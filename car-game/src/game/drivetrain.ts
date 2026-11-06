/**
 * Trem de força (puro, sem dependências): motor com curva de torque, caixa manual
 * e rotação do motor ligada às rodas traseiras. Não há embreagem: a rotação do motor
 * sai da velocidade das rodas, limitada entre marcha lenta e corte de giro.
 */

export type DrivetrainParams = {
  /** Marcha lenta (rpm). */
  idleRpm: number
  /** Corte de giro (rpm): acima disso o torque some. */
  redlineRpm: number
  /** Torque do motor em função da rotação: pontos [rpm, N·m], em ordem crescente. */
  torqueCurve: ReadonlyArray<readonly [number, number]>
  /** Freio-motor com acelerador solto (N·m, no motor). */
  engineBrake: number
  /** Relações da caixa: [marcha R, N, 1, 2, ...]. R é negativa, N é 0. */
  gears: readonly number[]
  /** Relação do diferencial. */
  finalDrive: number
  /** Fração do torque que vai para cada roda traseira. */
  rearShare: number
  /** Velocidade de subida do giro em ponto morto (rpm/s). */
  revRate: number
}

export type Drivetrain = {
  /** Rotação atual do motor (rpm). */
  readonly rpm: number
  /** Nome da marcha para exibir: "R", "N", "1" a "5". */
  gearLabel: () => string
  /**
   * Troca de marcha. Ré só com o carro quase parado (< 1.5 m/s).
   * Retorna se a troca aconteceu.
   */
  shift: (dir: 1 | -1, speedMs: number) => boolean
  /**
   * Avança o trem de força um passo.
   * @param rearOmega velocidade angular média das rodas traseiras (rad/s)
   * @param throttle acelerador, 0 a 1
   * @returns torque do motor em cada roda traseira (N·m), positivo para frente
   */
  update: (dt: number, throttle: number, rearOmega: number) => number
}

const RPM_PER_RAD_S = 60 / (2 * Math.PI)
const REVERSE_MAX_SPEED = 1.5

export function createDrivetrain(p: DrivetrainParams): Drivetrain {
  const NEUTRAL = 1
  let gearIdx = NEUTRAL
  let rpm = p.idleRpm

  const ratio = () => p.gears[gearIdx]

  const curve = (r: number): number => {
    const pts = p.torqueCurve
    if (r <= pts[0][0]) return pts[0][1]
    for (let i = 1; i < pts.length; i++) {
      const [r1, t1] = pts[i]
      if (r <= r1) {
        const [r0, t0] = pts[i - 1]
        return t0 + ((r - r0) / (r1 - r0)) * (t1 - t0)
      }
    }
    return pts[pts.length - 1][1]
  }

  return {
    get rpm() {
      return rpm
    },

    gearLabel: () => {
      if (gearIdx === 0) return 'R'
      if (gearIdx === NEUTRAL) return 'N'
      return String(gearIdx - NEUTRAL)
    },

    shift: (dir, speedMs) => {
      const next = gearIdx + dir
      if (next < 0 || next >= p.gears.length) return false
      // Ré só com o carro parado: evita engatar ré em movimento
      if (next === 0 && Math.abs(speedMs) > REVERSE_MAX_SPEED) return false
      gearIdx = next
      return true
    },

    update: (dt, throttle, rearOmega) => {
      const r = ratio()
      const redline = p.redlineRpm

      // Ponto morto: o motor sobe ou cai conforme o acelerador, sem carga
      if (r === 0) {
        const target = p.idleRpm + throttle * (redline - p.idleRpm)
        const step = p.revRate * dt
        rpm = Math.abs(target - rpm) <= step ? target : rpm + Math.sign(target - rpm) * step
        return 0
      }

      // Rotação do motor pela roda: travada entre marcha lenta e corte de giro
      const wheelRpm = Math.abs(rearOmega) * RPM_PER_RAD_S * Math.abs(r) * p.finalDrive
      rpm = Math.min(redline, Math.max(p.idleRpm, wheelRpm))

      // Torque: curva com acelerador; sem acelerador, freio-motor. Corte de giro acima do limite.
      let engine = throttle * (rpm < redline ? curve(rpm) : 0)
      engine += (1 - throttle) * -p.engineBrake

      // Torque do motor para cada roda traseira (a ré inverte o sinal pela relação)
      return engine * r * p.finalDrive * p.rearShare
    },
  }
}
