import { bedSpot } from '../house.ts'
import type { Task } from './types.ts'

/** Tiredness slept off per action asleep (a blanket helps); it gets up once it's down to RESTED. */
const SLEEP_OFF = 0.4
const BLANKET_SLEEP = 1.3
const RESTED = 4

/**
 * Tired out: go home to bed (if there is one) and sleep it off; otherwise sleep where it stands.
 * It sleeps when it's tired, not because it's night: it gets up again once it's rested, day or
 * night.
 */
export const sleep: Task = {
  start(body) {
    const { mind } = body
    mind.asleep = false
    mind.target = mind.home ? bedSpot(mind.home) : null
    mind.patience = 300
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    if (mind.asleep) {
      mind.tired = Math.max(0, (mind.tired ?? 0) - SLEEP_OFF * (mind.blanket ? BLANKET_SLEEP : 1))
      if (mind.tired > RESTED) return 'running'
      mind.asleep = false
      mind.say = { text: 'What a good sleep!', ttl: 20 }
      return 'done'
    }
    const far = mind.target && (Math.abs(mind.target.x - body.x) > 1 || Math.abs(mind.target.y - body.y) > 1)
    if (mind.target && mind.patience > 0 && far) {
      const result = body.walkTo(mind.target)
      mind.patience -= result === 'stuck' ? 10 : 1
      return 'running'
    }
    mind.asleep = body.standing()
    return 'running'
  },
}
