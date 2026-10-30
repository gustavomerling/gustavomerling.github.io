import type { Particle } from './particle'

// Fração da distância até o comando que a ativação percorre por passo (60 Hz): ~0,1 s para responder.
// Músculos de verdade não mudam de tensão instantaneamente; isso deixa o movimento suave.
export const MUSCLE_RESPONSE = 0.18

// Mola entre duas partículas cujo comprimento de repouso muda com a ativação.
// `activation` fica em [-1, 1]: positivo contrai, negativo estica (até `contraction` do comprimento base).
// O cérebro escreve `command`; a ativação o persegue aos poucos a cada passo.
export class Muscle {
  readonly a: Particle
  readonly b: Particle
  readonly baseLength: number
  // Rigidez de 0 a 1: fração da correção aplicada por iteração.
  readonly strength: number
  // Amplitude de 0 a 1, como fração do comprimento base.
  readonly contraction: number
  activation = 0
  command = 0

  constructor(a: Particle, b: Particle, baseLength: number, strength: number, contraction: number) {
    this.a = a
    this.b = b
    this.baseLength = baseLength
    this.strength = strength
    this.contraction = contraction
  }

  // Aproxima a ativação do comando (chamado uma vez por passo).
  respond(): void {
    this.activation += (this.command - this.activation) * MUSCLE_RESPONSE
  }

  get restLength(): number {
    const act = Math.max(-1, Math.min(1, this.activation))
    return this.baseLength * (1 - this.contraction * act)
  }

  solve(): void {
    const dx = this.b.pos.x - this.a.pos.x
    const dy = this.b.pos.y - this.a.pos.y
    const dist = Math.hypot(dx, dy)
    if (dist === 0) return

    const wA = this.a.invMass
    const wB = this.b.invMass
    const wSum = wA + wB
    if (wSum === 0) return

    const factor = ((dist - this.restLength) / dist / wSum) * this.strength
    const cx = dx * factor
    const cy = dy * factor
    this.a.pos.x += cx * wA
    this.a.pos.y += cy * wA
    this.b.pos.x -= cx * wB
    this.b.pos.y -= cy * wB
  }
}
