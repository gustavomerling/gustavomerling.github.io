export default function DsSection({
  id,
  index,
  label,
  title,
  children,
}: {
  id: string
  index: string
  label: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-line-1 py-14">
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent">
        <span className="font-mono">{index}</span>
        <span>{label}</span>
      </p>
      <h2 className="font-display text-3xl font-extrabold tracking-tight text-content-primary sm:text-4xl">
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  )
}