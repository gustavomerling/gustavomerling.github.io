import {
  Apple,
  Axe,
  CircleQuestionMark,
  Droplets,
  Fish,
  Footprints,
  Gift,
  Hammer,
  House,
  Lightbulb,
  Moon,
  Mountain,
  Pickaxe,
  Sailboat,
  Sprout,
  TreePine,
  WavesHorizontal,
} from 'lucide-react'
import type { Thought } from '../../types.ts'
import { HOUSE_COST, plankWorth, planksToBuild } from './craft.ts'
import { WANT_HINT, type Mind, type Want } from './mind.ts'
import { HOUSE_STEPS } from './tasks/build.ts'

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

/** What goes in the human's thought bubble: sleep, trouble, the water, a need, or the task at hand. */
export function thoughtOf(mind: Mind): Thought {
  if (mind.asleep) return { icon: Moon, text: 'Zzz…' }
  if (mind.stuck >= STUCK_SHOWN) return { icon: CircleQuestionMark, text: "Can't get there…" }
  if (mind.afloat === 'boat') return { icon: Sailboat, text: 'Rowing my boat' }
  if (mind.afloat === 'swim') return { icon: WavesHorizontal, text: mind.tools.boat ? 'Swimming…' : 'Swimming… (a boat needs 5 planks)' }
  // Needs show while it has nothing better to do (or when it's hungry: that's urgent).
  const idle = mind.task === 'wander' || mind.task === 'idle'
  if (mind.want && (idle || mind.want === 'food')) return WANTS[mind.want](mind)

  switch (mind.task) {
    case 'sleep':
      return mind.home ? { icon: House, text: 'Heading home to sleep' } : { icon: Moon, text: 'So sleepy…' }
    case 'wander':
      return { icon: Footprints, text: mind.home ? 'Taking a walk' : 'Looking around' }
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
      const step = mind.site?.step ?? 0
      return { icon: Hammer, text: `Building my house ${Math.round((step / HOUSE_STEPS) * 100)}%` }
    }
    case 'plant':
      return { icon: Sprout, text: 'Planting a tree' }
    case 'water':
      return { icon: Droplets, text: mind.phase === 0 ? 'Fetching water' : 'Watering a sapling' }
    case 'idle':
      return { icon: Lightbulb, text: 'Hmm…' }
  }
}
