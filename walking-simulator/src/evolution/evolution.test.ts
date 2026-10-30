import { describe, expect, it } from 'vitest'
import { defaultModel } from '../editor/defaultModel'
import { groundYFor, toWorld } from '../editor/model'
import { torsoTilt } from './episode'
import { Evolution } from './population'

const groundY = groundYFor(defaultModel)

// Simulam episódios inteiros: mais lentos que os outros testes.
describe('evolução', { timeout: 20000 }, () => {
  it('é determinística para a mesma semente', () => {
    const run = () => {
      const evo = new Evolution(defaultModel, groundY, { seed: 9, populationSize: 8 })
      evo.step()
      return evo.step().best
    }
    expect(run()).toBe(run())
  })

  it('o melhor nunca piora entre gerações (elitismo)', () => {
    const evo = new Evolution(defaultModel, groundY, { seed: 2, populationSize: 12 })
    const bests = Array.from({ length: 4 }, () => evo.step().best)
    for (let i = 1; i < bests.length; i++) expect(bests[i]).toBeGreaterThanOrEqual(bests[i - 1])
  })

  it('continuar de um cérebro salvo não piora o melhor e segue a contagem de gerações', () => {
    const first = new Evolution(defaultModel, groundY, { seed: 4, populationSize: 10 })
    first.step()
    const prev = first.step()
    const resumed = new Evolution(defaultModel, groundY, {
      seed: 8,
      populationSize: 10,
      seedWeights: first.bestWeights,
      startGeneration: prev.generation,
    })
    const next = resumed.step()
    expect(next.generation).toBe(3)
    expect(next.best).toBeGreaterThanOrEqual(prev.best)
  })

  it('inclinação do torso mede a rotação em relação à pose inicial', () => {
    const { world } = toWorld(defaultModel, groundY)
    const torso = world.particles.slice(0, defaultModel.joints.length)
    const initial = torso.map((p) => ({ ...p.pos }))
    expect(torsoTilt(world, initial)).toBeCloseTo(0)
    // Capota o torso: rotação de 180° em torno da origem.
    for (const p of torso) p.pos = { x: -p.pos.x, y: -p.pos.y }
    expect(Math.abs(torsoTilt(world, initial))).toBeCloseTo(Math.PI)
  })
})
