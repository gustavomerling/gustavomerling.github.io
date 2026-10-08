import { Bomb } from 'lucide-react'
import type { CellContext } from '../../engine/context.ts'
import type { ElementDefinition } from '../types.ts'

/** Temperature that sets it off (fire, lava, or a nearby blast). */
const IGNITION = 150
const BLAST_RADIUS = 5
/** Share of blasted cells that become flames (the rest is cleared). */
const FLAME_SHARE = 0.35
/** Blasts don't break these. */
const BLAST_PROOF: ReadonlySet<string | null> = new Set([null, 'air', 'stone', 'metal', 'glass', 'water'])

export const gunpowder: ElementDefinition = {
  id: 'gunpowder',
  name: 'Gunpowder',
  description: 'Explodes when heated, blasting everything nearby. Explosions set off more gunpowder.',
  category: 'chemistry',
  matter: 'powder',
  density: 14,
  color: { base: '#3d3d3d', variation: 0.25 },
  icon: Bomb,
  movement: { slide: 0.6 },
  thermal: { conductivity: 0.1 },
  update(ctx) {
    if (ctx.temp(0, 0) >= IGNITION || touchesFlame(ctx)) explode(ctx)
  },
}

const FLAMES: ReadonlySet<string | null> = new Set(['fire', 'lava'])

function touchesFlame(ctx: CellContext): boolean {
  return FLAMES.has(ctx.get(0, -1)) || FLAMES.has(ctx.get(-1, 0)) || FLAMES.has(ctx.get(1, 0)) || FLAMES.has(ctx.get(0, 1))
}

function explode(ctx: CellContext) {
  const r2 = BLAST_RADIUS * BLAST_RADIUS
  for (let dy = -BLAST_RADIUS; dy <= BLAST_RADIUS; dy++) {
    for (let dx = -BLAST_RADIUS; dx <= BLAST_RADIUS; dx++) {
      if (dx * dx + dy * dy > r2 || (dx === 0 && dy === 0)) continue
      const id = ctx.get(dx, dy)
      if (BLAST_PROOF.has(id)) continue
      // Chain reaction: other gunpowder gets heated past ignition and goes off next tick.
      if (id === 'gunpowder') {
        ctx.setTemp(dx, dy, IGNITION * 2)
        continue
      }
      ctx.set(dx, dy, ctx.random() < FLAME_SHARE ? 'fire' : 'air')
    }
  }
  ctx.set(0, 0, 'fire')
}
