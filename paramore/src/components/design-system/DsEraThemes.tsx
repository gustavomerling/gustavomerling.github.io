import DsSection from '@/components/design-system/DsSection'
import { THEMES } from '@/lib/nav'
import { applyTheme, persistTheme } from '@/lib/theme'

const ERAS = [
  {
    id: 'default',
    label: 'Paramore Brasil Modern',
    accent: '#FF5500',
    font: 'Space Grotesk',
    ink: 'Plus Jakarta Sans',
    paleta: ['#FF5500', '#FF7733'],
    desc: 'Tema padrão do portal — laranja Paramore com leitura clara.',
  },
  {
    id: 'awkif',
    label: 'AWKIF (2005)',
    accent: '#9E1B1B',
    font: 'Special Elite',
    ink: 'Special Elite',
    paleta: ['#9E1B1B', '#C22626', '#1C1C1C'],
    desc: 'Vermelho sofá desgastado — grunge e garagem.',
  },
  {
    id: 'riot',
    label: 'RIOT! (2007)',
    accent: '#FF6600',
    font: 'Anton',
    ink: 'Permanent Marker',
    paleta: ['#FF6600', '#FF8533', '#000000'],
    desc: 'Laranja Riot fogo — caos controlado, contraste máximo.',
  },
  {
    id: 'bne',
    label: 'Brand New Eyes (2009)',
    accent: '#E5A93C',
    font: 'Inter',
    ink: 'Caveat',
    paleta: ['#E5A93C', '#F0BC5E', '#2B261F'],
    desc: 'Amarelo ocre da mariposa — melancolia orgânica.',
  },
  {
    id: 'selftitled',
    label: 'Self-Titled (2013)',
    accent: '#00D8ED',
    font: 'Montserrat',
    ink: 'Montserrat',
    paleta: ['#00D8ED', '#38E5F6', '#FF2E93'],
    desc: 'Cyan elétrico — renascimento pop-art e fita adesiva.',
  },
  {
    id: 'afterlaughter',
    label: 'After Laughter (2017)',
    accent: '#FF6F61',
    font: 'Righteous',
    ink: 'Righteous',
    paleta: ['#FF6F61', '#FF8C80', '#00C2CB'],
    desc: 'Coral neon Memphis — new wave oitentista.',
  },
  {
    id: 'thisiswhy',
    label: 'This Is Why (2023)',
    accent: '#C04A26',
    font: 'DM Serif Display',
    ink: 'DM Serif Display',
    paleta: ['#C04A26', '#D75B34', '#C99700'],
    desc: 'Terracota analog — cinematográfico, anos 70.',
  },
]

export default function DsEraThemes() {
  const preview = (id: string) => {
    const theme = THEMES.find((t) => t.id === id)
    if (!theme) return
    applyTheme(theme.bodyClass)
    persistTheme(id)
  }

  return (
    <DsSection id="eras" index="03" label="Temas dinâmicos" title="Era-Theming: alternar a era com 1 clique">
      <p className="max-w-2xl text-sm leading-relaxed text-content-secondary">
        Aplique a classe no <code className="rounded bg-surface-1 px-1.5 py-0.5 font-mono text-xs">body</code>{" "}
        e as variáveis de destaque mudam instantaneamente. O seletor no topo do
        portal usa este mecanismo e salva a preferência no{" "}
        <code className="rounded bg-surface-1 px-1.5 py-0.5 font-mono text-xs">localStorage</code>. Clique
        numa era para pré-visualizar.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ERAS.map((era) => (
          <button
            key={era.id}
            type="button"
            onClick={() => preview(era.id)}
            className="rounded-lg border border-line-1 bg-surface-1 p-5 text-left transition-all hover:-translate-y-0.5 hover:border-accent/60"
          >
            <div className="flex items-center justify-between gap-3">
              <span
                className="size-8 rounded-md border border-line-1"
                style={{ backgroundColor: era.accent }}
              />
              <span className="font-mono text-[10px] uppercase tracking-wider text-content-muted">
                body.theme-{era.id}
              </span>
            </div>
            <h3 className="mt-3 font-display text-base font-bold text-content-primary" style={{ fontFamily: era.font }}>
              {era.label}
            </h3>
            <p className="mt-1 text-xs text-content-muted">{era.desc}</p>
            <p className="mt-2 text-xs">
              <span className="font-display" style={{ fontFamily: era.font }}>
                {era.font}
              </span>
              <span className="mx-1.5 text-content-muted">+</span>
              <span style={{ fontFamily: era.ink }}>{era.ink}</span>
            </p>
            <p className="mt-2 text-xs">
              <span className="text-content-muted">Highlight: </span>
              <span className="font-mono" style={{ color: era.accent }}>{era.accent}</span>
            </p>
            <div className="mt-3 flex items-center gap-1.5">
              {era.paleta.map((hex) => (
                <span
                  key={hex}
                  className="size-3.5 rounded-full border border-line-1"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          </button>
        ))}
      </div>
    </DsSection>
  )
}