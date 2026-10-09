import { Axe, Fish, Hammer, Pickaxe, Swords, Wheat, type LucideIcon } from 'lucide-react'
import type { SkillId, Status } from '../elements/types.ts'

const SKILL_ICONS: Record<SkillId, LucideIcon> = {
  mining: Pickaxe,
  fishing: Fish,
  farming: Wheat,
  building: Hammer,
  woodcutting: Axe,
  fighting: Swords,
}

/** Highest skill level (one pip per level). */
const MAX_LEVEL = 5

/** One row per skill: icon, name, level pips, a thin bar towards the next level and the rank. */
export function Skills({ skills }: { skills: Status['skills'] }) {
  if (skills.length === 0) return <p className="person-card__empty">No skills yet</p>

  return (
    <ul className="skills">
      {skills.map((skill) => {
        const Icon = SKILL_ICONS[skill.id]
        const maxed = skill.level >= MAX_LEVEL
        const percent = Math.round((maxed ? 1 : skill.progress) * 100)
        return (
          <li key={skill.id} className={`skills__row${skill.level === 0 ? ' skills__row--novice' : ''}`}>
            <span className="skills__icon" aria-hidden>
              <Icon size={16} />
            </span>
            <span className="skills__label">{skill.label}</span>
            <span className="skills__pips" role="img" aria-label={`Level ${skill.level} of ${MAX_LEVEL}`}>
              {Array.from({ length: MAX_LEVEL }, (_, i) => (
                <span key={i} className={`skills__pip${i < skill.level ? ' skills__pip--on' : ''}`} />
              ))}
            </span>
            <span
              className="skills__bar"
              role="progressbar"
              aria-label={maxed ? `${skill.label} mastered` : `${skill.label}: progress to the next level`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span className="skills__fill" style={{ width: `${percent}%` }} />
            </span>
            <span className="skills__title">{skill.title || 'Untrained'}</span>
          </li>
        )
      })}
    </ul>
  )
}
