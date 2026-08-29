export default function CodeBlock({
  code,
  language = 'css',
  name,
}: {
  code: string
  language?: string
  name?: string
}) {
  return (
    <figure className="overflow-hidden rounded-lg border border-line-1 bg-[#0c0c0f]">
      <figcaption className="flex items-center justify-between border-b border-line-1 px-4 py-2">
        <span className="text-xs font-medium text-content-muted">{name ?? language}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-content-muted">
          {language}
        </span>
      </figcaption>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-content-secondary">
        <code>{code}</code>
      </pre>
    </figure>
  )
}