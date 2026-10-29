// Partículas, ondas de choque, textos flutuantes, fogos, brilho de tela e tremida da câmera.
// Tudo anda em tempo real (segundos de relógio), não no tempo da simulação.
// Posições ficam no mundo; tamanhos e velocidades são pensados em pixels de tela e divididos
// pelo zoom no momento em que nascem (velocidade) ou em que são desenhados (tamanho).
import { glowSprite, SLOT_CSS, SLOT_LIGHT, GOLD_SLOT, WHITE_SLOT } from './palette'

const MAX_PARTICLES = 600
const MAX_RINGS = 40
const MAX_TEXTS = 24

// Tipos de partícula: ponto de brilho, confete que gira, faísca alongada pela velocidade.
const GLOW = 0
const CONFETTI = 1
const SPARK = 2

type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number // pixels de tela
  slot: number
  kind: number
  rot: number
  spin: number
  drag: number // fração da velocidade perdida por segundo (exponencial)
  gravity: number // pixels do mundo por s²
}

type Ring = { x: number; y: number; age: number; life: number; radius: number; width: number; slot: number }
type FloatText = { x: number; y: number; age: number; life: number; text: string; slot: number; scale: number }
type Burst = { delay: number; x: number; y: number; slot: number; zoom: number }

const particles: Particle[] = []
for (let i = 0; i < MAX_PARTICLES; i++) {
  particles.push({ x: 0, y: 0, vx: 0, vy: 0, age: 0, life: 1, size: 1, slot: 0, kind: 0, rot: 0, spin: 0, drag: 0, gravity: 0 })
}
let alive = 0
const rings: Ring[] = []
const texts: FloatText[] = []
const bursts: Burst[] = []

// Brilho de tela (bloom) e tremida, em pixels de tela.
let bloom = 0
let bloomSlot = GOLD_SLOT
let shake = 0

const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null

function spawn(): Particle | null {
  if (alive >= MAX_PARTICLES) return null
  const p = particles[alive++]
  p.age = 0
  p.rot = Math.random() * Math.PI * 2
  p.spin = 0
  p.drag = 1.5
  p.gravity = 0
  return p
}

// Explosão de partículas a partir de (x, y), na direção (nx, ny) com abertura spread (radianos).
export function emitBurst(
  x: number,
  y: number,
  nx: number,
  ny: number,
  spread: number,
  count: number,
  speed: number,
  slot: number,
  zoom: number,
  kindMix: 'hit' | 'sparkle' | 'confetti' | 'firework',
) {
  const base = Math.atan2(ny, nx)
  const inv = 1 / zoom
  for (let i = 0; i < count; i++) {
    const p = spawn()
    if (!p) return
    const angle = base + (Math.random() - 0.5) * spread
    const v = speed * (0.35 + Math.random() * 0.65) * inv
    p.x = x
    p.y = y
    p.vx = Math.cos(angle) * v
    p.vy = Math.sin(angle) * v
    p.slot = slot
    if (kindMix === 'hit') {
      p.kind = Math.random() < 0.5 ? SPARK : GLOW
      p.life = 0.35 + Math.random() * 0.4
      p.size = 2 + Math.random() * 3
      p.gravity = 700 * inv
      p.drag = 3
    } else if (kindMix === 'sparkle') {
      p.kind = Math.random() < 0.45 ? CONFETTI : GLOW
      p.life = 0.7 + Math.random() * 0.7
      p.size = p.kind === CONFETTI ? 3 + Math.random() * 3 : 2 + Math.random() * 4
      p.gravity = 380 * inv
      p.drag = 2.2
      p.spin = (Math.random() - 0.5) * 18
      if (p.kind === GLOW && Math.random() < 0.5) p.slot = Math.random() < 0.5 ? GOLD_SLOT : WHITE_SLOT
    } else if (kindMix === 'confetti') {
      p.kind = CONFETTI
      p.life = 1.4 + Math.random() * 1.2
      p.size = 3 + Math.random() * 4
      p.gravity = 520 * inv
      p.drag = 1.6
      p.spin = (Math.random() - 0.5) * 22
    } else {
      p.kind = Math.random() < 0.3 ? SPARK : GLOW
      p.life = 0.9 + Math.random() * 0.7
      p.size = 2 + Math.random() * 3
      p.gravity = 160 * inv
      p.drag = 1.8
    }
  }
}

export function emitRing(x: number, y: number, radius: number, width: number, life: number, slot: number) {
  if (rings.length >= MAX_RINGS) rings.shift()
  rings.push({ x, y, age: 0, life, radius, width, slot })
}

export function emitText(x: number, y: number, text: string, slot: number, scale: number) {
  if (texts.length >= MAX_TEXTS) texts.shift()
  texts.push({ x, y, age: 0, life: 0.95, text, slot, scale })
}

// Agenda um fogo de artifício para daqui a delay segundos.
export function scheduleFirework(delay: number, x: number, y: number, slot: number, zoom: number) {
  bursts.push({ delay, x, y, slot, zoom })
}

export function addBloom(amount: number, slot: number) {
  if (amount >= bloom) bloomSlot = slot
  bloom = Math.max(bloom, amount)
}

export function addShake(pixels: number) {
  if (reducedMotion?.matches) return
  shake = Math.max(shake, pixels)
}

export function clearParticles() {
  alive = 0
  rings.length = 0
  texts.length = 0
  bursts.length = 0
  bloom = 0
  shake = 0
}

export function updateParticles(dt: number) {
  for (let i = 0; i < alive; ) {
    const p = particles[i]
    p.age += dt
    if (p.age >= p.life) {
      // Troca com o último vivo, sem alocar.
      alive--
      particles[i] = particles[alive]
      particles[alive] = p
      continue
    }
    const damp = Math.exp(-p.drag * dt)
    p.vx *= damp
    p.vy = p.vy * damp + p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.rot += p.spin * dt
    i++
  }
  for (let i = rings.length - 1; i >= 0; i--) {
    rings[i].age += dt
    if (rings[i].age >= rings[i].life) rings.splice(i, 1)
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    texts[i].age += dt
    if (texts[i].age >= texts[i].life) texts.splice(i, 1)
  }
  for (let i = bursts.length - 1; i >= 0; i--) {
    const b = bursts[i]
    b.delay -= dt
    if (b.delay <= 0) {
      emitBurst(b.x, b.y, 0, -1, Math.PI * 2, 46, 420, b.slot, b.zoom, 'firework')
      emitRing(b.x, b.y, 70, 3, 0.5, b.slot)
      addBloom(0.35, b.slot)
      bursts.splice(i, 1)
    }
  }
  bloom *= Math.exp(-dt * 4.5)
  if (bloom < 0.003) bloom = 0
  shake *= Math.exp(-dt * 14)
  if (shake < 0.05) shake = 0
}

// Deslocamento da tremida neste quadro, em pixels de tela.
export function shakeOffset(clock: number): [number, number] {
  if (shake === 0) return [0, 0]
  return [Math.sin(clock * 91.7) * shake, Math.cos(clock * 77.3) * shake]
}

// Desenha partículas e anéis no espaço do mundo (a transformação do mundo já está aplicada).
export function drawParticlesWorld(ctx: CanvasRenderingContext2D, zoom: number) {
  const inv = 1 / zoom
  ctx.globalCompositeOperation = 'lighter'
  for (const r of rings) {
    const t = r.age / r.life
    const ease = 1 - (1 - t) * (1 - t) * (1 - t)
    ctx.globalAlpha = (1 - t) * 0.85
    ctx.strokeStyle = SLOT_LIGHT[r.slot]
    ctx.lineWidth = r.width * (1 - t * 0.7) * inv
    ctx.beginPath()
    ctx.arc(r.x, r.y, Math.max(0.1, r.radius * ease * inv), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.lineCap = 'round'
  for (let i = 0; i < alive; i++) {
    const p = particles[i]
    const t = p.age / p.life
    const fade = t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9
    if (p.kind === GLOW) {
      const s = p.size * (1.6 - t) * 2.2 * inv
      ctx.globalAlpha = fade
      ctx.drawImage(glowSprite(p.slot), p.x - s, p.y - s, s * 2, s * 2)
    } else if (p.kind === SPARK) {
      ctx.globalAlpha = fade
      ctx.strokeStyle = SLOT_LIGHT[p.slot]
      ctx.lineWidth = p.size * 0.6 * inv
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(p.x - p.vx * 0.035, p.y - p.vy * 0.035)
      ctx.stroke()
    }
  }
  // Confetes em composição normal: cores sólidas sobre o fundo escuro.
  ctx.globalCompositeOperation = 'source-over'
  ctx.lineCap = 'butt'
  for (let i = 0; i < alive; i++) {
    const p = particles[i]
    if (p.kind !== CONFETTI) continue
    const t = p.age / p.life
    ctx.globalAlpha = t > 0.7 ? (1 - t) / 0.3 : 1
    // O papel gira: o comprimento visível oscila com o cosseno da rotação.
    const len = p.size * inv * (0.25 + Math.abs(Math.cos(p.rot * 1.3)))
    const c = Math.cos(p.rot)
    const s = Math.sin(p.rot)
    ctx.strokeStyle = SLOT_CSS[p.slot]
    ctx.lineWidth = p.size * 0.7 * inv
    ctx.beginPath()
    ctx.moveTo(p.x - c * len, p.y - s * len)
    ctx.lineTo(p.x + c * len, p.y + s * len)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
  ctx.lineCap = 'round'
}

// Textos flutuantes (nome da nota) e o bloom, em espaço de tela.
// toScreenX/Y convertem do mundo para a tela; (bloomX, bloomY) é o centro do brilho, em tela.
export function drawParticlesScreen(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  toScreenX: (x: number) => number,
  toScreenY: (y: number) => number,
  bloomX: number,
  bloomY: number,
) {
  if (texts.length > 0) {
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const t of texts) {
      const k = t.age / t.life
      const rise = 46 * (1 - (1 - k) * (1 - k))
      const pop = k < 0.15 ? 0.7 + (k / 0.15) * 0.45 : 1.15 - Math.min(0.15, (k - 0.15) * 0.4)
      const size = Math.round(13 * t.scale * pop)
      const x = toScreenX(t.x)
      const y = toScreenY(t.y) - 26 - rise
      ctx.globalAlpha = k < 0.6 ? 1 : 1 - (k - 0.6) / 0.4
      ctx.font = `700 ${size}px system-ui, sans-serif`
      ctx.lineWidth = 3
      ctx.strokeStyle = 'rgba(8, 10, 30, 0.75)'
      ctx.strokeText(t.text, x, y)
      ctx.fillStyle = SLOT_LIGHT[t.slot]
      ctx.fillText(t.text, x, y)
    }
    ctx.globalAlpha = 1
  }
  if (bloom > 0) {
    ctx.globalCompositeOperation = 'lighter'
    ctx.globalAlpha = Math.min(0.6, bloom * 0.45)
    const size = Math.max(width, height) * 1.3
    ctx.drawImage(glowSprite(bloomSlot), bloomX - size / 2, bloomY - size / 2, size, size)
    ctx.globalAlpha = Math.min(0.25, bloom * 0.12)
    ctx.fillStyle = SLOT_CSS[bloomSlot]
    ctx.fillRect(0, 0, width, height)
    ctx.globalAlpha = 1
    ctx.globalCompositeOperation = 'source-over'
  }
}
