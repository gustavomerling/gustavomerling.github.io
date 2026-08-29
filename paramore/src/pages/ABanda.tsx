import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, Users, History, Camera } from 'lucide-react'
import { ALBUMS } from '@/lib/albums'
import bandHero from '@/assets/a-banda/band-o2-2023.jpg'
import hayleyPhoto from '@/assets/a-banda/hayley.jpg'
import taylorPhoto from '@/assets/a-banda/taylor.jpg'
import zacPhoto from '@/assets/a-banda/zac.jpg'
import rupturaRio from '@/assets/a-banda/ruptura-rio-2011.jpg'
import TiltCard from '@/components/fx/TiltCard'
import EraAmbientFX from '@/components/fx/EraAmbientFX'

interface EraEvent {
  years: string
  albumId: string
  tag: string
  title: string
  description: string
  image?: string
  imageCaption?: string
}

const EVENTS: EraEvent[] = [
  {
    years: '2002–2005',
    albumId: 'all-we-know-is-falling',
    tag: 'Origens & estreia',
    title: 'Do sofá vermelho ao primeiro disco',
    description:
      'Hayley Williams, de 13 anos, se muda de Meridian, Mississippi, para Franklin, Tennessee. Na escola conhece os irmãos Zac e Josh Farro. Com Jeremy Davis e Jason Bynum, a banda nasce no estúdio The Factory — e estreia com All We Know Is Falling pela Fueled by Ramen, capa da era: o sofá vermelho.',
  },
  {
    years: '2007',
    albumId: 'riot',
    tag: 'Salto global',
    title: 'RIOT! e o furacão pop-punk',
    description:
      'Com Misery Business e crushcrushcrush, o segundo álbum transforma a Paramore em um dos nomes gigantes do gênero: turnês pelo mundo, presença constante na MTV, apertura para bandas lendárias e uma geração inteira aprendendo a cantar junto.',
  },
  {
    years: '2008–2009',
    albumId: 'brand-new-eyes',
    tag: 'Era de ouro',
    title: 'Brand New Eyes, Decode e o topo',
    description:
      'O terceiro álbum estreia no topo das paradas. Mas é Decode — composta para a trilha de Crepúsculo — que leva a banda aos olhos do mundo todo. Ignorance e The Only Exception viram hinos em uma turnê esgotada.',
  },
  {
    years: '2010–2011',
    albumId: 'brand-new-eyes',
    tag: 'Ruptura',
    title: 'A ruptura e a reestruturação',
    description:
      'No fim de 2010, Josh e Zac Farro deixam a banda. Hayley Williams, Taylor York e Jeremy Davis seguem adiante, mantendo a turnê viva — e a América Latina recebe a banda pela primeira vez, com o Rio de Janeiro em fevereiro de 2011.',
    image: rupturaRio,
    imageCaption: 'Paramore no Rio de Janeiro · 2011',
  },
  {
    years: '2013',
    albumId: 'self-titled',
    tag: 'Renascimento',
    title: 'Paramore (Self-Titled): sem medo de mudar',
    description:
      'Primeiro álbum sem Josh, escrito e produzido em parceria com Taylor York. Still Into You e Ain’t It Fun explodem no rádio — esta última rende o Grammy de Melhor Canção de Rock em 2015. E o Brasil recebe a banda de braços (e corações) abertos.',
  },
  {
    years: '2017–2018',
    albumId: 'after-laughter',
    tag: 'Nova fase',
    title: 'A volta de Zac e a escuridão colorida',
    description:
      'Zac Farro retorna à bateria e a banda abraça o synth-pop com letras de ansiedade e libertação. Hard Times lidera a parada alternativa, e a turnê mundial passa por Europa, América do Norte e América do Sul.',
  },
  {
    years: '2023–hoje',
    albumId: 'this-is-why',
    tag: 'Era atual',
    title: 'This Is Why, o Grammy e o amor pelo Brasil',
    description:
      'Depois do hiato — quando Hayley lançou os discos solo Petals for Armor (2020) e Flowers for Vases (2021) — a Paramore volta com o sexto álbum, This Is Why. A faixa-título vence o Grammy de Melhor Performance de Rock Alternativo em 2024, e a banda reencontra o Brasil em turnê.',
  },
]

const GALLERY = [
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/02/Paramore_in_Vancouver.jpg/960px-Paramore_in_Vancouver.jpg',
    caption: 'Vancouver · verão 2009, era Brand New Eyes',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Hayley_Williams_-_concierto_de_Paramore_en_Bogot%C3%A1%2C_Colombia_%282011%29_-_5569060233.jpg/960px-Hayley_Williams_-_concierto_de_Paramore_en_Bogot%C3%A1%2C_Colombia_%282011%29_-_5569060233.jpg',
    caption: 'Bogotá · março de 2011, turnê latino-americana',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/6/66/RiP2013_Paramore_Hayley_Williams_0003.jpg/960px-RiP2013_Paramore_Hayley_Williams_0003.jpg',
    caption: 'Rock in Rio · junho de 2013, Self-Titled',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/37/Paramore_-_The_O2_-_Friday_12th_January_2018_DSC03984ParamoreO2Jan18_%2825112969047%29.jpg/960px-Paramore_-_The_O2_-_Friday_12th_January_2018_DSC03984ParamoreO2Jan18_%2825112969047%29.jpg',
    caption: 'Londres · The O2, janeiro de 2018, After Laughter',
  },
  {
    src: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b8/Paramore_2023.jpg/960px-Paramore_2023.jpg',
    caption: 'Paramore · abril de 2023, era This Is Why',
  },
]

const MEMBERS = [
  {
    name: 'Hayley Williams',
    role: 'Vocal & compositora',
    photo: hayleyPhoto,
    path: '/a-banda/hayley-williams',
    quote: '“Para sempre a garota do sofá vermelho.”',
  },
  {
    name: 'Taylor York',
    role: 'Guitarra, sintetizadores & produção',
    photo: taylorPhoto,
    path: '/a-banda/taylor-york',
    quote: '“O artesão e coração harmônico do Paramore.”',
  },
  {
    name: 'Zac Farro',
    role: 'Bateria, percussão & fotografia',
    photo: zacPhoto,
    path: '/a-banda/zac-farro',
    quote: '“A energia cinética e a visão estética.”',
  },
]

export default function ABanda() {
  return (
    <section className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <EraAmbientFX density="medium" />

      <header className="relative max-w-3xl">
        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent-subtle px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
            <History className="size-3.5" /> A Banda · 2004 — Presente
          </span>
          <span className="rounded-full border border-line-1 bg-surface-1 px-3 py-1 text-xs font-medium text-content-muted">
            3 Integrantes
          </span>
        </div>
        <h1 className="font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
          A história da Paramore
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          De Franklin, Tennessee, para os maiores palcos do mundo: mais de duas décadas,
          seis eras musicais marcantes e uma base de fãs inabalável pelo planeta.
        </p>
      </header>

      {/* Hero Banner Cinemático com Glow */}
      <motion.figure
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="group relative mt-10 overflow-hidden rounded-2xl border border-line-1 bg-surface-1 shadow-2xl"
      >
        <img
          src={bandHero}
          alt="Paramore ao vivo — O2 Arena, Londres, 2023"
          loading="lazy"
          className="h-72 w-full object-cover object-top transition-transform duration-700 ease-out group-hover:scale-105 sm:h-[420px]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
        <figcaption className="absolute bottom-0 inset-x-0 flex flex-wrap items-center justify-between gap-2 p-6 text-xs text-white/90">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent" />
            <span className="font-semibold text-sm">Paramore ao vivo · The O2, Londres (2023)</span>
          </div>
          <span className="font-mono text-white/60">Foto: Wikimedia Commons</span>
        </figcaption>
      </motion.figure>

      {/* Membros em Destaque com TiltCards 3D */}
      <div className="mt-20">
        <div className="max-w-2xl">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            <Users className="size-4" /> Formação Atual
          </div>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-content-primary sm:text-4xl">
            As três mentes da Paramore
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-content-secondary">
            Conheça a história individual, projetos paralelos e curiosidades de Hayley, Taylor e Zac.
          </p>
        </div>

        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERS.map((m) => (
            <TiltCard
              key={m.name}
              maxTilt={8}
              className="group flex flex-col overflow-hidden rounded-2xl border border-line-1 bg-surface-1/90 backdrop-blur-md transition-all duration-300 hover:border-accent/60 hover:bg-surface-2/70"
            >
              <Link to={m.path} className="flex flex-1 flex-col">
                <div className="relative aspect-[4/4.5] overflow-hidden">
                  <img
                    src={m.photo}
                    alt={m.name}
                    loading="lazy"
                    className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-1 via-transparent to-transparent" />
                  <span className="absolute bottom-3 left-4 rounded-full bg-black/70 px-3 py-1 font-mono text-xs font-bold text-accent backdrop-blur-md">
                    {m.role.split(',')[0]}
                  </span>
                </div>

                <div className="flex flex-1 flex-col p-6 pt-2">
                  <h3 className="font-display text-2xl font-bold tracking-tight text-content-primary transition-colors group-hover:text-accent">
                    {m.name}
                  </h3>
                  <p className="mt-2 text-xs italic text-content-muted">
                    {m.quote}
                  </p>
                  <span className="mt-auto inline-flex items-center gap-1.5 pt-5 text-sm font-semibold text-accent transition-transform duration-300 group-hover:translate-x-1">
                    Conhecer história completa
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </span>
                </div>
              </Link>
            </TiltCard>
          ))}
        </div>
      </div>

      {/* Linha do Tempo Visual das Eras */}
      <div className="relative mt-24">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="rounded-full border border-accent/40 bg-accent-subtle px-3.5 py-1 text-xs font-semibold uppercase tracking-widest text-accent">
            Linha do Tempo
          </span>
          <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-content-primary sm:text-4xl">
            A jornada álbum a álbum
          </h2>
        </div>

        <span
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-28 w-0.5 bg-gradient-to-b from-accent via-line-1 to-transparent md:left-1/2 md:-translate-x-1/2"
        />

        <ol className="space-y-16 md:space-y-24">
          {EVENTS.map((event, i) => {
            const album = ALBUMS.find((a) => a.id === event.albumId)
            const flip = i % 2 === 1
            return (
              <li
                key={event.title}
                className="relative grid gap-8 pl-12 sm:pl-16 md:grid-cols-2 md:gap-16 md:pl-0 items-center"
              >
                {/* Node da Linha do Tempo com pulso */}
                <span
                  aria-hidden="true"
                  className="absolute left-5 top-7 -translate-x-1/2 rounded-full border-4 border-surface-1 bg-accent shadow-glow md:left-1/2"
                  style={{ width: 18, height: 18 }}
                />

                <TiltCard
                  maxTilt={8}
                  className={`overflow-hidden rounded-2xl border border-line-1 bg-surface-2/80 backdrop-blur shadow-xl ${
                    flip ? 'md:order-2' : 'md:order-1'
                  }`}
                >
                  {album && (
                    <div className="relative aspect-[16/10] overflow-hidden">
                      <img
                        src={event.image ?? album.image}
                        alt={
                          event.imageCaption ??
                          `Capa de ${album.name} — era ${album.shortName}`
                        }
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out hover:scale-105"
                      />
                      <figcaption className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent px-5 py-3 text-xs font-medium text-white flex items-center justify-between">
                        <span>{event.imageCaption ?? `Era ${album?.shortName} · ${album?.name}`}</span>
                        <span className="font-mono text-accent text-[11px]">{event.years}</span>
                      </figcaption>
                    </div>
                  )}
                </TiltCard>

                <div
                  className={`flex flex-col ${
                    flip ? 'md:order-1 md:items-end md:text-right' : 'md:order-2'
                  }`}
                >
                  <span className="inline-flex w-fit rounded-full border border-accent/40 bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent">
                    {event.tag}
                  </span>
                  <p className="mt-4 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
                    {event.years}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-bold tracking-tight text-content-primary">
                    {event.title}
                  </h3>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-content-secondary">
                    {event.description}
                  </p>
                  {album && (
                    <Link
                      to={`/discos/${album.id}`}
                      className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent-hover"
                    >
                      Ver detalhes da era {album.shortName}
                      <ArrowRight className="size-3.5" />
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      {/* Shows & Mídia no Brasil */}
      <div className="mt-28">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              <Camera className="size-4" /> Acervo Histórico
            </div>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-content-primary sm:text-4xl">
              A Paramore ao vivo pelo mundo
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((img) => (
            <figure
              key={img.src}
              className="group overflow-hidden rounded-2xl border border-line-1 bg-surface-1 shadow-md transition-all duration-300 hover:border-accent/60"
            >
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={img.src}
                  alt={img.caption}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              </div>
              <figcaption className="p-4 text-xs font-medium text-content-secondary">
                {img.caption}
              </figcaption>
            </figure>
          ))}

          <div className="flex flex-col justify-center gap-4 rounded-2xl border border-dashed border-accent/40 bg-accent-subtle/40 p-8">
            <p className="text-sm leading-relaxed text-content-secondary">
              Nosso acervo fotográfico reúne registros de cada turnê, programas de TV e bastidores.
            </p>
            <Link
              to="/galeria"
              className="group inline-flex w-fit items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-xs font-semibold text-content-inverse shadow-glow transition-all hover:bg-accent-hover"
            >
              Explorar Galeria Completa
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}