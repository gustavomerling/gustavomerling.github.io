import { arrow, hazard, lamp, pad, slab } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 5 — Trampolins. Novidade: placas verdes que jogam o jogador para o alto
 * (cerca de 3,5 blocos). No ar dá para mirar o pouso com WASD.
 *
 *  1. trampolim ao lado do início, até uma plataforma ao sul
 *  2. trampolim flutuante até uma plataforma alta a oeste
 *  3. um trampolim mais forte que pula por cima de uma parede de perigo,
 *     até o topo (y = 10), onde o Nível 6 começa
 */

const SLAB = 0x7fc4b8
const LANDING = 0xa8e6da

export const level5: LevelDef = {
  id: 'level-5',
  name: 'Nível 5',
  tagline: 'Trampolins',
  size: 20,
  height: 10,
  floor: false,
  // No patamar final do Nível 4.
  spawn: [2, 0, -7.5],
  blocks: [
    pad(6.5, -7.5, 0.5),
    slab(7.5, -4, 3.5, 2.5, 2.5, { color: SLAB }),
    pad(7.5, 0.5, 4, 14),
    slab(4, 3, 7, 3, 3, { color: SLAB }),
    // Mais forte: passa por cima da parede.
    pad(-0.5, 4.5, 7, 14),
    hazard(-2.5, 4.5, 7, [0.5, 1.5, 3]),
    slab(-5, 4.5, 10, 3, 3, { color: LANDING, thick: 1 }),

    arrow(2, -7.5, 0, 6.5, -7.5),
    arrow(7.5, -4, 3.5, 7.5, 0.5),
    arrow(4, 3, 7, -0.5, 4.5),
    lamp(8.5, -5, 3.5),
    lamp(5.3, 4.3, 7),
    lamp(-6.2, 5.7, 10),
  ],
}
