import type { ReactNode } from 'react'
import { Countdown, Credits, CtaBlock, Footer, Hero, SplitBlock, TapeBanner, Timeline } from '../components/blocks'
import { Card, MovieCard, Polaroid, QuizCard, QuoteCard, Setlist, StatCard, TicketCard } from '../components/cards'
import { Icon, type IconName } from '../components/icons'
import { Container, Grid, Section, TornEdge, type SectionTone } from '../components/layout'
import { Button, Hand, List, Placeholder, Ransom, Stars, Sticker, Tag, Tape } from '../components/primitives'
import './DesignSystem.css'

const PALETTE = [
  { group: 'Rosa', tokens: ['pink-50', 'pink-100', 'pink-300', 'pink-500', 'pink-700'] },
  { group: 'Vermelho', tokens: ['red-300', 'red-500', 'red-700'] },
  { group: 'Laranja', tokens: ['orange-100', 'orange-300', 'orange-500'] },
  { group: 'Papel e tinta', tokens: ['white', 'paper', 'paper-dark', 'ink-muted', 'ink-soft', 'ink'] },
]

const FONTS = [
  { token: '--font-display', name: 'Anton', use: 'títulos de pôster', sample: 'HELENA 28', style: { textTransform: 'uppercase' } },
  { token: '--font-serif', name: 'Instrument Serif', use: 'subtítulos, citações', sample: 'who knew evil girls have the prettiest face?', style: { fontStyle: 'italic' } },
  { token: '--font-sans', name: 'DM Sans', use: 'texto corrido', sample: 'Design, muito rock e Taylor Swift.', style: {} },
  { token: '--font-mono', name: 'Space Mono', use: 'ingressos, datas, rótulos', sample: 'ADMIT ONE · 21.10.2026', style: {} },
  { token: '--font-hand', name: 'Caveat', use: 'anotações à mão', sample: 'chorei muito, 5 estrelas', style: {} },
] as const

const TOC = [
  { id: 'fundamentos', label: 'Fundamentos' },
  { id: 'primitivos', label: 'Primitivos' },
  { id: 'cards', label: 'Cards' },
  { id: 'blocos', label: 'Blocos' },
]

const ICON_NAMES: IconName[] = ['bow', 'ghost', 'heart', 'spark', 'pumpkin', 'star', 'film', 'music']

const SECTION_TONES: SectionTone[] = ['paper', 'pink', 'orange', 'red', 'ink']

// Rótulo + exemplo, para cada peça exibida no catálogo
function Specimen({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div className="ds-specimen">
      <code className="ds-specimen__name">{name}</code>
      {children}
    </div>
  )
}

function scrollTo(id: string) {
  // Âncoras com href="#id" conflitam com o HashRouter, por isso o scroll é manual
  document.getElementById(id)?.scrollIntoView()
}

export default function DesignSystem() {
  return (
    <>
      <header className="ds-header">
        <Container>
          <div className="ds-header__inner">
            <strong className="ds-header__brand">
              <Icon name="bow" size={22} color="var(--pink-500)" /> helena.28 / design system
            </strong>
            <nav className="ds-toc">
              {TOC.map((item) => (
                <button key={item.id} type="button" onClick={() => scrollTo(item.id)}>
                  {item.label}
                </button>
              ))}
            </nav>
          </div>
        </Container>
      </header>

      {/* ===================== FUNDAMENTOS ===================== */}
      <Section
        id="fundamentos"
        eyebrow="01 · Fundamentos"
        title={
          <>
            Spooky season,
            <br />
            <span className="accent">mas rosa</span>
          </>
        }
        subtitle="Pôster de cinema e setlist de show, em colagem com muito noise. Tokens em src/styles/tokens.css."
      >
        <div className="ds-stack">
          <Specimen name="Cores">
            <div className="ds-palette">
              {PALETTE.map((p) => (
                <div key={p.group} className="ds-palette__group">
                  <span className="ds-palette__label">{p.group}</span>
                  <div className="ds-swatches">
                    {p.tokens.map((t) => (
                      <div key={t} className="ds-swatch">
                        <div className="ds-swatch__color" style={{ background: `var(--${t})` }} />
                        <code>{t}</code>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Specimen>

          <Specimen name="Tipografia">
            <div className="ds-fonts">
              {FONTS.map((f) => (
                <div key={f.token} className="ds-font">
                  <div className="ds-font__meta">
                    <code>{f.token}</code>
                    <span>
                      {f.name}, {f.use}
                    </span>
                  </div>
                  <p className="ds-font__sample" style={{ fontFamily: `var(${f.token})`, ...f.style }}>
                    {f.sample}
                  </p>
                </div>
              ))}
            </div>
          </Specimen>

          <Specimen name="Textura e forma">
            <Grid cols={4}>
              <div className="ds-shape" style={{ boxShadow: 'var(--shadow-hard)' }}>
                <code>--shadow-hard</code>
              </div>
              <div className="ds-shape" style={{ boxShadow: 'var(--shadow-hard-lg)' }}>
                <code>--shadow-hard-lg</code>
              </div>
              <div className="ds-shape" style={{ boxShadow: 'var(--shadow-photo)', border: 0 }}>
                <code>--shadow-photo</code>
              </div>
              <div className="ds-shape ds-shape--noise">
                <code>--noise</code>
              </div>
            </Grid>
          </Specimen>
        </div>
      </Section>

      <TornEdge from="paper" to="pink" seed={3} />

      {/* ===================== PRIMITIVOS ===================== */}
      <Section id="primitivos" eyebrow="02 · Primitivos" title="Recorta e cola" tone="pink">
        <div className="ds-stack">
          <Specimen name="<Button />">
            <div className="actions">
              <Button>Primário</Button>
              <Button variant="dark">Escuro</Button>
              <Button variant="secondary">Secundário</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
            <div className="actions">
              <Button size="sm">Pequeno</Button>
              <Button>Médio</Button>
              <Button size="lg">Grande</Button>
            </div>
          </Specimen>

          <Specimen name="<Ransom />">
            <div className="ds-ransom">
              <Ransom text="HELENA" />
              <Ransom text="spooky 28" seed={4} />
            </div>
          </Specimen>

          <Specimen name="<Sticker />">
            <div className="actions">
              <Sticker tone="orange">28 anos!</Sticker>
              <Sticker tone="pink" rotate={8}>
                +18
              </Sticker>
              <Sticker tone="ink" shape="circle" rotate={-4}>
                em cartaz
              </Sticker>
              <Sticker tone="red" size={88} rotate={12}>
                boo!
              </Sticker>
            </div>
          </Specimen>

          <Specimen name="<Tag /> · <Stars /> · <Hand />">
            <div className="actions">
              <Tag>Papel</Tag>
              <Tag tone="pink">Rom-com</Tag>
              <Tag tone="red">Terror</Tag>
              <Tag tone="orange">Halloween</Tag>
              <Tag tone="ink">Bruxa</Tag>
            </div>
            <div className="actions">
              <Stars rating={5} />
              <Stars rating={3.5} />
              <Stars rating={2} />
              <Hand>duas estrelas só pelo jack black</Hand>
            </div>
          </Specimen>

          <Specimen name="<Icon />">
            <div className="actions">
              {ICON_NAMES.map((name, i) => (
                <span key={name} className="ds-icon">
                  <Icon name={name} size={40} color={['var(--pink-500)', 'var(--white)', 'var(--red-500)', 'var(--orange-500)'][i % 4]} />
                  <code>{name}</code>
                </span>
              ))}
            </div>
          </Specimen>

          <Specimen name="<Tape /> · <Placeholder />">
            <Grid cols={4}>
              <div className="ds-taped">
                <Tape />
                <Placeholder label="pink" />
              </div>
              <div className="ds-taped">
                <Tape position="left" tone="orange" />
                <Placeholder label="orange" tone="orange" />
              </div>
              <div className="ds-taped">
                <Tape position="right" tone="paper" />
                <Placeholder label="red" tone="red" />
              </div>
              <div className="ds-taped">
                <Placeholder label="ink" tone="ink" />
              </div>
            </Grid>
          </Specimen>

          <Specimen name="<List />">
            <List items={['Taylor Swift', 'Paramore', 'Hayley Williams', 'Avril Lavigne']} />
          </Specimen>
        </div>
      </Section>

      <TornEdge from="pink" to="paper" seed={7} />

      {/* ===================== CARDS ===================== */}
      <Section id="cards" eyebrow="03 · Cards" title="Em cartaz" subtitle="Todos cabem em <Grid cols={2|3|4}>.">
        <div className="ds-stack">
          <Specimen name="<MovieCard />">
            <Grid cols={4}>
              <MovieCard title="Sorry, Baby" year={2025} rating={5} genre="Drama" note="chorei muito" />
              <MovieCard title="Over the Garden Wall" year={2014} rating={5} genre="Spooky" />
              <MovieCard title="A Bruxa" year={2015} rating={4.5} genre="Terror" note="bruxa favorita" />
              <MovieCard title="What a Girl Wants" year={2003} rating={3.5} genre="Rom-com" />
            </Grid>
          </Specimen>

          <Specimen name="<TicketCard />">
            <Grid cols={3}>
              <TicketCard title="Hayley Williams" date="show 1 de 3" place="2026" />
              <TicketCard title="Spooky Season" date="outubro" place="sofá de casa" tone="orange" stub="Nº 033" />
              <TicketCard title="Helena, 28" date="21.10.2026" place="Joinville" tone="red" admit="ESTREIA" />
            </Grid>
          </Specimen>

          <Specimen name="<StatCard />">
            <Grid cols={4}>
              <StatCard value="28" label="anos" tone="pink" />
              <StatCard value="982" label="filmes no Filmow" />
              <StatCard value="3" label="shows da Hayley" tone="orange" />
              <StatCard value="5" label="spooky seasons" tone="ink" />
            </Grid>
          </Specimen>

          <Specimen name="<QuoteCard />">
            <Grid cols={3}>
              <QuoteCard quote="tudo que eu tenho a oferecer é design, muito rock e taylor swift" source="X · @helefanta" tilt={-2} />
              <QuoteCard quote="your favorite artist's favorite designer" source="Pinterest" tone="pink" tilt={1.5} />
              <QuoteCard quote="who knew evil girls have the prettiest face?" source="Filmow" tone="orange" tilt={-1} />
            </Grid>
          </Specimen>

          <Specimen name="<Setlist />">
            <Grid cols={2}>
              <Setlist
                title="setlist da Helena"
                highlight={1}
                tracks={[
                  { song: 'Misery Business', artist: 'Paramore', time: '3:31' },
                  { song: 'Dead Horse', artist: 'Hayley Williams', time: '4:03' },
                  { song: 'All Too Well (10 min)', artist: 'Taylor Swift', time: '10:13' },
                  { song: 'Complicated', artist: 'Avril Lavigne', time: '4:04' },
                  { song: 'Hard Times', artist: 'Paramore', time: '3:02' },
                ]}
              />
              <Card title="Card genérico" text="Para qualquer coisa que não tenha um card próprio." icon="ghost" tape tilt={1.5}>
                <div className="actions">
                  <Tag tone="pink">Tag</Tag>
                  <Button size="sm" variant="secondary">
                    Ação
                  </Button>
                </div>
              </Card>
            </Grid>
          </Specimen>

          <Specimen name="<QuizCard />">
            <Grid cols={2}>
              <QuizCard
                question="Quantos shows da Hayley a Helena vai ver em 2026?"
                options={['Um', 'Dois', 'Três', 'Nenhum, ela odeia a Hayley']}
                answer={2}
                reveal="São três!"
              />
              <QuizCard
                question="Qual a tradição de outubro dela?"
                options={['Spooky season no Letterboxd', 'Maratona de Harry Potter', 'Nenhuma']}
                answer={0}
                reveal="Uma lista de terror todo ano, desde 2021."
              />
            </Grid>
          </Specimen>

          <Specimen name="<Polaroid />">
            <div className="ds-polaroids">
              <Polaroid caption="spooky season" rotate={-4} />
              <Polaroid caption="joinville ♡" rotate={3} />
              <Polaroid caption="show da hayley" rotate={-1} />
            </div>
          </Specimen>
        </div>
      </Section>

      <TornEdge from="paper" to="orange" seed={11} />

      {/* ===================== BLOCOS ===================== */}
      <Section id="blocos" eyebrow="04 · Blocos" title="Seções inteiras" subtitle="Prontas para empilhar na LP." tone="orange">
        <div className="ds-stack">
          <Specimen name="<Hero />">
            <div className="ds-frame">
              <Hero
                eyebrow="Em cartaz · 21.10.2026"
                title={<Ransom text="HELENA" />}
                subtitle="Uma garota, 28 anos, muito rock, Taylor Swift e filmes de bruxa."
                actions={
                  <>
                    <Button size="lg">Dar o play</Button>
                    <Button size="lg" variant="ghost">
                      ver o trailer
                    </Button>
                  </>
                }
              />
            </div>
          </Specimen>

          <Specimen name="<TapeBanner /> · <TapeBanner crossed />">
            <div className="ds-frame">
              <TapeBanner items={['Feliz aniversário', 'Helena 28', 'Spooky season', 'Taylor & Paramore']} />
              <TapeBanner items={['Não ultrapasse', 'Aniversariante', 'Área rosa']} tone="orange" tilt={3} crossed />
            </div>
          </Specimen>

          <Specimen name="<SplitBlock /> e <SplitBlock reverse />">
            <div className="ds-frame ds-frame--padded ds-stack">
              <SplitBlock eyebrow="Quem é" title="Designer de dia, cinéfila de noite" text="Texto de apoio sobre a Helena, em uma ou duas frases.">
                <List items={['Design gráfico', 'Terror e bruxas', 'Muito rock']} />
              </SplitBlock>
              <SplitBlock reverse eyebrow="Onde" title="Joinville, onde tudo ficou bom" text="E Curitiba ali, no horizonte.">
                <Button variant="dark">Uma ação</Button>
              </SplitBlock>
            </div>
          </Specimen>

          <Specimen name="<Timeline /> · <Countdown />">
            <Grid cols={2}>
              <div className="ds-frame ds-frame--padded">
                <Timeline
                  items={[
                    { date: '2022', title: 'Joinville', text: 'Uma mudança e um começo.' },
                    { date: '17.12.2023', title: 'Voltamos a nos falar' },
                    { date: '02.2024', title: 'Mesma casa, mesmo sofá', text: 'E muitos filmes no Letterboxd.' },
                  ]}
                />
              </div>
              <div className="ds-frame ds-frame--padded ds-center">
                <Countdown to="2026-10-21T00:00:00-03:00" caption="até a estreia: 21.10.2026" doneText={<Sticker tone="pink">é hoje!</Sticker>} />
              </div>
            </Grid>
          </Specimen>

          <Specimen name="<Credits />">
            <div className="ds-frame">
              <Section tone="ink" eyebrow="Fim" title="Créditos" center>
                <Credits
                  items={[
                    { role: 'Estrelando', name: 'Helena Vieira' },
                    { role: 'Trilha sonora', name: 'Taylor Swift, Paramore & Hayley Williams' },
                    { role: 'Locação', name: 'Joinville, SC' },
                    { role: 'Direção, roteiro e pipoca', name: 'Gustavo' },
                  ]}
                />
              </Section>
            </div>
          </Specimen>

          <Specimen name="<CtaBlock />">
            <div className="ds-frame ds-frame--padded" style={{ paddingTop: 'var(--space-12)' }}>
              <CtaBlock
                title="Feliz aniversário, Helena"
                text="Que os 28 tenham mais show, mais filme de bruxa e mais Curitiba."
                sticker={<Sticker tone="orange">28!</Sticker>}
                actions={<Button variant="dark" size="lg">Soprar as velas</Button>}
              />
            </div>
          </Specimen>

          <Specimen name='<Section tone="…" /> · <TornEdge />'>
            <div className="ds-frame">
              {SECTION_TONES.map((tone, i) => (
                <div key={tone}>
                  {i > 0 && <TornEdge from={SECTION_TONES[i - 1]} to={tone} seed={i * 5} />}
                  <div className={`section section--${tone} ds-tone`}>
                    <Container>
                      <code>tone="{tone}"</code>
                    </Container>
                  </div>
                </div>
              ))}
            </div>
          </Specimen>

          <Specimen name="<Footer />">
            <div className="ds-frame">
              <Footer>
                <span>feito com ♡ pelo Gustavo</span>
                <span>21.10.2026 · Joinville</span>
              </Footer>
            </div>
          </Specimen>
        </div>
      </Section>
    </>
  )
}
