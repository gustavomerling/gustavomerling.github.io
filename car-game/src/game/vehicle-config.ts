/**
 * Parâmetros do veículo. Tudo em SI (metros, kg, N).
 * Eixo: +z é a frente do carro, +y para cima, origem no centro do chassi.
 */
export const VEHICLE = {
  /** Massa do chassi (kg). */
  mass: 1200,
  /** Meia-medida da caixa do chassi (colisor e carroceria). */
  chassisHalf: { x: 1.0, y: 0.35, z: 2.1 },
  /** Altura inicial do chassi ao soltar (m). */
  spawnHeight: 1.6,

  wheels: {
    /** Raio da roda (m). */
    radius: 0.36,
    /** Largura da roda (m), só visual por enquanto. */
    width: 0.3,
    /** Metade da bitola (distância do centro até a roda, em x). */
    trackHalf: 1.0,
    /** Metade da distância entre eixos (em z). */
    wheelbaseHalf: 1.35,
    /** Onde a suspensão prende no chassi, em y (abaixo do centro). */
    connectionY: -0.3,
    /** Comprimento da suspensão quando solta (m). */
    restLength: 0.45,
    /** Curso máximo da suspensão para cima e para baixo (m). */
    maxTravel: 0.3,
  },

  tire: {
    /** Inércia da roda (kg·m²). */
    inertia: 2.0,
    /** Atrito de pico: longitudinal e lateral (asfalto seco). */
    muLong: 1.05,
    muLat: 1.0,
    /** Pacejka longitudinal (rigidez, forma, curvatura). */
    longB: 10,
    longC: 1.65,
    longE: 0.8,
    /** Pacejka lateral (rigidez, forma, curvatura). */
    latB: 8,
    latC: 1.3,
    latE: 0,
  },

  /**
   * Torques temporários: motor e freio completos chegam nos passos 6 e 7.
   * Motor só nas rodas traseiras.
   */
  controls: {
    /** Torque do motor por roda traseira com acelerador cheio (N·m). */
    driveTorque: 1200,
    /** Torque do freio de serviço por roda (N·m). */
    brakeTorque: 3000,
    /** Torque extra do freio de mão nas rodas traseiras (N·m). */
    handbrakeTorque: 2500,
  },

  suspension: {
    /** Rigidez da mola. Mais alto = mais dura. */
    stiffness: 30,
    /** Amortecimento na compressão (quando a roda sobe). */
    compression: 4,
    /** Amortecimento na extensão (quando a roda desce, a "volta"). */
    relaxation: 4,
    /** Força máxima que uma mola aplica (N). */
    maxForce: 40000,
  },
} as const
