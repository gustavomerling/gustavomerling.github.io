// Regras de montagem do carro (puro, sem física nem React).
//
// O carro é uma ÁRVORE de corpos. Quem pode segurar o quê:
//   chassi          -> blocos, suspensões (pelo topo), eixos (pivô), rodas (rígidas)
//   cubo de mola    -> roda ou eixo
//   ponta de eixo   -> roda ou suspensão (pelo topo)  => suspensões aninhadas!
//
// O encaixe é geométrico: se o ponto de encaixe da peça coincide com um "mount",
// ela pertence a ele. Assim o projeto salvo é só uma lista de peças com x/y.

import { AXLES_BY_ID } from './catalog/axles'
import { BLOCKS_BY_ID, blockMass } from './catalog/blocks'
import { getChassis } from './catalog/chassis'
import { SUSPENSIONS_BY_ID } from './catalog/suspensions'
import { WHEELS_BY_ID, type WheelDef } from './catalog/wheels'
import { add, centroid, dist, rotate, rotateAround, scale, signedArea, sub } from './geometry'
import { REST_FLAG, type CarDesign, type CarPoses, type Part, type PartKind, type Pose, type Vec } from './types'

export type Attachment =
  | { kind: 'chassis' }
  | { kind: 'suspension'; id: string } // cubo da mola
  | { kind: 'axle'; id: string; end: -1 | 1 } // ponta do eixo

export interface Mount {
  pos: Vec
  attachment: Attachment
}

const EPS = 0.02

export const ROTATABLE: PartKind[] = ['suspension', 'axle', 'block', 'flag']

// ---------------------------------------------------------------- geometria das peças

/** Direção da mola (do topo para o cubo). */
export const suspensionAxis = (p: Part): Vec => rotate({ x: 0, y: 1 }, p.angle ?? 0)
export const suspensionTop = (p: Part): Vec =>
  sub(p, scale(suspensionAxis(p), SUSPENSIONS_BY_ID[p.typeId].length))
export const axleEnd = (p: Part, end: -1 | 1): Vec =>
  add(p, rotate({ x: (end * AXLES_BY_ID[p.typeId].length) / 2, y: 0 }, p.angle ?? 0))

/** Ponto da peça que encaixa num mount. */
export function attachPoint(p: Part): Vec {
  return p.kind === 'suspension' ? suspensionTop(p) : { x: p.x, y: p.y }
}

/** Onde a peça precisa estar para que seu ponto de encaixe caia em `mountPos`. */
export function positionForMount(p: Pick<Part, 'kind' | 'typeId' | 'angle'>, mountPos: Vec): Vec {
  if (p.kind !== 'suspension') return mountPos
  return add(mountPos, scale(suspensionAxis(p as Part), SUSPENSIONS_BY_ID[p.typeId].length))
}

/** Mounts disponíveis para um tipo de peça. */
export function mountsFor(design: CarDesign, kind: PartKind): Mount[] {
  const mounts: Mount[] = []
  for (const p of design.parts) {
    if (p.kind === 'suspension' && (kind === 'wheel' || kind === 'axle' || kind === 'flag')) {
      mounts.push({ pos: { x: p.x, y: p.y }, attachment: { kind: 'suspension', id: p.id } })
    }
    if (p.kind === 'axle' && (kind === 'wheel' || kind === 'suspension' || kind === 'flag')) {
      for (const end of [-1, 1] as const) {
        mounts.push({ pos: axleEnd(p, end), attachment: { kind: 'axle', id: p.id, end } })
      }
    }
  }
  return mounts
}

export function nearestMount(mounts: Mount[], pos: Vec, maxDist: number): Mount | null {
  let best: Mount | null = null
  let bestD = maxDist
  for (const m of mounts) {
    const d = dist(m.pos, pos)
    if (d <= bestD) {
      best = m
      bestD = d
    }
  }
  return best
}

export const parentOf = (a: Attachment | undefined): string | null => (!a || a.kind === 'chassis' ? null : a.id)

// ---------------------------------------------------------------- árvore

/** Para cada peça, onde ela está presa. Ciclos (impossíveis fisicamente) caem para o chassi. */
export function resolveAttachments(design: CarDesign): Record<string, Attachment> {
  const result: Record<string, Attachment> = {}
  const mountCache: Partial<Record<PartKind, Mount[]>> = {}
  for (const p of design.parts) {
    if (p.kind === 'block') {
      result[p.id] = { kind: 'chassis' }
      continue
    }
    const mounts = (mountCache[p.kind] ??= mountsFor(design, p.kind)).filter((m) => parentOf(m.attachment) !== p.id)
    result[p.id] = nearestMount(mounts, attachPoint(p), EPS)?.attachment ?? { kind: 'chassis' }
  }
  // quebra ciclos
  for (const p of design.parts) {
    const seen = new Set<string>([p.id])
    let cur = parentOf(result[p.id])
    while (cur) {
      if (seen.has(cur)) {
        result[p.id] = { kind: 'chassis' }
        break
      }
      seen.add(cur)
      cur = parentOf(result[cur])
    }
  }
  return result
}

/** Peças em ordem "pais antes dos filhos" (para montar a física). */
export function buildOrder(design: CarDesign, att = resolveAttachments(design)): Part[] {
  const out: Part[] = []
  const placed = new Set<string>()
  let progress = true
  while (out.length < design.parts.length && progress) {
    progress = false
    for (const p of design.parts) {
      if (placed.has(p.id)) continue
      const parent = parentOf(att[p.id])
      if (!parent || placed.has(parent)) {
        out.push(p)
        placed.add(p.id)
        progress = true
      }
    }
  }
  return out
}

/** Tudo que está pendurado (direta ou indiretamente) em `partId`. */
export function descendantsOf(design: CarDesign, partId: string, att = resolveAttachments(design)): Part[] {
  const out: Part[] = []
  const visit = (id: string) => {
    for (const p of design.parts) {
      if (parentOf(att[p.id]) === id && !out.includes(p)) {
        out.push(p)
        visit(p.id)
      }
    }
  }
  visit(partId)
  return out
}

// ---------------------------------------------------------------- edição

const mapParts = (design: CarDesign, ids: string[], fn: (p: Part) => Part): CarDesign => ({
  ...design,
  parts: design.parts.map((p) => (ids.includes(p.id) ? fn(p) : p)),
})

/** Gira a peça (e o que está preso nela) em torno do ponto onde ela encaixa. */
export function rotatePart(design: CarDesign, id: string, delta: number): CarDesign {
  const part = design.parts.find((p) => p.id === id)
  if (!part || !ROTATABLE.includes(part.kind)) return design
  const pivot = attachPoint(part)
  const ids = [id, ...descendantsOf(design, id).map((p) => p.id)]
  return mapParts(design, ids, (p) => {
    const pos = rotateAround(p, pivot, delta)
    return { ...p, x: pos.x, y: pos.y, angle: ROTATABLE.includes(p.kind) ? (p.angle ?? 0) + delta : p.angle }
  })
}

export function setPartAngle(design: CarDesign, id: string, angle: number): CarDesign {
  const part = design.parts.find((p) => p.id === id)
  return part ? rotatePart(design, id, angle - (part.angle ?? 0)) : design
}

/** Copia a peça (e filhos) espelhada no eixo X do chassi. */
export function mirrorPart(design: CarDesign, id: string): CarDesign {
  const part = design.parts.find((p) => p.id === id)
  if (!part) return design
  const group = [part, ...descendantsOf(design, id)]
  const copies = group.map((p) => ({ ...p, id: newId(), x: -p.x, angle: p.angle ? -p.angle : p.angle }))
  return { ...design, parts: [...design.parts, ...copies] }
}

export function duplicatePart(design: CarDesign, id: string, offset: Vec = { x: 0.5, y: 0 }): { design: CarDesign; newId?: string } {
  const part = design.parts.find((p) => p.id === id)
  if (!part) return { design }
  const group = [part, ...descendantsOf(design, id)]
  const copies = group.map((p) => ({ ...p, id: newId(), x: p.x + offset.x, y: p.y + offset.y }))
  return { design: { ...design, parts: [...design.parts, ...copies] }, newId: copies[0].id }
}

/** Remove a peça e tudo que estava pendurado nela. */
export function removePart(design: CarDesign, id: string): CarDesign {
  const ids = [id, ...descendantsOf(design, id).map((p) => p.id)]
  return { ...design, parts: design.parts.filter((p) => !ids.includes(p.id)) }
}

// ---------------------------------------------------------------- estatísticas

export interface CarStats {
  mass: number
  centerOfMass: Vec
  wheels: number
  driven: number
  torque: number
  suspensions: number
}

export function carStats(design: CarDesign): CarStats {
  const items: { m: number; c: Vec }[] = []
  const ch = getChassis(design)
  for (const poly of ch.polygons) items.push({ m: Math.abs(signedArea(poly)) * ch.density, c: centroid(poly) })
  let wheels = 0
  let driven = 0
  let torque = 0
  let suspensions = 0
  for (const p of design.parts) {
    if (p.kind === 'block') {
      const b = BLOCKS_BY_ID[p.typeId]
      items.push({ m: blockMass(b), c: p })
    } else if (p.kind === 'axle') {
      const a = AXLES_BY_ID[p.typeId]
      items.push({ m: a.length * a.thickness * a.density, c: p })
    } else if (p.kind === 'wheel') {
      const w = WHEELS_BY_ID[p.typeId]
      items.push({ m: Math.PI * w.radius ** 2 * w.density, c: p })
      wheels++
      if (p.driven !== false) {
        driven++
        torque += w.maxTorque
      }
    } else if (p.kind === 'suspension') {
      suspensions++
      items.push({ m: 0.05, c: p })
    }
  }
  const mass = items.reduce((s, i) => s + i.m, 0)
  const com = items.reduce((s, i) => add(s, scale(i.c, i.m / mass)), { x: 0, y: 0 })
  return { mass, centerOfMass: com, wheels, driven, torque, suspensions }
}

/** Ponto mais baixo do carro (maior Y), para posicionar o spawn acima do chão. */
export function lowestPoint(design: CarDesign): number {
  let maxY = Math.max(...getChassis(design).outline.map((v) => v.y))
  for (const p of design.parts) {
    if (p.kind === 'wheel') maxY = Math.max(maxY, p.y + WHEELS_BY_ID[p.typeId].radius)
    if (p.kind === 'block') {
      const b = BLOCKS_BY_ID[p.typeId]
      maxY = Math.max(maxY, p.y + Math.hypot(b.w, b.h) / 2)
    }
    if (p.kind === 'axle') maxY = Math.max(maxY, axleEnd(p, -1).y, axleEnd(p, 1).y)
    if (p.kind === 'suspension') maxY = Math.max(maxY, p.y)
  }
  return maxY
}

// ---------------------------------------------------------------- poses

/** Contorno de uma roda gosmenta em repouso (coordenadas do mundo). */
export function restBlob(def: WheelDef, at: Pose): Vec[] {
  const n = def.soft?.segments ?? 16
  return Array.from({ length: n }, (_, i) => {
    const a = at.angle + (i / n) * Math.PI * 2
    return { x: at.x + Math.cos(a) * def.radius, y: at.y + Math.sin(a) * def.radius }
  })
}

/** Poses "de oficina": tudo parado na posição do projeto. */
export function staticPoses(design: CarDesign): CarPoses {
  const poses: CarPoses = { chassis: { x: 0, y: 0, angle: 0 }, parts: {}, springs: {}, blobs: {}, cargo: [], flags: {} }
  for (const p of design.parts) {
    const pose = { x: p.x, y: p.y, angle: p.angle ?? 0 }
    poses.parts[p.id] = pose
    if (p.kind === 'suspension') poses.springs[p.id] = { top: suspensionTop(p), bottom: { x: p.x, y: p.y } }
    if (p.kind === 'wheel' && WHEELS_BY_ID[p.typeId].soft) poses.blobs[p.id] = restBlob(WHEELS_BY_ID[p.typeId], pose)
    if (p.kind === 'flag') poses.flags[p.id] = REST_FLAG
  }
  poses.cargo = (getChassis(design).cargo ?? []).map((c) => ({ x: c.x, y: c.y, angle: 0 }))
  return poses
}

let counter = 0
export const newId = () => `p${Date.now().toString(36)}${(counter++).toString(36)}`
