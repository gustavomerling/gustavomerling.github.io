import { useState, type ReactNode } from 'react'
import { Icon, type IconName } from './icons'
import { CountUp } from './motion/CountUp'
import { Eyebrow, Placeholder, Stars, Tag, Tape } from './primitives'
import type { Tone } from './types'

type CardProps = {
  title: string
  text?: string
  eyebrow?: string
  icon?: IconName
  tone?: Tone
  /** Inclinação em graus, para o ar de colagem */
  tilt?: number
  tape?: boolean
  children?: ReactNode
}

export function Card({ title, text, eyebrow, icon, tone = 'paper', tilt, tape, children }: CardProps) {
  return (
    <article className={tone === 'paper' ? 'card' : `card card--${tone}`} style={tilt ? { rotate: `${tilt}deg` } : undefined}>
      {tape && <Tape />}
      {icon && (
        <span className="card__icon">
          <Icon name={icon} size={30} color="var(--pink-500)" />
        </span>
      )}
      <div className="card__body">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h3 className="card__title">{title}</h3>
        {text && <p className="card__text">{text}</p>}
      </div>
      {children}
    </article>
  )
}

type PolaroidProps = {
  caption?: string
  rotate?: number
  tape?: boolean
  /** Uma <img>; sem ela, entra um placeholder */
  children?: ReactNode
}

export function Polaroid({ caption, rotate = 0, tape = true, children }: PolaroidProps) {
  return (
    <figure className="polaroid" style={rotate ? { rotate: `${rotate}deg` } : undefined}>
      {tape && <Tape position="top" tone="paper" />}
      {children ?? <Placeholder label="foto" ratio="1/1" />}
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  )
}

type MovieCardProps = {
  title: string
  year: number | string
  rating?: number
  genre?: string
  note?: string
  /** Uma <img> do pôster; sem ela, entra um placeholder */
  poster?: ReactNode
}

/** Capa de VHS: pôster, faixas coloridas, nota e comentário à mão */
export function MovieCard({ title, year, rating, genre, note, poster }: MovieCardProps) {
  return (
    <article className="movie">
      <div className="movie__poster">
        {genre && <Tag tone="pink">{genre}</Tag>}
        {poster ?? <Placeholder label="pôster" ratio="2/3" tone="ink" />}
      </div>
      <div className="movie__stripes" />
      <div className="movie__body">
        <h3 className="movie__title">{title}</h3>
        <div className="movie__meta">
          <span>{year}</span>
          {rating !== undefined && <Stars rating={rating} />}
        </div>
        {note && <p className="movie__note" title={note}>{note}</p>}
      </div>
    </article>
  )
}

type TicketCardProps = {
  title: string
  date: string
  place?: string
  admit?: string
  stub?: string
  tone?: 'pink' | 'orange' | 'red' | 'paper'
}

export function TicketCard({ title, date, place, admit = 'ADMIT ONE', stub = 'Nº 028', tone = 'pink' }: TicketCardProps) {
  return (
    <div className="ticket-wrap">
      <article className={`ticket ticket--${tone}`}>
        <div className="ticket__main">
          <span className="ticket__admit">{admit}</span>
          <h3 className="ticket__title">{title}</h3>
          <div className="ticket__meta">
            <span>{date}</span>
            {place && <span>{place}</span>}
          </div>
        </div>
        <div className="ticket__stub">
          <span>{stub}</span>
        </div>
      </article>
    </div>
  )
}

export function StatCard({ value, label, tone = 'paper' }: { value: string; label: string; tone?: Tone }) {
  return (
    <article className={tone === 'paper' ? 'card' : `card card--${tone}`}>
      {/* números contam de 0 até o valor quando aparecem */}
      <p className="stat__value">{/^\d[\d.]*$/.test(value) ? <CountUp value={value} /> : value}</p>
      <p className="stat__label">{label}</p>
    </article>
  )
}

type QuoteCardProps = {
  quote: string
  source: string
  tone?: 'paper' | 'pink' | 'orange'
  tilt?: number
}

/** Frase dela, num pedaço de papel colado com fita */
export function QuoteCard({ quote, source, tone = 'paper', tilt = 0 }: QuoteCardProps) {
  return (
    <figure className={tone === 'paper' ? 'quote' : `quote quote--${tone}`} style={tilt ? { rotate: `${tilt}deg` } : undefined}>
      <Tape position={tilt < 0 ? 'left' : 'top'} tone={tone === 'pink' ? 'orange' : 'pink'} />
      <blockquote>{quote}</blockquote>
      <figcaption>{source}</figcaption>
    </figure>
  )
}

type Track = { song: string; artist: string; time?: string }

type SetlistProps = {
  title: string
  tracks: Track[]
  /** Índice da faixa marcada com marca-texto */
  highlight?: number
}

export function Setlist({ title, tracks, highlight }: SetlistProps) {
  return (
    <article className="setlist">
      <Tape position="top" tone="orange" />
      <h3 className="setlist__title">{title}</h3>
      <ol>
        {tracks.map((t, i) => (
          <li key={t.song} className={i === highlight ? 'is-highlight' : undefined}>
            <span>
              <span className="setlist__song">{t.song}</span> <span className="setlist__artist">· {t.artist}</span>
            </span>
            {t.time && <span className="setlist__time">{t.time}</span>}
          </li>
        ))}
      </ol>
    </article>
  )
}

type QuizCardProps = {
  question: string
  options: string[]
  /** Índice da resposta certa */
  answer: number
  /** Comentário mostrado depois que a pessoa responde */
  reveal?: string
  /** Avisa quem está em volta (ex.: o quiz por etapas) */
  onAnswer?: (correct: boolean) => void
}

export function QuizCard({ question, options, answer, reveal, onAnswer }: QuizCardProps) {
  const [picked, setPicked] = useState<number | null>(null)
  const answered = picked !== null

  return (
    <article className="card">
      <p className="quiz__question">{question}</p>
      <div className="quiz__options">
        {options.map((option, i) => {
          const state = answered && (i === answer ? 'is-correct' : i === picked ? 'is-wrong' : '')
          return (
            <button
              key={option}
              type="button"
              className={`quiz__option ${state || ''}`}
              disabled={answered}
              onClick={() => {
                setPicked(i)
                onAnswer?.(i === answer)
              }}
            >
              {option}
              {answered && i === answer && <Icon name="heart" size={18} color="var(--white)" />}
            </button>
          )
        })}
      </div>
      {answered && reveal && (
        <p className="quiz__reveal" role="status">
          {picked === answer ? 'Acertou! ' : 'Errou feio, errou rude. '}
          {reveal}
        </p>
      )}
    </article>
  )
}
