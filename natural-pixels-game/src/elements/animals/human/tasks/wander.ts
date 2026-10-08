import type { Task } from './types.ts'

/** Wandering keeps within this distance of home (once it has one). */
const HOME_RANGE = 40

/** Stroll a few cells left or right, turning around at walls. */
export const wander: Task = {
  start(body) {
    const { mind } = body
    if (body.random() < 0.3) mind.dir = mind.dir === 1 ? -1 : 1
    // Settled humans don't stray far from home.
    if (mind.home && Math.abs(mind.home.x - body.x) > HOME_RANGE) mind.dir = mind.home.x > body.x ? 1 : -1
    mind.target = { x: body.x + mind.dir * (5 + Math.floor(body.random() * 12)), y: body.y }
    mind.patience = 40
    return true
  },
  run(body) {
    const { mind } = body
    if (!mind.target || Math.abs(mind.target.x - body.x) <= 1) return 'done'
    if (!body.step(Math.sign(mind.target.x - body.x)) && !body.tunnel(mind.target)) {
      mind.dir = mind.dir === 1 ? -1 : 1
      return 'failed'
    }
    return --mind.patience > 0 ? 'running' : 'done'
  },
}
