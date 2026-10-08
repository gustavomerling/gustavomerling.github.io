import type { Mind } from './mind.ts'

/*
 * Crafting, Minecraft-style. Recipes are applied automatically whenever the human can
 * afford them and needs the result.
 *
 *   1 log                  → 4 planks
 *   3 planks               → wooden pickaxe   (needed to mine stone)
 *   3 planks               → wooden axe       (chops faster)
 *   3 stone + 2 planks     → stone pickaxe / stone axe
 *   3 planks               → bucket           (carries water for saplings)
 *   1 plank + 1 stone      → lamp             (placed when building the house)
 *   5 planks               → boat             (made at the shore, when it has to cross water)
 *   2 planks               → wooden sword     (for zombies)
 *   2 stone + 1 plank      → stone sword
 *   1 gunpowder + 3 planks + 2 stone → musket
 */

/** What a first house costs (see house.ts and build.ts): walls, roof, bed and lamp; stone foundation. */
export const HOUSE_COST = { plank: 24, stone: 8 }
export const BOAT_COST = { plank: 5 }

/** Planks a log turns into. */
export const PLANKS_PER_LOG = 4
/** Don't hoard more planks than this from logs. */
const PLANK_STOCK = 40

export function craft(mind: Mind) {
  const { inv, tools } = mind

  while (inv.log > 0 && inv.plank < PLANK_STOCK) {
    inv.log--
    inv.plank += PLANKS_PER_LOG
  }

  // Tools come first: they unlock and speed up everything else.
  if (tools.pickaxe === 0 && inv.plank >= 3) {
    inv.plank -= 3
    tools.pickaxe = 1
  }
  if (tools.axe === 0 && inv.plank >= 3 + 3) {
    inv.plank -= 3
    tools.axe = 1
  }
  if (tools.pickaxe < 2 && inv.stone >= 3 && inv.plank >= 2) {
    inv.stone -= 3
    inv.plank -= 2
    tools.pickaxe = 2
  }
  if (tools.axe < 2 && tools.pickaxe === 2 && inv.stone >= 3 + 3 && inv.plank >= 2) {
    inv.stone -= 3
    inv.plank -= 2
    tools.axe = 2
  }
  // Weapons once the house is up (zombies come at night).
  if (mind.home && tools.sword === 0 && inv.plank >= 2) {
    inv.plank -= 2
    tools.sword = 1
  }
  if (mind.home && tools.sword === 1 && inv.stone >= 2 && inv.plank >= 1) {
    inv.stone -= 2
    inv.plank -= 1
    tools.sword = 2
  }
  if (!tools.gun && inv.gunpowder > 0 && inv.plank >= 3 && inv.stone >= 2) {
    inv.plank -= 3
    inv.stone -= 2
    tools.gun = true
  }
  // A bucket once there's something to water (and the house is covered).
  if (!tools.bucket && (mind.home || mind.saplings.length > 0) && inv.plank >= 3) {
    inv.plank -= 3
    tools.bucket = true
  }
}

/** Planks to collect before building: the house, plus the wooden tools it still has to craft. */
export function planksToBuild(mind: Mind): number {
  return HOUSE_COST.plank + (mind.tools.pickaxe ? 0 : 3) + (mind.tools.axe ? 0 : 3)
}

/** Total planks available counting unprocessed logs. */
export function plankWorth(mind: Mind): number {
  return mind.inv.plank + mind.inv.log * PLANKS_PER_LOG
}
