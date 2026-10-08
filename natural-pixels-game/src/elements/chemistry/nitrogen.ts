import { Snowflake } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/** Super-cold liquid that boils away by itself, freezing water and putting out fires. */
export const nitrogen: ElementDefinition = {
  id: 'nitrogen',
  name: 'Liquid Nitrogen',
  description: 'Freezing liquid at −196 °C. Turns water to ice and puts out fires, then boils away.',
  category: 'chemistry',
  matter: 'liquid',
  density: 8,
  color: { base: '#e6f4ff', variation: 0.05, alpha: 0.6 },
  icon: Snowflake,
  brushFill: 0.3,
  movement: { spread: 5 },
  thermal: { conductivity: 0.6, initialTemp: -196, insulation: 0.9 },
  lifetime: { min: 240, max: 480 },
  reactions: [
    { with: 'water', chance: 0.3, other: 'ice' },
    { with: 'fire', chance: 0.8, other: 'air' },
  ],
}
