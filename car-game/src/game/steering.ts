/**
 * Geometria da direção (puro, sem dependências).
 * Convenção: ângulo positivo gira a roda para +x do modelo. Com a frente em +z e o topo em +y,
 * +x é a ESQUERDA do carro. Quem chama inverte o sinal da entrada (D = direita).
 */

export type SteeringParams = {
  /** Distância entre eixos (m). */
  wheelbase: number
  /** Bitola (distância entre as rodas de um eixo, m). */
  track: number
  /** Esterçamento máximo em marcha lenta (rad). */
  maxAngleLow: number
  /** Esterçamento máximo em alta velocidade (rad). */
  maxAngleHigh: number
  /** Velocidade (m/s) em que o esterçamento máximo chega ao mínimo. */
  highSpeed: number
  /** Velocidade máxima de giro do volante (rad/s). */
  rate: number
}

/** Esterçamento máximo dado a velocidade: diminui com a velocidade para não virar demais. */
export function maxSteerAngle(p: SteeringParams, speedMs: number): number {
  const t = Math.min(1, Math.abs(speedMs) / p.highSpeed)
  return p.maxAngleLow + (p.maxAngleHigh - p.maxAngleLow) * t
}

/** Aproxima o ângulo atual do alvo, limitado pela velocidade de giro do volante. */
export function steerTowards(current: number, target: number, rate: number, dt: number): number {
  const max = rate * dt
  return current + Math.max(-max, Math.min(max, target - current))
}

/**
 * Ackermann: em curva, a roda interna esterça mais que a externa, para as duas girarem
 * em torno do mesmo centro. Devolve o ângulo da roda do lado -x e da roda do lado +x.
 * @param center ângulo "médio" da direção (rad); positivo = para +x
 */
export function ackermann(p: SteeringParams, center: number): { atNegX: number; atPosX: number } {
  if (Math.abs(center) < 1e-4) return { atNegX: 0, atPosX: 0 }

  const radius = p.wheelbase / Math.tan(Math.abs(center)) // raio até o centro do eixo traseiro
  const inner = Math.atan(p.wheelbase / (radius - p.track / 2))
  const outer = Math.atan(p.wheelbase / (radius + p.track / 2))

  // Virando para +x, a roda de +x é a interna
  return center > 0 ? { atNegX: outer, atPosX: inner } : { atNegX: -inner, atPosX: -outer }
}
