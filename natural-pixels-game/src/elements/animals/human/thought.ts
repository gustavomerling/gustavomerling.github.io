import {
  Apple,
  Armchair,
  Axe,
  CircleQuestionMark,
  Droplets,
  Fish,
  CloudRain,
  Crosshair,
  Fence,
  Flame,
  Footprints,
  Gift,
  Hammer,
  Hand,
  HeartCrack,
  House,
  Lightbulb,
  Moon,
  Mountain,
  Pickaxe,
  Sailboat,
  Shovel,
  Sparkles,
  Sprout,
  Swords,
  TreePine,
  WavesHorizontal,
  Wheat,
} from 'lucide-react'
import type { Thought } from '../../types.ts'
import { HOUSE_COST, plankWorth, planksToBuild } from './craft.ts'
import { WANT_HINT, type Mind, type Want } from './mind.ts'
import { blueprint } from './house.ts'

/** Shows "can't get there" after this many stuck actions in a row (~1 s). */
const STUCK_SHOWN = 12

function hint(want: Want) {
  const text = WANT_HINT[want]
  return text[0].toUpperCase() + text.slice(1)
}

const WANTS: Record<Want, (mind: Mind) => Thought> = {
  wood: (mind) => ({
    icon: TreePine,
    text: `I need wood (${plankWorth(mind)}/${planksToBuild(mind)} planks)`,
    hint: hint('wood'),
  }),
  stone: (mind) => ({
    icon: Mountain,
    text: `I need stone (${mind.inv.stone}/${HOUSE_COST.stone})`,
    hint: hint('stone'),
  }),
  food: () => ({ icon: Apple, text: "I'm hungry!", hint: hint('food') }),
}

/** Field jobs, in the order of `phase` (see tasks/field.ts). */
const FIELD_JOBS: readonly Thought[] = [
  { icon: Wheat, text: 'Harvesting wheat' },
  { icon: Wheat, text: 'Sowing wheat' },
  { icon: Wheat, text: 'Looking for seeds in the grass' },
  { icon: Fence, text: 'Fencing the field' },
  { icon: Droplets, text: 'Fetching water for the field' },
  { icon: Droplets, text: 'Watering the wheat' },
]

/** What goes in the human's thought bubble: sleep, talk, trouble, the water, a need, or the task at hand. */
export function thoughtOf(mind: Mind, rain: number, light: number): Thought {
  if (mind.asleep) return { icon: Moon, text: 'Zzz…' }
  if (mind.hurt > 0) return { icon: HeartCrack, text: 'Ouch!' }
  if (mind.say) return { icon: Hand, text: mind.say.text }
  if (mind.task === 'fight') {
    return mind.tools.gun && mind.inv.gunpowder > 0
      ? { icon: Crosshair, text: 'Zombie! Take aim…' }
      : { icon: Swords, text: 'Take that, zombie!' }
  }
  if (mind.task === 'hide') return { icon: House, text: 'Zombie! Hiding at home' }
  if (mind.stuck >= STUCK_SHOWN) return { icon: CircleQuestionMark, text: "Can't get there…" }
  if (mind.afloat === 'boat') return { icon: Sailboat, text: 'Rowing my boat' }
  if (mind.afloat === 'swim') return { icon: WavesHorizontal, text: mind.inv.plank >= 5 ? 'Swimming…' : 'Swimming… (a boat needs 5 planks)' }
  // Needs show while it has nothing better to do (or when it's hungry: that's urgent).
  const idle = mind.task === 'wander' || mind.task === 'idle'
  if (mind.want && (idle || mind.want === 'food')) return WANTS[mind.want](mind)

  switch (mind.task) {
    case 'sleep':
      return mind.home ? { icon: House, text: 'Heading home to sleep' } : { icon: Moon, text: 'So sleepy…' }
    case 'wander':
      if (light < 0.35) return { icon: Flame, text: 'A walk by torchlight' }
      return { icon: Footprints, text: mind.home ? 'Taking a walk' : 'Looking around' }
    case 'level':
      return { icon: Shovel, text: 'Levelling the yard' }
    case 'scavenge':
      return { icon: Sparkles, text: 'Gunpowder! For my musket' }

    case 'forage':
      return { icon: Apple, text: 'Picking fruit' }
    case 'fish':
      return { icon: Fish, text: mind.phase === 0 ? 'Going fishing' : 'Waiting for a bite…' }
    case 'chop':
      return { icon: Axe, text: 'Chopping a tree' }
    case 'gather':
      return { icon: Gift, text: 'Wood! Thanks!' }
    case 'mine':
      return { icon: Pickaxe, text: mind.phase === 1 ? 'Digging for stone' : 'Mining stone' }
    case 'build': {
      const site = mind.site
      const done = site ? Math.round((site.step / blueprint(site).length) * 100) : 0
      return { icon: Hammer, text: `${site && site.stage > 1 ? 'Making my house bigger' : 'Building my house'} ${done}%` }
    }
    case 'relax': {
      if (rain > 0.2) return { icon: CloudRain, text: 'Waiting out the rain' }
      const upstairs = mind.home && mind.target && mind.target.y < mind.home.ground - 2
      return upstairs ? { icon: House, text: 'Looking out the window' } : { icon: Armchair, text: 'Relaxing at home' }
    }
    case 'farm':
      return FIELD_JOBS[mind.phase] ?? FIELD_JOBS[0]
    case 'plant':
      return { icon: Sprout, text: 'Planting a tree' }
    case 'water':
      return { icon: Droplets, text: mind.phase === 0 ? 'Fetching water' : 'Watering a sapling' }
    case 'idle':
      return { icon: Lightbulb, text: 'Hmm…' }
  }
}
