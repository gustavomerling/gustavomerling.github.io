import type { DriveInput } from './input'
import type { Drivetrain } from './drivetrain'

/**
 * Câmbio automático: converte W/S em "D" e "R" e troca as marchas sozinho.
 * W acelera para a frente; S freia e, com o carro quase parado, engata a ré e acelera para trás.
 * Acelerador com rampa e teto, limite de velocidade e "auto-hold" (sem pedal, o carro
 * desacelera e fica parado), para dar para manobrar em vaga com o teclado.
 */
export type AutoGearbox = {
  /** Devolve a entrada ajustada (acelerador/freio) e troca marchas no trem de força. */
  apply: (dt: number, input: DriveInput, dt_: Drivetrain, forwardSpeed: number) => DriveInput
}

export type AutoGearboxOptions = {
  /** Velocidade máxima para a frente (m/s). */
  maxForward: number
  /** Velocidade máxima de ré (m/s). */
  maxReverse: number
  /** Acelerador máximo (0 a 1): o teclado é tudo ou nada, isso evita patinar. */
  maxThrottle: number
  /** Sem pedal: freio leve que faz o carro parar sozinho e segura parado. */
  autoHold: boolean
}

/** Estacionamento: devagar, macio e parando sozinho. */
export const PARKING_GEARBOX: AutoGearboxOptions = {
  maxForward: 7.5, // ~27 km/h
  maxReverse: 3.5, // ~13 km/h
  maxThrottle: 0.5,
  autoHold: true,
}

/** Pista de testes: livre. */
export const FREE_GEARBOX: AutoGearboxOptions = {
  maxForward: 60,
  maxReverse: 6,
  maxThrottle: 1,
  autoHold: false,
}

const RAMP = 2 // 1/s
/** Freio do auto-hold rodando (desacelera como um carro real ao soltar o pedal) e parado. */
const COAST_BRAKE = 0.08
const HOLD_BRAKE = 0.6
const HOLD_SPEED = 0.6 // m/s

export function createAutoGearbox(opt: AutoGearboxOptions): AutoGearbox {
  let throttle = 0
  let cooldown = 0
  // Intenção atual: 1 = frente, -1 = ré
  let dir: 1 | -1 = 1

  return {
    apply: (dt, input, dt_, v) => {
      cooldown -= dt
      const wantsGo = input.throttle > 0.05
      const wantsBack = input.brake > 0.05

      let thr = 0
      let brake = 0
      if (wantsGo && !wantsBack) {
        if (v < -0.5) brake = 1 // andando de ré: freia antes de ir para a frente
        else {
          dir = 1
          thr = input.throttle * opt.maxThrottle
        }
      } else if (wantsBack && !wantsGo) {
        if (v > 0.5) brake = input.brake // andando para a frente: freio de verdade
        else {
          dir = -1
          thr = input.brake * opt.maxThrottle * 0.8
        }
      } else if (wantsBack && wantsGo) {
        brake = 1
      } else if (opt.autoHold) {
        brake = Math.abs(v) < HOLD_SPEED ? HOLD_BRAKE : COAST_BRAKE
      }

      // Limite de velocidade: corta o acelerador perto do teto (com folga para não serrilhar)
      if (dir === 1 && v > opt.maxForward) thr = 0
      else if (dir === 1 && v > opt.maxForward - 1) thr *= opt.maxForward - v
      if (dir === -1 && v < -opt.maxReverse) thr = 0
      else if (dir === -1 && v < -opt.maxReverse + 1) thr *= v + opt.maxReverse

      // Rampa do acelerador (sobe suave, solta rápido)
      throttle = thr > throttle ? Math.min(thr, throttle + RAMP * dt) : thr

      // Trocas de marcha
      if (cooldown <= 0) {
        const g = dt_.gear
        if (dir === -1 && g !== -1 && Math.abs(v) < 1.4) {
          if (dt_.shift(-1, v)) cooldown = 0.12
        } else if (dir === 1 && g < 1 && (wantsGo || g === 0)) {
          if (dt_.shift(1, v)) cooldown = 0.12
        } else if (dir === 1 && g >= 1) {
          if (dt_.rpm > 5600 && g < 5) {
            dt_.shift(1, v)
            cooldown = 0.35
          } else if (dt_.rpm < 1700 && g > 1 && v < 20) {
            dt_.shift(-1, v)
            cooldown = 0.35
          }
        }
      }
      // Ainda sem a marcha certa: não acelera
      if ((dir === 1 && dt_.gear < 1) || (dir === -1 && dt_.gear !== -1)) throttle = 0

      return { ...input, throttle, brake, shiftUp: false, shiftDown: false }
    },
  }
}
