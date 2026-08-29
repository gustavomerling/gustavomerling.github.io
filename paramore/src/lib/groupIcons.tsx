import { Disc3, Home, Guitar, Newspaper, Sparkles, Users, Zap } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const GROUP_ICONS: Record<string, LucideIcon> = {
  home: Home,
  banda: Zap,
  noticias: Newspaper,
  turnê: Guitar,
  midia: Disc3,
  projetos: Sparkles,
  comunidade: Users,
}

export function GroupIcon({ name, className }: { name: string; className?: string }) {
  const Icon = GROUP_ICONS[name] ?? Sparkles
  return <Icon className={className} aria-hidden="true" />
}