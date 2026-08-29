import DsSection from '@/components/design-system/DsSection'
import CodeBlock from '@/components/ui/CodeBlock'

const SPACES = [
  ['--space-1', '0.25rem', '4px'],
  ['--space-2', '0.5rem', '8px'],
  ['--space-3', '0.75rem', '12px'],
  ['--space-4', '1rem', '16px'],
  ['--space-6', '1.5rem', '24px'],
  ['--space-8', '2rem', '32px'],
  ['--space-12', '3rem', '48px'],
  ['--space-16', '4rem', '64px'],
  ['--space-24', '6rem', '96px'],
] as const

const RADII = [
  ['--radius-sm', '4px', 'Detalhes'],
  ['--radius-md', '8px', 'Cards e botões'],
  ['--radius-lg', '16px', 'Modais e banners'],
  ['--radius-full', '9999px', 'Badges e avatares'],
] as const

const SPACING_CSS = `:root {
  --space-1: 0.25rem;  /* 4px  */
  --space-2: 0.5rem;   /* 8px  */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1.0rem;   /* 16px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2.0rem;   /* 32px */
  --space-12: 3.0rem;  /* 48px */
  --space-16: 4.0rem;  /* 64px */
  --space-24: 6.0rem;  /* 96px */

  --container-max-width: 1280px;
  --container-editorial-width: 820px; /* leitura de artigos */
  --container-padding: 1.5rem;        /* 24px mobile / 48px desktop */
}`

const SHADOWS = [
  ['--shadow-sm', '0 1px 2px rgba(0,0,0,0.4)', 'Elevação sutil', '0 1px 2px rgba(0,0,0,0.4)'],
  ['--shadow-md', '0 4px 12px rgba(0,0,0,0.5)', 'Cards e menus', '0 4px 12px rgba(0,0,0,0.5)'],
  ['--shadow-lg', '0 12px 32px rgba(0,0,0,0.7)', 'Modais e overlays', '0 12px 32px rgba(0,0,0,0.7)'],
  ['--shadow-glow', '0 0 20px var(--color-accent-glow)', 'Destaques de era', 'var(--shadow-glow)'],
  ['--shadow-punk-offset', '4px 4px 0px #000', 'Estilo pop-punk decalque', '4px 4px 0px #000'],
] as const

export default function DsSpacing() {
  return (
    <DsSection id="espacamento" index="05" label="Layout" title="Espaçamento, grid, raios e sombras">
      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
            Escala de espaçamento
          </h3>
          <div className="overflow-hidden rounded-lg border border-line-1 bg-surface-1">
            {SPACES.map(([token, rem, px]) => (
              <div
                key={token}
                className="flex items-center gap-4 border-b border-line-1 py-2.5 last:border-0"
              >
                <code className="w-28 shrink-0 px-4 font-mono text-xs text-content-secondary">
                  {token}
                </code>
                <div className="flex h-4 shrink-0 items-start" style={{ width: rem }}>
                  <span className="block h-full w-full bg-accent/50" />
                </div>
                <span className="ml-auto pr-4 font-mono text-xs text-content-muted">
                  {rem} · {px}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
              Raios de borda
            </h3>
            <div className="grid gap-6 sm:grid-cols-4">
              {RADII.map(([token, value, uso]) => (
                <div key={token} className="text-center">
                  <div
                    className="mx-auto h-16 w-16 border border-line-2 bg-surface-2"
                    style={{ borderRadius: value === '9999px' ? '50%' : value }}
                  />
                  <p className="mt-2 font-mono text-[10px] text-content-muted">{token}</p>
                  <p className="text-xs text-content-muted">{uso}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-4 font-display text-lg font-bold tracking-tight text-content-primary">
              Sombras e elevação
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {SHADOWS.map(([token, value, uso, css]) => (
                <div key={token} className="rounded-lg border border-line-1 bg-surface-1 p-5">
                  <p className="font-mono text-xs text-content-secondary">{token}</p>
                  <p className="mt-1 text-xs text-content-muted">{uso}</p>
                  <div
                    className="mt-4 h-12 rounded-md border border-line-1 bg-surface-2"
                    style={{ boxShadow: css, backgroundColor: 'var(--color-bg-surface-2)' }}
                  />
                  <p className="mt-2 max-w-full truncate font-mono text-[10px] text-content-muted">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8">
        <CodeBlock code={SPACING_CSS} name="spacing-tokens.css" />
      </div>
    </DsSection>
  )
}