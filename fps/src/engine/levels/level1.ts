import { arrow, lamp, pillar, shade } from './kit.ts'
import type { LevelDef } from './types.ts'

/**
 * Nível 1 — Primeiros passos. Ensina a andar e a pular. Um anel de colunas pelo
 * perímetro da área, cada uma mais alta que a anterior:
 *
 *  1. sul (+z), indo para leste: dois degraus baixos que dá para subir andando,
 *     depois saltos de 1 bloco
 *  2. leste, indo para o norte: um vão maior no plano
 *  3. norte, indo para oeste: escada de colunas até o topo (y = 10), no canto
 *     noroeste, onde o Nível 2 começa
 *
 * Cair aqui é tranquilo: o chão pega o jogador.
 */

const BOTTOM = 0x56769a
const TOP = 0x9fd8ea

const column = (x: number, z: number, top: number, width = 2, depth = 2) =>
  pillar(x, z, top, width, depth, shade(BOTTOM, TOP, top / 10))

export const level1: LevelDef = {
  id: 'level-1',
  name: 'Nível 1',
  tagline: 'Primeiros passos',
  size: 20,
  height: 10,
  spawn: [-7, 0, 7],
  fallLimit: -12,
  blocks: [
    // Sul, para leste. Os dois primeiros dá para subir andando.
    column(-4, 7, 0.5),
    column(-2, 7, 1),
    column(0.5, 7, 2),
    column(3, 7, 3),
    column(6.5, 7, 3, 3, 3),

    // Leste, para o norte.
    column(6.5, 3.5, 4),
    column(6.5, 0.5, 5),
    column(6.5, -3, 5),
    column(6.5, -7, 6, 3, 3),

    // Norte, para oeste, até o topo.
    column(3, -7, 7),
    column(0, -7, 8),
    column(-3, -7, 9),
    column(-6.5, -7, 10, 3, 3),

    // Sinalização.
    arrow(-6.5, 7, 0, -4, 7),
    arrow(6.5, 7, 3, 6.5, 3.5),
    arrow(6.5, -7, 6, 3, -7),
    lamp(-8.5, 8.5, 0),
    lamp(7.7, 8.2, 3),
    lamp(7.7, -8.2, 6),
    lamp(-7.7, -8.2, 10),
  ],
}
