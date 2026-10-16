import { BASE_STATS } from './config'
import { PASSIVE_BY_ID } from './items/passives'
import { SHOP_BY_ID } from './shop/upgrades'
import type { Stats } from './types'

/** base -> permanent shop upgrades -> in-run passives */
export function computeStats(shop: Record<string, number>, passives: Map<string, number>): Stats {
  const s: Stats = { ...BASE_STATS }
  for (const [id, level] of Object.entries(shop)) {
    if (level > 0) SHOP_BY_ID[id]?.apply(s, level)
  }
  for (const [id, level] of passives) {
    if (level > 0) PASSIVE_BY_ID[id]?.apply(s, level)
  }
  return s
}
