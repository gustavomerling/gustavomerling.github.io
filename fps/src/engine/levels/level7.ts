import { arrow, blink, lamp, pad, slab } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 7 — Ritmo do cume. Novidade: plataformas de energia que ligam e
 * desligam. As azuis e as rosas se revezam, e piscam pouco antes de sumir.
 * O final junta o que veio antes: um trampolim no meio do caminho.
 *
 *  1. três plataformas alternadas para oeste, até um descanso
 *  2. trampolim até uma plataforma alta
 *  3. mais duas plataformas alternadas até o cume (y = 10), com o cristal da chegada
 */

const A = 0x52d1ff
const B = 0xff5ad8
const REST = 0x8aa0d8
const SUMMIT = 0xe8f0ff
const GOLD = 0x6dffc8

export const level7: LevelDef = {
  id: 'level-7',
  name: 'Nível 7',
  tagline: 'Ritmo do cume',
  size: 20,
  height: 10,
  floor: false,
  // No patamar final do Nível 6.
  spawn: [6.5, 0, 7],
  goal: [5, 10, -7],
  blocks: [
    blink(2.5, 7, 1, 0, A),
    blink(-0.5, 7, 2, 0.5, B),
    blink(-3.5, 7, 3, 0, A),
    slab(-7, 7, 3.5, 2.5, 2.5, { color: REST }),

    pad(-7, 3.5, 4),
    slab(-7, -1, 7, 2.5, 2.5, { color: REST }),

    blink(-3.5, -5, 8, 0.5, B),
    blink(0, -7, 9, 0, A),
    slab(5, -7, 10, 4, 4, { color: SUMMIT, thick: 1 }),

    arrow(6.5, 7, 0, 2.5, 7),
    arrow(-7, 7, 3.5, -7, 3.5),
    arrow(-7, -1, 7, -3.5, -5),
    lamp(7.7, 8.2, 0),
    lamp(-8, 8, 3.5),
    lamp(-8, -2, 7),
    lamp(3.3, -8.7, 10, GOLD),
    lamp(6.7, -8.7, 10, GOLD),
    lamp(3.3, -5.3, 10, GOLD),
    lamp(6.7, -5.3, 10, GOLD),
  ],
}
