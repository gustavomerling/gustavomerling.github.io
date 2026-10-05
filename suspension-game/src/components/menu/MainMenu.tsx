import { BookOpen, ChevronRight, Settings, Sparkles, Wrench, type LucideIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { MEDALS } from '../../game/medals'
import { medalTotals } from '../../game/storage'
import { MEDAL_COLORS, MedalIcon } from '../ui/icons'
import { Logo } from './Logo'

export type MenuTarget = 'build' | 'howto' | 'options' | 'credits'

const ITEMS: { id: MenuTarget; label: string; hint: string; Icon: LucideIcon; color: string }[] = [
  { id: 'build', label: 'Garagem', hint: 'Monte seu carro e vá para a pista', Icon: Wrench, color: '#ff6b3d' },
  { id: 'howto', label: 'Como jogar', hint: 'Controles e regras', Icon: BookOpen, color: '#29b6f6' },
  { id: 'options', label: 'Opções', hint: 'Som, regras e efeitos', Icon: Settings, color: '#9ccc65' },
  { id: 'credits', label: 'Créditos', hint: 'Quem fez', Icon: Sparkles, color: '#ba68c8' },
]

/** Menu principal: navegável por mouse ou ↑ ↓ Enter. */
export function MainMenu({ onSelect }: { onSelect: (t: MenuTarget) => void }) {
  const [index, setIndex] = useState(0)
  const totals = medalTotals() // [bronze, prata, ouro]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 's') setIndex((i) => (i + 1) % ITEMS.length)
      else if (e.key === 'ArrowUp' || e.key === 'w') setIndex((i) => (i + ITEMS.length - 1) % ITEMS.length)
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(ITEMS[index].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, onSelect])

  return (
    <div className="menu-screen">
      <div className="menu-panel">
        <Logo />
        <nav className="menu-items">
          {ITEMS.map((it, i) => (
            <button
              key={it.id}
              className={i === index ? 'menu-item active' : 'menu-item'}
              style={{ '--item': it.color } as React.CSSProperties}
              onMouseEnter={() => setIndex(i)}
              onClick={() => onSelect(it.id)}
            >
              <span className="menu-icon">
                <it.Icon size={22} strokeWidth={2.2} />
              </span>
              <span className="menu-text">
                <span>{it.label}</span>
                <small>{it.hint}</small>
              </span>
              <ChevronRight className="menu-chevron" size={20} />
            </button>
          ))}
        </nav>

        <div className="medal-board">
          <span className="medal-board-title">Suas medalhas</span>
          <div className="medal-badges">
            {[3, 2, 1].map((level) => (
              <div
                key={level}
                className={totals[level - 1] ? 'medal-badge' : 'medal-badge empty'}
                style={{ '--medal': MEDAL_COLORS[level] } as React.CSSProperties}
                title={MEDALS[level].rule}
              >
                <span className="medal-disc">
                  <MedalIcon level={level} size={18} strokeWidth={2.4} />
                </span>
                <span className="medal-info">
                  <b>{totals[level - 1]}</b>
                  <small>{MEDALS[level].name}</small>
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="menu-hint">
          <kbd>↑</kbd>
          <kbd>↓</kbd> navegar · <kbd>Enter</kbd> selecionar
        </div>
      </div>
    </div>
  )
}
