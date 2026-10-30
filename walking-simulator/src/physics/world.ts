import { Bone } from './bone'
import { applyFriction, collideWithGround, type Ground } from './ground'
import { Muscle } from './muscle'
import { Particle } from './particle'

export const FIXED_DT = 1 / 60
const MAX_STEPS_PER_FRAME = 5

export type WorldOptions = {
  gravityY?: number
  damping?: number
  iterations?: number
  ground?: Ground
}

export class World {
  particles: Particle[] = []
  bones: Bone[] = []
  muscles: Muscle[] = []
  // Chamado antes de cada passo para ajustar a ativação dos músculos (cérebro ou demonstração).
  controller: ((world: World) => void) | null = null
  gravityY: number
  damping: number
  iterations: number
  ground: Ground | null
  steps = 0

  private accumulator = 0

  constructor(options: WorldOptions = {}) {
    this.gravityY = options.gravityY ?? 900
    this.damping = options.damping ?? 0.99
    this.iterations = options.iterations ?? 16
    this.ground = options.ground ?? null
  }

  addParticle(p: Particle): Particle {
    this.particles.push(p)
    return p
  }

  // Cria um osso com o comprimento atual entre os dois pontos.
  connect(a: Particle, b: Particle): Bone {
    const bone = new Bone(a, b, Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y))
    this.bones.push(bone)
    return bone
  }

  // Cria um músculo com o comprimento atual entre os dois pontos como base.
  addMuscle(a: Particle, b: Particle, strength: number, contraction: number): Muscle {
    const muscle = new Muscle(a, b, Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y), strength, contraction)
    this.muscles.push(muscle)
    return muscle
  }

  // Fração de passo acumulada e ainda não simulada (0–1): usada para interpolar o desenho entre passos.
  get alpha(): number {
    return Math.min(1, this.accumulator / FIXED_DT)
  }

  // Avança a simulação em passos fixos, independente do FPS da tela.
  update(frameSeconds: number): void {
    this.accumulator += Math.min(frameSeconds, MAX_STEPS_PER_FRAME * FIXED_DT)
    let n = 0
    while (this.accumulator >= FIXED_DT && n < MAX_STEPS_PER_FRAME) {
      this.step(FIXED_DT)
      this.accumulator -= FIXED_DT
      n++
    }
  }

  step(dt: number): void {
    this.controller?.(this)
    for (const muscle of this.muscles) muscle.respond()
    for (const p of this.particles) {
      p.contact = 0
      p.integrate(this.gravityY, dt, this.damping)
    }
    for (let i = 0; i < this.iterations; i++) {
      // Músculos primeiro: os ossos são rígidos e ficam com a última palavra em cada iteração.
      for (const muscle of this.muscles) muscle.solve()
      if (this.ground) {
        for (const p of this.particles) collideWithGround(p, this.ground)
      }
      for (const bone of this.bones) bone.solve()
    }
    if (this.ground) {
      for (const p of this.particles) applyFriction(p, this.ground)
      // O atrito mexe nos pés depois das restrições; mais algumas passadas nos ossos devolvem o comprimento.
      for (let i = 0; i < 4; i++) for (const bone of this.bones) bone.solve()
    }
    this.steps++
  }
}
