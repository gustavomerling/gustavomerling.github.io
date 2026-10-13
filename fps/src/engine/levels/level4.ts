import { arrow, hazard, lamp, slab } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 4 — Zona de perigo. Novidade: blocos vermelhos. Tocar em um deles leva
 * de volta ao início do nível.
 *
 *  1. rampa torta (sobe 4) com três blocos de perigo varrendo o caminho
 *  2. um corredor com duas barreiras fixas, em slalom
 *  3. uma plataforma com um bloco de perigo girando em volta do centro
 *     (o centro é seguro)
 *  4. um último salto com um bloco que sobe e desce no meio do vão,
 *     até o topo (y = 10), onde o Nível 5 começa
 */

const RAMP = 0xc08bd6
const SLAB = 0xa58cc0
const LANDING = 0xd6b8f0

// Height of the ramp surface at a point of its path (it rises 4 over 17 units).
const rampAt = (along: number) => (along / 17) * 4

export const level4: LevelDef = {
  id: 'level-4',
  name: 'Nível 4',
  tagline: 'Zona de perigo',
  size: 20,
  height: 10,
  floor: false,
  // No patamar final do Nível 3.
  spawn: [-6.5, 0, -3],
  ramps: [
    {
      path: [
        [-4, -3],
        [6, -3],
        [6, 4],
      ],
      width: 2,
      rise: 4,
      color: RAMP,
    },
  ],
  blocks: [
    // Varredores na rampa: dois cruzam o caminho, um vai e volta ao longo dele.
    hazard(-1, -3, rampAt(3), [0.6, 1.2, 0.6], { axis: 'z', amplitude: 2, period: 2.4 }),
    hazard(3, -3, rampAt(7), [0.6, 1.2, 0.6], { axis: 'z', amplitude: 2, period: 2.4, phase: Math.PI }),
    hazard(6, 1, rampAt(14), [0.6, 1.2, 0.6], { axis: 'x', amplitude: 2, period: 2.2 }),

    // Fim da rampa e corredor em slalom.
    slab(6, 6.5, 4, 3, 3, { color: LANDING }),
    slab(0, 6.5, 4.5, 6, 3, { color: SLAB }),
    hazard(1.5, 7.1, 4.5, [0.6, 1.2, 1.8]),
    hazard(-1, 5.9, 4.5, [0.6, 1.2, 1.8]),

    // Subida pelo oeste até a plataforma giratória.
    slab(-6.5, 6.5, 5.5, 2.5, 2.5, { color: SLAB }),
    slab(-6.5, 2.75, 6, 2, 1.5, { color: SLAB }),
    slab(-6.5, -1.5, 7, 4, 4, { color: LANDING }),
    hazard(-6.5, -1.5, 7, [0.7, 1.2, 0.7], { axis: 'orbit', amplitude: 1.3, period: 3.6 }),

    // Salto final, com um bloco que sobe e desce no meio do vão.
    slab(-6.5, -6, 8, 2, 2, { color: SLAB }),
    slab(-2.5, -7.5, 9, 2, 2, { color: SLAB }),
    hazard(-4.5, -7, 8.6, [0.6, 0.6, 1.6], { axis: 'y', amplitude: 0.8, period: 2 }),
    slab(2, -7.5, 10, 3, 3, { color: LANDING, thick: 1 }),

    arrow(-6.5, -3, 0, -4, -3),
    arrow(6, 6.5, 4, 0, 6.5),
    lamp(7.3, 7.8, 4),
    lamp(-7.6, 7.6, 5.5),
    lamp(3.2, -8.7, 10),
  ],
}
