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
 * a = self-glow (emissive) 0..1.
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

const float KIND_STATIC = 1.0;
const float KIND_POWDER = 2.0;
const float KIND_LIQUID = 3.0;
const float KIND_GAS = 4.0;
const float KIND_ENERGY = 5.0;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 sky(vec2 uv) {
  vec3 top = mix(vec3(0.02, 0.03, 0.08), vec3(0.36, 0.62, 0.92), uLight);
  vec3 bottom = mix(vec3(0.07, 0.09, 0.18), vec3(0.75, 0.88, 0.98), uLight);
  vec3 c = mix(top, bottom, uv.y);

  float dusk = smoothstep(0.0, 0.35, uLight) * (1.0 - smoothstep(0.35, 0.8, uLight));
  c += vec3(0.9, 0.4, 0.15) * dusk * uv.y * uv.y * 0.6;

  // Stars, fading in as the light goes.
  if (uLight < 0.5) {
    vec2 g = floor(gl_FragCoord.xy / 3.0);
    float h = hash(g);
    float twinkle = 0.6 + 0.4 * sin(uTime * 3.0 + h * 50.0);
    c += step(0.997, h) * twinkle * (1.0 - uLight * 2.0) * (1.0 - uv.y);
  }

  // Sun by day, pale moon by night.
  vec2 d = (uv - uSun) * vec2(uGrid.x / uGrid.y, 1.0);
  float r = length(d);
  vec3 disc = mix(vec3(0.85, 0.88, 1.0), vec3(1.0, 0.93, 0.65), uLight);
  c += disc * smoothstep(0.042, 0.034, r);
  c += disc * 0.22 * exp(-r * 12.0) * (0.35 + uLight);
  return c;
}

bool isSolid(float kind) {
  return kind == KIND_STATIC || kind == KIND_POWDER;
}

void main() {
  vec2 p = vUv * uGrid;
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
  vec3 col = sky(vUv);

  // World lighting: dimmer at night, warmed up by nearby fire and hot material.
  vec3 light = vec3(0.28 + 0.72 * uLight);
  light += vec3(1.0, 0.55, 0.2) * (fireW * 0.22 + glowW * 0.18) * (1.15 - uLight);

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
    col = mix(col, sc.rgb * (1.0 + rim) * mix(light, vec3(1.0), emits[4]), a * sc.a);
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
