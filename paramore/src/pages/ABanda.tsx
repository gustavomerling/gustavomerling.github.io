import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { ALBUMS } from '@/lib/albums'
import bandHero from '@/assets/a-banda/band-o2-2023.jpg'
import hayleyPhoto from '@/assets/a-banda/hayley.jpg'
import taylorPhoto from '@/assets/a-banda/taylor.jpg'
import zacPhoto from '@/assets/a-banda/zac.jpg'
import rupturaRio from '@/assets/a-banda/ruptura-rio-2011.jpg'

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
  },
  {
    name: 'Taylor York',
    role: 'Guitarra, sintetizadores & produção',
    photo: taylorPhoto,
    path: '/a-banda/taylor-york',
  },
  {
    name: 'Zac Farro',
    role: 'Bateria, percussão & fotografia',
    photo: zacPhoto,
    path: '/a-banda/zac-farro',
  },
]

export default function ABanda() {
  return (
    <section className="mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
      <header className="max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
          A Banda · História
        </p>
        <h1 className="mt-2 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-5xl">
          A história da Paramore
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-content-secondary">
          De Franklin, Tennessee, para os maiores palcos do mundo: mais de 20
          anos, seis álbuns e uma base de fãs que atravessa gerações.
        </p>
      </header>

      <figure className="mt-10 overflow-hidden rounded-xl border border-line-1 bg-surface-1">
        <img
          src={bandHero}
          alt="Paramore ao vivo — O2 Arena, Londres, 2023"
          loading="lazy"
          className="h-72 w-full object-cover object-top sm:h-96"
        />
        <figcaption className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-content-muted">
          <span>Paramore ao vivo · The O2, Londres — 2023</span>
          <span className="font-mono">Foto: Wikimedia Commons</span>
        </figcaption>
      </figure>

      <div className="mt-10 flex flex-wrap items-center gap-2" aria-label="Membros">
        <span className="text-xs font-semibold uppercase tracking-wider text-content-muted">
          Membros
        </span>
        {MEMBERS.map((m) => (
          <Link
            key={m.name}
            to={m.path}
            className="rounded-full border border-line-1 bg-surface-2 px-3.5 py-1.5 text-xs font-medium text-content-secondary transition-colors hover:border-accent/60 hover:text-accent"
          >
            {m.name}
          </Link>
        ))}
      </div>

      <div className="relative mt-16">
        <span
          aria-hidden="true"
          className="absolute bottom-0 left-5 top-0 w-px bg-line-1 md:left-1/2"
        />
        <ol className="space-y-14 md:space-y-20">
          {EVENTS.map((event, i) => {
            const album = ALBUMS.find((a) => a.id === event.albumId)
            const flip = i % 2 === 1
            return (
              <li
                key={event.title}
                className="relative grid gap-6 pl-12 sm:pl-14 md:grid-cols-2 md:gap-16 md:pl-0"
              >
                <span
                  aria-hidden="true"
                  className="absolute left-5 top-7 -translate-x-1/2 rounded-full border-2 border-accent bg-surface-1 md:left-1/2"
                  style={{ width: 14, height: 14 }}
                />
                <figure
                  className={`relative overflow-hidden rounded-xl border border-line-1 bg-surface-2 ${
                    flip ? 'md:order-2' : 'md:order-1'
                  }`}
                >
                  {album && (
                    <img
                      src={event.image ?? album.image}
                      alt={
                        event.imageCaption ??
                        `Capa de ${album.name} — era ${album.shortName}`
                      }
                      loading="lazy"
                      className="aspect-square w-full object-cover transition-transform duration-300 ease-out hover:scale-105"
                    />
                  )}
                  <figcaption className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-4 py-3 text-xs font-medium text-white">
                    {event.imageCaption ?? `Era ${album?.shortName} · ${album?.name}`}
                  </figcaption>
                </figure>
                <div
                  className={`flex flex-col ${
                    flip ? 'md:order-1 md:items-end md:text-right' : 'md:order-2'
                  }`}
                >
                  <span className="inline-flex w-fit rounded-full border border-accent/40 bg-accent-subtle px-3 py-1 text-xs font-semibold text-accent">
                    {event.tag}
                  </span>
                  <p className="mt-4 font-display text-5xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
                    {event.years}
                  </p>
                  <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-content-primary">
                    {event.title}
                  </h2>
                  <p className="mt-3 max-w-md text-sm leading-relaxed text-content-secondary">
                    {event.description}
                  </p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="mt-24">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              Shows & Mídia
            </p>
            <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-content-primary">
              A banda onde vive sua melhor versão:
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {GALLERY.map((img) => (
            <figure
              key={img.src}
              className="group overflow-hidden rounded-xl border border-line-1 bg-surface-1"
            >
              <img
                src={img.src}
                alt={img.caption}
                loading="lazy"
                className="aspect-[4/3] w-full object-cover transition-transform duration-300 ease-out group-hover:scale-105"
              />
              <figcaption className="px-4 py-3 text-xs font-medium text-content-secondary">
                {img.caption}
              </figcaption>
            </figure>
          ))}
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-dashed border-line-1 bg-surface-1 p-6">
            <p className="text-sm leading-relaxed text-content-secondary">
              Todas as fotos desta página vêm do acervo do{' '}
              <span className="font-semibold text-content-primary">
                Wikimedia Commons
              </span>
              , registrando eras incríveis da banda.
            </p>
            <Link
              to="/galeria"
              className="group inline-flex w-fit items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-hover"
            >
              Acervo completo
              <ArrowRight
                className="size-4 translate-y-[2px] transition-transform group-hover:translate-x-0.5"
                aria-hidden="true"
              />
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">
            A Banda · Membros
          </p>
          <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-content-primary">
            As três mentes da Paramore
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-content-secondary">
            Perfis completos com história, carreira solo e curiosidades.
          </p>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MEMBERS.map((m) => (
            <Link
              key={m.name}
              to={m.path}
              className="group flex flex-col overflow-hidden rounded-xl border border-line-1 bg-surface-1 transition-colors hover:border-accent/60 hover:bg-surface-2"
            >
              <div className="overflow-hidden">
                <img
                  src={m.photo}
                  alt={m.name}
                  loading="lazy"
                  className="aspect-[3/4] w-full object-cover object-top transition-transform duration-300 ease-out group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-lg font-bold tracking-tight text-content-primary transition-colors group-hover:text-accent">
                  {m.name}
                </h3>
                <p className="mt-1 text-xs font-medium uppercase tracking-wider text-content-muted">
                  {m.role}
                </p>
                <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-accent">
                  Conhecer {m.name.split(' ')[0]}
                  <ArrowRight className="size-4 translate-y-[2px]" aria-hidden="true" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}