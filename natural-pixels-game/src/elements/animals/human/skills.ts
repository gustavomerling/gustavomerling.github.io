import type { JournalKind, SkillId, Status } from '../../types.ts'
import type { Mind } from './mind.ts'

/*
 * Practice makes perfect: a human gets better at what it does most. Each skill gains experience
 * as it's used (a block mined, a fish caught, a harvest, a block laid, a tree felled, a blow
 * landed) and goes up a level now and then, up to MAX_LEVEL. Every level makes it a little
 * quicker or luckier at it (see knack), earns a rank ("Seasoned miner") and a line in its
 * journal; its best skill's rank is its title.
 *
 * The journal lives here too: milestones of its life, written down on the day they happen.
 */

export const MAX_LEVEL = 5
/** Experience needed to reach each level. */
const LEVEL_XP = [0, 20, 70, 160, 320, 600]
/** Each level makes it this much better at the job (speed, luck, strength). */
const KNACK_PER_LEVEL = 0.12
/** Journal entries kept (the oldest go first). */
const JOURNAL_SIZE = 300

const SKILLS: Record<SkillId, { label: string; ranks: string[] }> = {
  mining: { label: 'Mining', ranks: ['', 'Novice miner', 'Miner', 'Seasoned miner', 'Master miner', 'Legendary miner'] },
  fishing: { label: 'Fishing', ranks: ['', 'Novice angler', 'Angler', 'Seasoned angler', 'Master angler', 'Legendary angler'] },
  farming: { label: 'Farming', ranks: ['', 'Novice farmer', 'Farmer', 'Seasoned farmer', 'Master farmer', 'Legendary farmer'] },
  building: { label: 'Building', ranks: ['', 'Handy', 'Builder', 'Seasoned builder', 'Master builder', 'Legendary architect'] },
  woodcutting: { label: 'Woodcutting', ranks: ['', 'Novice woodcutter', 'Woodcutter', 'Lumberjack', 'Master lumberjack', 'Legendary lumberjack'] },
  fighting: { label: 'Fighting', ranks: ['', 'Brawler', 'Fighter', 'Monster hunter', 'Champion', 'Legendary hero'] },
}
const ORDER = Object.keys(SKILLS) as SkillId[]

function xpOf(mind: Mind, id: SkillId): number {
  return mind.skills?.[id] ?? 0
}

export function skillLevel(mind: Mind, id: SkillId): number {
  const xp = xpOf(mind, id)
  let level = 0
  while (level < MAX_LEVEL && xp >= LEVEL_XP[level + 1]) level++
  return level
}

/** How much better than a beginner it is at this (1 = beginner): divides the time things take, multiplies luck and blows. */
export function knack(mind: Mind, id: SkillId): number {
  return 1 + skillLevel(mind, id) * KNACK_PER_LEVEL
}

/** A bit of practice; a new level gets a journal line and a cheer. */
export function practice(mind: Mind, id: SkillId, xp = 1) {
  const before = skillLevel(mind, id)
  ;(mind.skills ??= {})[id] = xpOf(mind, id) + xp
  const after = skillLevel(mind, id)
  if (after <= before) return
  const rank = SKILLS[id].ranks[after]
  note(mind, after === 1 ? `Getting the hang of ${SKILLS[id].label.toLowerCase()}: ${rank.toLowerCase()} now.` : `I'm a ${rank.toLowerCase()} now!`, 'skill')
  mind.say = { text: `${rank}!`, ttl: 25 }
}

/** Its skills for the status card. */
export function skillsStatus(mind: Mind): Status['skills'] {
  return ORDER.map((id) => {
    const level = skillLevel(mind, id)
    const from = LEVEL_XP[level]
    const to = LEVEL_XP[Math.min(MAX_LEVEL, level + 1)]
    const progress = level >= MAX_LEVEL ? 1 : (xpOf(mind, id) - from) / (to - from)
    return { id, label: SKILLS[id].label, level, progress, title: SKILLS[id].ranks[level] }
  })
}

/** Its title: the rank of its best skill (most experience breaks ties), once it's any good. */
export function titleOf(mind: Mind): string | undefined {
  let best: SkillId | null = null
  for (const id of ORDER) if (!best || xpOf(mind, id) > xpOf(mind, best)) best = id
  if (!best || skillLevel(mind, best) < 1) return undefined
  return SKILLS[best].ranks[skillLevel(mind, best)]
}

// ---------- The journal ----------

/** Writes a line in its journal, dated today (the same line twice in a row isn't repeated). */
export function note(mind: Mind, text: string, kind: JournalKind) {
  const journal = (mind.journal ??= [])
  const last = journal[journal.length - 1]
  if (last && last.text === text && last.day === (mind.today ?? 1)) return
  journal.push({ day: mind.today ?? 1, text, kind })
  if (journal.length > JOURNAL_SIZE) journal.splice(0, journal.length - JOURNAL_SIZE)
}

/** A line in the journal, but only the first time this happens (`key` tells them apart). */
export function firstTime(mind: Mind, key: string, text: string, kind: JournalKind) {
  const firsts = (mind.firsts ??= [])
  if (firsts.includes(key)) return
  firsts.push(key)
  note(mind, text, kind)
}
