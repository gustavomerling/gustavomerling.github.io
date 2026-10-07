import { MovieCard } from '../components/cards'
import { Grid, Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { Tilt } from '../components/motion/Tilt'
import { FILMES } from '../data/filmes'

export function FilmesSection() {
  return (
    <Section
      id="filmes"
      full
      tone="ink"
      decor={<Floaters icons={['ghost', 'bat', 'pumpkin', 'bat']} colors={['var(--white)', 'var(--ink-soft)', 'var(--orange-500)', 'var(--pink-500)']} count={12} seed={13} />}
      eyebrow="Sessão da meia-noite"
      title={
        <>
          Spooky season,
          <br />
          <span className="accent">desde 2021</span>
        </>
      }
      subtitle={
        <>
          Todo outubro, uma lista nova de terror no Letterboxd.
          <br />
          E o aniversário cai bem no meio dela.
        </>
      }
    >
      <Grid cols={4} reveal="slap">
        {FILMES.map((f) => (
          <Tilt key={f.slug}>
            <MovieCard
              title={f.title}
              year={f.year}
              rating={f.rating}
              note={f.review}
              poster={<img src={f.poster} alt={`Pôster de ${f.title}`} loading="lazy" decoding="async" />}
            />
          </Tilt>
        ))}
      </Grid>
    </Section>
  )
}
