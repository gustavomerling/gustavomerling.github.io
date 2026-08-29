export default function Swatch({
  hex,
  name,
  usage,
}: {
  hex: string
  name: string
  usage?: string
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-line-1 bg-surface-1">
      <div
        className="h-16 border-b border-line-1"
        style={{ backgroundColor: hex }}
        aria-label={`${name}: ${hex}`}
      />
      <div className="p-3">
        <p className="text-xs font-semibold text-content-primary">{name}</p>
        <p className="mt-0.5 font-mono text-xs text-content-muted">{hex}</p>
        {usage && <p className="mt-1 text-xs text-content-muted">{usage}</p>}
      </div>
    </div>
  )
}