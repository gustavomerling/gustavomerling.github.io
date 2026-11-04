/**
 * Estado do teclado por `code` (posição física da tecla), então WASD funciona
 * igual em ABNT, US, AZERTY etc.
 *
 * Teclas "pressionadas" (borda de descida) ficam guardadas até alguém
 * consumir, para não perder um toque rápido entre dois passos de física.
 * Um toque não consumido expira (PRESS_TTL), para não disparar uma ação
 * muito depois (ex.: um clique antigo colocando um objeto ao entrar no modo
 * construção).
 */
const PRESS_TTL = 250

export class Input {
  private readonly down = new Set<string>()
  /** Momento do último toque de cada tecla/botão ainda não consumido. */
  private readonly pressed = new Map<string, number>()
  private wheel = 0
  /** Só aceita teclas enquanto o jogo está com o mouse capturado. */
  enabled = false

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.clear)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    window.addEventListener('wheel', this.onWheel, { passive: true })
    window.addEventListener('contextmenu', this.onContextMenu)
  }

  /** Passos acumulados da roda do mouse desde a última leitura (+1 = para baixo). */
  consumeWheel() {
    const w = this.wheel
    this.wheel = 0
    return this.enabled ? w : 0
  }

  isDown(code: string) {
    return this.enabled && this.down.has(code)
  }

  /** true uma única vez por toque. */
  consume(code: string) {
    const at = this.pressed.get(code)
    this.pressed.delete(code)
    return this.enabled && at !== undefined && performance.now() - at < PRESS_TTL
  }

  /** -1, 0 ou 1 a partir de um par de teclas. */
  axis(negative: string, positive: string) {
    return (this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0)
  }

  clear = () => {
    this.down.clear()
    this.pressed.clear()
    this.wheel = 0
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.clear)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    window.removeEventListener('wheel', this.onWheel)
    window.removeEventListener('contextmenu', this.onContextMenu)
  }

  // Botões do mouse viram códigos "Mouse0" (esquerdo), "Mouse1" (meio), "Mouse2" (direito).
  private onMouseDown = (e: MouseEvent) => {
    if (!this.enabled) return
    const code = `Mouse${e.button}`
    this.pressed.set(code, performance.now())
    this.down.add(code)
  }

  private onMouseUp = (e: MouseEvent) => {
    this.down.delete(`Mouse${e.button}`)
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled || e.deltaY === 0) return
    this.wheel += Math.sign(e.deltaY)
  }

  private onContextMenu = (e: MouseEvent) => {
    if (this.enabled) e.preventDefault()
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return
    // Espaço rolaria a página; Tab tiraria o foco.
    if (e.code === 'Space' || e.code === 'Tab') e.preventDefault()
    if (!e.repeat) this.pressed.set(e.code, performance.now())
    this.down.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code)
  }
}
