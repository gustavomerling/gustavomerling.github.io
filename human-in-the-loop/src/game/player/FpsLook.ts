import * as THREE from 'three'

const PITCH_LIMIT = THREE.MathUtils.degToRad(89)
/** Sensibilidade 1.0 = 0,0022 rad por pixel (≈ padrão de jogos de PC). */
const BASE_RAD_PER_PIXEL = 0.0022
/**
 * Alguns navegadores no Windows soltam "saltos" enormes de movementX/Y ao
 * capturar o mouse. Sem entrada crua, deltas acima disso são descartados.
 */
const SPIKE_PX = 250

/**
 * Olhar em primeira pessoa com pointer lock. Sem suavização: o movimento do
 * mouse é aplicado direto (é o que jogadores de FPS esperam), e o ângulo
 * vertical é limitado para não virar de cabeça para baixo.
 */
export class FpsLook {
  yaw = 0
  pitch = 0
  sensitivity = 1
  /** Multiplicador extra (ex.: menor ao mirar, junto com o zoom). */
  zoomScale = 1
  /** Olhar travado (ex.: menu de spawn aberto usa o mouse como cursor). */
  frozen = false
  private rawInput = false
  private readonly euler = new THREE.Euler(0, 0, 0, 'YXZ')
  private readonly element: HTMLElement
  private readonly onLockChange: (locked: boolean) => void

  constructor(element: HTMLElement, onLockChange: (locked: boolean) => void) {
    this.element = element
    this.onLockChange = onLockChange
    document.addEventListener('pointerlockchange', this.handleLockChange)
    document.addEventListener('mousemove', this.handleMove)
    element.addEventListener('click', this.lock)
  }

  get locked() {
    return document.pointerLockElement === this.element
  }

  /** Captura o mouse; tenta entrada crua (sem aceleração do SO) primeiro. */
  lock = async () => {
    if (this.locked) return
    try {
      await this.element.requestPointerLock({ unadjustedMovement: true })
      this.rawInput = true
    } catch {
      try {
        await this.element.requestPointerLock()
      } catch {
        // O navegador pode recusar se o pedido vier rápido demais após um Esc.
      }
      this.rawInput = false
    }
  }

  unlock() {
    if (this.locked) document.exitPointerLock()
  }

  /** Aponta a câmera para um ponto (usado ao nascer). */
  lookAt(from: THREE.Vector3, target: THREE.Vector3) {
    const dir = target.clone().sub(from).normalize()
    this.yaw = Math.atan2(-dir.x, -dir.z)
    this.pitch = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
  }

  /** `offsetPitch/Yaw`: deslocamento só da mira (ex.: respiração), não acumula. */
  apply(camera: THREE.Camera, offsetPitch = 0, offsetYaw = 0) {
    this.euler.set(this.pitch + offsetPitch, this.yaw + offsetYaw, 0)
    camera.quaternion.setFromEuler(this.euler)
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this.handleLockChange)
    document.removeEventListener('mousemove', this.handleMove)
    this.element.removeEventListener('click', this.lock)
    this.unlock()
  }

  private handleLockChange = () => this.onLockChange(this.locked)

  private handleMove = (e: MouseEvent) => {
    if (!this.locked || this.frozen) return
    const { movementX: dx, movementY: dy } = e
    if (!this.rawInput && (Math.abs(dx) > SPIKE_PX || Math.abs(dy) > SPIKE_PX)) return
    const k = BASE_RAD_PER_PIXEL * this.sensitivity * this.zoomScale
    this.yaw -= dx * k
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * k, -PITCH_LIMIT, PITCH_LIMIT)
  }
}
