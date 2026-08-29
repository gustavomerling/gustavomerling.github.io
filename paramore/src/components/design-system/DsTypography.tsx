import DsSection from '@/components/design-system/DsSection'

const SCALE = [
  ['display', '4.5rem / 72px', '2.75rem / 44px', '1.05', '-0.04em', 'Hero e anúncios de álbum'],
  ['h1', '3.25rem / 52px', '2.25rem / 36px', '1.15', '-0.03em', 'Títulos de artigos e páginas'],
  ['h2', '2.25rem / 36px', '1.75rem / 28px', '1.25', '-0.02em', 'Cabeçalhos de seções'],
  ['h3', '1.5rem / 24px', '1.25rem / 20px', '1.3', '-0.01em', 'Títulos de cards'],
  ['h4', '1.25rem / 20px', '1.125rem / 18px', '1.4', '0em', 'Subtítulos de widgets'],
  ['body-lg', '1.125rem / 18px', '1rem / 16px', '1.65', '0em', 'Introdução e destaques'],
  ['body-base', '1rem / 16px', '0.9375rem / 15px', '1.6', '0em', 'Corpo editorial e traduções'],
  ['body-sm', '0.875rem / 14px', '0.8125rem / 13px', '1.5', '+0.01em', 'Metadados'],
  ['caption', '0.75rem / 12px', '0.75rem / 12px', '1.4', '+0.04em', 'Créditos e badges'],
] as const

const FAMILIES = [
  {
    name: 'Space Grotesk',
    role: 'Headings & Display',
    weights: '600, 700',
    sample: 'font-display',
    className: 'font-display',
  },
  {
    name: 'Plus Jakarta Sans',
    role: 'Body & Editorial',
    weights: '400, 500, 600',
    sample: 'Corpo de texto com leitura confortável.',
    className: 'font-sans',
  },
  {
    name: 'JetBrains Mono',
    role: 'Monospace & Letras',
    weights: '400, 500, 600',
    sample: 'Setlists, códigos e traduções // 01. You First',
    className: 'font-mono',
  },
] as const

const ERA_FONTS = [
  ['Padrão (portal)', 'Space Grotesk', 'Plus Jakarta Sans', 'Sólida e rock, sem ruído'],
  ['AWKIF — All We Know Is Falling', 'Special Elite', 'Special Elite', 'Máquina de escrever analógica e grunge'],
  ['RIOT!', 'Anton', 'Permanent Marker', 'Garrafais de pôster (marker nos badges)'],
  ['Brand New Eyes', 'Inter (200)', 'Caveat (600)', 'Minimalista e melancólica (diário)'],
  ['Self-Titled', 'Montserrat (900)', 'Montserrat', 'Geométrica pesada, estilo fita isolante'],
  ['After Laughter', 'Righteous', 'Righteous', 'Synthwave 80s, divertida e geométrica'],
  ['This Is Why', 'DM Serif Display', 'DM Serif Display', 'Editorial cinematográfica anos 70'],
] as const

export default function DsTypography() {
  return (
    <DsSection id="tipografia" index="04" label="Escala tipográfica" title="Tipografia: escala e famílias">
      <div className="overflow-x-auto rounded-lg border border-line-1 bg-surface-1">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line-1 text-xs uppercase tracking-wider text-content-muted">
              <th className="px-4 py-3 font-medium">Token</th>
              <th className="px-4 py-3 font-medium">Desktop</th>
              <th className="px-4 py-3 font-medium">Mobile</th>
              <th className="px-4 py-3 font-medium">Line height</th>
              <th className="px-4 py-3 font-medium">Tracking</th>
              <th className="px-4 py-3 font-medium">Uso</th>
            </tr>
          </thead>
          <tbody>
            {SCALE.map((row) => (
              <tr key={row[0]} className="border-b border-line-1 last:border-0">
                <td className="px-4 py-3">
                  <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-content-secondary">
                    --font-size-{row[0]}
                  </code>
                </td>
                <td className="px-4 py-3 text-content-secondary">{row[1]}</td>
                <td className="px-4 py-3 text-content-secondary">{row[2]}</td>
                <td className="px-4 py-3 font-mono text-xs text-content-muted">{row[3]}</td>
                <td className="px-4 py-3 font-mono text-xs text-content-muted">{row[4]}</td>
                <td className="px-4 py-3 text-content-muted">{row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {FAMILIES.map((f) => (
          <div key={f.name} className="rounded-lg border border-line-1 bg-surface-1 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{f.role}</p>
            <h3 className="mt-2 font-display text-lg font-bold text-content-primary">{f.name}</h3>
            <p className="mt-1 text-xs text-content-muted">Pesos: {f.weights}</p>
            <p className={`mt-4 text-base ${f.className} text-content-primary`}>{f.sample}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {FAMILIES.map((f) => (
          <div key={f.name} className="rounded-lg border border-line-1 bg-surface-1 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">{f.role}</p>
            <h3 className="mt-2 font-display text-lg font-bold text-content-primary">{f.name}</h3>
            <p className="mt-1 text-xs text-content-muted">Pesos: {f.weights}</p>
            <p className={`mt-4 text-base ${f.className} text-content-primary`}>{f.sample}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 overflow-x-auto rounded-lg border border-line-1 bg-surface-1">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-line-1 text-xs uppercase tracking-wider text-content-muted">
              <th className="px-4 py-3 font-medium">Era</th>
              <th className="px-4 py-3 font-medium">Principal (display)</th>
              <th className="px-4 py-3 font-medium">Secundária (detail)</th>
              <th className="px-4 py-3 font-medium">Vibe</th>
            </tr>
          </thead>
          <tbody>
            {ERA_FONTS.map((row) => (
              <tr key={row[0]} className="border-b border-line-1 last:border-0">
                <td className="px-4 py-3 font-medium text-content-primary">{row[0]}</td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: row[1] }}>{row[1]}</span>
                </td>
                <td className="px-4 py-3">
                  <span style={{ fontFamily: row[2] }}>{row[2]}</span>
                </td>
                <td className="px-4 py-3 text-content-muted">{row[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 space-y-6 rounded-lg border border-line-1 bg-surface-1 p-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            display (72px desktop)
          </p>
          <p className="font-display text-5xl font-extrabold tracking-tight text-content-primary sm:text-6xl">
            PARAMORE BRASIL
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            h2 (36px)
          </p>
          <p className="font-display text-4xl font-extrabold tracking-tight text-content-primary">
            Seis eras de resistência
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            h3 (24px)
          </p>
          <p className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
            Misery Business ao vivo em SP
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            body-base (16px)
          </p>
          <p className="max-w-xl text-base leading-relaxed text-content-secondary">
            A leitura editorial vive no corpo do artigo: parágrafo confortável,
            largura de coluna em 820px e relações de linha sem brilho — só
            conteúdo respirando.
          </p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            caption (12px)
          </p>
          <p className="text-xs text-content-muted">
            Foto: Lindsey Byrnes · Allianz Parque, São Paulo · 10 out 2026
          </p>
        </div>
      </div>
    </DsSection>
  )
}