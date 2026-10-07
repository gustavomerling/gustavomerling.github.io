import { useCallback, useState } from 'react'
import { Footer, TapeBanner } from '../components/blocks'
import { TornEdge } from '../components/layout'
import { GlitterCursor } from '../components/motion/GlitterCursor'
import { ScrollProgress } from '../components/motion/ScrollProgress'
import { Plim } from '../components/Plim'
import { SectionNav } from '../components/SectionNav'
import { CartaSection } from '../sections/CartaSection'
import { ElencoSection } from '../sections/ElencoSection'
import { FilmesSection } from '../sections/FilmesSection'
import { FinalSection } from '../sections/FinalSection'
import { HeroSection } from '../sections/HeroSection'
import { IntroSection } from '../sections/IntroSection'
import { LinksSection } from '../sections/LinksSection'
import { MusicaSection } from '../sections/MusicaSection'
import { QuemESection } from '../sections/QuemESection'
import { QuizSection } from '../sections/QuizSection'
import { TimelineSection } from '../sections/TimelineSection'
import { ValeSection } from '../sections/ValeSection'

const NAV = [
  { id: 'inicio', label: 'Início' },
  { id: 'quem-e', label: 'Ficha técnica' },
  { id: 'filmes', label: 'Filmes' },
  { id: 'musica', label: 'Música' },
  { id: 'linha-do-tempo', label: 'Linha do tempo' },
  { id: 'elenco', label: 'Bastet & Mocha' },
  { id: 'vale', label: 'Coisa do vale' },
  { id: 'quiz', label: 'Quiz' },
  { id: 'carta', label: 'Carta' },
  { id: 'final', label: 'Parabéns' },
  { id: 'links', label: 'Links úteis' },
]

/** A LP: cada seção é um componente em src/sections, empilhado aqui em ordem */
export default function Home() {
  // vira true quando o cartão de abertura sai: libera a entrada do hero e o easter egg
  const [revealed, setRevealed] = useState(false)
  const onReveal = useCallback(() => setRevealed(true), [])

  return (
    <>
      <IntroSection onReveal={onReveal} />
      <ScrollProgress />
      <GlitterCursor />
      <SectionNav items={NAV} />
      <Plim enabled={revealed} />

      <HeroSection ready={revealed} />
      <TornEdge from="pink" to="paper" seed={2} />
      <TapeBanner items={['Diva', 'Mona', 'Fazer o barro', 'Fizeram piada do seu mousse', 'Helena 28']} />
      <QuemESection />
      <TornEdge from="paper" to="ink" seed={5} />
      <FilmesSection />
      <TornEdge from="ink" to="orange" seed={8} />
      <MusicaSection />
      <TornEdge from="orange" to="paper" seed={11} />
      <TimelineSection />
      <TornEdge from="paper" to="pink" seed={14} />
      <ElencoSection />
      <TornEdge from="pink" to="red" seed={17} />
      <ValeSection />
      <TornEdge from="red" to="paper" seed={20} />
      <QuizSection />
      <TornEdge from="paper" to="pink" seed={23} />
      <CartaSection />
      <TornEdge from="pink" to="ink" seed={26} />
      <FinalSection />
      <TornEdge from="ink" to="pink" seed={29} />
      <LinksSection />
      <TornEdge from="pink" to="ink" seed={32} />
      <Footer>
        <span>feito com ♡ pelo Gustavo</span>
        <span>21.10.2026 · Joinville</span>
      </Footer>
    </>
  )
}
