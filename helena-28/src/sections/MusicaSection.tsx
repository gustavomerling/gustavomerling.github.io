import { TicketCard } from '../components/cards'
import { GifCard } from '../components/GifCard'
import { Grid, Section } from '../components/layout'
import { Floaters } from '../components/motion/Floaters'
import { Tilt } from '../components/motion/Tilt'
import { Hand } from '../components/primitives'
import { SpotifyEmbed } from '../components/SpotifyEmbed'
import { GIFS } from '../data/gifs'
import './MusicaSection.css'

// IDs conferidos no oEmbed do Spotify. Dead Horse é o link que ela postou no X.
const PLAYERS = [
  { type: 'track', id: '5RdkyZw1KQ1v0EbquUAsx2', title: 'Dead Horse, Hayley Williams' },
  { type: 'artist', id: '74XFHRwlV6OrjEM0A2NCMF', title: 'Paramore' },
  { type: 'artist', id: '06HL4z0CvFAxyc27GXpf02', title: 'Taylor Swift' },
  { type: 'artist', id: '0p4nmQO2msCgU4IF37Wi3j', title: 'Avril Lavigne' },
] as const

// The Hayley Williams Show, Brasil 2026 (Rolling Stone / Omelete)
const SHOWS = [
  { date: '10.11.2026', place: 'Qualistage · Rio', stub: 'Nº 001', tone: 'pink' },
  { date: '12.11.2026', place: 'Espaço Unimed · SP', stub: 'Nº 002', tone: 'paper' },
  { date: '13.11.2026', place: 'Espaço Unimed · SP', stub: 'Nº 003', tone: 'red' },
] as const

export function MusicaSection() {
  return (
    <Section
      id="musica"
      full
      tone="orange"
      decor={<Floaters icons={['music', 'star', 'music', 'heart']} colors={['var(--orange-500)', 'var(--pink-500)', 'var(--red-500)']} count={11} seed={21} />}
      eyebrow="Trilha sonora"
      title={
        <>
          Muito rock
          <br />
          <span className="accent">e Taylor Swift</span>
        </>
      }
      subtitle="Quem falar mal da Taylor ou do Paramore leva block."
    >
      <div className="musica">
        <div className="musica__pick">
          <span className="musica__eq" aria-hidden>
            <i />
            <i />
            <i />
            <i />
            <i />
          </span>
          <Hand>"o maior hit da carreira da hayley"</Hand>
          <span className="musica__source">ela, no X, sobre Dead Horse</span>
        </div>
        <Grid cols={2} reveal="up">
          {PLAYERS.map((p) => (
            <SpotifyEmbed key={p.id} type={p.type} id={p.id} title={p.title} />
          ))}
        </Grid>

        <Hand color="var(--ink)">no telão: Taylor, a cantora favorita</Hand>
        <Grid cols={4} reveal="slap">
          {[GIFS.era1989, GIFS.bejeweled, GIFS.karma, GIFS.erasTour].map((g, i) => (
            <Tilt key={g.id} max={10}>
              <GifCard gif={g} rotate={[-3, 2, -2, 3][i]} />
            </Tilt>
          ))}
        </Grid>

        <Hand color="var(--ink)">The Hayley Williams Show: os 3 shows dela em 2026</Hand>
        <Grid cols={3} reveal="drop">
          {SHOWS.map((s) => (
            <Tilt key={s.date} max={14}>
              <TicketCard title="Hayley Williams" date={s.date} place={s.place} stub={s.stub} tone={s.tone} />
            </Tilt>
          ))}
        </Grid>
      </div>
    </Section>
  )
}
