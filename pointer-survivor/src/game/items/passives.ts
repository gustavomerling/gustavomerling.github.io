import type { PassiveDef } from '../types'

/**
 * In-run passive items, offered on level-up. Lost when the run ends.
 * To add one: append a def here.
 */
export const PASSIVES: PassiveDef[] = [
  {
    id: 'ramStick',
    name: 'RAM Stick',
    icon: 'ram',
    maxLevel: 5,
    description: '+20 max HP',
    apply: (s, l) => {
      s.maxHp += 20 * l
    },
  },
  {
    id: 'turbo',
    name: 'Turbo Button',
    icon: 'clock',
    maxLevel: 5,
    description: '-8% weapon cooldown',
    apply: (s, l) => {
      s.cooldown *= Math.pow(0.92, l)
    },
  },
  {
    id: 'mouseBall',
    name: 'Clean Mouse Ball',
    icon: 'mouse',
    maxLevel: 5,
    description: '+10% move speed',
    apply: (s, l) => {
      s.moveSpeed *= 1 + 0.1 * l
    },
  },
  {
    id: 'largeFonts',
    name: 'Large Fonts',
    icon: 'fonts',
    maxLevel: 5,
    description: '+12% area',
    apply: (s, l) => {
      s.area += 0.12 * l
    },
  },
  {
    id: 'defrag',
    name: 'Defragmenter',
    icon: 'scandisk',
    maxLevel: 5,
    description: '+0.4 HP/s regen',
    apply: (s, l) => {
      s.regen += 0.4 * l
    },
  },
  {
    id: 'firewall',
    name: 'Firewall',
    icon: 'shield',
    maxLevel: 3,
    description: '-1 damage taken per hit',
    apply: (s, l) => {
      s.armor += l
    },
  },
  {
    id: 'highDpi',
    name: 'High DPI',
    icon: 'magnet',
    maxLevel: 3,
    description: '+30% pickup range',
    apply: (s, l) => {
      s.magnet *= 1 + 0.3 * l
    },
  },
  {
    id: 'directX',
    name: 'DirectX 7',
    icon: 'cpu',
    maxLevel: 5,
    description: '+10% damage, +10% projectile speed',
    apply: (s, l) => {
      s.damage += 0.1 * l
      s.projectileSpeed += 0.1 * l
    },
  },
  {
    id: 'dualMonitor',
    name: 'Dual Monitor',
    icon: 'monitors',
    maxLevel: 2,
    description: '+1 projectile / orbiter / blast for every weapon',
    apply: (s, l) => {
      s.amount += l
    },
  },
  {
    id: 'cache',
    name: 'Browser Cache',
    icon: 'cache',
    maxLevel: 5,
    description: '+12% XP gained',
    apply: (s, l) => {
      s.growth += 0.12 * l
    },
  },
  {
    id: 'clipart',
    name: 'Lucky Clip Art',
    icon: 'clover',
    maxLevel: 3,
    description: '+30% floppy and heart drops',
    apply: (s, l) => {
      s.luck += 0.3 * l
    },
  },
  {
    id: 'screensaver',
    name: 'Screensaver',
    icon: 'screensaver',
    maxLevel: 3,
    description: '+0.2s invulnerability after a hit',
    apply: (s, l) => {
      s.invuln += 0.2 * l
    },
  },
]

export const PASSIVE_BY_ID: Record<string, PassiveDef> = Object.fromEntries(PASSIVES.map((p) => [p.id, p]))
