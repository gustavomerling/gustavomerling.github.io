import { Palette, Search } from 'lucide-react'
import DsSection from '@/components/design-system/DsSection'
import NewsCard from '@/components/news/NewsCard'
import LyricsViewer from '@/components/album/LyricsViewer'
import TourTracker from '@/components/tour/TourTracker'
import type { FeaturedLyrics } from '@/lib/albums'
import type { NewsItem } from '@/lib/mock-news'

const SAMPLE_NEWS: NewsItem = {
  title: 'Paramore confirma gravações em estúdio para novo projeto',
  excerpt:
    'Trio se reúne em Nashville para trabalhar nas primeiras faixas do que pode ser o sexto álbum de estúdio da banda.',
  date: '28 de Agosto, 2026',
  category: 'Lançamentos',
  readTime: '4 MIN',
  tag: 'TURNÊ 2026',
  image: 'https://placehold.co/600x400/EEE/31343C?text=Novo+projeto+em+estudio',
  body: ['Corpo ilustrativo usado apenas para demonstração dos componentes no design system.'],
  slug: 'design-system-sample',
}

const SAMPLE_LYRICS: FeaturedLyrics = {
  title: 'Crave',
  en: [
    'I can\u2019t wait to see what this turns into',
    "I already know you'll be on my mind",
    "I'm feeling through the phantom pain",
    'Crave, to swallow up time',
  ],
  pt: [
    'Mal posso esperar para ver no que isso vai dar',
    'Já sei que você não vai sair da minha cabeça',
    'Estou sentindo através da dor fantasma',
    'O desejo de devorar o tempo',
  ],
  note: 'A palavra "Crave" aqui simboliza a urgência visceral de Hayley — "swallow up time" é a vontade de suspender o momento.',
}

function NavbarMock() {
  return (
    <div className="rounded-lg border border-line-1 bg-surface-1">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-1 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-9 items-center justify-center rounded bg-accent/20 font-mono text-xs font-bold text-accent">
            | \ |
          </span>
          <span className="font-display text-sm font-extrabold tracking-tight text-content-primary">
            PARAMORE <span className="text-accent">BRASIL</span>
          </span>
        </div>
        <div className="hidden items-center gap-4 text-xs font-medium text-content-secondary md:flex">
          <span>Notícias</span>
          <span>Discografia</span>
          <span>Shows</span>
          <span>Traduções</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full border border-line-1 bg-surface-2 px-3 py-1.5 text-xs">
            <Palette className="size-3.5 text-accent" aria-hidden="true" /> Era:{' '}
            <span className="font-semibold text-accent">RIOT!</span>
          </span>
          <span
            className="inline-flex size-7 items-center justify-center rounded-full border border-line-1 bg-surface-2 text-content-muted"
            aria-hidden="true"
          >
            <Search className="size-3.5" />
          </span>
        </div>
      </div>
      <p className="px-4 py-2 text-center text-[11px] text-content-muted">
        Fixo no topo · <code className="font-mono">backdrop-filter: blur(16px)</code> · fundo rgba(9,9,11,0.85) · Era
        Switcher salvo no localStorage
      </p>
    </div>
  )
}

export default function DsComponents() {
  return (
    <DsSection id="componentes" index="06" label="Biblioteca de UI" title="Componentes em especificação">
      <div className="space-y-12">
        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold tracking-tight text-content-primary">
              6.1 Navbar Global com Seletor de Era
            </h3>
            <span className="font-mono text-xs text-content-muted">&lt;Navbar /&gt;</span>
          </div>
          <NavbarMock />
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold tracking-tight text-content-primary">
              6.2 Card de Notícia Editorial
            </h3>
            <span className="font-mono text-xs text-content-muted">&lt;NewsCard /&gt;</span>
          </div>
          <div className="max-w-md">
            <NewsCard news={SAMPLE_NEWS} />
          </div>
          <p className="mt-3 text-xs text-content-muted">
            Micro-interações: imagem com <code className="font-mono">scale(1.04)</code>, título na cor de
            destaque da era e borda acendendo no hover.
          </p>
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold tracking-tight text-content-primary">
              6.3 Tradutor de Letras Lado a Lado
            </h3>
            <span className="font-mono text-xs text-content-muted">&lt;LyricsViewer /&gt;</span>
          </div>
          <div className="max-w-3xl">
            <LyricsViewer lyrics={SAMPLE_LYRICS} />
          </div>
          <p className="mt-3 text-xs text-content-muted">
            Botão de alternância entre visualização lado a lado (desktop) e abas
            alternadas (mobile).
          </p>
        </div>

        <div>
          <div className="mb-5 flex items-center justify-between gap-3">
            <h3 className="font-display text-lg font-bold tracking-tight text-content-primary">
              6.4 Rastreador de Shows & Turnê
            </h3>
            <span className="font-mono text-xs text-content-muted">&lt;TourTracker /&gt;</span>
          </div>
          <div className="max-w-3xl">
            <TourTracker
              eventLabel="PRÓXIMA PARADA NO BRASIL"
              target={new Date('2026-10-10T16:00:00-03:00').getTime()}
              venue="São Paulo, SP • Allianz Parque • 10 de Outubro de 2026 • Abertura dos portões: 16h00"
            />
          </div>
        </div>
      </div>
    </DsSection>
  )
}