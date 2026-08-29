import DsNav from '@/components/design-system/DsNav'
import DsPrinciples from '@/components/design-system/DsPrinciples'
import DsTokens from '@/components/design-system/DsTokens'
import DsEraThemes from '@/components/design-system/DsEraThemes'
import DsTypography from '@/components/design-system/DsTypography'
import DsSpacing from '@/components/design-system/DsSpacing'
import DsComponents from '@/components/design-system/DsComponents'
import DsBrand from '@/components/design-system/DsBrand'
import DsVoice from '@/components/design-system/DsVoice'
import DsAccessibility from '@/components/design-system/DsAccessibility'
import DsRoadmap from '@/components/design-system/DsRoadmap'
import { Badge } from '@/components/ui/Badge'

const SOURCES = [
  'paramore_design_system.md',
  'paramore_brand_and_visual_guide.md',
  'paramore_communication_guide.md',
  'paramore_redesign_roadmap.md',
]

export default function DesignSystem() {
  return (
    <>
      <header className="relative overflow-hidden border-b border-line-1">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(ellipse 70% 55% at 50% -15%, var(--color-accent-subtle), transparent)',
          }}
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-[var(--container-max)] px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">DS-PB v2.0.0</Badge>
            <Badge>Tailwind · CSS Variables · React/Next/Astro</Badge>
          </div>
          <h1 className="mt-4 font-display text-4xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
            Design System
            <span className="block text-accent">Paramore Brasil</span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-content-secondary">
            Documentação de engenharia e design de interface para
            desenvolvedores front-end, designers UI/UX e criadores de conteúdo do
            Paramore Brasil — digitalizada a partir dos quatro documentos de marca.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {SOURCES.map((src) => (
              <code
                key={src}
                className="rounded-md border border-line-1 bg-surface-1 px-2.5 py-1 font-mono text-xs text-content-muted"
              >
                {src}
              </code>
            ))}
          </div>
        </div>
      </header>

      <DsNav />

      <div className="mx-auto max-w-[var(--container-max)] px-4 sm:px-6">
        <DsPrinciples />
        <DsTokens />
        <DsEraThemes />
        <DsTypography />
        <DsSpacing />
        <DsComponents />
        <DsBrand />
        <DsVoice />
        <DsAccessibility />
        <DsRoadmap />
      </div>
    </>
  )
}