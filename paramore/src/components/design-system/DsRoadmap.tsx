import { Camera, ChevronRight, Disc3, Guitar, Newspaper, ScrollText, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import DsSection from '@/components/design-system/DsSection'

const ROADMAP_ICONS: Record<string, LucideIcon> = {
  'Notícias & Artigos': Newspaper,
  'Discografia Interativa': Disc3,
  Traduções: ScrollText,
  'Shows & Turnê': Guitar,
  'Galeria & Acervo': Camera,
  'A Banda': Zap,
  'Comunidade & Projetos': Users,
}

const IA_GROUPS = [
  { label: 'Notícias & Artigos', children: ['Filtros: Shows | Lançamentos | Hayley | Taylor | Zac'] },
  { label: 'Discografia Interativa', children: ['Página do álbum + faixas + player de áudio'] },
  { label: 'Traduções', children: ['Visualizador lado a lado (EN / PT)'] },
  { label: 'Shows & Turnê', children: ['Rastreador de setlist + histórico Brasil'] },
  { label: 'Galeria & Acervo', children: ['Filtro por era / fotógrafo / shows no Brasil'] },
  { label: 'A Banda', children: ['História & integrantes'] },
  { label: 'Comunidade & Projetos', children: ['Fórum, Discord e projetos'] },
]

const EXCLUSIVES = [
  {
    title: '1. Seletor de Era',
    body: 'Troca a skin de todo o portal com 1 clique no menu superior — cores, tipografia de destaque e elementos gráficos por álbum.',
  },
  {
    title: '2. Hub de Letras',
    body: 'Letra original sincronizada com a tradução, notas da equipe por estrofe e player de áudio embutido.',
  },
  {
    title: '3. Paramore in Brazil Hub',
    body: 'Histórico completo das passagens (2008–2026), galeria de ingressos, setlists e relatos de fãs.',
  },
  {
    title: '4. Live Mode',
    body: 'Barra de alerta em dias de show atualizando setlist e fotos em tempo real, sem recarregar a página.',
  },
]

const STACK = [
  ['Framework', 'Next.js / Astro', 'Velocidade instantânea, SSR híbrido e SEO'],
  ['Estilização', 'Tailwind + CSS Vars', 'Temas por era dinâmicos e fácil manutenção'],
  ['CMS', 'WP REST API / Sanity', 'Reaproveita 20 anos de acervo do WordPress'],
  ['Hospedagem', 'Vercel / Cloudflare', 'CDN global, carregamento rápido no Brasil'],
  ['Mídia', 'Cloudinary / UploadThing', 'WebP/AVIF automático para galerias pesadas'],
] as const

const PHASES = [
  {
    fase: 'Fase 1 — Fundações',
    itens: ['Aprovação da identidade visual e design tokens', 'Repositório + Tailwind + temas das eras', 'Biblioteca base de componentes'],
  },
  {
    fase: 'Fase 2 — Dados & Acervo',
    itens: ['Integração com a API do WordPress', 'Discografia e letras traduzidas', 'Visualizador lado a lado'],
  },
  {
    fase: 'Fase 3 — Recursos de Fã',
    itens: ['Hub de Shows no Brasil e setlist', 'Galeria com filtros por era', 'Testes de acessibilidade e mobile'],
  },
  {
    fase: 'Fase 4 — Lançamento',
    itens: ['Beta fechado com moderadores', 'Lançamento com campanha nas redes'],
  },
] as const

export default function DsRoadmap() {
  return (
    <DsSection id="roadmap" index="10" label="Execução" title="Roadmap de redesenho">
      <div className="grid gap-4 md:grid-cols-2">
        {IA_GROUPS.map((g) => (
          <div key={g.label} className="rounded-lg border border-line-1 bg-surface-1 p-4">
            <p className="flex items-center gap-2 font-display text-sm font-bold text-content-primary">
              {(() => {
                const Icon = ROADMAP_ICONS[g.label]
                return Icon ? <Icon className="size-4 text-accent" /> : null
              })()}
              {g.label}
            </p>
            <ul className="mt-2 space-y-1">
              {g.children.map((c) => (
                <li key={c} className="flex items-center gap-1.5 text-xs text-content-muted">
                  <ChevronRight className="size-3.5 shrink-0 text-accent/70" aria-hidden="true" />
                  {c}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <h3 className="mt-10 mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
        Funcionalidades exclusivas
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {EXCLUSIVES.map((f) => (
          <div key={f.title} className="rounded-lg border border-line-1 bg-surface-1 p-5">
            <h4 className="font-display text-base font-bold text-accent">{f.title}</h4>
            <p className="mt-2 text-sm text-content-secondary">{f.body}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-10 mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
        Stack recomendada
      </h3>
      <div className="overflow-hidden rounded-lg border border-line-1 bg-surface-1">
        {STACK.map(([camada, tech, beneficio]) => (
          <div key={camada} className="grid gap-1 border-b border-line-1 px-5 py-3 text-sm last:border-0 sm:grid-cols-[140px_1fr_1.3fr] sm:gap-4">
            <p className="font-semibold text-content-primary">{camada}</p>
            <p className="text-content-secondary">{tech}</p>
            <p className="text-content-muted">{beneficio}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-10 mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
        Fases de execução
      </h3>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PHASES.map((phase) => (
          <div key={phase.fase} className="rounded-lg border border-line-1 bg-surface-1 p-5">
            <h4 className="font-display text-base font-bold text-content-primary">{phase.fase}</h4>
            <ul className="mt-3 space-y-2">
              {phase.itens.map((item) => (
                <li key={item} className="flex gap-2 text-xs leading-relaxed text-content-secondary">
                  <span className="text-accent" aria-hidden="true">▸</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </DsSection>
  )
}