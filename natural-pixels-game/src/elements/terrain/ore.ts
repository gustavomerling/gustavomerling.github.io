import { Gem, Mountain } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'
import { stone } from './stone.ts'

/*
 * Ores, Minecraft-style: veins of them sit inside the stone (see worldgen.ts). They behave
 * like stone (heavy blocks that fall and stack); humans mine them with a good enough pickaxe
 * (see ORE_TIER) and use them: coal for torches, iron for better tools, sulfur and saltpeter
 * (with coal) for gunpowder; silver and gold for treasure and golden statues.
 */

/** Pickaxe tier needed to get anything out of each ore (1 wooden, 2 stone, 3 iron). */
export const ORE_TIER: Readonly<Record<string, number>> = {
  coal: 1,
  iron_ore: 2,
  silver_ore: 3,
  gold_ore: 3,
  sulfur_ore: 2,
  saltpeter: 2,
  amethyst: 3,
}

const ore = (id: string, name: string, description: string, base: string, extra: Partial<ElementDefinition> = {}): ElementDefinition => ({
  ...stone,
  id,
  name,
  description,
  color: { base, variation: 0.22 },
  icon: Mountain,
  ...extra,
})

export const coal = ore('coal', 'Coal', 'Black rock found in the stone. Humans make torches with it.', '#34343b', {
  // It burns, slowly, like a lump of charcoal.
  thermal: { conductivity: 0.2, burn: { at: 350, temp: 700, rate: 0.002, into: 'ash' } },
})
export const ironOre = ore('iron_ore', 'Iron Ore', 'Rusty stone deep underground. Humans need a stone pickaxe to mine it, and make iron tools.', '#b0876b')
export const silverOre = ore('silver_ore', 'Silver Ore', 'Shiny ore deep down. Needs an iron pickaxe. Humans keep it as treasure.', '#c9d0d8', {
  icon: Gem,
})
export const goldOre = ore('gold_ore', 'Gold Ore', 'Rare and deepest of all. Needs an iron pickaxe. Humans keep it as treasure.', '#e3bb3a', {
  icon: Gem,
  color: { base: '#e3bb3a', variation: 0.22, emissive: 0.15 },
})
export const sulfurOre = ore('sulfur_ore', 'Sulfur', 'Yellow, smelly rock deep in the stone. With coal and saltpeter, humans make gunpowder.', '#d8cf45', {
  icon: Gem,
})
export const saltpeter = ore('saltpeter', 'Saltpeter', 'White crystals in the stone. With coal and sulfur, humans make gunpowder.', '#e9e6dc', {
  icon: Gem,
})
export const amethyst = ore('amethyst', 'Amethyst', 'Purple crystals that glimmer deep in the stone. Needs an iron pickaxe. Humans treasure it.', '#a77bd6', {
  icon: Gem,
  color: { base: '#a77bd6', variation: 0.25, emissive: 0.35 },
})
