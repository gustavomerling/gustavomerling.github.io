import { MAX_PASSIVES, MAX_WEAPONS } from '../config'
import { PASSIVES } from '../items/passives'
import { shuffle } from '../math'
import type { UpgradeOption } from '../types'
import { WEAPONS } from '../weapons'
import type { World } from './World'

/** Builds up to `count` random level-up choices from everything the player can still get. */
export function buildChoices(world: World, count = 3): UpgradeOption[] {
  const pool: UpgradeOption[] = []

  for (const def of WEAPONS) {
    const owned = world.weapons.find((w) => w.def.id === def.id)
    if (owned && owned.level >= def.maxLevel) continue
    if (!owned && world.weapons.length >= MAX_WEAPONS) continue
    const next = owned ? owned.level + 1 : 1
    pool.push({
      key: `weapon:${def.id}`,
      title: def.name,
      subtitle: owned ? `Level ${next}` : 'New weapon!',
      description: def.levelText(next),
      icon: def.icon,
      apply: (w) => w.addWeapon(def.id),
    })
  }

  for (const def of PASSIVES) {
    const level = world.passives.get(def.id) ?? 0
    if (level >= def.maxLevel) continue
    if (level === 0 && world.passives.size >= MAX_PASSIVES) continue
    pool.push({
      key: `passive:${def.id}`,
      title: def.name,
      subtitle: level ? `Level ${level + 1}` : 'New item!',
      description: def.description,
      icon: def.icon,
      apply: (w) => w.addPassive(def.id),
    })
  }

  const choices = shuffle(pool).slice(0, count)
  // being offered counts as meeting it, for the glossary
  for (const c of choices) {
    const [kind, id] = c.key.split(':')
    if (kind === 'weapon') world.discover('weapons', id)
    if (kind === 'passive') world.discover('items', id)
  }

  // everything maxed: fall back to consumables
  if (choices.length === 0) {
    choices.push(
      {
        key: 'heal',
        title: 'Disk Cleanup',
        subtitle: 'Consumable',
        description: 'Restore 40 HP.',
        icon: 'heart',
        apply: (w) => {
          w.player.hp = Math.min(w.stats.maxHp, w.player.hp + 40)
        },
      },
      {
        key: 'floppy',
        title: 'Spare Floppy',
        subtitle: 'Consumable',
        description: '+1 floppy (worth KB at the end of the run).',
        icon: 'floppy',
        apply: (w) => {
          w.floppies++
        },
      },
    )
  }
  return choices
}
