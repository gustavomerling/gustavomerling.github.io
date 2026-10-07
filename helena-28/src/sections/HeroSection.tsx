import { Hero } from '../components/blocks'
import { FotoPolaroid } from '../components/FotoPolaroid'
import { Floaters } from '../components/motion/Floaters'
import { Sparkles } from '../components/motion/Sparkles'
import { Button, Ransom, Sticker } from '../components/primitives'
import { foto } from '../data/fotos'

/** `ready`: a entrada só começa quando o cartão de abertura sai */
export function HeroSection({ ready = true }: { ready?: boolean }) {
  return (
    <Hero
      id="inicio"
      ready={ready}
      decor={<Floaters icons={['bow', 'heart', 'spark', 'star']} colors={['var(--pink-500)', 'var(--red-500)', 'var(--orange-500)']} count={12} seed={3} />}
      eyebrow="Em cartaz · 21.10.2026"
      title={
        <Sparkles>
          <Ransom text="HELENA" play={ready} />
        </Sparkles>
      }
      subtitle={
        <>
          28 anos de design, muito rock,
          <br />
          Taylor Swift e filme de bruxa.
        </>
      }
      actions={
        <Button size="lg" onClick={() => document.getElementById('quem-e')?.scrollIntoView()}>
          Começar a sessão
        </Button>
      }
      collage={
        <>
          <FotoPolaroid foto={foto('helena-e-o-nemo')} />
          <FotoPolaroid foto={foto('helena-e-uma-hello-kitty-gigante')} />
          <Sticker tone="orange">28 anos!</Sticker>
        </>
      }
    />
  )
}
