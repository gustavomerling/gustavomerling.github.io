import type { World } from '../physics/world'
import { Mlp } from './mlp'
import { readSensors, sensorCount } from './sensors'

export const HIDDEN_NEURONS = 16

// Cria o cérebro de uma criatura: uma saída por músculo do mundo, então os exemplares
// da frente e de trás de cada membro recebem sinais independentes.
export function createBrainFor(world: World, rng: import('../utils/rng').Rng): Mlp {
  return Mlp.random(sensorCount(world), HIDDEN_NEURONS, world.muscles.length, rng)
}

// Controlador que lê os sensores, roda o cérebro e aplica a saída `i` como comando de `world.muscles[i]`.
export function brainController(brain: Mlp): (world: World) => void {
  const input = new Float32Array(brain.inputs)
  const out = new Float32Array(brain.outputs)
  return (world) => {
    readSensors(world, input)
    brain.forward(input, out)
    world.muscles.forEach((m, i) => {
      m.command = out[i]
    })
  }
}
