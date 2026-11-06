/** Comandos de direção, normalizados. */
export type DriveInput = {
  /** Acelerador, 0 a 1. */
  throttle: number
  /** Freio, 0 a 1. */
  brake: number
  /** Direção: -1 (esquerda do carro) a 1 (direita do carro). */
  steer: number
  /** Freio de mão. */
  handbrake: boolean
  /** Marcha acima: aconteceu desde a última leitura (pulso, não estado). */
  shiftUp: boolean
  /** Marcha abaixo: aconteceu desde a última leitura (pulso, não estado). */
  shiftDown: boolean
  /** Alterna o ABS: aconteceu desde a última leitura (pulso). */
  absToggle: boolean
}

const THROTTLE_KEYS = ['w', 'arrowup']
const BRAKE_KEYS = ['s', 'arrowdown']
const LEFT_KEYS = ['a', 'arrowleft']
const RIGHT_KEYS = ['d', 'arrowright']
const HANDBRAKE_KEYS = [' ']

// Controle (padrão Xbox): eixo esquerdo X, gatilhos RT/LT, A, B, LB/RB
const PAD_STICK_X = 0
const PAD_DEADZONE = 0.12
const PAD_B = 1
const PAD_A = 0
const PAD_LB = 4
const PAD_RB = 5
const PAD_LT = 6
const PAD_RT = 7

/**
 * Entrada de direção: teclado (WASD/setas, espaço, Q/E, B) e controle (RT/LT, stick, A, LB/RB, B).
 * Os dois valem ao mesmo tempo: o maior acelerador/freio vence, e a direção é a mais forte.
 * As teclas são lidas por estado (pressionada agora). Ao perder o foco da janela, tudo é solto.
 * Trocas de marcha e ABS são pulsos: cada aperto vale uma vez, na próxima leitura.
 */
export function createKeyboardInput(): { read: () => DriveInput; dispose: () => void } {
  const down = new Set<string>()
  // Pulsos pendentes de teclado
  let pendingUp = 0
  let pendingDown = 0
  let pendingAbs = 0
  // Estado anterior dos botões do controle, para detectar aperto (borda)
  const prevPad = { rb: false, lb: false, b: false }

  const isGameKey = (k: string) =>
    [...THROTTLE_KEYS, ...BRAKE_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...HANDBRAKE_KEYS].includes(k)

  const onDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (isGameKey(k)) e.preventDefault()
    if (!e.repeat) {
      if (k === 'e') pendingUp++
      if (k === 'q') pendingDown++
      if (k === 'b') pendingAbs++
    }
    down.add(k)
  }
  const onUp = (e: KeyboardEvent) => {
    down.delete(e.key.toLowerCase())
  }
  const onBlur = () => {
    down.clear()
    pendingUp = 0
    pendingDown = 0
    pendingAbs = 0
  }

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', onBlur)

  const any = (keys: string[]) => keys.some((k) => down.has(k))

  const readPad = () => {
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : []
    const pad = Array.from(pads).find((p) => p && p.connected)
    if (!pad) return null
    const btn = (i: number) => pad.buttons[i]
    const stick = pad.axes[PAD_STICK_X] ?? 0
    const steer = Math.abs(stick) < PAD_DEADZONE ? 0 : Math.sign(stick) * ((Math.abs(stick) - PAD_DEADZONE) / (1 - PAD_DEADZONE))

    const rb = !!btn(PAD_RB)?.pressed
    const lb = !!btn(PAD_LB)?.pressed
    const b = !!btn(PAD_B)?.pressed
    const shiftUp = rb && !prevPad.rb
    const shiftDown = lb && !prevPad.lb
    const absToggle = b && !prevPad.b
    prevPad.rb = rb
    prevPad.lb = lb
    prevPad.b = b

    return {
      throttle: btn(PAD_RT)?.value ?? 0,
      brake: btn(PAD_LT)?.value ?? 0,
      steer,
      handbrake: !!btn(PAD_A)?.pressed,
      shiftUp,
      shiftDown,
      absToggle,
    }
  }

  const read = (): DriveInput => {
    const kLeft = any(LEFT_KEYS)
    const kRight = any(RIGHT_KEYS)
    const kSteer = (kLeft ? -1 : 0) + (kRight ? 1 : 0)
    const kThrottle = any(THROTTLE_KEYS) ? 1 : 0
    const kBrake = any(BRAKE_KEYS) ? 1 : 0
    const kHandbrake = any(HANDBRAKE_KEYS)

    const pad = readPad()

    // Os pulsos de teclado são consumidos aqui, junto com os do controle
    const out: DriveInput = {
      throttle: Math.max(kThrottle, pad?.throttle ?? 0),
      brake: Math.max(kBrake, pad?.brake ?? 0),
      // A direção mais forte entre teclado e stick
      steer: Math.abs(pad?.steer ?? 0) > Math.abs(kSteer) ? (pad?.steer ?? 0) : kSteer,
      handbrake: kHandbrake || (pad?.handbrake ?? false),
      shiftUp: pendingUp > 0 || (pad?.shiftUp ?? false),
      shiftDown: pendingDown > 0 || (pad?.shiftDown ?? false),
      absToggle: pendingAbs > 0 || (pad?.absToggle ?? false),
    }
    pendingUp = 0
    pendingDown = 0
    pendingAbs = 0
    return out
  }

  const dispose = () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', onBlur)
  }

  return { read, dispose }
}
