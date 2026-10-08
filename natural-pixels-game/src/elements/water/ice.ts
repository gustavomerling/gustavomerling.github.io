import { Snowflake } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Frozen water: chills and freezes water it touches, melts back slowly in the warmth. */
export const ice: ElementDefinition = {
  id: 'ice',
  name: 'Ice',
  description: 'Frozen water. Chills what it touches and slowly melts back. Liquid nitrogen makes more.',
  category: 'water',
  matter: 'static',
  density: 9,
  color: { base: '#bfe6ff', variation: 0.06, alpha: 0.9 },
  icon: Snowflake,
  thermal: {
    conductivity: 0.5,
    initialTemp: -60,
    insulation: 0.97,
    // Strong latent heat: melting takes a while and soaks up the warmth around it.
    above: { temp: 1, into: 'water', chance: 0.0015 },
  },
}
