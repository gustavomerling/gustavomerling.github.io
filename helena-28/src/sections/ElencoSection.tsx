import { FotoPolaroid } from '../components/FotoPolaroid'
import { Grid, Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { Tilt } from '../components/motion/Tilt'
import { Tag } from '../components/primitives'
import { foto } from '../data/fotos'

const ELENCO = [
  { slug: 'bastet-nossa-gatinha', role: '01 · Bastet, da Helena', rotate: -3 },
  { slug: 'mocha', role: '02 · Mocha, do Gustavo (por enquanto)', rotate: 2 },
  { slug: 'mocha-e-bastet-no-aquecedor', role: 'as duas no aquecedor', rotate: -1 },
]

export function ElencoSection() {
  return (
    <Section
      id="elenco"
      full
      tone="pink"
      decor={<Floaters icons={['heart', 'bow', 'heart', 'spark']} colors={['var(--red-500)', 'var(--pink-500)']} count={12} seed={34} />}
      eyebrow="Elenco de apoio"
      title={
        <>
          Bastet
          <br />
          <span className="accent">& Mocha</span>
        </>
      }
      subtitle={
        <>
          A Bastet é dela: a 01. A Mocha é minha: a 02.
          <br />
          Mas a Helena já avisou que, no dia em que for embora, vai roubar a Mocha.
        </>
      }
    >
      <Grid cols={3} reveal="drop">
        {ELENCO.map((e) => (
          <div key={e.slug} style={{ display: 'grid', gap: 'var(--space-4)', justifyItems: 'center' }}>
            <Tilt max={10} glare={false}>
              <FotoPolaroid foto={foto(e.slug)} rotate={e.rotate} />
            </Tilt>
            <Tag tone="ink">{e.role}</Tag>
          </div>
        ))}
      </Grid>
    </Section>
  )
}
