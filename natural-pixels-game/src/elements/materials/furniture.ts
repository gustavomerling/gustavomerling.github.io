import { AppWindow, Armchair, Flower2, Image, Library, Table } from 'lucide-react'
import type { ElementDefinition } from '../types.ts'

/*
 * Furniture and decoration humans put in their houses (see house.ts). Like the back wall,
 * it's all behind them: humans walk in front of it, everything else treats it as solid. None of
 * it is in the palette: humans build it.
 */

const wooden = { conductivity: 0.05, burn: { at: 240, temp: 600, rate: 0.01, into: 'ash' } }

/** A window in the back wall: mostly see-through, so the sky (day or night) shows inside. */
export const backWindow: ElementDefinition = {
  id: 'back_window',
  name: 'Back Window',
  description: 'A window in the back wall of a house: you can see the sky through it.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#cfe8ff', variation: 0.04, alpha: 0.28 },
  icon: AppWindow,
  hidden: true,
  thermal: { conductivity: 0.1 },
}

/** A painting on the wall (every one a little different). */
export const painting: ElementDefinition = {
  id: 'painting',
  name: 'Painting',
  description: 'A colourful painting hanging on the wall.',
  category: 'materials',
  matter: 'static',
  density: 20,
  color: { base: '#c0784a', variation: 0.45 },
  icon: Image,
  hidden: true,
  thermal: wooden,
}

export const table: ElementDefinition = {
  id: 'table',
  name: 'Table',
  description: 'A wooden table.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#a0683a', variation: 0.06 },
  icon: Table,
  hidden: true,
  thermal: wooden,
}

export const chair: ElementDefinition = {
  id: 'chair',
  name: 'Chair',
  description: 'A wooden chair.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#8a5530', variation: 0.06 },
  icon: Armchair,
  hidden: true,
  thermal: wooden,
}

/** Shelves full of books in every colour. */
export const bookshelf: ElementDefinition = {
  id: 'bookshelf',
  name: 'Bookshelf',
  description: 'Shelves full of books.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#7d5a8c', variation: 0.4 },
  icon: Library,
  hidden: true,
  thermal: wooden,
}

/** A potted plant by the window. */
export const flowerpot: ElementDefinition = {
  id: 'flowerpot',
  name: 'Flowerpot',
  description: 'A potted plant.',
  category: 'materials',
  matter: 'static',
  density: 25,
  color: { base: '#5aa04a', variation: 0.18 },
  icon: Flower2,
  hidden: true,
  thermal: { conductivity: 0.05 },
}
