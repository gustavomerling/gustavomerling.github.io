import { describe, expect, it } from 'vitest'
import { surfaceY } from './ground'
import { Particle } from './particle'
import { World } from './world'

describe('física', () => {
  it('pêndulo mantém o comprimento do osso', () => {
    const world = new World({ gravityY: 900, damping: 0.999 })
    const anchor = world.addParticle(new Particle({ x: 0, y: 0 }, 0))
    const bob = world.addParticle(new Particle({ x: 100, y: 0 }))
    const bone = world.connect(anchor, bob)
    for (let i = 0; i < 60 * 20; i++) world.step(1 / 60)
    const length = Math.hypot(bob.pos.x - anchor.pos.x, bob.pos.y - anchor.pos.y)
    expect(Math.abs(length - bone.restLength)).toBeLessThan(0.5)
  })

  it('quadrado com diagonais repousa no chão sem desmontar', () => {
    const groundY = 500
    const size = 40
    const world = new World({ gravityY: 900, ground: { y: groundY, friction: 0.5 } })
    const [p0, p1, p2, p3] = [
      { x: 0, y: 300 },
      { x: size, y: 300 },
      { x: size, y: 300 + size },
      { x: 0, y: 300 + size },
    ].map((c) => world.addParticle(new Particle(c)))
    world.connect(p0, p1)
    world.connect(p1, p2)
    world.connect(p2, p3)
    world.connect(p3, p0)
    world.connect(p0, p2)
    world.connect(p1, p3)
    for (let i = 0; i < 60 * 10; i++) world.step(1 / 60)
    expect(Math.max(p0.pos.y, p1.pos.y, p2.pos.y, p3.pos.y)).toBeCloseTo(groundY, 0)
    expect(Math.hypot(p2.pos.x - p0.pos.x, p2.pos.y - p0.pos.y)).toBeCloseTo(Math.SQRT2 * size, 0)
  })

  it('músculo contraído encurta a distância entre as pontas', () => {
    const world = new World({ gravityY: 0 })
    const a = world.addParticle(new Particle({ x: 0, y: 0 }))
    const b = world.addParticle(new Particle({ x: 100, y: 0 }))
    const muscle = world.addMuscle(a, b, 0.5, 0.3)
    muscle.command = 1
    for (let i = 0; i < 120; i++) world.step(1 / 60)
    expect(Math.hypot(b.pos.x - a.pos.x, b.pos.y - a.pos.y)).toBeCloseTo(70, 0)
  })

  it('degrau bloqueia quem desliza contra a lateral, em vez de subir sozinho', () => {
    const ground = { y: 300, friction: 0, terrain: 'stairs' as const, originX: 0 }
    const world = new World({ gravityY: 900, ground })
    // Ponto no chão, logo antes do primeiro degrau (x = 120), indo para a direita.
    const p = world.addParticle(new Particle({ x: 110, y: 300 }))
    p.prev = { x: 107, y: 300 }
    for (let i = 0; i < 30; i++) world.step(1 / 60)
    expect(p.pos.x).toBeLessThanOrEqual(121)
    expect(p.pos.y).toBeCloseTo(300, 0)
    expect(surfaceY(ground, 125)).toBe(291)
  })

  it('atrito de Coulomb: bloco lançado desliza, desacelera e para', () => {
    const world = new World({ gravityY: 900, ground: { y: 300, friction: 1 } })
    const a = world.addParticle(new Particle({ x: 0, y: 300 }))
    const b = world.addParticle(new Particle({ x: 20, y: 300 }))
    world.connect(a, b)
    a.prev.x -= 4
    b.prev.x -= 4
    const xs: number[] = []
    for (let i = 0; i < 120; i++) {
      world.step(1 / 60)
      xs.push(a.pos.x)
    }
    expect(xs[5]).toBeGreaterThan(5)
    expect(xs[119] - xs[100]).toBe(0)
  })
})
