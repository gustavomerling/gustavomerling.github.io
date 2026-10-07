import type { CSSProperties } from 'react'
import { Icon, type IconName } from '../icons'

type FloatersProps = {
  icons: IconName[]
  count?: number
  colors?: string[]
  seed?: number
}

// pseudo-aleatório determinístico: as mesmas posições em todo render
function layout(icons: IconName[], count: number, colors: string[], seed: number) {
  let s = seed * 7919
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  return Array.from({ length: count }, (_, i) => ({
    icon: icons[i % icons.length],
    color: colors[i % colors.length],
    size: 22 + rand() * 34,
    style: {
      left: `${rand() * 94}%`,
      top: `${rand() * 92}%`,
      '--dx': `${(rand() - 0.5) * 80}px`,
      '--dy': `${(rand() - 0.5) * 90}px`,
      '--dur': `${7 + rand() * 8}s`,
      '--delay': `${-rand() * 10}s`,
    } as CSSProperties,
  }))
}

/** Ícones flutuando devagar no fundo de uma seção (decoração, atrás do conteúdo) */
export function Floaters({ icons, count = 9, colors = ['var(--pink-500)'], seed = 1 }: FloatersProps) {
  const items = layout(icons, count, colors, seed)

  return (
    <div className="floaters" aria-hidden>
      {items.map((it, i) => (
        <span key={i} className="floater" style={it.style}>
          <Icon name={it.icon} size={it.size} color={it.color} />
        </span>
      ))}
    </div>
  )
}
