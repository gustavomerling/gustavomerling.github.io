import * as THREE from 'three'

/**
 * Tipos de sala da masmorra e a decoração de cada um. Tudo é caixa estática
 * (com colisor) ou "decalque" no chão (sem colisor). As posições são
 * relativas ao centro da sala (lado interno 14 m, metade 7).
 *
 * Regras de espaço (para o resto do jogo funcionar):
 * - cruz central |x| < 1.6 ou |z| < 1.6 livre: corredores entre as portas;
 * - quadrado central |x|,|z| < 2.2 livre: itens coletáveis;
 * - cantos (±5.4, ±5.4) de preferência livres: é onde os inimigos surgem.
 */
export type RoomType = 'start' | 'depot' | 'office' | 'hall' | 'lab' | 'end'

export const MIDDLE_TYPES: RoomType[] = ['depot', 'office', 'hall', 'lab']

export const ROOM_LABELS: Record<RoomType, string> = {
  start: 'Início',
  depot: 'Depósito',
  office: 'Escritório',
  hall: 'Salão de pilares',
  lab: 'Laboratório',
  end: 'Saída',
}

export type DecorMat = 'wall' | 'structure' | 'wood' | 'metal' | 'dark' | 'cloth' | 'hazard' | 'green' | 'rug' | 'screen' | 'exit'

export const DECOR_COLORS: Record<Exclude<DecorMat, 'wall' | 'structure'>, { color: string; emissive?: string }> = {
  wood: { color: '#8a6440' },
  metal: { color: '#8b9096' },
  dark: { color: '#33363a' },
  cloth: { color: '#6f7a83' },
  hazard: { color: '#e2b61f' },
  green: { color: '#5f8f4e' },
  rug: { color: '#4d5f78' },
  screen: { color: '#1d2a33', emissive: '#2c6f8f' },
  exit: { color: '#1e2a1e', emissive: '#3fae4a' },
}

export interface Obstacle {
  /** Centro no plano (relativo à sala), base (y) e tamanho. */
  x: number
  z: number
  y?: number
  w: number
  h: number
  d: number
  mat: DecorMat
  /** false = só visual (decalque no chão, tela em cima da mesa). */
  solid?: boolean
}

type Rng = () => number

/** Espelha um layout num quadrante para os quatro (com sorteio de quais usar). */
function quads(rng: Rng, n: number) {
  return [
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]
    .sort(() => rng() - 0.5)
    .slice(0, n)
}

const floorDecal = (w: number, d: number, mat: DecorMat, x = 0, z = 0): Obstacle => ({ x, z, y: 0, w, h: 0.02, d, mat, solid: false })

export function decorate(type: RoomType, rng: Rng): Obstacle[] {
  const o: Obstacle[] = []
  switch (type) {
    case 'start': {
      o.push(floorDecal(5, 5, 'rug'))
      // Bancos encostados nas paredes (perto dos cantos, longe das portas).
      for (const [sx, sz] of quads(rng, 2)) o.push({ x: sx * 4.5, z: sz * 6.5, w: 2.2, h: 0.45, d: 0.5, mat: 'wood' })
      break
    }
    case 'depot': {
      // Pilhas de caixotes e paletes.
      for (const [sx, sz] of quads(rng, 3 + Math.floor(rng() * 2))) {
        const x = sx * (3 + rng() * 1.2)
        const z = sz * (3 + rng() * 1.2)
        o.push({ x, z, w: 1.6, h: 0.15, d: 1.2, mat: 'wood' })
        o.push({ x: x - 0.35, z, y: 0.15, w: 0.8, h: 0.8, d: 0.8, mat: 'wood' })
        o.push({ x: x + 0.45, z: z + 0.1, y: 0.15, w: 0.7, h: 0.7, d: 0.7, mat: 'wood' })
        if (rng() < 0.6) o.push({ x: x - 0.3, z, y: 0.95, w: 0.7, h: 0.7, d: 0.7, mat: 'wood' })
      }
      // Prateleira comprida numa parede sem porta seria ideal; vai na lateral de um quadrante.
      const s = rng() < 0.5 ? 1 : -1
      o.push({ x: s * 6.4, z: s * 3.6, w: 0.6, h: 2.4, d: 2.6, mat: 'metal' })
      break
    }
    case 'office': {
      // Mesas com monitor e divisórias baixas.
      for (const [sx, sz] of quads(rng, 4)) {
        const x = sx * 3.6
        const z = sz * 3.4
        o.push({ x, z, w: 1.6, h: 0.75, d: 0.8, mat: 'wood' })
        o.push({ x: x + 0.2, z: z - sz * 0.15, y: 0.75, w: 0.5, h: 0.32, d: 0.06, mat: 'screen', solid: false })
        o.push({ x, z: z + sz * 0.9, w: 2.2, h: 1.3, d: 0.08, mat: 'cloth' })
      }
      o.push(floorDecal(9, 0.6, 'cloth', 0, 0))
      break
    }
    case 'hall': {
      // Quatro colunas grossas com base; piso com faixa.
      const c = 3.4
      for (const [sx, sz] of quads(rng, 4)) {
        o.push({ x: sx * c, z: sz * c, w: 1.0, h: 4, d: 1.0, mat: 'structure' })
        o.push({ x: sx * c, z: sz * c, w: 1.4, h: 0.3, d: 1.4, mat: 'dark' })
      }
      o.push(floorDecal(6.2, 6.2, 'dark'))
      o.push(floorDecal(5.6, 5.6, 'wall'))
      break
    }
    case 'lab': {
      // Bancadas de metal, tanques verdes e faixa de perigo.
      for (const [sx, sz] of quads(rng, 3)) {
        o.push({ x: sx * 3.8, z: sz * 3.0, w: 2.6, h: 0.9, d: 0.8, mat: 'metal' })
        o.push({ x: sx * 3.4, z: sz * 3.0, y: 0.9, w: 0.3, h: 0.35, d: 0.3, mat: 'green', solid: false })
      }
      for (const [sx, sz] of quads(rng, 2)) o.push({ x: sx * 5.8, z: sz * 2.6, w: 0.9, h: 2.1, d: 0.9, mat: 'green' })
      o.push(floorDecal(7, 0.3, 'hazard', 0, 2.4))
      o.push(floorDecal(7, 0.3, 'hazard', 0, -2.4))
      break
    }
    case 'end': {
      // Alçapão de saída no centro, faixa de perigo, barricadas.
      o.push(floorDecal(3.2, 3.2, 'hazard'))
      o.push({ x: 0, z: 0, y: 0, w: 2.4, h: 0.03, d: 2.4, mat: 'exit', solid: false })
      for (const [sx, sz] of quads(rng, 4)) {
        o.push({ x: sx * 3.6, z: sz * 3.0, w: 2.2, h: 1.1, d: 0.5, mat: 'hazard' })
        o.push({ x: sx * 3.0, z: sz * 4.4, w: 0.5, h: 1.1, d: 1.6, mat: 'dark' })
      }
      break
    }
  }
  return o
}

/** Materiais da decoração (os de parede/estrutura vêm do jogo). */
export function decorMaterials() {
  const out = {} as Record<keyof typeof DECOR_COLORS, THREE.MeshStandardMaterial>
  for (const [k, v] of Object.entries(DECOR_COLORS)) {
    out[k as keyof typeof DECOR_COLORS] = new THREE.MeshStandardMaterial({
      color: v.color,
      emissive: v.emissive ?? '#000000',
      roughness: 0.75,
      metalness: k === 'metal' ? 0.35 : 0,
    })
  }
  return out
}
