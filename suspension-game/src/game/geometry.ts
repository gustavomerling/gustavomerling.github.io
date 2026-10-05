// Utilitários de geometria 2D (puros).

import type { Vec } from './types'

export const add = (a: Vec, b: Vec): Vec => ({ x: a.x + b.x, y: a.y + b.y })
export const sub = (a: Vec, b: Vec): Vec => ({ x: a.x - b.x, y: a.y - b.y })
export const scale = (a: Vec, s: number): Vec => ({ x: a.x * s, y: a.y * s })
export const dist = (a: Vec, b: Vec) => Math.hypot(a.x - b.x, a.y - b.y)
export const rotate = (v: Vec, a: number): Vec => {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}
export const rotateAround = (p: Vec, center: Vec, a: number) => add(center, rotate(sub(p, center), a))
export const deg = (rad: number) => (rad * 180) / Math.PI
export const rad = (deg: number) => (deg * Math.PI) / 180

/** Normaliza para (-PI, PI]. */
export const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export function signedArea(pts: Vec[]) {
  let a = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    a += p.x * q.y - q.x * p.y
  }
  return a / 2
}

export function centroid(pts: Vec[]): Vec {
  const a = signedArea(pts)
  if (Math.abs(a) < 1e-9) return { x: pts.reduce((s, p) => s + p.x, 0) / pts.length, y: pts.reduce((s, p) => s + p.y, 0) / pts.length }
  let cx = 0
  let cy = 0
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i]
    const q = pts[(i + 1) % pts.length]
    const f = p.x * q.y - q.x * p.y
    cx += (p.x + q.x) * f
    cy += (p.y + q.y) * f
  }
  return { x: cx / (6 * a), y: cy / (6 * a) }
}

const cross = (o: Vec, a: Vec, b: Vec) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x)

function inTriangle(p: Vec, a: Vec, b: Vec, c: Vec) {
  return cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0
}

export function convexHull(points: Vec[]): Vec[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y)
  if (pts.length < 3) return pts
  const lower: Vec[] = []
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop()
    lower.push(p)
  }
  const upper: Vec[] = []
  for (const p of [...pts].reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop()
    upper.push(p)
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)]
}

/**
 * Triangulação por "ear clipping" de um polígono simples (pode ser côncavo).
 * Devolve triângulos; se o polígono for inválido (se cruza), cai para o casco convexo.
 */
export function triangulate(polygon: Vec[]): Vec[][] {
  let pts = polygon.filter((p, i) => dist(p, polygon[(i + 1) % polygon.length]) > 1e-4)
  if (pts.length < 3) return []
  if (signedArea(pts) < 0) pts = [...pts].reverse()
  const tris: Vec[][] = []
  const idx = pts.map((_, i) => i)
  let guard = 0
  while (idx.length > 3 && guard++ < 5000) {
    let clipped = false
    for (let i = 0; i < idx.length; i++) {
      const a = pts[idx[(i + idx.length - 1) % idx.length]]
      const b = pts[idx[i]]
      const c = pts[idx[(i + 1) % idx.length]]
      if (cross(a, b, c) <= 1e-9) continue // vértice côncavo
      const blocked = idx.some((j) => {
        const p = pts[j]
        return p !== a && p !== b && p !== c && inTriangle(p, a, b, c)
      })
      if (blocked) continue
      tris.push([a, b, c])
      idx.splice(i, 1)
      clipped = true
      break
    }
    if (!clipped) {
      // polígono se cruza: usa o casco convexo em leque
      const hull = convexHull(polygon)
      return hull.slice(1, -1).map((p, i) => [hull[0], p, hull[i + 2]])
    }
  }
  if (idx.length === 3) tris.push(idx.map((i) => pts[i]))
  return tris.filter((t) => Math.abs(signedArea(t)) > 0.002)
}

/** Simplificação Ramer–Douglas–Peucker (para desenho à mão livre). */
export function simplify(pts: Vec[], eps: number): Vec[] {
  if (pts.length < 3) return pts
  const [a, b] = [pts[0], pts[pts.length - 1]]
  let maxD = 0
  let index = 0
  const len = dist(a, b) || 1e-9
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(cross(a, b, pts[i])) / len
    if (d > maxD) {
      maxD = d
      index = i
    }
  }
  if (maxD <= eps) return [a, b]
  return [...simplify(pts.slice(0, index + 1), eps).slice(0, -1), ...simplify(pts.slice(index), eps)]
}

/** Caminho SVG suave e fechado passando pelos pontos (Catmull-Rom). */
export function smoothClosedPath(pts: Vec[]): string {
  const n = pts.length
  if (n < 3) return ''
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n]
    const p1 = pts[i]
    const p2 = pts[(i + 1) % n]
    const p3 = pts[(i + 2) % n]
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += `C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p2.x} ${p2.y}`
  }
  return d + 'Z'
}

/** Ponto mais próximo de `p` sobre o contorno fechado `poly`. */
export function closestOnOutline(poly: Vec[], p: Vec): { point: Vec; dist: number } {
  let best = { point: poly[0], dist: Infinity }
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const ab = sub(b, a)
    const len2 = ab.x * ab.x + ab.y * ab.y || 1e-9
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * ab.x + (p.y - a.y) * ab.y) / len2))
    const q = add(a, scale(ab, t))
    const d = dist(p, q)
    if (d < best.dist) best = { point: q, dist: d }
  }
  return best
}
