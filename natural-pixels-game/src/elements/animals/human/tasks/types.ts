import type { Body } from '../body.ts'

export type TaskStatus = 'running' | 'done' | 'failed'

/**
 * Something a human can do. `start` checks it's possible right now and sets up the mind
 * (target, patience...); `run` is called once per action until it reports done/failed.
 */
export interface Task {
  start(body: Body): boolean
  run(body: Body): TaskStatus
}

/** Walk towards the mind's target; while stuck, burn patience. Returns 'arrived' or a status. */
export function approach(body: Body): 'arrived' | TaskStatus {
  const { mind } = body
  if (!mind.target) return 'failed'
  const result = body.walkTo(mind.target)
  if (result === 'arrived') return 'arrived'
  // Stuck: dig through (collapsed soil, a hill, a cave ceiling) before losing patience.
  if (result === 'stuck' && body.tunnel(mind.target)) mind.patience -= 1
  else mind.patience -= result === 'stuck' ? 5 : 1
  return mind.patience <= 0 ? 'failed' : 'running'
}
