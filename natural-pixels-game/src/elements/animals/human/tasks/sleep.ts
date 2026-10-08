import { bedSpot } from '../house.ts'
import type { Task } from './types.ts'

/** Wakes up once it's this light. */
const MORNING = 0.45
/** It sleeps this many actions (a night is ~550), then gets up for a while. */
const SLEEP_MIN = 220
const SLEEP_MAX = 420

/**
 * Go home to bed (if there is one) and sleep; otherwise sleep where it stands. It doesn't
 * sleep the whole night: after a good few hours it wakes up (and may go out with a torch).
 */
export const sleep: Task = {
  start(body) {
    const { mind } = body
    mind.asleep = false
    mind.target = mind.home ? bedSpot(mind.home) : null
    mind.patience = 300
    mind.timer = 0
    mind.phase = SLEEP_MIN + Math.floor(body.random() * (SLEEP_MAX - SLEEP_MIN))
    return true
  },
  run(body) {
    const { mind } = body
    if (body.light() > MORNING || (mind.asleep && ++mind.timer >= mind.phase)) {
      mind.asleep = false
      mind.slept = true
      return 'done'
    }
    const far = mind.target && (Math.abs(mind.target.x - body.x) > 1 || Math.abs(mind.target.y - body.y) > 1)
    if (!mind.asleep && mind.target && mind.patience > 0 && far) {
      const result = body.walkTo(mind.target)
      mind.patience -= result === 'stuck' ? 10 : 1
      return 'running'
    }
    mind.asleep = body.standing()
    return 'running'
  },
}
