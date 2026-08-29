import type { FeaturedLyrics } from '@/lib/albums'

export default function LyricsViewer({ lyrics }: { lyrics: FeaturedLyrics }) {
  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-extrabold tracking-tight text-content-primary">
          {lyrics.title}
        </h3>
        <span className="text-xs font-medium uppercase tracking-wider text-content-muted">
          Letra original / Tradução
        </span>
      </div>

      <div className="grid gap-6 rounded-lg border border-line-1 bg-surface-1 p-6 md:grid-cols-2 md:gap-0">
        <div className="md:border-r md:border-line-1 md:pr-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            Inglês (original)
          </p>
          <ul className="space-y-2 font-mono text-base leading-relaxed text-content-primary">
            {lyrics.en.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
        <div className="md:pl-6">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-content-muted">
            Português (Brasil)
          </p>
          <ul className="space-y-2 text-base leading-relaxed text-content-secondary">
            {lyrics.pt.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      <aside className="mt-4 rounded-lg border border-accent/40 bg-accent-subtle p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-accent">
          Nota dos tradutores
        </p>
        <p className="mt-2 text-sm leading-relaxed text-content-secondary">
          {lyrics.note}
        </p>
      </aside>
    </div>
  )
}