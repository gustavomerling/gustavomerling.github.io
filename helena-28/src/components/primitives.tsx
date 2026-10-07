import type { CSSProperties, ReactNode } from 'react'
import { motion } from 'motion/react'
import type { Tone } from './types'

type ButtonProps = {
  children: ReactNode
  variant?: 'primary' | 'dark' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  block?: boolean
  href?: string
  onClick?: () => void
}

export function Button({ children, variant = 'primary', size = 'md', block, href, onClick }: ButtonProps) {
  const className = ['btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, block && 'btn--block']
    .filter(Boolean)
    .join(' ')

  if (href) {
    return (
      <a className={className} href={href}>
        {children}
      </a>
    )
  }
  return (
    <button type="button" className={className} onClick={onClick}>
      {children}
    </button>
  )
}

export function Tag({ children, tone = 'paper' }: { children: ReactNode; tone?: Tone }) {
  return <span className={`tag tag--${tone}`}>{children}</span>
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return <span className="eyebrow">{children}</span>
}

/** Texto "escrito à mão", para anotações na colagem */
export function Hand({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span className="hand" style={color ? { color } : undefined}>
      {children}
    </span>
  )
}

/** Nota no formato do Letterboxd: ★★★½ */
export function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  return (
    <span className="stars" role="img" aria-label={`${rating} de 5 estrelas`}>
      {'★'.repeat(full)}
      {half && '½'}
    </span>
  )
}

type TapeProps = {
  position?: 'top' | 'left' | 'right'
  tone?: 'pink' | 'orange' | 'paper'
}

/** Fita adesiva. O pai precisa de position: relative */
export function Tape({ position = 'top', tone = 'pink' }: TapeProps) {
  return <span className={`tape tape--${position} tape--${tone}`} aria-hidden />
}

const BURST = (() => {
  const spikes = 14
  const points = Array.from({ length: spikes * 2 }, (_, i) => {
    const r = i % 2 ? 41 : 50
    const a = (Math.PI * i) / spikes - Math.PI / 2
    return `${(50 + r * Math.cos(a)).toFixed(2)}% ${(50 + r * Math.sin(a)).toFixed(2)}%`
  })
  return `polygon(${points.join(',')})`
})()

type StickerProps = {
  children: ReactNode
  tone?: Tone
  size?: number
  rotate?: number
  shape?: 'burst' | 'circle'
}

export function Sticker({ children, tone = 'orange', size = 112, rotate = -10, shape = 'burst' }: StickerProps) {
  return (
    <span className="sticker-wrap" style={{ rotate: `${rotate}deg` }}>
      <span
        className={`sticker sticker--${tone} ${shape === 'circle' ? 'sticker--circle' : ''}`}
        style={{ '--size': `${size}px`, clipPath: shape === 'burst' ? BURST : undefined } as CSSProperties}
      >
        {children}
      </span>
    </span>
  )
}

const RANSOM_FONTS = [
  { family: 'var(--font-display)', scale: 1, italic: false },
  { family: 'var(--font-serif)', scale: 1.05, italic: true },
  { family: 'var(--font-mono)', scale: 0.85, italic: false },
  { family: 'var(--font-hand)', scale: 1.2, italic: false },
  { family: 'var(--font-sans)', scale: 0.9, italic: false },
]

const RANSOM_LOOKS = [
  { bg: 'var(--pink-500)', fg: 'var(--white)' },
  { bg: 'var(--white)', fg: 'var(--ink)' },
  { bg: 'var(--ink)', fg: 'var(--pink-300)' },
  { bg: 'var(--orange-500)', fg: 'var(--ink)' },
  { bg: 'var(--red-500)', fg: 'var(--white)' },
  { bg: 'var(--pink-100)', fg: 'var(--red-700)' },
]

type RansomProps = {
  text: string
  /** Muda a combinação de fontes/cores sem mudar o texto */
  seed?: number
  /**
   * Letras caem uma a uma, girando. Sem a prop, ficam paradas;
   * com false, ficam escondidas esperando (ex.: até o cartão de abertura sair)
   */
  play?: boolean
  /**
   * O recorte depende também do caractere: quando ele muda (ex.: contagem regressiva),
   * entra um recorte novo, com outra cor/fonte, num "pop"
   */
  byChar?: boolean
}

/** Letras recortadas de revista. O tamanho vem do font-size do pai */
export function Ransom({ text, seed = 0, play, byChar }: RansomProps) {
  return (
    <span className="ransom">
      <span className="sr-only">{text}</span>
      {[...text].map((ch, i) => {
        if (ch === ' ') return <span key={i} className="ransom__space" aria-hidden />
        const k = i + seed + (byChar ? ch.charCodeAt(0) * 7 : 0)
        const font = RANSOM_FONTS[(k * 3) % RANSOM_FONTS.length]
        const look = RANSOM_LOOKS[(k * 5 + 1) % RANSOM_LOOKS.length]
        const tilt = ((k * 37) % 11) - 5
        const style: CSSProperties = {
          fontFamily: font.family,
          fontSize: `${font.scale}em`,
          fontStyle: font.italic ? 'italic' : undefined,
          background: look.bg,
          color: look.fg,
        }
        if (play === undefined) {
          return (
            <span
              // com byChar, a key muda junto com o caractere e o recorte é "colado" de novo
              key={byChar ? `${i}-${ch}` : i}
              className={byChar ? 'ransom__ch ransom__ch--pop' : 'ransom__ch'}
              aria-hidden
              style={{ ...style, rotate: `${tilt}deg` }}
            >
              {ch}
            </span>
          )
        }
        return (
          <motion.span
            key={i}
            className="ransom__ch"
            aria-hidden
            style={style}
            initial={{ opacity: 0, y: '-120%', rotate: tilt - 50, scale: 1.6 }}
            animate={play ? { opacity: 1, y: 0, rotate: tilt, scale: 1 } : undefined}
            transition={{ type: 'spring', stiffness: 320, damping: 14, delay: 0.15 + i * 0.09 }}
          >
            {ch}
          </motion.span>
        )
      })}
    </span>
  )
}

type PlaceholderProps = {
  label?: string
  /** Proporção largura/altura, ex.: "4/3" */
  ratio?: string
  /** Tamanho fixo (quadrado), útil para avatares */
  size?: number
  round?: boolean
  tone?: 'pink' | 'orange' | 'red' | 'ink'
}

export function Placeholder({ label, ratio = '4/3', size, round, tone = 'pink' }: PlaceholderProps) {
  const style: CSSProperties = size ? { width: size, height: size } : { aspectRatio: ratio }
  const className = ['placeholder', `placeholder--${tone}`, round && 'placeholder--round'].filter(Boolean).join(' ')
  return (
    <div className={className} style={style} aria-hidden>
      {label && <span>{label}</span>}
    </div>
  )
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}
