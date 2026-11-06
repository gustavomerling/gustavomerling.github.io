/**
 * Parâmetros do veículo. Tudo em SI (metros, kg, N).
 * Eixo: +z é a frente do carro, +x é a esquerda do carro, +y para cima, origem no centro do chassi.
 *
 * Dois carros: "rua" (padrão) e "esportivo". Escolha pela URL: ?car=esportivo
 */

const BASE = {
  /** Massa do chassi (kg). */
  mass: 1200,
  /** Meia-medida da caixa do chassi (colisor e carroceria). */
  chassisHalf: { x: 1.0, y: 0.35, z: 2.1 },
  /** Altura inicial do chassi ao soltar (m). */
  spawnHeight: 1.6,

  wheels: {
    /** Raio da roda (m). */
    radius: 0.36,
    /** Largura da roda (m). */
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

  /** Motor e caixa (ver drivetrain.ts). Torque do motor vai para as rodas traseiras. */
  engine: {
    /** Marcha lenta (rpm). */
    idleRpm: 800,
    /** Corte de giro (rpm). */
    redlineRpm: 7000,
    /** Curva de torque: [rpm, N·m] (pico de ~400 N·m a 4000 rpm). */
    torqueCurve: [
      [800, 180],
      [2000, 300],
      [4000, 400],
      [5500, 370],
      [7000, 300],
    ] as Array<[number, number]>,
    /** Freio-motor com acelerador solto (N·m). */
    engineBrake: 60,
    /** Caixa: R, N, 1, 2, 3, 4, 5. */
    gears: [-3.2, 0, 3.6, 2.2, 1.5, 1.1, 0.9],
    /** Relação do diferencial. */
    finalDrive: 3.4,
    /** Fração do torque para cada roda traseira. */
    rearShare: 0.5,
    /** Subida do giro em ponto morto (rpm/s). */
    revRate: 4000,
  },

  /** Direção (ver steering.ts). Só as rodas dianteiras esterçam. */
  steering: {
    /** Distância entre eixos (m). */
    wheelbase: 2.7,
    /** Bitola (m). */
    track: 2.0,
    /** Esterçamento máximo parado (rad, ~35°). */
    maxAngleLow: 0.61,
    /** Esterçamento máximo em alta velocidade (rad, ~6°). */
    maxAngleHigh: 0.1,
    /** Velocidade em que o máximo chega ao mínimo (m/s). */
    highSpeed: 25,
    /** Velocidade de giro do volante (rad/s). */
    rate: 2.5,
  },

  /** Freios (N·m por roda). Dianteiros mais fortes: o peso vai para a frente na frenagem. */
  brakes: {
    /** Torque do freio de serviço em cada roda dianteira (N·m). */
    front: 3200,
    /** Torque do freio de serviço em cada roda traseira (N·m). */
    rear: 2600,
    /** Torque extra do freio de mão nas rodas traseiras (N·m). */
    handbrake: 2500,
    /** ABS ligado ao iniciar. Alterna com B. */
    absDefault: true,
    /** Com ABS, a roda que passa desse escorregamento longitudinal (negativo) solta o freio. */
    absSlipLimit: -0.2,
    /** Fração do freio mantida quando o ABS atua (pulsação). */
    absReduction: 0.25,
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
    /**
     * Barra estabilizadora por eixo (N/m): puxa uma roda para cima quando a do outro lado
     * comprime mais. Dá rolagem controlada em curva. Mais alto = carro mais "plano".
     */
    antiRoll: {
      front: 12000,
      rear: 8000,
    },
  },
}

export type VehicleConfig = typeof BASE

/** Esportivo: mais leve, motor que gira mais alto e entrega mais torque, mais aderência e freio, direção direta e suspensão firme. */
const SPORT: VehicleConfig = {
  ...BASE,
  mass: 1100,
  tire: { ...BASE.tire, muLong: 1.12, muLat: 1.1 },
  engine: {
    ...BASE.engine,
    redlineRpm: 7800,
    torqueCurve: [
      [800, 200],
      [2500, 340],
      [5000, 430],
      [6500, 420],
      [7800, 360],
    ],
    gears: [-3.2, 0, 3.0, 2.0, 1.45, 1.1, 0.9],
    finalDrive: 3.7,
  },
  steering: { ...BASE.steering, maxAngleLow: 0.5, maxAngleHigh: 0.07 },
  brakes: { ...BASE.brakes, front: 4300, rear: 3300 },
  suspension: { ...BASE.suspension, stiffness: 42, antiRoll: { front: 18000, rear: 12000 } },
}

/** Nome do carro escolhido pela URL (?car=esportivo). Padrão: rua. */
export const CAR_NAME: 'rua' | 'esportivo' =
  typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('car') === 'esportivo'
    ? 'esportivo'
    : 'rua'

export const VEHICLE: VehicleConfig = CAR_NAME === 'esportivo' ? SPORT : BASE
