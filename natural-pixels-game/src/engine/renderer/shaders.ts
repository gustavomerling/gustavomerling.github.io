/** Full-screen triangle; `vUv` is 0..1 with y pointing down (row 0 = top of the grid). */
export const VERTEX_SHADER = /* glsl */ `#version 300 es
out vec2 vUv;
void main() {
  vec2 pos = vec2((gl_VertexID << 1) & 2, gl_VertexID & 2);
  vUv = vec2(pos.x, 1.0 - pos.y);
  gl_Position = vec4(pos * 2.0 - 1.0, 0.0, 1.0);
}
`

/*
 * Draws the grid smoothly at screen resolution. For each pixel it looks at the 5×5 cells
 * around it and composites, back to front:
 *   sky → liquids (continuous surface) → solids/powders (rounded) → gases (soft) → fire (glow).
 *
 * uInfo channels: r = kind (see KIND_* in webgl.ts), g = heat glow 0..1, b = shade,
 * a = self-glow (emissive) 0..1. uLightMap (sampled smoothly, see renderer/lighting.ts):
 * r = skylight reaching the cell, g = light from glowing things around it, b = tree shade 0..1.
 * Sky/lighting numbers mirror renderer/sky.ts.
 */
export const FRAGMENT_SHADER = /* glsl */ `#version 300 es
precision highp float;
precision highp int;

in vec2 vUv;
out vec4 outColor;

uniform sampler2D uColor;
uniform sampler2D uInfo;
uniform vec2 uGrid;
uniform float uTime;
uniform float uLight;
uniform vec2 uSun;
uniform float uCellsPerPixel;
uniform float uOvercast;
uniform float uFlash;
uniform float uRainbow;
uniform sampler2D uLightMap;
/** The camera: xy = the top-left of the view (0..1 of the world), z = its size (1 / zoom). */
uniform vec3 uView;
uniform float uRainbow2;
uniform float uEclipse;
uniform float uAurora;
uniform float uMeteors;

/** Warm torchlight; deep darkness never quite black (rock), a bit darker in open caves. */
const vec3 GLOW_TINT = vec3(1.0, 0.74, 0.46);
const float DARK_SOLID = 0.13;
const float DARK_OPEN = 0.03;
const vec3 CAVE = vec3(0.035, 0.03, 0.04);
/** The air under a tree's crown gets a light dark veil (this much black, fully shaded). */
const float AIR_SHADE = 0.2;

const float KIND_STATIC = 1.0;
const float KIND_POWDER = 2.0;
const float KIND_LIQUID = 3.0;
const float KIND_GAS = 4.0;
const float KIND_ENERGY = 5.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

// ---------- The landscape behind the world (mirrors renderer/horizon.ts) ----------

float vnoise(float x, float seed) {
  float i = floor(x);
  float f = fract(x);
  return mix(hash(vec2(i, seed)), hash(vec2(i + 1.0, seed)), f * f * (3.0 - 2.0 * f));
}

float ridgeNoise(float u, float scale, float seed) {
  float x = u * scale;
  return vnoise(x + seed, 3.1) * 0.6 + vnoise(x * 2.3 + seed * 1.7, 3.1) * 0.28 + vnoise(x * 5.1 + seed * 2.9, 3.1) * 0.12;
}

/** One layer of hills over the sky colour c: filled below its ridge, hazed with the sky. */
vec3 hills(vec3 c, vec2 uv, float base, float rise, float scale, float seed, vec3 tint, float haze, float trees, bool snow) {
  float n = ridgeNoise(uv.x, scale, seed);
  float top = base - n * rise - (trees > 0.0 ? vnoise(uv.x * 90.0 + seed, 7.7) * trees : 0.0);
  float edge = 0.0025;
  float inside = smoothstep(top - edge, top + edge, uv.y);
  if (inside <= 0.0) return c;
  // Snow on the highest peaks, just under the ridge.
  vec3 ground = tint;
  if (snow && n > 0.66) ground = mix(ground, vec3(0.96, 0.97, 1.0), (1.0 - smoothstep(top + 0.005, top + 0.025, uv.y)) * smoothstep(0.66, 0.74, n));
  // Night and dusk come from the sky: hazed with it, and dimmed with the light.
  ground *= 0.35 + 0.65 * uLight;
  ground = mix(ground, c, haze);
  return mix(c, ground, inside);
}

vec3 horizon(vec3 c, vec2 uv) {
  c = hills(c, uv, 0.44, 0.22, 3.0, 11.0, vec3(0.56, 0.6, 0.74), 0.55, 0.0, true);
  c = hills(c, uv, 0.56, 0.14, 5.0, 37.0, vec3(0.5, 0.62, 0.56), 0.35, 0.008, false);
  c = hills(c, uv, 0.67, 0.09, 8.0, 71.0, vec3(0.42, 0.58, 0.4), 0.15, 0.02, false);
  return c;
}

vec3 sky(vec2 uv) {
  vec3 top = mix(vec3(0.02, 0.03, 0.08), vec3(0.36, 0.62, 0.92), uLight);
  vec3 bottom = mix(vec3(0.07, 0.09, 0.18), vec3(0.75, 0.88, 0.98), uLight);
  vec3 c = mix(top, bottom, uv.y);

  float dusk = smoothstep(0.0, 0.35, uLight) * (1.0 - smoothstep(0.35, 0.8, uLight));
  c += vec3(0.9, 0.4, 0.15) * dusk * uv.y * uv.y * 0.6 * (1.0 - uOvercast);

  // Stars, fading in as the light goes.
  if (uLight < 0.5) {
    vec2 g = floor(gl_FragCoord.xy / 3.0);
    float h = hash(g);
    float twinkle = 0.6 + 0.4 * sin(uTime * 3.0 + h * 50.0);
    c += step(0.997, h) * twinkle * (1.0 - uLight * 2.0) * (1.0 - uv.y);
  }

  // Aurora: soft green and violet curtains rippling high in the night sky.
  if (uAurora > 0.0) {
    float wave = sin(uv.x * 9.0 + uTime * 0.35) * 0.04 + sin(uv.x * 23.0 - uTime * 0.6) * 0.015;
    float band = smoothstep(0.42, 0.12, abs(uv.y - 0.22 - wave)) * (0.6 + 0.4 * sin(uv.x * 40.0 + uTime * 1.3));
    vec3 tint = mix(vec3(0.25, 1.0, 0.55), vec3(0.6, 0.35, 1.0), smoothstep(0.1, 0.35, uv.y + wave));
    c += tint * band * 0.35 * uAurora * (1.0 - uLight);
  }

  // Now and then a shooting star streaks across the night sky (every second or so in a shower).
  if (uLight < 0.3) {
    float period = mix(7.0, 1.1, uMeteors);
    float k = floor(uTime / period);
    float t = mod(uTime, period);
    if (t < 0.9 && hash(vec2(k, 7.0)) < 0.6 + 0.4 * uMeteors) {
      vec2 aspect = vec2(uGrid.x / uGrid.y, 1.0);
      vec2 start = vec2(0.1 + hash(vec2(k, 1.0)) * 0.8, 0.05 + hash(vec2(k, 2.0)) * 0.3);
      vec2 dir = normalize(vec2(hash(vec2(k, 3.0)) < 0.5 ? -1.0 : 1.0, 0.45));
      vec2 head = start + dir * t * 0.45 / aspect;
      vec2 pa = (uv - head) * aspect;
      float along = dot(pa, -dir);
      float across = length(pa + dir * along);
      float tail = smoothstep(0.12, 0.0, along) * step(0.0, along);
      float fade = smoothstep(0.0, 0.15, t) * smoothstep(0.9, 0.6, t);
      c += vec3(1.0, 0.95, 0.85) * tail * smoothstep(0.004, 0.0, across) * fade * (1.0 - uLight * 3.0);
    }
  }

  // Sun by day, pale moon by night.
  vec2 d = (uv - uSun) * vec2(uGrid.x / uGrid.y, 1.0);
  float r = length(d);
  vec3 disc = mix(vec3(0.85, 0.88, 1.0), vec3(1.0, 0.93, 0.65), uLight);
  c += disc * smoothstep(0.042, 0.034, r) * (1.0 - uOvercast * 0.9);
  // An eclipse: the moon slides over the sun, leaving a glowing ring (the corona).
  if (uEclipse > 0.0) {
    vec2 m = d - vec2((1.0 - uEclipse) * 0.06, 0.0);
    float moon = smoothstep(0.041, 0.035, length(m));
    c = mix(c, vec3(0.02, 0.02, 0.04), moon * uEclipse);
    c += vec3(1.0, 0.95, 0.8) * smoothstep(0.06, 0.04, r) * smoothstep(0.03, 0.045, r) * uEclipse * 0.8;
  }
  c += disc * 0.22 * exp(-r * 12.0) * (0.35 + uLight) * (1.0 - uOvercast);

  // The hills in the distance (the sun and moon set behind them).
  c = horizon(c, uv);

  // Rain clouds: the sky turns grey and dark; lightning lights it up.
  c = mix(c, vec3(0.32, 0.35, 0.4) * (0.25 + 0.75 * uLight), uOvercast);
  c += vec3(0.75, 0.8, 1.0) * uFlash * 0.5;

  // Rainbow after the rain: a faint arc centred below the bottom of the screen.
  if (uRainbow > 0.0) {
    vec2 rp = (uv - vec2(0.5, 1.25)) * vec2(uGrid.x / uGrid.y, 1.0);
    float band = (length(rp) - 0.9) / 0.09;
    if (band > 0.0 && band < 1.0) {
      vec3 bow = clamp(abs(fract(band * 0.85 + vec3(0.0, 0.67, 0.33)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
      c = mix(c, bow, uRainbow * 0.3 * sin(band * 3.14159));
    }
    // A second, fainter bow outside the first, its colours the other way round.
    if (uRainbow2 > 0.0) {
      float band2 = (length(rp) - 1.08) / 0.1;
      if (band2 > 0.0 && band2 < 1.0) {
        vec3 bow2 = clamp(abs(fract((1.0 - band2) * 0.85 + vec3(0.0, 0.67, 0.33)) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
        c = mix(c, bow2, uRainbow2 * 0.14 * sin(band2 * 3.14159));
      }
    }
  }
  return c;
}

bool isSolid(float kind) {
  return kind == KIND_STATIC || kind == KIND_POWDER;
}

void main() {
  // Where on the world this pixel is (the camera may be zoomed in).
  vec2 uv = uView.xy + vUv * uView.z;
  vec2 p = uv * uGrid;
  ivec2 cell = ivec2(floor(p));
  vec2 f = fract(p);
  ivec2 maxCell = ivec2(uGrid) - 1;
  float aa = clamp(uCellsPerPixel, 0.02, 0.5);

  float gasW = 0.0;
  vec3 gasC = vec3(0.0);
  float gasA = 0.0;
  float fireW = 0.0;
  float glowW = 0.0;
  float liqW = 0.0;
  float liqTotal = 0.0;
  vec4 liqC = vec4(0.0);
  float kinds[9];
  vec4 colors[9];
  float emits[9];
  float liqEmit = 0.0;

  for (int dy = -2; dy <= 2; dy++) {
    for (int dx = -2; dx <= 2; dx++) {
      ivec2 c = cell + ivec2(dx, dy);
      bool inside = all(greaterThanEqual(c, ivec2(0))) && all(lessThanEqual(c, maxCell));
      vec4 info = inside ? texelFetch(uInfo, c, 0) : vec4(0.0);
      vec4 col = inside ? texelFetch(uColor, c, 0) : vec4(0.0);
      float kind = floor(info.r * 255.0 + 0.5);
      vec2 d = p - (vec2(c) + 0.5);
      float d2 = dot(d, d);

      if (kind == KIND_GAS) {
        float w = exp(-d2 * 0.45);
        gasW += w;
        gasC += col.rgb * w;
        gasA += col.a * w;
      }
      float wf = exp(-d2 * 0.35);
      if (kind == KIND_ENERGY) fireW += wf;
      glowW += wf * info.g;

      if (abs(dx) <= 1 && abs(dy) <= 1) {
        int k = (dy + 1) * 3 + (dx + 1);
        kinds[k] = kind;
        colors[k] = col;
        emits[k] = info.a;
        float wl = exp(-d2 * 1.6);
        liqTotal += wl;
        if (kind == KIND_LIQUID) {
          liqW += wl;
          liqC += col * wl;
          liqEmit += info.a * wl;
        }
      }
    }
  }

  float here = kinds[4];
  vec3 litMap = texture(uLightMap, uv).rgb;
  vec2 lit = litMap.rg;
  float shadeMap = litMap.b;
  float glowFlicker = 0.88 + 0.12 * sin(uTime * 7.0 + hash(floor(p / 4.0)) * 6.28);

  // The sky only shows where daylight gets to; caves and galleries are dark behind (lit by torches).
  vec3 col = mix(CAVE, sky(uv), smoothstep(0.0, 0.45, lit.r)) * (1.0 - AIR_SHADE * shadeMap) + GLOW_TINT * lit.g * 0.18 * glowFlicker;

  // World lighting: skylight (dimmer at night, under trees, deep down) plus warm light from
  // glowing things nearby, and a touch of fire and red-hot glow on top.
  float day = (0.28 + 0.72 * uLight) * (1.0 - 0.45 * uOvercast) + uFlash * 0.6;
  vec3 light = vec3(lit.r * day) + GLOW_TINT * lit.g * 1.05 * glowFlicker;
  light = max(light, vec3(isSolid(here) ? DARK_SOLID : DARK_OPEN));
  light += vec3(1.0, 0.55, 0.2) * (fireW * 0.22 + glowW * 0.06 * glowFlicker) * (1.15 - uLight);

  // Liquids: a smooth coverage field gives one continuous surface instead of squares.
  if (liqW > 0.0) {
    vec4 lc = liqC / liqW;
    float coverage = liqW / liqTotal + sin(p.x * 1.3 + uTime * 2.0) * 0.02;
    float drop = here == KIND_LIQUID ? smoothstep(0.62, 0.42, length(f - 0.5)) : 0.0;
    float a = max(smoothstep(0.3, 0.48, coverage), drop);
    vec3 water = lc.rgb * mix(light, vec3(1.0), liqEmit / liqW);
    // Bright line along the surface (open air above).
    if (here == KIND_LIQUID && kinds[1] != KIND_LIQUID && !isSolid(kinds[1])) {
      water += vec3(0.35) * (1.0 - smoothstep(0.0, 0.35, f.y)) * (0.6 + 0.4 * uLight);
    }
    col = mix(col, water, a * lc.a);
  }

  // Solids and powders: exposed corners rounded, inner corners filled, soft top light.
  vec2 q = f - 0.5;
  int sx = q.x < 0.0 ? -1 : 1;
  int sy = q.y < 0.0 ? -1 : 1;
  bool sideX = isSolid(kinds[4 + sx]);
  bool sideY = isSolid(kinds[4 + sy * 3]);
  if (isSolid(here)) {
    vec4 sc = colors[4];
    float a = 1.0;
    if (!sideX && !sideY) a = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, length(q));
    float rim = isSolid(kinds[1]) ? 0.0 : (1.0 - smoothstep(0.0, 0.3, f.y)) * 0.12;
    // Torches, campfires and lamps flicker a little.
    float flick = emits[4] > 0.5 ? 0.9 + 0.1 * sin(uTime * 11.0 + hash(vec2(cell)) * 6.28) : 1.0;
    col = mix(col, sc.rgb * (1.0 + rim) * flick * mix(light, vec3(1.0), emits[4]), a * sc.a);
  } else if (sideX && sideY) {
    // Fillet between two solid neighbours: smooths staircases into slopes.
    vec4 sc = (colors[4 + sx] + colors[4 + sy * 3]) * 0.5;
    float r = length(q - vec2(float(sx), float(sy)) * 0.5);
    float a = 1.0 - smoothstep(0.5 - aa, 0.5 + aa, r);
    col = mix(col, sc.rgb * light, a * sc.a);
  }

  // Gases: soft, cloudy blobs.
  if (gasW > 0.001) {
    float coverage = clamp(gasW / 4.5, 0.0, 1.0);
    vec3 gc = gasC / gasW * (0.45 + 0.55 * uLight);
    col = mix(col, gc, smoothstep(0.05, 0.6, coverage) * (gasA / gasW));
  }

  // Fire: additive flickering glow, plus a halo around anything red-hot.
  float fire = clamp(fireW / 3.5, 0.0, 1.0);
  if (fire > 0.0) {
    float flicker = 0.8 + 0.2 * sin(uTime * 18.0 + hash(vec2(cell)) * 6.28);
    vec3 flame = mix(vec3(0.9, 0.15, 0.02), vec3(1.0, 0.85, 0.4), smoothstep(0.3, 1.0, fire));
    col += flame * smoothstep(0.05, 0.7, fire) * flicker * 1.1;
  }
  col += vec3(1.0, 0.45, 0.15) * glowW * 0.12;

  outColor = vec4(col, 1.0);
}
`
