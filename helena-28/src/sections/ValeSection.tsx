import { Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { RevealGroup } from '../components/motion/Reveal'
import { Hand, Sticker } from '../components/primitives'
import type { Tone } from '../components/types'
import './ValeSection.css'

// Frases que ela usa (do Twitter, "coisa do vale")
const FRASES = ['Diva', 'Mona', 'Fazer o barro', 'Fizeram piada do seu mousse']

// Pajubá com significado documentado (UFRGS, UFMG)
const DICIONARIO = [
  { termo: 'Babado', sentido: 'fofoca' },
  { termo: 'Bafo', sentido: 'novidade' },
  { termo: 'Gongar', sentido: 'zombar de alguém' },
  { termo: 'Aqué', sentido: 'dinheiro' },
  { termo: 'Picumã', sentido: 'cabelo (e a tinta dele nos braços)' },
]

// "Apenas para gays e mulheres". Carros: Fiat 500 e BYD Dolphin ela citou; o resto vem da lista viral do Eduardo Emanuel
const CARROS = ['BYD Dolphin', 'Fiat 500', 'Mini Cooper', 'New Beetle', 'Nissan March', 'Peugeot 208']
const OUTROS = ['Taylor Swift', 'Paramore', 'Hello Kitty', 'Sex and the City', 'Aperol Spritz', 'Copo Stanley', 'Mamma Mia!']

const TONES: Tone[] = ['pink', 'orange', 'paper', 'red', 'ink']
const TILTS = [-8, 6, -4, 10, -10, 4, -6, 8]

function Certificados({ items, offset = 0 }: { items: string[]; offset?: number }) {
  return (
    <RevealGroup className="vale__stickers" variant="pop" stagger={0.07}>
      {items.map((item, i) => (
        <Sticker
          key={item}
          tone={TONES[(i + offset) % TONES.length]}
          size={124}
          rotate={TILTS[(i + offset) % TILTS.length]}
          shape={(i + offset) % 3 === 2 ? 'circle' : 'burst'}
        >
          {item}
        </Sticker>
      ))}
    </RevealGroup>
  )
}

export function ValeSection() {
  return (
    <Section
      id="vale"
      full
      tone="red"
      decor={<Floaters icons={['spark', 'heart', 'star', 'bow']} colors={['var(--pink-300)', 'var(--orange-300)', 'var(--white)']} count={10} seed={55} />}
      eyebrow="Coisa do vale"
      title={
        <>
          Apenas para
          <br />
          <span className="accent">gays e mulheres</span>
        </>
      }
      subtitle="O vocabulário e as preferências oficiais da Helena."
    >
      <div className="vale">
        <div className="vale__row">
          <div className="vale__block">
            <Hand color="var(--white)">frases que você vai ouvir aqui em casa</Hand>
            <RevealGroup className="vale__frases" variant="left" stagger={0.12}>
              {FRASES.map((f, i) => (
                <p key={f} className="vale__frase" style={{ rotate: `${TILTS[i] / 3}deg` }}>
                  “{f}”
                </p>
              ))}
            </RevealGroup>
          </div>

          <div className="vale__block">
            <Hand color="var(--white)">dicionário do vale</Hand>
            <RevealGroup className="vale__dicionario" variant="right" stagger={0.1}>
              {DICIONARIO.map((d) => (
                <p key={d.termo} className="vale__verbete">
                  <strong>{d.termo}</strong>
                  <span>{d.sentido}</span>
                </p>
              ))}
            </RevealGroup>
          </div>
        </div>

        <div className="vale__block">
          <Hand color="var(--white)">certificados: apenas para gays e mulheres</Hand>
          <p className="vale__group">carros</p>
          <Certificados items={CARROS} />
          <p className="vale__group">e o resto</p>
          <Certificados items={OUTROS} offset={3} />
        </div>
      </div>
    </Section>
  )
}
