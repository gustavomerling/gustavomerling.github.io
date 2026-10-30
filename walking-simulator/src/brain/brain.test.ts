import { describe, expect, it } from 'vitest'
import { defaultModel } from '../editor/defaultModel'
import { groundYFor, toWorld } from '../editor/model'
import { FIXED_DT } from '../physics/world'
import { createRng } from '../utils/rng'
import { brainController, createBrainFor } from './controller'
import { Mlp } from './mlp'
import { readSensors, sensorCount } from './sensors'

describe('cérebro', () => {
  it('MLP tem o número de pesos do layout e saídas em [-1, 1]', () => {
    const mlp = Mlp.random(5, 4, 3, createRng(1))
    expect(mlp.weights.length).toBe(5 * 4 + 4 + 4 * 3 + 3)
    const out = mlp.forward([10, -10, 3, 0, 1])
    for (const v of out) expect(Math.abs(v)).toBeLessThanOrEqual(1)
  })

  it('mesma semente gera o mesmo cérebro', () => {
    const a = Mlp.random(6, 4, 2, createRng(42)).weights
    const b = Mlp.random(6, 4, 2, createRng(42)).weights
    expect(Array.from(a)).toEqual(Array.from(b))
  })

  it('sensores ficam aproximadamente em [-1, 1]', () => {
    const { world } = toWorld(defaultModel, groundYFor(defaultModel))
    const input = new Float32Array(sensorCount(world))
    readSensors(world, input)
    for (const v of input) expect(Math.abs(v)).toBeLessThanOrEqual(1.0001)
  })

  it('exemplares da frente e de trás recebem sinais independentes', () => {
    const { world } = toWorld(defaultModel, groundYFor(defaultModel))
    // Cada músculo de membro vira dois no mundo (trás, frente), e o cérebro tem uma saída para cada.
    expect(world.muscles.length).toBe(defaultModel.muscles.length * 2)
    world.controller = brainController(createBrainFor(world, createRng(5)))
    let gap = 0
    for (let s = 0; s < 300; s++) {
      world.step(FIXED_DT)
      for (let i = 0; i < world.muscles.length; i += 2) gap += Math.abs(world.muscles[i].activation - world.muscles[i + 1].activation)
    }
    expect(gap).toBeGreaterThan(1)
  })
})
