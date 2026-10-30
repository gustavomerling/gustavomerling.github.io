import type { Vec2 } from '../utils/vec2'

// Deslocamento máximo por passo (px): 5 px/passo = 300 px/s.
const MAX_STEP = 5

// Ponto de massa integrado com Verlet: a velocidade é implícita (pos - prev).
export class Particle {
  pos: Vec2
  prev: Vec2
  // 0 = fixo (pinado), 1 = massa unitária
  invMass: number
  // Camada de desenho: -1 = exemplar de trás do membro, 0 = torso, 1 = exemplar da frente. Não afeta a física.
  depth = 0
  // Quanto o chão empurrou o ponto para cima no passo atual (px): a "força normal" usada no atrito.
  contact = 0

  constructor(pos: Vec2, invMass = 1) {
    this.pos = { ...pos }
    this.prev = { ...pos }
    this.invMass = invMass
  }

  get pinned(): boolean {
    return this.invMass === 0
  }

  integrate(gravityY: number, dt: number, damping: number): void {
    if (this.pinned) return
    let vx = (this.pos.x - this.prev.x) * damping
    let vy = (this.pos.y - this.prev.y) * damping
    // Limite de velocidade: impede que conflitos entre músculos e ossos lancem a criatura.
    const speed = Math.hypot(vx, vy)
    if (speed > MAX_STEP) {
      vx *= MAX_STEP / speed
      vy *= MAX_STEP / speed
    }
    this.prev = { ...this.pos }
    this.pos.x += vx
    this.pos.y += vy + gravityY * dt * dt
  }
}
