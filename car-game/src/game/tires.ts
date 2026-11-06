/**
 * Modelo de pneu (puro, sem dependências): força longitudinal e lateral a partir do
 * escorregamento, com a "Fórmula Mágica" de Pacejka. Não toca no Rapier; quem chama
 * aplica as forças no chassi.
 */

export type TireParams = {
  /** Raio efetivo da roda (m). */
  radius: number
  /** Momento de inércia da roda em torno do eixo (kg·m²). */
  inertia: number
  /** Coeficiente de atrito longitudinal (pico). */
  muLong: number
  /** Coeficiente de atrito lateral (pico). */
  muLat: number
  /** Pacejka longitudinal: rigidez, forma e curvatura. */
  longB: number
  longC: number
  longE: number
  /** Pacejka lateral: rigidez, forma e curvatura. */
  latB: number
  latC: number
  latE: number
}

export type TireResult = {
  /** Força longitudinal (N), positiva para frente da roda. */
  Fx: number
  /** Força lateral (N), positiva para a direita do carro. */
  Fy: number
  /** Escorregamento longitudinal (adimensional; +1 = roda girando sem o carro andar). */
  slipRatio: number
  /** Ângulo de escorregamento (rad). */
  slipAngle: number
}

/** Fórmula Mágica de Pacejka: forma normalizada, entre -D e D. */
export function magicFormula(x: number, B: number, C: number, E: number): number {
  const bx = B * x
  return Math.sin(C * Math.atan(bx - E * (bx - Math.atan(bx))))
}

/**
 * Força do pneu dada a carga vertical e o movimento da roda no chão.
 * @param load carga vertical na roda (N), não negativa
 * @param vLong velocidade do ponto de contato na direção da roda (m/s)
 * @param vLat velocidade do ponto de contato lateral à roda (m/s)
 * @param omega velocidade angular da roda (rad/s)
 */
export function tireForce(p: TireParams, load: number, vLong: number, vLat: number, omega: number): TireResult {
  if (load <= 0) return { Fx: 0, Fy: 0, slipRatio: 0, slipAngle: 0 }

  // Abaixo de 2 m/s o escorregamento é normalizado por 2, para não explodir na parada
  const denom = Math.max(Math.abs(vLong), 2)
  const slipRatio = (omega * p.radius - vLong) / denom
  // A força lateral se opõe à velocidade lateral do contato
  const slipAngle = -Math.atan2(vLat, denom)

  const maxLong = p.muLong * load
  const maxLat = p.muLat * load
  let Fx = maxLong * magicFormula(slipRatio, p.longB, p.longC, p.longE)
  let Fy = maxLat * magicFormula(slipAngle, p.latB, p.latC, p.latE)

  // Elipse de atrito: a roda não tem mais aderência total do que o pico combinado
  const norm = Math.hypot(Fx / maxLong, Fy / maxLat)
  if (norm > 1) {
    Fx /= norm
    Fy /= norm
  }
  return { Fx, Fy, slipRatio, slipAngle }
}

/**
 * Velocidade angular da roda no passo seguinte.
 * @param driveTorque torque do motor na roda (N·m), para frente
 * @param brakeTorque torque máximo do freio (N·m), sempre contra o giro
 */
export function integrateSpin(
  p: TireParams,
  omega: number,
  Fx: number,
  driveTorque: number,
  brakeTorque: number,
  dt: number,
): number {
  // Reação do chão: a força longitudinal atua com o raio contra o giro da roda
  const drive = driveTorque - Fx * p.radius

  // Freio forte o bastante para travar a roda: ela fica parada
  if (Math.abs(omega) < 0.5 && brakeTorque >= Math.abs(drive)) return 0

  const brakeOpposed = omega !== 0 ? Math.sign(omega) * brakeTorque : 0
  let next = omega + ((drive - brakeOpposed) / p.inertia) * dt

  // O freio para a roda, mas não a faz girar ao contrário
  if (brakeTorque > 0 && omega !== 0 && Math.sign(next) !== Math.sign(omega)) next = 0
  return next
}
