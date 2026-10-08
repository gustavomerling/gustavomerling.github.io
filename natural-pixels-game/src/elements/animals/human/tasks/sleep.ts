import type { Task } from './types.ts'

/** Wakes up once it's this light. */
const MORNING = 0.45

/** Go home (if there is one) and sleep until morning; otherwise sleep where it stands. */
export const sleep: Task = {
  start(body) {
    const { mind } = body
    mind.asleep = false
    mind.target = mind.home ? { x: mind.home.x + 3, y: mind.home.ground - 1 } : null
    mind.patience = 300
    return true
  },
  run(body) {
    const { mind } = body
    if (body.light() > MORNING) {
      mind.asleep = false
      return 'done'
    }
    if (!mind.asleep && mind.target && mind.patience > 0 && Math.abs(mind.target.x - body.x) > 1) {
      const result = body.walkTo(mind.target)
      mind.patience -= result === 'stuck' ? 10 : 1
      return 'running'
    }
    mind.asleep = body.standing()
    return 'running'
  },
}
