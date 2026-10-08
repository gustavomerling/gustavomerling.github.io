import { ELEMENTS, EMPTY, elementIndex } from '../elements/registry.ts'
import type { Simulation } from './simulation.ts'

/** A `Reaction` resolved to registry indices (-1 = leave unchanged). */
export interface CompiledReaction {
  with: number
  chance: number
  self: number
  other: number
  selfChance: number
}

/** Per element index: its reactions (empty array when it has none). */
export function compileReactions(): CompiledReaction[][] {
  return ELEMENTS.map((el) =>
    (el.reactions ?? []).map((r) => ({
      with: elementIndex(r.with),
      chance: r.chance,
      self: r.self === undefined ? -1 : elementIndex(r.self),
      other: r.other === undefined ? -1 : elementIndex(r.other),
      selfChance: r.selfChance ?? 1,
    })),
  )
}

const DX = [0, -1, 1, 0]
const DY = [-1, 0, 0, 1]

/**
 * Tries the cell's reactions against one random neighbour.
 * Returns true if the cell itself changed into something else.
 */
export function react(sim: Simulation, x: number, y: number, i: number, t: number): boolean {
  const reactions = sim.reactions[t]
  const { grid } = sim
  const side = Math.floor(sim.random() * 4)
  const nx = x + DX[side]
  const ny = y + DY[side]
  if (!grid.inBounds(nx, ny)) return false
  const j = ny * grid.width + nx
  const neighbour = grid.type[j]
  if (neighbour === EMPTY) return false

  for (const r of reactions) {
    if (r.with !== neighbour || sim.random() >= r.chance) continue
    if (r.other >= 0) sim.transform(j, r.other)
    if (r.self >= 0 && sim.random() < r.selfChance) {
      sim.transform(i, r.self)
      return true
    }
    return false
  }
  return false
}
