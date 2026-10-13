import { arrow, crumble, lamp, slab } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 6 — Chão que desmorona. Novidade: lajes rachadas que tremem quando
 * pisadas e caem logo depois (voltam alguns segundos mais tarde). Não dá para
 * parar em cima delas.
 *
 *  1. três lajes subindo pelo oeste até um descanso
 *  2. uma ponte inteira de lajes frágeis: atravessar sem parar
 *  3. um zigue-zague de cinco lajes subindo pelo leste, até o topo (y = 10),
 *     onde o Nível 7 começa
 */

const REST = 0xb0a090
const LANDING = 0xd8c8a8

export const level6: LevelDef = {
  id: 'level-6',
  name: 'Nível 6',
  tagline: 'Chão que desmorona',
  size: 20,
  height: 10,
  floor: false,
  // No patamar final do Nível 5.
  spawn: [-5, 0, 4.5],
  blocks: [
    crumble(-6.5, 1, 1),
    crumble(-6.5, -1.5, 2),
    crumble(-6.5, -4.5, 3),
    slab(-6.5, -8, 3.5, 3, 2.5, { color: REST }),

    // A ponte.
    crumble(-3.5, -8, 3.5, 2, 2),
    crumble(-1.5, -8, 3.5, 2, 2),
    crumble(0.5, -8, 3.5, 2, 2),
    crumble(2.5, -8, 3.5, 2, 2),
    slab(6.5, -8, 4.5, 3, 3, { color: REST }),

    // Zigue-zague.
    crumble(7.5, -4.5, 5.5),
    crumble(4.5, -2.5, 6.5),
    crumble(7.5, -0.5, 7.5),
    crumble(4.5, 1.5, 8.5),
    crumble(7.5, 3.5, 9.5),
    slab(6.5, 7, 10, 3, 3, { color: LANDING, thick: 1 }),

    arrow(-5.5, 4.5, 0, -6.5, 1),
    arrow(-6.5, -8, 3.5, -3.5, -8),
    arrow(6.5, -8, 4.5, 7.5, -4.5),
    lamp(-7.7, -9, 3.5),
    lamp(7.7, -9.2, 4.5),
    lamp(7.7, 8.2, 10),
  ],
}
