import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { motion, useScroll, useTransform, type MotionValue } from 'motion/react'
import { Polaroid } from './cards'
import { Icon, type IconName } from './icons'
import { Container } from './layout'
import { remaining } from '../lib/time'
import { revealVariants } from './motion/variants'
import { Eyebrow, Sticker } from './primitives'

type HeroProps = {
  id?: string
  title: ReactNode
  subtitle?: ReactNode
  eyebrow?: string
  actions?: ReactNode
  /** Número gigante vazado no fundo */
  bgNumber?: string
  /** Colagem do lado direito; o padrão são duas polaroids e um adesivo */
  collage?: ReactNode
  /** Segura a entrada animada até virar true (ex.: o cartão de abertura sair) */
  ready?: boolean
  /** Decoração de fundo (ex.: <Floaters />) */
  decor?: ReactNode
}

/** Hero em formato de pôster de filme, com parallax na rolagem e no mouse */
export function Hero({ id, title, subtitle, eyebrow, actions, bgNumber = '28', collage, ready = true, decor }: HeroProps) {
  const ref = useRef<HTMLElement>(null)
  const frame = useRef(0)

  // Rolagem: o "28" do fundo desce devagar, o texto desce e a colagem sobe
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], [0, 280])
  const bgRotate = useTransform(scrollYProgress, [0, 1], [0, -14])
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 140])
  const collageY = useTransform(scrollYProgress, [0, 1], [0, -110])

  // Mouse: cada peça da colagem anda um pouco, em profundidades diferentes (via CSS)
  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (e.pointerType !== 'mouse') return
    const el = ref.current
    if (!el) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      el.style.setProperty('--mx', String(clientX / window.innerWidth - 0.5))
      el.style.setProperty('--my', String(clientY / window.innerHeight - 0.5))
    })
  }

  const enter = (delay: number) => ({
    initial: { opacity: 0, y: 30 },
    animate: ready ? { opacity: 1, y: 0 } : undefined,
    transition: { type: 'spring' as const, stiffness: 120, damping: 18, delay },
  })

  return (
    <header id={id} ref={ref} className="hero" onPointerMove={onPointerMove}>
      {decor}
      <motion.span className="hero__bg-number" style={{ y: bgY, rotate: bgRotate }} aria-hidden>
        {bgNumber}
      </motion.span>
      <Container>
        <div className="hero__inner">
          <motion.div className="hero__content" style={{ y: contentY }}>
            {eyebrow && (
              <motion.div {...enter(0.05)}>
                <Eyebrow>{eyebrow}</Eyebrow>
              </motion.div>
            )}
            <h1 className="hero__title">{title}</h1>
            {subtitle && (
              <motion.p className="hero__subtitle" {...enter(0.85)}>
                {subtitle}
              </motion.p>
            )}
            {actions && (
              <motion.div className="actions" {...enter(1.05)}>
                {actions}
              </motion.div>
            )}
          </motion.div>
          <motion.div style={{ y: collageY }}>
            <motion.div
              className="hero__collage"
              initial={{ opacity: 0, scale: 0.6, rotate: -12 }}
              animate={ready ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
              transition={{ type: 'spring', stiffness: 110, damping: 13, delay: 0.45 }}
            >
              {collage ?? (
                <>
                  <Polaroid caption="foto 1" />
                  <Polaroid caption="foto 2" />
                  <Sticker tone="orange">28 anos!</Sticker>
                </>
              )}
            </motion.div>
          </motion.div>
        </div>
      </Container>
    </header>
  )
}

type TapeBannerProps = {
  items: string[]
  icons?: IconName[]
  tone?: 'ink' | 'pink' | 'orange'
  /** Inclinação em graus */
  tilt?: number
  /** Cruza uma segunda faixa rosa por trás, em X */
  crossed?: boolean
}

/**
 * Faixa no estilo "fita de isolamento". O texto anda com a rolagem da página
 * (não é animação automática, então funciona igual em qualquer navegador)
 */
export function TapeBanner({ items, icons = ['spark', 'ghost', 'bow', 'pumpkin'], tone = 'ink', tilt = -2, crossed }: TapeBannerProps) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const forward = useTransform(scrollYProgress, [0, 1], ['8%', '-18%'])
  const backward = useTransform(scrollYProgress, [0, 1], ['-18%', '8%'])

  // Repete o conteúdo o bastante para cobrir telas largas mesmo andando
  const strip = (stripTone: string, deg: number, x: MotionValue<string>, hidden: boolean) => (
    <div className={`faixa faixa--${stripTone}`} style={{ rotate: `${deg}deg` }} aria-hidden={hidden}>
      <motion.div className="faixa__inner" style={{ x }}>
        {Array.from({ length: 6 }, (_, copy) =>
          items.map((item, i) => (
            <span key={`${copy}-${i}`} className="faixa__item" aria-hidden={copy > 0}>
              {item}
              <Icon name={icons[i % icons.length]} size={26} />
            </span>
          )),
        )}
      </motion.div>
    </div>
  )

  return (
    <div ref={ref} className={crossed ? 'faixa-wrap faixa-wrap--crossed' : 'faixa-wrap'}>
      {crossed && strip(tone === 'pink' ? 'ink' : 'pink', -tilt, backward, true)}
      {strip(tone, tilt, forward, false)}
    </div>
  )
}

type SplitBlockProps = {
  title: string
  text?: string
  eyebrow?: string
  children?: ReactNode
  /** Lado visual; o padrão é uma polaroid */
  media?: ReactNode
  reverse?: boolean
}

export function SplitBlock({ title, text, eyebrow, children, media, reverse }: SplitBlockProps) {
  return (
    <div className={reverse ? 'split split--reverse' : 'split'}>
      <div className="split__content">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h2 className="split__title">{title}</h2>
        {text && <p className="split__text">{text}</p>}
        {children}
      </div>
      <div className="split__media">{media ?? <Polaroid rotate={reverse ? -3 : 3} caption="legenda" />}</div>
    </div>
  )
}

type TimelineItem = { date: string; title: string; text?: string }

export function Timeline({ items }: { items: TimelineItem[] }) {
  return (
    <ol className="timeline">
      {items.map((item) => (
        <li key={item.date} className="timeline__item">
          <span className="timeline__dot">
            <Icon name="heart" size={22} />
          </span>
          <span className="tag tag--paper">{item.date}</span>
          <h3 className="timeline__title">{item.title}</h3>
          {item.text && <p className="timeline__text">{item.text}</p>}
        </li>
      ))}
    </ol>
  )
}

type CountdownProps = {
  /** Data/hora alvo em ISO, ex.: "2026-10-21T00:00:00-03:00" */
  to: string
  caption?: string
  /** Mostrado no lugar dos números quando a data chega */
  doneText?: ReactNode
}

export function Countdown({ to, caption, doneText }: CountdownProps) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const { done, units } = remaining(new Date(to).getTime(), now)

  return (
    <div className="countdown">
      {done && doneText ? (
        doneText
      ) : (
        <div className="countdown__grid" role="timer">
          {units.map((u) => (
            <div key={u.label} className="countdown__unit">
              <span className="countdown__value">{String(u.value).padStart(2, '0')}</span>
              <span className="countdown__label">{u.label}</span>
            </div>
          ))}
        </div>
      )}
      {caption && <p className="countdown__caption">{caption}</p>}
    </div>
  )
}

const creditRow = revealVariants('up')

/** Créditos finais de filme: função em cima, nome embaixo; sobem um de cada vez */
export function Credits({ items }: { items: { role: string; name: string }[] }) {
  return (
    <motion.dl
      className="credits"
      initial="hidden"
      whileInView="shown"
      viewport={{ once: true, amount: 0.3 }}
      variants={{ hidden: {}, shown: { transition: { staggerChildren: 0.35 } } }}
    >
      {items.map((item) => (
        <motion.div key={item.role} className="credits__row" variants={creditRow} custom={0}>
          <dt className="credits__role">{item.role}</dt>
          <dd className="credits__name">{item.name}</dd>
        </motion.div>
      ))}
    </motion.dl>
  )
}

type CtaBlockProps = {
  title: ReactNode
  text?: string
  actions?: ReactNode
  sticker?: ReactNode
}

export function CtaBlock({ title, text, actions, sticker }: CtaBlockProps) {
  return (
    <div className="cta">
      {sticker}
      <h2 className="cta__title">{title}</h2>
      {text && <p className="cta__text">{text}</p>}
      {actions && <div className="actions">{actions}</div>}
    </div>
  )
}

export function Footer({ children }: { children?: ReactNode }) {
  return (
    <footer className="footer">
      <Container>
        <div className="footer__inner">{children}</div>
      </Container>
    </footer>
  )
}
