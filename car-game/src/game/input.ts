/** Comandos de direção, normalizados. */
export type DriveInput = {
  /** Acelerador, 0 a 1. */
  throttle: number
  /** Freio, 0 a 1. */
  brake: number
  /** Direção: -1 (esquerda) a 1 (direita). */
  steer: number
  /** Freio de mão. */
  handbrake: boolean
}

const THROTTLE_KEYS = ['w', 'arrowup']
const BRAKE_KEYS = ['s', 'arrowdown']
const LEFT_KEYS = ['a', 'arrowleft']
const RIGHT_KEYS = ['d', 'arrowright']
const HANDBRAKE_KEYS = [' ']

/**
 * Teclado para dirigir: WASD ou setas, espaço para freio de mão.
 * As teclas são lidas por estado (pressionada agora), e tudo é solto ao perder o foco
 * da janela, para não ficar acelerador preso.
 */
export function createKeyboardInput(): { read: () => DriveInput; dispose: () => void } {
  const down = new Set<string>()

  const isGameKey = (k: string) =>
    [...THROTTLE_KEYS, ...BRAKE_KEYS, ...LEFT_KEYS, ...RIGHT_KEYS, ...HANDBRAKE_KEYS].includes(k)

  const onDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (isGameKey(k)) e.preventDefault()
    down.add(k)
  }
  const onUp = (e: KeyboardEvent) => {
    down.delete(e.key.toLowerCase())
  }
  const onBlur = () => down.clear()

  window.addEventListener('keydown', onDown)
  window.addEventListener('keyup', onUp)
  window.addEventListener('blur', onBlur)

  const any = (keys: string[]) => keys.some((k) => down.has(k))

  const read = (): DriveInput => {
    const left = any(LEFT_KEYS)
    const right = any(RIGHT_KEYS)
    return {
      throttle: any(THROTTLE_KEYS) ? 1 : 0,
      brake: any(BRAKE_KEYS) ? 1 : 0,
      steer: (left ? -1 : 0) + (right ? 1 : 0),
      handbrake: any(HANDBRAKE_KEYS),
    }
  }

  const dispose = () => {
    window.removeEventListener('keydown', onDown)
    window.removeEventListener('keyup', onUp)
    window.removeEventListener('blur', onBlur)
  }

  return { read, dispose }
}
