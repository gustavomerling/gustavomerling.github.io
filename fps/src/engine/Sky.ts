import * as THREE from 'three'

export const SKY_HORIZON = 0x1c2c42
const SKY_TOP = 0x03060e
const SKY_BOTTOM = 0x0d1828
const SUN_GLOW = 0xffb36b

const DOME_RADIUS = 400
const STAR_COUNT = 1600
const MOTE_COUNT = 260
// Motes fill a cube this wide around the camera and wrap around its edges.
const MOTE_SPAN = 26

// The sea of clouds the tower rises from.
const CLOUD_Y = -32
const CLOUD_RADIUS = 480

/** Value noise and fbm, shared by the sky and the clouds. */
const NOISE_GLSL = /* glsl */ `
  float hash(vec3 p) {
    p = fract(p * 0.3183099 + 0.1);
    p *= 17.0;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float noise(vec3 x) {
    vec3 i = floor(x);
    vec3 f = fract(x);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
      mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y),
      f.z);
  }
  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p);
      p *= 2.03;
      amplitude *= 0.5;
    }
    return value;
  }
`

/**
 * Backdrop that follows the camera: a night sky with a nebula, an aurora band,
 * a low sun with its glow, twinkling stars, a sea of clouds far below, and slow
 * dust motes drifting around the player for depth.
 */
export class Sky {
  readonly group = new THREE.Group()
  private readonly dome: THREE.ShaderMaterial
  private readonly stars: THREE.ShaderMaterial
  private readonly clouds: THREE.Mesh
  private readonly cloudMaterial: THREE.ShaderMaterial
  private readonly motes: THREE.Points
  private readonly moteBase: Float32Array
  private readonly moteSpeed: Float32Array

  constructor(sunDirection: THREE.Vector3) {
    const sun = sunDirection.clone().normalize()

    this.dome = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        top: { value: new THREE.Color(SKY_TOP) },
        horizon: { value: new THREE.Color(SKY_HORIZON) },
        bottom: { value: new THREE.Color(SKY_BOTTOM) },
        glow: { value: new THREE.Color(SUN_GLOW) },
        sunDirection: { value: sun },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDirection;
        void main() {
          vDirection = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec3 top;
        uniform vec3 horizon;
        uniform vec3 bottom;
        uniform vec3 glow;
        uniform vec3 sunDirection;
        varying vec3 vDirection;
        ${NOISE_GLSL}
        void main() {
          vec3 d = normalize(vDirection);
          float h = d.y;
          vec3 color = h > 0.0
            ? mix(horizon, top, pow(h, 0.5))
            : mix(horizon, bottom, pow(-h, 0.35));

          // Nebula: two layers of noise, purple and teal, high in the sky.
          float cloud = fbm(d * 2.6 + vec3(0.0, time * 0.004, 0.0));
          float tint = fbm(d * 5.0 - vec3(time * 0.006));
          vec3 nebula = mix(vec3(0.32, 0.12, 0.5), vec3(0.06, 0.42, 0.55), tint);
          color += nebula * smoothstep(0.48, 0.85, cloud) * smoothstep(0.05, 0.5, h) * 0.5;

          // Aurora: a wavy green band that drifts slowly.
          float wave = 0.32 + 0.06 * sin(atan(d.z, d.x) * 3.0 + time * 0.05);
          float band = exp(-pow((h - wave) * 9.0, 2.0));
          float curtain = smoothstep(0.35, 0.75, fbm(vec3(atan(d.z, d.x) * 6.0, time * 0.04, h * 2.0)));
          color += vec3(0.1, 0.85, 0.55) * band * curtain * 0.28;

          // Haze right at the horizon.
          color += horizon * 0.35 * exp(-abs(h) * 14.0);

          // Sun: wide warm glow plus a small disc.
          float s = max(dot(d, sunDirection), 0.0);
          color += glow * (pow(s, 5.0) * 0.32 + pow(s, 80.0) * 0.6) * smoothstep(-0.25, 0.15, h);
          color += vec3(1.0, 0.92, 0.78) * smoothstep(0.9993, 0.9997, s) * 2.0;

          gl_FragColor = vec4(color, 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
    const dome = new THREE.Mesh(new THREE.SphereGeometry(DOME_RADIUS, 48, 24), this.dome)
    dome.renderOrder = -2
    this.group.add(dome)

    this.stars = this.buildStarMaterial()
    this.group.add(this.buildStars(this.stars))

    this.cloudMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        center: { value: new THREE.Vector2() },
        low: { value: new THREE.Color(0x0b1424) },
        high: { value: new THREE.Color(0x3a5070) },
        lit: { value: new THREE.Color(SUN_GLOW) },
        horizon: { value: new THREE.Color(SKY_HORIZON) },
        sunDirection: { value: sun },
      },
      vertexShader: /* glsl */ `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform float time;
        uniform vec2 center;
        uniform vec3 low;
        uniform vec3 high;
        uniform vec3 lit;
        uniform vec3 horizon;
        uniform vec3 sunDirection;
        varying vec3 vWorld;
        ${NOISE_GLSL}
        void main() {
          vec2 p = vWorld.xz * 0.018 + vec2(time * 0.012, time * 0.007);
          float big = fbm(vec3(p, time * 0.015));
          float small = fbm(vec3(p * 3.1, 2.0 + time * 0.02));
          float density = smoothstep(0.32, 0.78, big * 0.75 + small * 0.35);
          vec3 color = mix(low, high, density);
          // Cloud tops facing the sun catch a little of its colour.
          vec2 toSun = normalize(sunDirection.xz);
          float rim = smoothstep(0.55, 0.85, small) * density;
          color += lit * rim * 0.12 * (0.5 + 0.5 * dot(normalize(vWorld.xz - center + 0.001), toSun));
          float fade = smoothstep(${(CLOUD_RADIUS * 0.95).toFixed(1)}, 60.0, length(vWorld.xz - center));
          gl_FragColor = vec4(mix(horizon, color, fade), 1.0);
          #include <colorspace_fragment>
        }
      `,
    })
    this.clouds = new THREE.Mesh(new THREE.CircleGeometry(CLOUD_RADIUS, 64), this.cloudMaterial)
    this.clouds.rotation.x = -Math.PI / 2
    this.clouds.renderOrder = -1

    this.moteBase = new Float32Array(MOTE_COUNT * 3)
    this.moteSpeed = new Float32Array(MOTE_COUNT)
    for (let i = 0; i < MOTE_COUNT; i++) {
      this.moteBase[i * 3] = Math.random() * MOTE_SPAN
      this.moteBase[i * 3 + 1] = Math.random() * MOTE_SPAN
      this.moteBase[i * 3 + 2] = Math.random() * MOTE_SPAN
      this.moteSpeed[i] = 0.15 + Math.random() * 0.35
    }
    const moteGeometry = new THREE.BufferGeometry()
    moteGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MOTE_COUNT * 3), 3))
    this.motes = new THREE.Points(
      moteGeometry,
      new THREE.PointsMaterial({
        color: 0xbfe6ff,
        size: 0.05,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
    this.motes.frustumCulled = false
  }

  /** World-space layers (motes, clouds), added to the scene separately from the dome. */
  get layers() {
    return [this.motes, this.clouds]
  }

  update(cameraPosition: THREE.Vector3, time: number) {
    this.group.position.copy(cameraPosition)
    this.dome.uniforms.time.value = time
    this.stars.uniforms.time.value = time

    this.clouds.position.set(cameraPosition.x, CLOUD_Y, cameraPosition.z)
    this.cloudMaterial.uniforms.time.value = time
    ;(this.cloudMaterial.uniforms.center.value as THREE.Vector2).set(cameraPosition.x, cameraPosition.z)

    const positions = this.motes.geometry.getAttribute('position') as THREE.BufferAttribute
    const array = positions.array as Float32Array
    const half = MOTE_SPAN / 2
    for (let i = 0; i < MOTE_COUNT; i++) {
      const speed = this.moteSpeed[i]
      const bx = this.moteBase[i * 3] + Math.sin(time * 0.3 + i) * 0.6
      const by = this.moteBase[i * 3 + 1] + time * speed * 0.4
      const bz = this.moteBase[i * 3 + 2] + Math.cos(time * 0.25 + i * 1.7) * 0.6
      array[i * 3] = cameraPosition.x + wrap(bx - cameraPosition.x, MOTE_SPAN) - half
      array[i * 3 + 1] = cameraPosition.y + wrap(by - cameraPosition.y, MOTE_SPAN) - half
      array[i * 3 + 2] = cameraPosition.z + wrap(bz - cameraPosition.z, MOTE_SPAN) - half
    }
    positions.needsUpdate = true
  }

  private buildStarMaterial() {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: { time: { value: 0 }, pixelRatio: { value: Math.min(window.devicePixelRatio, 2) } },
      vertexShader: /* glsl */ `
        uniform float time;
        uniform float pixelRatio;
        attribute vec3 starColor;
        attribute float seed;
        varying vec3 vColor;
        void main() {
          float twinkle = 0.65 + 0.35 * sin(time * (1.5 + seed * 3.0) + seed * 40.0);
          vColor = starColor * twinkle;
          gl_PointSize = (1.2 + seed * 2.2) * pixelRatio;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          float alpha = smoothstep(0.5, 0.0, d);
          gl_FragColor = vec4(vColor * alpha, alpha);
        }
      `,
    })
  }

  private buildStars(material: THREE.ShaderMaterial) {
    const positions = new Float32Array(STAR_COUNT * 3)
    const colors = new Float32Array(STAR_COUNT * 3)
    const seeds = new Float32Array(STAR_COUNT)
    const color = new THREE.Color()
    for (let i = 0; i < STAR_COUNT; i++) {
      // Upper hemisphere, a little below the horizon too.
      const y = Math.random() * 1.05 - 0.05
      const angle = Math.random() * Math.PI * 2
      const ring = Math.sqrt(1 - y * y)
      const radius = DOME_RADIUS * 0.95
      positions[i * 3] = Math.cos(angle) * ring * radius
      positions[i * 3 + 1] = y * radius
      positions[i * 3 + 2] = Math.sin(angle) * ring * radius
      color.setHSL(0.55 + Math.random() * 0.12, 0.5, 0.6 + Math.random() * 0.4)
      color.multiplyScalar(0.4 + Math.random() * 0.6)
      colors.set([color.r, color.g, color.b], i * 3)
      seeds[i] = Math.random() ** 3
    }
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('starColor', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('seed', new THREE.BufferAttribute(seeds, 1))
    const stars = new THREE.Points(geometry, material)
    stars.renderOrder = -1
    stars.frustumCulled = false
    return stars
  }
}

/** `value` wrapped into [0, span). */
function wrap(value: number, span: number) {
  return ((value % span) + span) % span
}
