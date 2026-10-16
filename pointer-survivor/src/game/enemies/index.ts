import type { EnemyDef } from '../types'
import { bannerAd } from './bannerAd'
import { blueScreen } from './blueScreen'
import { bug } from './bug'
import { cookie } from './cookie'
import { corruptedFile } from './corruptedFile'
import { error404 } from './error404'
import { hourglass } from './hourglass'
import { popup } from './popup'
import { spam } from './spam'
import { spamMail } from './spamMail'
import { trojan } from './trojan'
import { virus } from './virus'
import { worm } from './worm'
import { y2kBug } from './y2kBug'

/**
 * Every enemy, in glossary order. To add one: create a file with defineEnemy(...) and list it here.
 * Start it as status 'concept' to iterate in the Monster Glossary (dev builds only); switch to
 * 'active' and reference its id in a map's waves to put it in the game.
 */
export const ENEMIES: EnemyDef[] = [
  // Desktop
  bug,
  virus,
  popup,
  hourglass,
  blueScreen,
  // World Wide Web
  spamMail,
  spam,
  cookie,
  bannerAd,
  error404,
  // System32
  worm,
  trojan,
  corruptedFile,
  y2kBug,
]

export const ENEMY_BY_ID: Record<string, EnemyDef> = Object.fromEntries(ENEMIES.map((e) => [e.id, e]))

export function isActive(def: EnemyDef): boolean {
  return (def.status ?? 'active') === 'active'
}
