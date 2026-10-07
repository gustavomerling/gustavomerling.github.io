import { motion } from 'motion/react'
import { GifCard } from '../components/GifCard'
import { Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { Reveal, RevealGroup } from '../components/motion/Reveal'
import { Sparkles } from '../components/motion/Sparkles'
import { Eyebrow, Sticker, Tape } from '../components/primitives'
import { GIFS } from '../data/gifs'
import './CartaSection.css'

// Texto do Gustavo, revisado
const PARAGRAFOS = [
  'Esses 28 anos não foram fáceis: foram muitas conquistas e derrotas, momentos felizes e decepções.',
  'Os próximos 28 não serão diferentes, mas ainda bem que temos um ao outro. As alegrias vão ser maiores, e vamos estar juntos para deixar mais leves os momentos difíceis.',
  'Obrigado por colocar cor na minha vida e por ser essa pessoa incrível que você é.',
]

export function CartaSection() {
  return (
    <Section
      id="carta"
      full
      tone="pink"
      decor={<Floaters icons={['heart', 'heart', 'bow', 'spark']} colors={['var(--red-500)', 'var(--pink-500)']} count={14} seed={89} />}
    >
      {/* a folha se desdobra de cima para baixo quando aparece */}
      <div className="carta-stage">
        <Reveal variant="unfold" amount={0.3}>
          <article className="carta">
            <Tape position="top" tone="orange" />
            {/* "I don't wanna look at anything else now that I saw you" */}
            <GifCard gif={GIFS.lover} rotate={-7} className="carta__gif" />
            <span className="carta__sticker">
              <Sticker tone="pink" rotate={12}>
                Diva!
              </Sticker>
            </span>
            <Eyebrow>Uma carta</Eyebrow>
            <p className="carta__greeting">Helena,</p>
            <RevealGroup variant="up" stagger={0.35} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              {PARAGRAFOS.map((p) => (
                <p key={p} className="carta__text">
                  {p}
                </p>
              ))}
            </RevealGroup>
            {/* "Diva!" e assinatura seguem a própria folha (herdam o "shown" do Reveal acima),
                então aparecem sempre depois que ela se desdobra */}
            <motion.p
              className="carta__diva"
              variants={{
                hidden: { opacity: 0, scale: 1.6, rotate: -10 },
                shown: { opacity: 1, scale: 1, rotate: 0, transition: { type: 'spring', stiffness: 380, damping: 14, delay: 1.6 } },
              }}
            >
              <Sparkles>Diva!</Sparkles>
            </motion.p>
            {/* assinatura "escrita" da esquerda para a direita */}
            <motion.p
              className="carta__signature"
              variants={{
                hidden: { clipPath: 'inset(-20% 100% -20% 0)' },
                shown: { clipPath: 'inset(-20% 0% -20% 0)', transition: { duration: 1.4, ease: 'easeInOut', delay: 2.1 } },
              }}
            >
              com amor, Gustavo
            </motion.p>
          </article>
        </Reveal>
      </div>
    </Section>
  )
}
