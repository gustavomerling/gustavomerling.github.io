import type { MovingBall, Point, Segment } from './types'

// Configuração global da física.
export const PHYSICS = {
  gravity: 1500, // px/s²
  bounce: 0.6, // fração da velocidade normal mantida no quique (restituição)
  friction: 0.1, // fração da velocidade tangencial perdida por segundo de contato
}
export const BALL_RADIUS = 12
const MAX_MOVE_PER_SUBSTEP = BALL_RADIUS / 2 // px; menos que o raio, para não atravessar blocos
const REACH = BALL_RADIUS + 1 // folga do descarte rápido por caixa envolvente
export const PREDICT_TIME = 10 // segundos simulados à frente, para a linha de previsão
export const PREDICT_DT = 1 / 120

export function segmentLength(seg: Segment) {
  return Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1)
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

export function distanceToSegment(p: Point, seg: Segment) {
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return Math.hypot(p.x - seg.x1, p.y - seg.y1)
  const t = Math.max(0, Math.min(1, ((p.x - seg.x1) * dx + (p.y - seg.y1) * dy) / len2))
  return Math.hypot(p.x - (seg.x1 + t * dx), p.y - (seg.y1 + t * dy))
}

// Empurra a bolinha para fora do bloco e aplica quique e atrito. dt é o tamanho do subpasso.
function collideWithSegment(ball: MovingBall, seg: Segment, dt: number) {
  const dx = seg.x2 - seg.x1
  const dy = seg.y2 - seg.y1
  const len2 = dx * dx + dy * dy
  if (len2 === 0) return
  const t = Math.max(0, Math.min(1, ((ball.x - seg.x1) * dx + (ball.y - seg.y1) * dy) / len2))
  const closestX = seg.x1 + t * dx
  const closestY = seg.y1 + t * dy

  const distX = ball.x - closestX
  const distY = ball.y - closestY
  const dist = Math.hypot(distX, distY)
  if (dist >= BALL_RADIUS || dist === 0) return

  // Normal apontando do bloco para a bolinha.
  const nx = distX / dist
  const ny = distY / dist

  // Empurra a bolinha para fora do bloco.
  ball.x += nx * (BALL_RADIUS - dist)
  ball.y += ny * (BALL_RADIUS - dist)

  // Separa a velocidade em normal (quique) e tangencial (atrito).
  const vn = ball.vx * nx + ball.vy * ny
  if (vn >= 0) return

  const tx = ball.vx - vn * nx
  const ty = ball.vy - vn * ny
  const keep = Math.pow(1 - PHYSICS.friction, dt)

  ball.vx = tx * keep - vn * PHYSICS.bounce * nx
  ball.vy = ty * keep - vn * PHYSICS.bounce * ny
}

// Divide o passo em subpassos curtos: uma bolinha rápida não pode pular um bloco de uma vez.
// Chama onHit quando a bolinha passa a encostar num bloco, inclusive deslizando.
// Devolve true quando a bolinha encosta numa linha de chegada.
export function integrate(
  b: MovingBall,
  dt: number,
  segments: Segment[],
  onHit?: (index: number, speed: number) => void,
): boolean {
  const speed = Math.hypot(b.vx, b.vy + PHYSICS.gravity * dt)
  const substeps = Math.max(1, Math.ceil((speed * dt) / MAX_MOVE_PER_SUBSTEP))
  const h = dt / substeps
  for (let s = 0; s < substeps; s++) {
    b.vy += PHYSICS.gravity * h
    b.x += b.vx * h
    b.y += b.vy * h
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i]
      // Descarte rápido: bloco longe da bolinha (caixa envolvente) não precisa de conta.
      const far =
        b.x < Math.min(seg.x1, seg.x2) - REACH ||
        b.x > Math.max(seg.x1, seg.x2) + REACH ||
        b.y < Math.min(seg.y1, seg.y2) - REACH ||
        b.y > Math.max(seg.y1, seg.y2) + REACH
      if (far && b.touching.length === 0) continue
      const was = b.touching.includes(i)
      if (far && !was) continue
      if (!far) collideWithSegment(b, seg, h)
      const touching = !far && distanceToSegment(b, seg) <= BALL_RADIUS + 0.5
      if (touching && !was) {
        b.touching.push(i)
        // A linha de chegada pausa e não toca som.
        if (seg.finish) return true
        onHit?.(i, Math.hypot(b.vx, b.vy))
      } else if (!touching && was) {
        b.touching = b.touching.filter((j) => j !== i)
      }
    }
  }
  return false
}

// Simula o futuro a partir do estado dado, sem alterar a bolinha.
// A previsão termina na linha de chegada, se houver.
// bounces guarda os índices de points em que a bolinha quica; hits guarda qual bloco foi tocado.
export function predict(ball: MovingBall, segments: Segment[], time = PREDICT_TIME, dt = PREDICT_DT) {
  const future = { ...ball, touching: [...ball.touching] }
  const points: Point[] = [{ x: future.x, y: future.y }]
  const bounces: number[] = []
  const hits: number[] = []
  for (let t = 0; t < time; t += dt) {
    const index = points.length
    const reachedFinish = integrate(future, dt, segments, (seg) => {
      bounces.push(index)
      hits.push(seg)
    })
    points.push({ x: future.x, y: future.y })
    if (reachedFinish) break
  }
  return { points, bounces, hits }
}
