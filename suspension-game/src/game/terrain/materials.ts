export type MaterialId = 'grass' | 'dirt' | 'rock' | 'sand' | 'wood' | 'mud' | 'ice'

export interface MaterialDef {
  name: string
  friction: number
  fill: string
  edge: string
}

export const MATERIALS: Record<MaterialId, MaterialDef> = {
  grass: { name: 'Grama', friction: 0.9, fill: '#5d8a34', edge: '#7fb342' },
  dirt: { name: 'Terra', friction: 1.0, fill: '#7a5532', edge: '#9a6c40' },
  rock: { name: 'Pedra', friction: 0.75, fill: '#6f7078', edge: '#9a9ba3' },
  sand: { name: 'Areia', friction: 0.45, fill: '#cdb070', edge: '#e6cc8a' },
  wood: { name: 'Madeira', friction: 0.8, fill: '#8a6236', edge: '#b88a52' },
  mud: { name: 'Lama', friction: 0.5, fill: '#4a3522', edge: '#6b4c2e' },
  ice: { name: 'Gelo', friction: 0.06, fill: '#a9d8ef', edge: '#e4f6ff' },
}
