/**
 * Loop com passo fixo de física e render no ritmo do monitor.
 *
 * - `fixedUpdate(dt)` roda N vezes por frame, sempre com o mesmo dt (60 Hz).
 * - `render(alpha)` roda uma vez por frame; `alpha` (0..1) diz quanto do
 *   próximo passo já passou, para interpolar posições e evitar tremedeira em
 *   monitores de 120/144 Hz.
 */
export const FIXED_DT = 1 / 60
/** Limite de passos por frame, para não entrar em espiral se o PC engasgar. */
const MAX_STEPS_PER_FRAME = 5

export interface LoopCallbacks {
  fixedUpdate: (dt: number) => void
  render: (alpha: number, frameDt: number) => void
}

export interface Loop {
  start: () => void
  stop: () => void
}

export function createLoop({ fixedUpdate, render }: LoopCallbacks): Loop {
  let rafId = 0
  let last = 0
  let acc = 0

  const frame = (now: number) => {
    rafId = requestAnimationFrame(frame)
    const frameDt = Math.min((now - last) / 1000, MAX_STEPS_PER_FRAME * FIXED_DT)
    last = now
    acc += frameDt
    while (acc >= FIXED_DT) {
      fixedUpdate(FIXED_DT)
      acc -= FIXED_DT
    }
    render(acc / FIXED_DT, frameDt)
  }

  return {
    start() {
      if (rafId) return
      last = performance.now()
      acc = 0
      rafId = requestAnimationFrame(frame)
    },
    stop() {
      cancelAnimationFrame(rafId)
      rafId = 0
    },
  }
}
