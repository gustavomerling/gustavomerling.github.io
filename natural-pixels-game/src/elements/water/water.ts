import { Droplets } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

export const water: ElementDefinition = {
  id: 'water',
  name: 'Water',
  description: 'Flows and levels out. Soaks into soil, boils into steam at 100 °C.',
  category: 'water',
  matter: 'liquid',
  density: 10,
  color: { base: '#3d9bff', variation: 0.05, alpha: 0.85 },
  icon: Droplets,
  movement: { spread: 5 },
  // Boils gradually: boiling water holds at 100 °C and turns to steam a little at a time.
  thermal: { conductivity: 0.3, above: { temp: 100, into: 'steam', chance: 0.01 } },
}
