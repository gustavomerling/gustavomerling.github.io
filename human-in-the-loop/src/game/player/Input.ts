/**
 * Estado do teclado por `code` (posição física da tecla), então WASD funciona
 * igual em ABNT, US, AZERTY etc.
 *
 * Teclas "pressionadas" (borda de descida) ficam guardadas até alguém
 * consumir, para não perder um toque rápido entre dois passos de física.
 */
export class Input {
  private readonly down = new Set<string>()
  private readonly pressed = new Set<string>()
  /** Só aceita teclas enquanto o jogo está com o mouse capturado. */
  enabled = false

  constructor() {
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.clear)
  }

  isDown(code: string) {
    return this.enabled && this.down.has(code)
  }

  /** true uma única vez por toque. */
  consume(code: string) {
    const was = this.pressed.has(code)
    this.pressed.delete(code)
    return this.enabled && was
  }

  /** -1, 0 ou 1 a partir de um par de teclas. */
  axis(negative: string, positive: string) {
    return (this.isDown(positive) ? 1 : 0) - (this.isDown(negative) ? 1 : 0)
  }

  clear = () => {
    this.down.clear()
    this.pressed.clear()
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.clear)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled) return
    // Espaço rolaria a página; Tab tiraria o foco.
    if (e.code === 'Space' || e.code === 'Tab') e.preventDefault()
    if (!e.repeat) this.pressed.add(e.code)
    this.down.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.down.delete(e.code)
  }
}
