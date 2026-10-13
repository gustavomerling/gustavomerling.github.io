import type { Motion } from '../blocks/types.ts'
import { arrow, lamp, slab } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 3 — Plataformas móveis. Novidade: plataformas de metal que andam e
 * carregam o jogador. Uma de cada tipo, nesta ordem:
 *
 *  1. vai e volta de lado (x)
 *  2. elevador (sobe e desce)
 *  3. gira em círculo ao redor de um ponto
 *  4. vai e volta para frente (z)
 *  5. elevador final até o topo (y = 10), no oeste, onde o Nível 4 começa
 */

const STATIC = 0x9bb8a0
const MOVING = 0xe8c07a

const moving = (x: number, z: number, top: number, size: number, motion: Motion) =>
  slab(x, z, top, size, size, { color: MOVING, motion })

export const level3: LevelDef = {
  id: 'level-3',
  name: 'Nível 3',
  tagline: 'Plataformas móveis',
  size: 20,
  height: 10,
  floor: false,
  // No patamar final do Nível 2.
  spawn: [2, 0, -8.5],
  blocks: [
    moving(7, -8.5, 1, 2.5, { axis: 'x', amplitude: 1.75, period: 4 }),
    // Elevador: o topo vai de 1,5 a 5.
    moving(8, -4, 3.25, 2.5, { axis: 'y', amplitude: 1.75, period: 4 }),
    slab(8, 0.5, 5.5, 2.5, 2, { color: STATIC }),
    // Gira ao redor de (3, 3).
    moving(3, 3, 6.5, 2, { axis: 'orbit', amplitude: 2.5, period: 7 }),
    moving(-2.5, 3, 7.5, 2, { axis: 'z', amplitude: 2, period: 4.5 }),
    slab(-6.5, 6.5, 8, 3, 3, { color: STATIC }),
    // Elevador final: o topo vai de 8 a 10.
    moving(-6.5, 1.5, 9, 2.5, { axis: 'y', amplitude: 1, period: 3.5 }),
    slab(-6.5, -3, 10, 3, 3, { color: STATIC, thick: 1 }),

    arrow(2, -8.5, 0, 7, -8.5),
    arrow(8, 0.5, 5.5, 3, 3),
    arrow(-6.5, 6.5, 8, -6.5, 1.5),
    lamp(9.2, 1.3, 5.5),
    lamp(-7.8, 7.8, 8),
    lamp(-7.8, -4.2, 10),
  ],
}
