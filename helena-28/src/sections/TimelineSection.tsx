import { Fragment, useEffect, useRef } from 'react'
import { FotoPolaroid } from '../components/FotoPolaroid'
import { Container } from '../components/layout'
import { Reveal } from '../components/motion/Reveal'
import { Eyebrow } from '../components/primitives'
import { FOTOS } from '../data/fotos'
import './TimelineSection.css'

// Inclinações alternadas, para parecer colado à mão
const TILTS = [-3, 2, -1.5, 3, -2, 1]

/**
 * Linha do tempo com rolagem lateral: a seção "gruda" na tela e a rolagem
 * vertical move o trilho de fotos para a direita.
 */
export function TimelineSection() {
  const outerRef = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const outer = outerRef.current
    const track = trackRef.current
    if (!outer || !track) return

    let distance = 0
    let frame = 0
    let lastX = 0
    let settle = 0

    // A altura da seção é o quanto o trilho precisa andar + uma tela
    const measure = () => {
      distance = Math.max(0, track.scrollWidth - window.innerWidth)
      outer.style.height = `${distance + window.innerHeight}px`
    }

    const update = () => {
      frame = 0
      const scrolled = -outer.getBoundingClientRect().top
      const progress = distance ? Math.min(Math.max(scrolled / distance, 0), 1) : 0
      const x = -progress * distance
      track.style.transform = `translate3d(${x}px, 0, 0)`
      progressRef.current?.style.setProperty('--progress', String(progress))

      // As fotos entortam na direção do movimento, proporcional à velocidade, e voltam quando para
      const skew = Math.max(-10, Math.min(10, (x - lastX) * 0.12))
      lastX = x
      track.style.setProperty('--skew', `${skew}deg`)
      clearTimeout(settle)
      settle = window.setTimeout(() => track.style.setProperty('--skew', '0deg'), 120)
    }

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const onResize = () => {
      measure()
      update()
    }

    // Mede de novo quando a janela ou o trilho mudam (ex.: a fonte termina de carregar)
    const resizeObserver = new ResizeObserver(onResize)
    resizeObserver.observe(track)
    onResize()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [])

  return (
    <section id="linha-do-tempo" ref={outerRef} className="hscroll">
      <div className="hscroll__sticky">
        <Container>
          <header className="hscroll__header">
            <Eyebrow>Rolo de câmera</Eyebrow>
            <h2 className="section__title">
              Linha do tempo <span className="accent">2024 → hoje</span>
            </h2>
          </header>
        </Container>

        <div ref={trackRef} className="hscroll__track">
          {FOTOS.map((f, i) => {
            const year = f.date.slice(0, 4)
            const newYear = i === 0 || FOTOS[i - 1].date.slice(0, 4) !== year
            return (
              <Fragment key={f.slug}>
                {newYear && (
                  <div className="hscroll__year" aria-label={`Ano ${year}`}>
                    {year}
                  </div>
                )}
                <Reveal className="hscroll__item" variant={i % 2 ? 'drop' : 'pop'} amount={0.3}>
                  <FotoPolaroid foto={f} rotate={TILTS[i % TILTS.length]} stamp />
                </Reveal>
              </Fragment>
            )
          })}
          <div className="hscroll__end">
            <span className="hand">continua…</span>
          </div>
        </div>

        <Container>
          <div ref={progressRef} className="hscroll__progress" aria-hidden />
        </Container>
      </div>
    </section>
  )
}
