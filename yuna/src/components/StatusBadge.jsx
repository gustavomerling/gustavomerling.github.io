import { Badge } from '@/components/ui/badge'
import { STATUS } from '@/lib/mock-data'
import { cn } from '@/lib/utils'

const TONE = {
  muted: 'border-border bg-muted text-muted-foreground',
  info: 'border-transparent bg-info/25 text-info-foreground dark:text-foreground',
  warning: 'border-transparent bg-warning/20 text-[color-mix(in_oklab,var(--warning)_75%,black)] dark:text-warning',
  success: 'border-transparent bg-success/15 text-success dark:text-primary',
  primary: 'border-transparent bg-primary text-primary-foreground',
  destructive: 'border-transparent bg-destructive/15 text-destructive',
}

export function StatusBadge({ status, className }) {
  const meta = STATUS[status] ?? STATUS.rascunho
  return (
    <Badge className={cn('font-normal', TONE[meta.tone], className)}>{meta.label}</Badge>
  )
}
