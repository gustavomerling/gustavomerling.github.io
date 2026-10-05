// Ícones do jogo. A base é a lucide-react; aqui ficam só os que precisam de algo próprio.
import { Medal, type LucideProps } from 'lucide-react'

/** Roda (logo do jogo), no mesmo estilo de traço da lucide. */
export function WheelIcon({ size = 24, className, strokeWidth = 2 }: { size?: number | string; className?: string; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      className={className}
    >
      <circle cx={12} cy={12} r={10} />
      <circle cx={12} cy={12} r={4} />
      <path d="M12 2v6M12 16v6M2 12h6M16 12h6M4.9 4.9l4.3 4.3M14.8 14.8l4.3 4.3M19.1 4.9l-4.3 4.3M9.2 14.8l-4.3 4.3" />
    </svg>
  )
}

export const MEDAL_COLORS = ['#7d8896', '#cd7f32', '#c0c7d1', '#ffc83d']

/** Medalha colorida: 1 bronze, 2 prata, 3 ouro (0 = cinza). */
export function MedalIcon({ level, ...props }: { level: number } & LucideProps) {
  return <Medal color={MEDAL_COLORS[level] ?? MEDAL_COLORS[0]} {...props} />
}
