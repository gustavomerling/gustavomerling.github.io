import { arrow, lamp, slab } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 2 — Corra e salte. O primeiro nível sem chão: cair leva de volta ao
 * Nível 1. Novidade: vãos que só se passam correndo (Shift).
 *
 * Começa no topo do Nível 1 (canto noroeste) e desce pela faixa oeste numa viga
 * estreita, cruza o sul com saltos cada vez mais longos (o último, de 4 blocos,
 * pede corrida), sobe pelo leste e volta em zigue-zague até o canto norte, onde
 * o Nível 3 começa.
 */

const SLAB = 0x7a9cc6
const BEAM = 0x9fb6d8
const LANDING = 0x8fd4e8
const RUN = 0xffd27a

export const level2: LevelDef = {
  id: 'level-2',
  name: 'Nível 2',
  tagline: 'Corra e salte',
  size: 20,
  height: 10,
  floor: false,
  // No patamar final do Nível 1.
  spawn: [-6.5, 0, -7],
  blocks: [
    // Oeste, para o sul: degraus soltos e uma viga estreita.
    slab(-6.5, -3.5, 1, 2, 2, { color: SLAB }),
    slab(-6.5, 0, 1, 2, 2, { color: SLAB }),
    slab(-6.5, 4, 1.5, 0.8, 4, { color: BEAM }),
    slab(-6.5, 8, 2, 3, 3, { color: LANDING }),

    // Sul, para leste: saltos de 2, 2,5 e 4 blocos (este último, correndo).
    slab(-2, 8, 2, 2, 2, { color: SLAB }),
    slab(2.5, 8, 2, 2, 2, { color: RUN }),
    slab(8.5, 8, 2, 2, 2.5, { color: LANDING }),

    // Leste, para o norte.
    slab(8.5, 4.5, 3, 2, 2, { color: SLAB }),
    slab(8.5, 1, 4, 2, 2, { color: SLAB }),
    slab(8.5, -2.5, 5, 2, 2, { color: SLAB }),

    // Zigue-zague de volta para oeste, até o topo.
    slab(5, -5, 6, 2, 2, { color: SLAB }),
    slab(1.5, -3, 7, 2, 2, { color: SLAB }),
    slab(-2, -5, 8, 2, 2, { color: SLAB }),
    slab(-2, -8.5, 9, 2, 1.5, { color: SLAB }),
    slab(2, -8.5, 10, 3, 3, { color: LANDING, thick: 1 }),

    // Sinalização: a seta amarela avisa do salto longo.
    arrow(-6.5, -7, 0, -6.5, -3.5),
    arrow(-6.5, 8, 2, -2, 8),
    arrow(2.5, 8, 2, 8.5, 8, RUN),
    lamp(-7.7, 9.2, 2),
    lamp(9.2, 9, 2),
    lamp(3.2, -9.5, 10),
  ],
}
