import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { RevealGroup } from './motion/Reveal'
import { revealVariants, type RevealVariant } from './motion/variants'
import { Eyebrow } from './primitives'

export function Container({ children }: { children: ReactNode }) {
  return <div className="container">{children}</div>
}

export type SectionTone = 'paper' | 'pink' | 'orange' | 'ink' | 'red'

type SectionProps = {
  children: ReactNode
  id?: string
  eyebrow?: ReactNode
  title?: ReactNode
  subtitle?: ReactNode
  tone?: SectionTone
  center?: boolean
  /** Ocupa pelo menos a altura da tela (100dvh) */
  full?: boolean
  /** Decoração de fundo, atrás do conteúdo (ex.: <Floaters />) */
  decor?: ReactNode
}

const headerItem = revealVariants('up')

export function Section({ children, id, eyebrow, title, subtitle, tone = 'paper', center, full, decor }: SectionProps) {
  const hasHeader = eyebrow || title || subtitle
  const className = ['section', tone !== 'paper' && `section--${tone}`, full && 'section--full'].filter(Boolean).join(' ')
  return (
    <section id={id} className={className}>
      {decor}
      <Container>
        {hasHeader && (
          // eyebrow, título e subtítulo entram em cascata quando a seção aparece
          <motion.header
            className={center ? 'section__header section__header--center' : 'section__header'}
            initial="hidden"
            whileInView="shown"
            viewport={{ once: true, amount: 0.4 }}
            variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.12 } } }}
          >
            {eyebrow && (
              <motion.span variants={headerItem} custom={0}>
                <Eyebrow>{eyebrow}</Eyebrow>
              </motion.span>
            )}
            {title && (
              <motion.h2 className="section__title" variants={headerItem} custom={0}>
                {title}
              </motion.h2>
            )}
            {subtitle && (
              <motion.p className="section__subtitle" variants={headerItem} custom={0}>
                {subtitle}
              </motion.p>
            )}
          </motion.header>
        )}
        {children}
      </Container>
    </section>
  )
}

type GridProps = {
  children: ReactNode
  cols?: 2 | 3 | 4
  /** Os itens entram em cascata ao aparecer na tela */
  reveal?: RevealVariant
}

export function Grid({ children, cols = 3, reveal }: GridProps) {
  if (reveal) {
    return (
      <RevealGroup className={`grid grid--${cols}`} variant={reveal}>
        {children}
      </RevealGroup>
    )
  }
  return <div className={`grid grid--${cols}`}>{children}</div>
}

const SECTION_COLORS: Record<SectionTone, string> = {
  paper: 'var(--paper)',
  pink: 'var(--pink-100)',
  orange: 'var(--orange-100)',
  ink: 'var(--ink)',
  red: 'var(--red-500)',
}

function tornPath(seed: number) {
  // pseudo-aleatório determinístico: a mesma borda em todo render
  let s = seed * 9301 + 49297
  const rand = () => {
    s = (s * 9301 + 49297) % 233280
    return s / 233280
  }
  const points = ['M0 10', 'L0 5']
  for (let x = 0; x <= 100; x += 1.5 + rand() * 2) {
    points.push(`L${x.toFixed(2)} ${(2 + rand() * 6).toFixed(2)}`)
  }
  points.push('L100 5', 'L100 10', 'Z')
  return points.join(' ')
}

type TornEdgeProps = {
  /** Cor da seção de cima */
  from: SectionTone
  /** Cor da seção de baixo (é ela que "rasga" para cima) */
  to: SectionTone
  seed?: number
}

/** Borda de papel rasgado entre duas seções */
export function TornEdge({ from, to, seed = 1 }: TornEdgeProps) {
  return (
    <svg
      className="torn"
      viewBox="0 0 100 10"
      preserveAspectRatio="none"
      style={{ background: SECTION_COLORS[from] }}
      aria-hidden
    >
      <path d={tornPath(seed)} fill={SECTION_COLORS[to]} />
    </svg>
  )
}
