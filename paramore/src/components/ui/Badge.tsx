export function Badge({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'accent' | 'success' | 'warning' | 'danger'
}) {
  const tones: Record<string, string> = {
    default: 'bg-surface-2 text-content-secondary',
    accent: 'bg-accent-subtle text-accent',
    success: 'bg-status-success/15 text-status-success',
    warning: 'bg-status-warning/15 text-status-warning',
    danger: 'bg-status-danger/15 text-status-danger',
  }
  return (
    <span
      className={`inline-flex items-center rounded-full border border-line-1 px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  )
}