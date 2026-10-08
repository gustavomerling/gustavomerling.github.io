import { WOOD_TREE } from '../../../plants/wood.ts'
import type { Body } from '../body.ts'
import type { Point } from '../mind.ts'
import { findNearest, reachableFromGround } from '../senses.ts'
import { approach, type Task } from './types.ts'

/** How far it notices wood the player painted for it. */
const SEARCH = 50
/** Actions to pick up one cell of wood. */
const TAKE_ACTIONS = 2
/** Planks one painted wood cell is worth. */
const PLANKS_PER_CELL = 1

function painted(body: Body, x: number, y: number) {
  return body.get(x, y) === 'wood' && (body.data(x, y) & WOOD_TREE) === 0
}

/** Wood that isn't part of a tree: painted by the player, free for the taking. */
function looseWood(body: Body, x: number, y: number) {
  return painted(body, x, y) && reachableFromGround(body, { x, y })
}

/** Taking a piece from the bottom of a pile: the wood above slides down one cell. */
function settle(body: Body, x: number, y: number) {
  let top = y
  while (painted(body, x, top - 1)) top--
  if (top === y) return
  body.set(x, y, 'wood')
  body.set(x, top, 'air')
}

function nextPiece(body: Body, from: Point): Point | null {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if ((dx || dy) && looseWood(body, from.x + dx, from.y + dy)) return { x: from.x + dx, y: from.y + dy }
    }
  }
  return null
}

/** The player's gift: walk to painted wood and take it, piece by piece, as planks. */
export const gather: Task = {
  start(body) {
    const wood = findNearest(body, SEARCH, (x, y) => looseWood(body, x, y))
    if (!wood) return false
    body.mind.target = wood
    body.mind.patience = 200
    body.mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    if (!mind.target || !looseWood(body, mind.target.x, mind.target.y)) return 'failed'
    const status = approach(body)
    if (status !== 'arrived') return status
    if (++mind.timer < TAKE_ACTIONS) return 'running'
    body.set(mind.target.x, mind.target.y, 'air')
    settle(body, mind.target.x, mind.target.y)
    mind.inv.plank += PLANKS_PER_CELL
    mind.timer = 0
    // The pile settled into the same spot, or move on to the next piece.
    if (!looseWood(body, mind.target.x, mind.target.y)) mind.target = nextPiece(body, mind.target)
    return mind.target ? 'running' : 'done'
  },
}
