import DsSection from '@/components/design-system/DsSection'
import Swatch from '@/components/ui/Swatch'

const SURFACES = [
  { hex: '#09090B', name: 'canvas', usage: 'Fundo geral da página (profundo)' },
  { hex: '#121216', name: 'surface-1', usage: 'Cards, painéis e barras' },
  { hex: '#1C1C24', name: 'surface-2', usage: 'Cards secundários, inputs, hovers' },
  { hex: '#282834', name: 'surface-3', usage: 'Modais, dropdowns e popovers' },
]

const TEXT = [
  { hex: '#F4F4F6', name: 'text-primary', usage: 'Títulos e corpo (98% branco)' },
  { hex: '#A1A1B2', name: 'text-secondary', usage: 'Metadados, subtítulos e legendas' },
  { hex: '#6E6E82', name: 'text-muted', usage: 'Rodapés, placeholders, timestamps' },
  { hex: '#09090B', name: 'text-inverse', usage: 'Texto sobre botões vibrantes' },
]

const STATUS = [
  { hex: '#10B981', name: 'success', usage: 'Ingressos disponíveis, show confirmado' },
  { hex: '#F59E0B', name: 'warning', usage: 'Poucos ingressos, rumores' },
  { hex: '#EF4444', name: 'danger', usage: 'Esgotado, show cancelado' },
  { hex: '#3B82F6', name: 'info', usage: 'Comunicados e avisos' },
]

const BORDERS = [
  { hex: '#FFFFFF14', name: 'border-subtle', usage: 'Linhas e divisórias — rgba(255,255,255,0.08)' },
  { hex: '#FFFFFF2E', name: 'border-strong', usage: 'Bordas de destaque — rgba(255,255,255,0.18)' },
]

function SwatchRow({ title, items }: { title: string; items: { hex: string; name: string; usage: string }[] }) {
  return (
    <div>
      <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">{title}</h3>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s) => (
          <Swatch key={s.name} hex={s.hex} name={s.name} usage={s.usage} />
        ))}
      </div>
    </div>
  )
}

export default function DsTokens() {
  return (
    <DsSection id="tokens" index="02" label="Fundações" title="Paleta base, superfícies e status (Dark-First)">
      <div className="space-y-10">
        <SwatchRow title="Fundo e superficies" items={SURFACES} />
        <SwatchRow title="Textos e tipografia" items={TEXT} />
        <SwatchRow title="Linhas e divisórias" items={BORDERS} />
        <SwatchRow title="Feedback e status" items={STATUS} />
      </div>
    </DsSection>
  )
}