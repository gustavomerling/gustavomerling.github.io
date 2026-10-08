import { Zap } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** A lightning bolt (made by storms, see engine/weather.ts): a blinding flash for a split second. */
export const lightning: ElementDefinition = {
  id: 'lightning',
  name: 'Lightning',
  description: 'A bolt from a storm cloud. Sets trees, grass and houses on fire where it strikes.',
  category: 'fire',
  matter: 'static',
  density: 0.1,
  color: { base: '#f4f8ff', variation: 0.05, emissive: 1 },
  icon: Zap,
  hidden: true,
  thermal: { conductivity: 0.5, source: 3000 },
  lifetime: { min: 5, max: 10 },
}
