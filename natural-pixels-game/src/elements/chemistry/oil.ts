import { Fuel } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

export const oil: ElementDefinition = {
  id: 'oil',
  name: 'Oil',
  description: 'Thick and lighter than water, so it floats on it. Catches fire very easily.',
  category: 'chemistry',
  matter: 'liquid',
  // Lighter than water (10): floats on top.
  density: 8,
  color: { base: '#5a4325', variation: 0.08, alpha: 0.95 },
  icon: Fuel,
  movement: { spread: 3, viscosity: 0.3 },
  // Ignites at a low temperature, so the fire runs across the whole pool.
  thermal: { conductivity: 0.15, burn: { at: 120, temp: 700, rate: 0.02 } },
}
