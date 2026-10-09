import {
  Apple,
  Armchair,
  Binoculars,
  BookOpen,
  Coffee,
  CookingPot,
  Guitar,
  Sofa,
  Star,
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
  Wrench,
} from 'lucide-react'
import type { Thought } from '../../types.ts'
import { HOUSE_COST, plankWorth, planksToBuild } from './craft.ts'
import { WANT_HINT, type Mind, type Want } from './mind.ts'
import { blueprint } from './house.ts'
import { DECOR_LABEL, decorProgress } from './tasks/decor.ts'
import { ELEMENTS } from '../../registry.ts'
import { herdLabel } from './tasks/herd.ts'

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
  if (mind.role === 'merchant') return { icon: Gift, text: mind.phase === 1 ? 'On my way, then!' : 'Fine wares for sale!' }
  if (mind.task === 'fight') {
    return mind.tools.gun && mind.inv.gunpowder > 0
      ? { icon: Crosshair, text: `${mind.foe === 'skeleton' ? 'Skeleton' : 'Zombie'}! Take aim…` }
      : { icon: Swords, text: `Take that, ${mind.foe ?? 'zombie'}!` }
  }
  if (mind.task === 'hide') return { icon: House, text: 'Monsters! Hiding at home' }
  if (mind.stuck >= STUCK_SHOWN) {
    return { icon: CircleQuestionMark, text: `Can't get there… ${whyStuck(mind.blocked)}`.trim() }
  }
  if (mind.afloat === 'boat') return { icon: Sailboat, text: 'Rowing my boat' }
  if (mind.afloat === 'swim') return { icon: WavesHorizontal, text: mind.inv.plank >= 5 ? 'Swimming…' : 'Swimming… (a boat needs 5 planks)' }
  // Needs show while it has nothing better to do (or when it's hungry: that's urgent).
  const idle = mind.task === 'wander' || mind.task === 'idle'
  if (mind.want && (idle || mind.want === 'food')) return WANTS[mind.want](mind)

  switch (mind.task) {
    case 'sleep':
      return mind.home ? { icon: House, text: 'So tired… off to bed' } : { icon: Moon, text: 'So sleepy…' }
    case 'wander':
      if (light < 0.35) return { icon: Flame, text: 'A walk by torchlight' }
      return { icon: Footprints, text: mind.home ? 'Taking a walk' : 'Looking around' }
    case 'level':
      return { icon: Shovel, text: 'Levelling the yard' }
    case 'scavenge':
      return { icon: Sparkles, text: 'Gunpowder! For my musket' }

    case 'forage':
      return mind.phase === 1 ? { icon: Sparkles, text: 'Collecting honey' } : { icon: Apple, text: 'Picking fruit' }
    case 'herd':
      return { icon: Wheat, text: herdLabel(mind.phase, mind.carrying) }
    case 'cook':
      return { icon: CookingPot, text: `Grilling fish at the campfire (${mind.inv.fish} left)` }
    case 'fish':
      return { icon: Fish, text: mind.phase === 0 ? 'Going fishing' : 'Waiting for a bite…' }
    case 'chop':
      return { icon: Axe, text: 'Chopping a tree' }
    case 'gather':
      return { icon: Gift, text: 'Wood! Thanks!' }
    case 'mine':
      return { icon: Pickaxe, text: mind.phase === 1 ? 'Digging for stone' : 'Mining stone' }
    case 'well':
      return { icon: Droplets, text: 'Drilling a well' }
    case 'shaft':
      return { icon: Pickaxe, text: mind.shaft?.target ? 'Digging towards ore' : mind.inv.torch > 0 ? 'Digging my mine' : 'Digging my mine (no torches yet)' }
    case 'build': {
      const site = mind.site
      const done = site ? Math.round((site.step / blueprint(site).length) * 100) : 0
      return { icon: Hammer, text: `${site && site.stage > 1 ? 'Making my house bigger' : 'Building my house'} ${done}%` }
    }
    case 'decorate': {
      const job = decorProgress(mind)
      return { icon: Hammer, text: job ? `${DECOR_LABEL[job.kind]} ${Math.round(job.done * 100)}%` : 'Building in the yard' }
    }
    case 'relax': {
      if (mind.relaxAt === 'campfire') return light < 0.3 ? { icon: Guitar, text: 'Singing by the campfire' } : { icon: Flame, text: 'Warming up by the campfire' }
      if (mind.relaxAt === 'workshop') return { icon: Wrench, text: 'Tinkering in the workshop' }
      if (mind.relaxAt === 'bench') return { icon: Sofa, text: 'Sitting on the bench' }
      if (mind.relaxAt === 'visit') return { icon: House, text: `Visiting ${mind.visiting ?? 'a neighbour'}` }
      if (mind.relaxAt === 'tower') {
        if (mind.phase !== 2) return { icon: Binoculars, text: 'Up the watchtower' }
        return light < 0.3 ? { icon: Star, text: 'Stargazing' } : { icon: Binoculars, text: 'Keeping watch' }
      }
      if (rain > 0.2) return { icon: CloudRain, text: 'Waiting out the rain' }
      if ((mind.tired ?? 0) > 50) return { icon: Armchair, text: 'Taking a breather' }
      if (mind.relaxAt === 'book') return { icon: BookOpen, text: 'Reading a book' }
      if (mind.relaxAt === 'tea') return { icon: Coffee, text: 'Having a cup of tea' }
      if (mind.relaxAt === 'plant') return { icon: Sprout, text: 'Watering the potted plant' }
      const upstairs = mind.relaxAt === 'window' || (mind.home && mind.target && mind.target.y < mind.home.ground - 2)
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

/** Why it's stuck, in a few words (see Mind.blocked). */
function whyStuck(blocked: string | null | undefined): string {
  if (blocked === 'high') return '(too high up)'
  if (blocked === 'low') return '(too far down)'
  if (blocked === 'edge') return "(can't find a way)"
  const name = blocked && ELEMENTS.find((el) => el.id === blocked)?.name
  return name ? `(${name} in the way)` : ''
}
