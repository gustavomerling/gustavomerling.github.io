export interface AxleDef {
  id: string
  name: string
  /** Distância entre as duas pontas (onde vão as rodas). */
  length: number
  thickness: number
  density: number
  color: string
}

/** Eixo = barra articulada no centro (balancim). Rodas encaixam nas pontas. */
export const AXLES: AxleDef[] = [
  { id: 'axle-short', name: 'Eixo curto', length: 1.0, thickness: 0.12, density: 6, color: '#555d66' },
  { id: 'axle-mid', name: 'Eixo médio', length: 1.4, thickness: 0.13, density: 6, color: '#4c545d' },
  { id: 'axle-long', name: 'Eixo longo', length: 1.8, thickness: 0.14, density: 6, color: '#444b53' },
]

export const AXLES_BY_ID: Record<string, AxleDef> = Object.fromEntries(AXLES.map((a) => [a.id, a]))
