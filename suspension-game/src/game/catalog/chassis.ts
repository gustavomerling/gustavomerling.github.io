import { triangulate } from '../geometry'
import type { CarDesign, Vec } from '../types'

export type CargoKind = 'crate' | 'barrel' | 'ball'

/** Objeto solto que viaja no chassi (ex.: caixas na caçamba). */
export interface CargoSpec {
  kind: CargoKind
  x: number
  y: number
  size: number
}

export interface ChassisDef {
  id: string
  name: string
  /** Contorno para desenho (pode ser côncavo). */
  outline: Vec[]
  /** Polígonos CONVEXOS para a física (juntos formam o contorno). */
  polygons: Vec[][]
  density: number
  color: string
  /** Detalhes visuais (janelas, faixas...). */
  decor?: { points: Vec[]; color: string; window?: boolean }[]
  cargo?: CargoSpec[]
  /** Cabeça do piloto (centro do capacete). Se encostar no chão = batida. */
  head: Vec
}

export const HEAD_RADIUS = 0.17

const pts = (...xy: number[]): Vec[] => {
  const out: Vec[] = []
  for (let i = 0; i < xy.length; i += 2) out.push({ x: xy[i], y: xy[i + 1] })
  return out
}

/** Chassi convexo simples: contorno = único polígono. */
const convex = (def: Omit<ChassisDef, 'polygons'>): ChassisDef => ({ ...def, polygons: [def.outline] })

/** Capacete logo acima do ponto mais alto do contorno. */
function defaultHead(outline: Vec[]): Vec {
  const top = Math.min(...outline.map((v) => v.y))
  const near = outline.filter((v) => v.y < top + 0.08)
  const x = near.reduce((s, v) => s + v.x, 0) / near.length
  return { x, y: top - HEAD_RADIUS * 0.9 }
}

export const CHASSIS: ChassisDef[] = [
  convex({
    id: 'buggy',
    name: 'Buggy',
    outline: pts(-1.2, -0.05, -0.9, -0.4, 0.7, -0.4, 1.2, -0.05, 1.2, 0.2, -1.2, 0.2),
    density: 2,
    color: '#e8553d',
    head: { x: -0.1, y: -0.52 },
    decor: [{ points: pts(-0.4, -0.33, 0.55, -0.33, 0.85, -0.08, -0.4, -0.08), color: '#9fd8ff55', window: true }],
  }),
  convex({
    id: 'truck',
    name: 'Caminhão',
    outline: pts(-1.8, -0.35, 1.8, -0.35, 1.8, 0.35, -1.8, 0.35),
    density: 2.5,
    color: '#3d7be8',
    head: { x: 1.0, y: -0.5 },
    decor: [{ points: pts(-1.8, 0.05, 1.8, 0.05, 1.8, 0.15, -1.8, 0.15), color: '#ffffff44' }],
  }),
  {
    id: 'pickup',
    name: 'Picape',
    outline: pts(-2, -0.55, -1.88, -0.55, -1.88, 0, 0.5, 0, 0.5, -0.95, 1.3, -0.95, 1.9, -0.4, 2, -0.3, 2, 0.25, -2, 0.25),
    polygons: [
      pts(-2, 0, 2, 0, 2, 0.25, -2, 0.25), // assoalho
      pts(-2, -0.55, -1.88, -0.55, -1.88, 0, -2, 0), // tampa traseira
      pts(0.5, -0.95, 1.3, -0.95, 1.9, -0.4, 2, -0.3, 2, 0, 0.5, 0), // cabine
    ],
    density: 2,
    color: '#2e9d6a',
    head: { x: 0.85, y: -0.68 },
    decor: [{ points: pts(0.65, -0.85, 1.2, -0.85, 1.65, -0.45, 0.65, -0.45), color: '#9fd8ff55', window: true }],
    cargo: [
      { kind: 'crate', x: -1.6, y: -0.21, size: 0.4 },
      { kind: 'crate', x: -1.15, y: -0.21, size: 0.4 },
      { kind: 'crate', x: -1.38, y: -0.62, size: 0.38 },
      { kind: 'barrel', x: -0.6, y: -0.26, size: 0.25 },
      { kind: 'ball', x: 0.1, y: -0.19, size: 0.18 },
    ],
  },
  convex({
    id: 'mini',
    name: 'Mini',
    outline: pts(-0.8, 0, -0.6, -0.3, 0.6, -0.3, 0.8, 0, 0.8, 0.2, -0.8, 0.2),
    density: 2,
    color: '#f2b632',
    head: { x: 0, y: -0.44 },
  }),
  convex({
    id: 'plank',
    name: 'Prancha',
    outline: pts(-2.2, -0.1, 2.2, -0.1, 2.2, 0.1, -2.2, 0.1),
    density: 3,
    color: '#8a5a33',
    head: { x: 0, y: -0.25 },
  }),
]

export const CHASSIS_BY_ID: Record<string, ChassisDef> = Object.fromEntries(CHASSIS.map((c) => [c.id, c]))

const FALLBACK_OUTLINE = pts(-1, -0.2, 1, -0.2, 1, 0.2, -1, 0.2)

/** Chassi efetivo do projeto (inclui o desenhado pelo jogador). */
export function getChassis(design: CarDesign): ChassisDef {
  if (design.chassisId !== 'custom') return CHASSIS_BY_ID[design.chassisId] ?? CHASSIS[0]
  const outline = design.customChassis && design.customChassis.length >= 3 ? design.customChassis : FALLBACK_OUTLINE
  const polygons = triangulate(outline)
  return {
    id: 'custom',
    name: 'Desenhado',
    outline,
    polygons: polygons.length ? polygons : [FALLBACK_OUTLINE],
    density: 1.5,
    color: '#c45ad6',
    head: defaultHead(outline),
  }
}
