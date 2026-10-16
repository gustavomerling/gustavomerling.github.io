import type { ShopUpgradeDef } from '../types'

/**
 * Permanent upgrades bought with KB between runs.
 * To add one: append a def here. The shop screen and stat pipeline pick it up automatically.
 */
export const SHOP_UPGRADES: ShopUpgradeDef[] = [
  {
    id: 'ram',
    name: 'Extra RAM',
    icon: 'ram',
    maxLevel: 5,
    description: '+15 max HP',
    cost: (l) => 30 + l * 30,
    apply: (s, l) => {
      s.maxHp += 15 * l
    },
  },
  {
    id: 'cpu',
    name: 'CPU Upgrade',
    icon: 'cpu',
    maxLevel: 5,
    description: '+10% damage',
    cost: (l) => 40 + l * 40,
    apply: (s, l) => {
      s.damage += 0.1 * l
    },
  },
  {
    id: 'bios',
    name: 'Overclock BIOS',
    icon: 'clock',
    maxLevel: 5,
    description: '-5% weapon cooldown',
    cost: (l) => 50 + l * 50,
    apply: (s, l) => {
      s.cooldown *= Math.pow(0.95, l)
    },
  },
  {
    id: 'optical',
    name: 'Optical Mouse',
    icon: 'mouse',
    maxLevel: 5,
    description: '+6% move speed',
    cost: (l) => 30 + l * 25,
    apply: (s, l) => {
      s.moveSpeed *= 1 + 0.06 * l
    },
  },
  {
    id: 'drag',
    name: 'Drag Distance',
    icon: 'magnet',
    maxLevel: 3,
    description: '+25% pickup range',
    cost: (l) => 25 + l * 25,
    apply: (s, l) => {
      s.magnet *= 1 + 0.25 * l
    },
  },
  {
    id: 'scandisk',
    name: 'ScanDisk',
    icon: 'scandisk',
    maxLevel: 3,
    description: '+0.2 HP/s regen',
    cost: (l) => 60 + l * 60,
    apply: (s, l) => {
      s.regen += 0.2 * l
    },
  },
  {
    id: 'license',
    name: 'Shareware License',
    icon: 'license',
    maxLevel: 5,
    description: '+10% KB earned',
    cost: (l) => 50 + l * 50,
    apply: (s, l) => {
      s.greed += 0.1 * l
    },
  },
  {
    id: 'fsb',
    name: 'Front-Side Bus',
    icon: 'cache',
    maxLevel: 5,
    description: '+6% XP gained',
    cost: (l) => 40 + l * 45,
    apply: (s, l) => {
      s.growth += 0.06 * l
    },
  },
  {
    id: 'mousepad',
    name: 'Lucky Mousepad',
    icon: 'clover',
    maxLevel: 3,
    description: '+15% floppy and heart drops',
    cost: (l) => 35 + l * 40,
    apply: (s, l) => {
      s.luck += 0.15 * l
    },
  },
]

export const SHOP_BY_ID: Record<string, ShopUpgradeDef> = Object.fromEntries(SHOP_UPGRADES.map((u) => [u.id, u]))
