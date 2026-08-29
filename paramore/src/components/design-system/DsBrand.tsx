import { X } from 'lucide-react'
import DsSection from '@/components/design-system/DsSection'
import Swatch from '@/components/ui/Swatch'
import Logo from '@/components/Logo'

const ICONS = [
  {
    symbol: '| \\ |',
    title: 'As Três Barras',
    body: 'Introduzidas em 2013 e tatuadas por milhões: a personalização da "Tríade Criativa" — Hayley, Taylor e Zac.',
  },
  {
    symbol: '🦋',
    title: 'A Mariposa (BNE)',
    body: 'A borboleta amarela alfinetada simboliza fragilidade, dissecação de conflitos e reconstrução.',
  },
  {
    symbol: '🛋️',
    title: 'O Sofá Vermelho (AWKIF)',
    body: 'O sofá desgastado com a silhueta ausente: abandono, partida e o início da jornada.',
  },
  {
    symbol: '🎤',
    title: 'O Cabelo de Hayley',
    body: 'De laranja fogo ao loiro platinado: catalisadores visuais de cada era.',
  },
]

const ERAS_MATRIX = [
  ['AWKIF (2005)', 'Emo Rock, grunge', '#8B0000 · #1C1C1C · #D1D5DB', 'Courier Final Draft'],
  ['RIOT! (2007)', 'Pop-punk, caos controlado', '#FF6600 · #000 · #FFF', 'Riot hand-drawn / Impact'],
  ['BNE (2009)', 'Melancolia orgânica', '#E5A93C · #2B261F · #ECE5D8', 'Neue Helvetica Thin'],
  ['Self-Titled (2013)', 'Pop-art, street art', '#00C4D6 · #FF2E93 · #FFE600', 'Futura Bold / Tri-Bar'],
  ['After Laughter (2017)', 'New Wave, Memphis', '#00C2CB · #FF6F61 · #FFE800', 'Bauhaus Geometric'],
  ['This Is Why (2023)', 'Post-punk, analógico', '#C04A26 · #C99700 · #2D4B39', 'Futura Bold / Serif'],
] as const

const PB_COLORS = [
  { hex: '#FF5500', name: '--pb-brand-primary', usage: 'Laranja Paramore — energia, paixão, raiz Riot' },
  { hex: '#0A0A0C', name: '--pb-brand-secondary', usage: 'Dark Rock — profundidade e elegância' },
  { hex: '#00D2D3', name: '--pb-brand-accent', usage: 'Cyan elétrico — destaques e links' },
  { hex: '#141418', name: '--pb-brand-surface', usage: 'Superfície de cards e módulos' },
  { hex: '#F8F9FA', name: '--pb-brand-text', usage: 'Branco puro para leitura confortável' },
  { hex: '#9E9EA8', name: '--pb-brand-muted', usage: 'Cinza secundário para metadados' },
]

const DONTS = [
  'Não use rosa choque genérico (#ff0078) — sem conexão histórica com a banda.',
  'Não distorça ou achate o símbolo das três barras.',
  'Não misture elementos de eras conflitantes numa mesma arte sem intenção de linha do tempo.',
  'Não use fotos de baixa resolução ou marcas d’água agressivas sobre os rostos dos integrantes.',
]

export default function DsBrand() {
  return (
    <DsSection id="marca" index="07" label="Identidade visual" title={'Marca: "Paramore is a band"'}>
      <blockquote className="rounded-lg border-l-4 border-accent bg-surface-1 p-6 text-lg italic leading-relaxed text-content-secondary">
        Desde 2004, uma das maiores batalhas de identidade do Paramore foi combater a
        percepção de que era um "projeto solo de Hayley com músicos de apoio". A marca
        não é uma pessoa — é a química criativa e indissolúvel da Tríade:{" "}
        <strong className="text-content-primary">Hayley Williams</strong>,{" "}
        <strong className="text-content-primary">Taylor York</strong> e{" "}
        <strong className="text-content-primary">Zac Farro</strong>.
      </blockquote>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {ICONS.map((icon) => (
          <div key={icon.title} className="rounded-lg border border-line-1 bg-surface-1 p-5">
            <p className="font-mono text-lg text-accent">{icon.symbol}</p>
            <h3 className="mt-2 font-display text-base font-bold text-content-primary">{icon.title}</h3>
            <p className="mt-1.5 text-sm text-content-secondary">{icon.body}</p>
          </div>
        ))}
      </div>

      <h3 className="mt-10 mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
        Matriz das 6 eras — estética, paleta & tipografia
      </h3>
      <div className="overflow-x-auto rounded-lg border border-line-1 bg-surface-1">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line-1 text-xs uppercase tracking-wider text-content-muted">
              <th className="px-4 py-3 font-medium">Era</th>
              <th className="px-4 py-3 font-medium">Estética</th>
              <th className="px-4 py-3 font-medium">Paleta (HEX)</th>
              <th className="px-4 py-3 font-medium">Tipografia chave</th>
            </tr>
          </thead>
          <tbody>
            {ERAS_MATRIX.map((row) => (
              <tr key={row[0]} className="border-b border-line-1 last:border-0">
                <td className="px-4 py-3 font-semibold text-content-primary">{row[0]}</td>
                <td className="px-4 py-3 text-content-secondary">{row[1]}</td>
                <td className="px-4 py-3 font-mono text-xs text-content-muted">{row[2]}</td>
                <td className="px-4 py-3 text-content-secondary">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-12 grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
            Logo Paramore Brasil — construção
          </h3>
          <div className="rounded-lg border border-line-1 bg-surface-1 p-6">
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-14 text-accent" />
              <span className="flex flex-col leading-none">
                <span className="font-display text-xl font-extrabold tracking-tight text-content-primary">
                  PARAMORE
                </span>
                <span className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.25em] text-content-muted">
                  Brasil
                </span>
              </span>
            </div>
            <p className="mt-4 text-sm text-content-secondary">
              Símbolo das 3 barras + <code className="font-mono">PARAMORE</code> em
              caixa alta bold/black (Space Grotesk ou Futura Bold) e{" "}
              <code className="font-mono">BRASIL</code> com tracking expandido de{" "}
              <code className="font-mono">0.25em</code>.
            </p>
            <ul className="mt-3 space-y-1 text-xs text-content-muted">
              <li>• Primary Full: símbolo + nome horizontal</li>
              <li>• Stacked: símbolo acima do nome (favicon e mobile)</li>
              <li>• Monogram: 3 barras no squircle</li>
            </ul>
          </div>
        </div>

        <div>
          <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
            Cores oficiais da marca Paramore Brasil
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PB_COLORS.map((c) => (
              <Swatch key={c.name} hex={c.hex} name={c.name} usage={c.usage} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-lg border border-status-danger/40 bg-status-danger/10 p-6">
        <h3 className="font-display text-base font-bold text-status-danger">Não faça (Don&apos;ts)</h3>
        <ul className="mt-3 space-y-2">
          {DONTS.map((d) => (
            <li key={d} className="flex gap-2 text-sm text-content-secondary">
              <X className="mt-0.5 size-4 shrink-0 text-status-danger" aria-hidden="true" />
              <span>{d}</span>
            </li>
          ))}
        </ul>
      </div>
    </DsSection>
  )
}