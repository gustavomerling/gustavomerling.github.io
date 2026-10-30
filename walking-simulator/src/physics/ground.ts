import type { Particle } from './particle'

// Tipos de terreno. A criatura sempre nasce numa faixa plana; o relevo começa logo à frente.
export type TerrainKind = 'flat' | 'hills' | 'stairs' | 'rough'

// Chão. O eixo Y cresce para baixo (coordenadas de tela); `y` é a altura do chão plano na largada.
export type Ground = {
  y: number
  // Coeficiente de atrito cinético (Coulomb). O estático é um pouco maior (STATIC_RATIO).
  friction: number
  terrain?: TerrainKind
  // Posição x da largada: o relevo é medido a partir dela.
  originX?: number
}

// Atrito estático / cinético.
const STATIC_RATIO = 1.3

// Distância plana à frente da largada antes do relevo começar (px).
const FLAT_START = 120

// Ruído 1D determinístico (valores em [0, 1) nos inteiros, interpolação suave entre eles).
const hash = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}
function noise(x: number): number {
  const i = Math.floor(x)
  const t = x - i
  const s = t * t * (3 - 2 * t)
  return hash(i) * (1 - s) + hash(i + 1) * s
}

// Elevação (px, para cima) a `d` px da largada.
function elevation(kind: TerrainKind, d: number): number {
  if (kind === 'flat' || d <= 0) return 0
  if (kind === 'stairs') {
    // Degraus de 9 px a cada 64 px, subindo sempre.
    return d > FLAT_START ? (Math.floor((d - FLAT_START) / 64) + 1) * 9 : 0
  }
  // Rampa de entrada para o relevo não começar com um degrau.
  const ramp = Math.min(1, Math.max(0, (d - FLAT_START) / 150))
  if (kind === 'hills') return ramp * (22 * (1 - Math.cos(d / 110)) + 9 * Math.sin(d / 41 + 0.6) + 9)
  // Irregular: calombos pequenos e frequentes.
  return ramp * (noise(d / 22) * 11 + noise(d / 7 + 40) * 4)
}

// Altura (y de tela) da superfície do chão na posição x.
export function surfaceY(ground: Ground, x: number): number {
  if (!ground.terrain || ground.terrain === 'flat') return ground.y
  return ground.y - elevation(ground.terrain, x - (ground.originX ?? 0))
}

export function collideWithGround(p: Particle, ground: Ground): void {
  if (p.pinned) return
  const gy = surfaceY(ground, p.pos.x)
  if (p.pos.y <= gy) return

  // Bateu na lateral de um degrau: o chão subiu de repente acima de onde o ponto estava.
  // Volta na horizontal em vez de "teletransportar" o ponto para cima do degrau.
  const prevGy = surfaceY(ground, p.prev.x)
  if (p.prev.y <= prevGy + 0.5 && gy < p.prev.y - 2) {
    p.pos.x = p.prev.x
    if (p.pos.y > prevGy) p.pos.y = prevGy
    return
  }

  p.contact += p.pos.y - gy
  p.pos.y = gy
  // Zera a velocidade vertical para não quicar para dentro do chão.
  p.prev.y = p.pos.y
}

// Atrito de Coulomb, aplicado uma vez por passo depois das restrições: proporcional a quanto o chão
// empurrou o ponto (força normal). Se o deslizamento do passo for pequeno, o pé fica parado (estático);
// senão, perde uma quantidade fixa de deslocamento (cinético).
export function applyFriction(p: Particle, ground: Ground): void {
  if (p.contact <= 0) return
  const dx = p.pos.x - p.prev.x
  const limit = p.contact * ground.friction
  if (Math.abs(dx) <= limit * STATIC_RATIO) p.pos.x = p.prev.x
  else p.pos.x -= Math.sign(dx) * limit
}
