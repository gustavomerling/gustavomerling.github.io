import { QuoteCard, StatCard } from '../components/cards'
import { Grid, Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { LETTERBOXD_TOTAL } from '../data/filmes'

export function QuemESection() {
  return (
    <Section
      id="quem-e"
      full
      decor={<Floaters icons={['spark', 'heart', 'star']} colors={['var(--pink-300)', 'var(--orange-300)']} seed={5} />}
      eyebrow="Ficha técnica"
      title={
        <>
          Designer de dia,
          <br />
          <span className="accent">cinéfila de noite</span>
        </>
      }
    >
      <div style={{ display: 'grid', gap: 'var(--space-16)' }}>
        <Grid cols={4} reveal="pop">
          <StatCard value="28" label="anos em 21.10" tone="pink" />
          <StatCard value="982" label="filmes no Filmow" />
          <StatCard value={LETTERBOXD_TOTAL} label="filmes no Letterboxd" tone="orange" />
          <StatCard value="5" label="spooky seasons" tone="ink" />
        </Grid>
        <Grid cols={3} reveal="drop">
          <QuoteCard quote="tudo que eu tenho a oferecer é design, muito rock e taylor swift" source="X · @helefanta" tilt={-2} />
          <QuoteCard quote="your favorite artist's favorite designer" source="Pinterest" tone="pink" tilt={1.5} />
          <QuoteCard quote="who knew evil girls have the prettiest face?" source="Filmow" tone="orange" tilt={-1} />
        </Grid>
      </div>
    </Section>
  )
}
