import { Snowflake } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Frozen water: falls like a block, floats on water, chills what it touches and melts back slowly. */
export const ice: ElementDefinition = {
  id: 'ice',
  name: 'Ice',
  description: 'Frozen water. Chills what it touches and slowly melts back. Liquid nitrogen makes more.',
  category: 'water',
  matter: 'powder',
  // Falls and stacks like blocks; lighter than water, so it floats.
  movement: { slide: 0 },
  brushFill: 1,
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
