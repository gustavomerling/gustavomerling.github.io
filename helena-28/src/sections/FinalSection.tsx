import { useEffect, useRef, useState } from 'react'
import { useInView } from 'motion/react'
import { Credits, CtaBlock } from '../components/blocks'
import { Burst } from '../components/intro/Burst'
import { Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { Reveal } from '../components/motion/Reveal'
import { Sparkles } from '../components/motion/Sparkles'
import { Button, Sticker } from '../components/primitives'

const BURST_MS = 7000

export function FinalSection() {
  // Quando o "Feliz aniversário" aparece, a festa explode de novo (uma vez)
  const ctaRef = useRef<HTMLDivElement>(null)
  const inView = useInView(ctaRef, { once: true, amount: 0.6 })
  const [burstOver, setBurstOver] = useState(false)
  const bursting = inView && !burstOver

  useEffect(() => {
    if (!inView) return
    const id = setTimeout(() => setBurstOver(true), BURST_MS)
    return () => clearTimeout(id)
  }, [inView])

  return (
    <>
      <Section
        id="final"
        full
        tone="ink"
        decor={<Floaters icons={['star', 'spark', 'star', 'spark']} colors={['var(--white)', 'var(--pink-300)', 'var(--orange-300)']} count={18} seed={144} />}
      >
        <div style={{ display: 'grid', gap: 'var(--space-24)', paddingTop: 'var(--space-8)' }}>
          <div ref={ctaRef}>
            <Reveal variant="slap" amount={0.5}>
              <CtaBlock
                title={<Sparkles>Feliz aniversário, Helena</Sparkles>}
                text="Que os 28 tenham mais show, mais filme de bruxa e mais Curitiba."
                sticker={<Sticker tone="orange">Diva!</Sticker>}
                actions={
                  <Button variant="dark" size="lg" onClick={() => document.getElementById('inicio')?.scrollIntoView()}>
                    Ver de novo
                  </Button>
                }
              />
            </Reveal>
          </div>
          <Credits
            items={[
              { role: 'Estrelando', name: 'Helena Vieira' },
              { role: 'Elenco de apoio', name: 'Bastet & Mocha' },
              { role: 'Trilha sonora', name: 'Taylor Swift, Paramore & Hayley Williams' },
              { role: 'Locação', name: 'Joinville, SC' },
              { role: 'Direção, roteiro e pipoca', name: 'Gustavo' },
            ]}
          />
        </div>
      </Section>
      {bursting && <Burst />}
    </>
  )
}
