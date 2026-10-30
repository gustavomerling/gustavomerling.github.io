import { length } from '../utils/vec2'
import type { Particle } from './particle'

// Restrição de distância rígida entre duas partículas (um "osso").
export class Bone {
  readonly a: Particle
  readonly b: Particle
  readonly restLength: number

  constructor(a: Particle, b: Particle, restLength: number) {
    this.a = a
    this.b = b
    this.restLength = restLength
  }

  solve(): void {
    const dx = this.b.pos.x - this.a.pos.x
    const dy = this.b.pos.y - this.a.pos.y
    const dist = length({ x: dx, y: dy })
    if (dist === 0) return

    const wA = this.a.invMass
    const wB = this.b.invMass
    const wSum = wA + wB
    if (wSum === 0) return

    // Cada ponta se move na proporção do inverso da massa (pinado não se move).
    const factor = (dist - this.restLength) / dist / wSum
    const cx = dx * factor
    const cy = dy * factor
    this.a.pos.x += cx * wA
    this.a.pos.y += cy * wA
    this.b.pos.x -= cx * wB
    this.b.pos.y -= cy * wB
  }
}
