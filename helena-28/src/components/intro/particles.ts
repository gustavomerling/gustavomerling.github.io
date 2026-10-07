import type { CSSProperties } from 'react'
import type { IconName } from '../icons'

export type Particle = {
  kind: 'confetti' | 'dot' | 'icon' | 'butterfly'
  color: string
  icon?: IconName
  size: number
  /** Trajetória em variáveis CSS (--x1/--y1 meio, --x2/--y2 fim) */
  style: CSSProperties
}

const COLORS = ['var(--pink-500)', 'var(--pink-300)', 'var(--red-500)', 'var(--orange-500)', 'var(--white)']
const BUTTERFLY_COLORS = ['var(--pink-500)', 'var(--orange-500)', 'var(--red-500)', 'var(--pink-300)']
const ICONS: IconName[] = ['heart', 'spark', 'bow', 'star', 'heart', 'spark']

const pick = <T>(list: T[]) => list[Math.floor(Math.random() * list.length)]
const between = (min: number, max: number) => min + Math.random() * (max - min)

export function makeParticles({ confetti = 60, dots = 12, icons = 18, butterflies = 12 } = {}): Particle[] {
  const particles: Particle[] = []

  // Confete, bolinhas e ícones: saem do centro, sobem e caem com "gravidade"
  const total = confetti + dots + icons
  for (let i = 0; i < total; i++) {
    const kind = i < confetti ? 'confetti' : i < confetti + dots ? 'dot' : 'icon'
    const angle = between(0, Math.PI * 2)
    const dist = between(160, 560)
    const x1 = Math.cos(angle) * dist
    const y1 = Math.sin(angle) * dist - between(80, 220)
    particles.push({
      kind,
      color: pick(COLORS),
      icon: kind === 'icon' ? pick(ICONS) : undefined,
      size: kind === 'icon' ? between(22, 40) : between(8, 14),
      style: {
        '--x1': `${x1}px`,
        '--y1': `${y1}px`,
        '--x2': `${x1 * 1.25}px`,
        '--y2': `${y1 + between(320, 640)}px`,
        '--rot': `${between(-720, 720)}deg`,
        '--dur': `${between(1.8, 3)}s`,
        '--delay': `${between(0, 0.25)}s`,
      } as CSSProperties,
    })
  }

  // Borboletas: voam para cima e para longe, em zigue-zague
  for (let i = 0; i < butterflies; i++) {
    const x2 = between(-700, 700)
    const y2 = -between(450, 900)
    particles.push({
      kind: 'butterfly',
      color: pick(BUTTERFLY_COLORS),
      size: between(34, 56),
      style: {
        '--x1': `${x2 * 0.35 + between(-160, 160)}px`,
        '--y1': `${y2 * 0.4}px`,
        '--x2': `${x2}px`,
        '--y2': `${y2}px`,
        '--rot': `${between(-25, 25)}deg`,
        '--dur': `${between(3.6, 5.5)}s`,
        '--delay': `${between(0.1, 0.6)}s`,
        '--flap': `${between(0.14, 0.22)}s`,
      } as CSSProperties,
    })
  }

  return particles
}
