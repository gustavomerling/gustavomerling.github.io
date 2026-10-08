import { Bird, Box, Droplets, Flame, FlaskConical, Mountain, Sprout, type LucideIcon } from 'lucide-react'
import type { ElementCategory } from './types.ts'

export interface CategoryInfo {
  id: ElementCategory
  label: string
  icon: LucideIcon
}

/** Element families as shown in the sidebar, in order. `core` (air) never shows up. */
export const CATEGORIES: readonly CategoryInfo[] = [
  { id: 'terrain', label: 'Terrain', icon: Mountain },
  { id: 'water', label: 'Water', icon: Droplets },
  { id: 'plants', label: 'Plants', icon: Sprout },
  { id: 'animals', label: 'Animals', icon: Bird },
  { id: 'fire', label: 'Fire', icon: Flame },
  { id: 'chemistry', label: 'Chemistry', icon: FlaskConical },
  { id: 'materials', label: 'Materials & Objects', icon: Box },
]
