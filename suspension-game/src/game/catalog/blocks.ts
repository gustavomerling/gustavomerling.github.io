export type BlockShapeKind = 'rect' | 'wedge' | 'circle'

export interface BlockDef {
  id: string
  name: string
  shape: BlockShapeKind
  /** rect/wedge: largura x altura. circle: w = diâmetro. */
  w: number
  h: number
  density: number
  color: string
  friction?: number
  restitution?: number
}


export const BLOCKS: BlockDef[] = [
  { id: 'block-s', name: 'Bloco', shape: 'rect', w: 0.4, h: 0.4, density: 1, color: '#9aa4b1' },
  { id: 'block-l', name: 'Viga', shape: 'rect', w: 1.2, h: 0.2, density: 1, color: '#7d8896' },
  { id: 'plate', name: 'Placa', shape: 'rect', w: 2, h: 0.08, density: 1.5, color: '#b0b8c4' },
  { id: 'weight', name: 'Peso', shape: 'rect', w: 0.4, h: 0.3, density: 12, color: '#3a3f47' },
  { id: 'foam', name: 'Espuma', shape: 'rect', w: 0.6, h: 0.45, density: 0.15, color: '#f5d76e' },
  { id: 'wedge', name: 'Cunha', shape: 'wedge', w: 0.8, h: 0.4, density: 1, color: '#8d9db0' },
  { id: 'bumper', name: 'Para-choque', shape: 'circle', w: 0.45, h: 0.45, density: 0.6, color: '#e74c3c', restitution: 0.8 },
  { id: 'skid', name: 'Esqui', shape: 'rect', w: 1, h: 0.1, density: 1, color: '#d0e8f2', friction: 0.05 },
]

export const BLOCKS_BY_ID: Record<string, BlockDef> = Object.fromEntries(BLOCKS.map((b) => [b.id, b]))

/** Vértices da cunha (rampa), centrada em (0,0), sem rotação. */
export const wedgeVertices = (b: BlockDef) => [
  { x: -b.w / 2, y: b.h / 2 },
  { x: b.w / 2, y: b.h / 2 },
  { x: b.w / 2, y: -b.h / 2 },
]

/** Massa aproximada (kg) para estatísticas. */
export function blockMass(b: BlockDef) {
  if (b.shape === 'circle') return Math.PI * (b.w / 2) ** 2 * b.density
  if (b.shape === 'wedge') return (b.w * b.h * b.density) / 2
  return b.w * b.h * b.density
}
