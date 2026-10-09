import { Sailboat } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * A human's rowing boat, 5 cells long (150% of a human's height): a flat hull on the water's
 * surface with a raised bow and stern. The human standing on the middle rows it along
 * (see human/body.ts). Every boat cell covers the water (or air) it sits on. When the human
 * steps ashore the boat stays moored there, and any human can take it again. As the water
 * level drops (soaking into the lake bed, evaporating) the boat goes down with it, until it
 * rests on the water again or runs aground.
 *
 * Boat `data`: bits 0-2 = column offset from the middle + 2 (0..4); bit 3 = raised end.
 */
export const BOAT_LENGTH = 5
export const BOAT_END = 0x08

/** Data for a boat cell `offset` columns from the middle (-2..2). */
export function boatPart(offset: number, end = false): number {
  return (offset + 2) | (end ? BOAT_END : 0)
}

/** Under the hull, these let the boat drop (nothing holding it up). */
const DROPS_INTO: ReadonlySet<string | null> = new Set(['air', 'steam', 'cloud', 'litter', 'firefly', 'bird', 'bee'])
/** Chance per tick a boat with nothing under it drops a cell (it settles, not plummets). */
const DROP_CHANCE = 0.25

/** The middle of the hull (where the rower stands on). */
export function isBoatMiddle(data: number): boolean {
  return (data & 0x0f) === BOAT_LENGTH >> 1
}

export const boat: ElementDefinition = {
  id: 'boat',
  name: 'Boat',
  description: 'A wooden boat a human made. It stays moored where they landed, ready for the trip back.',
  category: 'materials',
  matter: 'static',
  density: 8,
  color: { base: '#8a5a32', variation: 0.06 },
  icon: Sailboat,
  hidden: true,
  thermal: { conductivity: 0.05, burn: { at: 260, temp: 650, rate: 0.006, into: 'ash' } },
  update(ctx) {
    // The middle of the hull looks after the whole boat.
    if (!isBoatMiddle(ctx.data(0, 0)) || ctx.data(0, 0) & BOAT_END || ctx.random() >= DROP_CHANCE) return
    const reach = BOAT_LENGTH >> 1
    // Water (or the ground) under any part of the hull holds it up.
    for (let k = -reach; k <= reach; k++) {
      if (ctx.get(k, 0) !== 'boat' || !DROPS_INTO.has(ctx.get(k, 1))) return
    }
    // Down a cell, hull first, taking the water it floats on down with it (none is left on
    // deck); then the raised ends.
    for (let k = -reach; k <= reach; k++) {
      ctx.moveCell(k, 0, k, 1)
      if (ctx.get(k, 0) === 'water') {
        ctx.set(k, 0, 'air')
        ctx.setBehind(k, 1, 'water')
      }
    }
    for (const k of [-reach, reach]) if (ctx.get(k, -1) === 'boat') ctx.moveCell(k, -1, k, 0)
  },
}
