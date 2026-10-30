export type Vec2 = { x: number; y: number }

export const vec2 = (x: number, y: number): Vec2 => ({ x, y })

export const sub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y })

export const length = (v: Vec2): number => Math.hypot(v.x, v.y)

// Ângulo que melhor alinha `from` a `to` em torno dos respectivos centros (mesma ordem de pontos).
export function bestRotation(from: Vec2[], to: Vec2[]): number {
  const n = from.length
  if (n < 2) return 0
  let fx = 0, fy = 0, tx = 0, ty = 0
  for (let i = 0; i < n; i++) {
    fx += from[i].x
    fy += from[i].y
    tx += to[i].x
    ty += to[i].y
  }
  fx /= n
  fy /= n
  tx /= n
  ty /= n
  let cross = 0
  let dot = 0
  for (let i = 0; i < n; i++) {
    const ax = from[i].x - fx
    const ay = from[i].y - fy
    const bx = to[i].x - tx
    const by = to[i].y - ty
    cross += ax * by - ay * bx
    dot += ax * bx + ay * by
  }
  return Math.atan2(cross, dot)
}
