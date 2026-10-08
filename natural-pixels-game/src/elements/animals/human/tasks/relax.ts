import { spotInside } from '../house.ts'
import { approach, type Task } from './types.ts'

/** Actions it spends at each spot (~3–12 s); a while longer when it's raining outside. */
const STAY_MIN = 40
const STAY_MAX = 150
const WALKING = 0
const STAYING = 1

/** Spend some time at home: walk to a spot on one of the floors and hang out there. */
export const relax: Task = {
  start(body) {
    const { mind } = body
    if (!mind.home) return false
    mind.target = spotInside(mind.home, () => body.random())
    mind.patience = 250
    mind.phase = WALKING
    mind.timer = 0
    return true
  },
  run(body) {
    const { mind } = body
    if (mind.phase === WALKING) {
      const status = approach(body)
      if (status !== 'arrived') return status
      mind.phase = STAYING
      // From here on, patience is how long it stays.
      mind.patience = STAY_MIN + Math.floor(body.random() * (STAY_MAX - STAY_MIN))
    }
    // Rain keeps it in; otherwise, once it's had enough, off it goes.
    if (body.rain() > 0.2) mind.timer = Math.min(mind.timer, mind.patience - 10)
    return ++mind.timer >= mind.patience ? 'done' : 'running'
  },
}
