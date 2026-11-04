import * as THREE from 'three'
import type { Input } from '../player/Input'
import { buildViewmodel, createViewmodelMaterials, type ViewmodelMaterials } from './viewmodels'
import { WEAPONS, type WeaponDef } from './weapons'

/** Tempo para abaixar a arma atual e para levantar a próxima (s). */
const LOWER_TIME = 0.14
const RAISE_TIME = 0.2
/** Quanto a arma desce ao ser guardada (m, espaço da câmera). */
const LOWER_DROP = 0.28

export interface WeaponState {
  index: number
  name: string
  /** Mostra o nome por um instante depois de trocar. */
  changedAt: number
}

/**
 * Armas na tela: desenhadas numa cena própria por cima do mundo (não
 * atravessam paredes), com troca animada, balanço ao virar a câmera e
 * passada ao andar.
 */
export class WeaponSystem {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(58, 1, 0.01, 10)
  private readonly materials: ViewmodelMaterials
  private readonly models: THREE.Group[]
  private readonly holder = new THREE.Group()

  index = 1
  private next = 1
  private phase: 'idle' | 'lower' | 'raise' = 'raise'
  private phaseT = 0
  /** Guardada (modo construção): a arma fica abaixada. */
  private holstered = false
  private holsterT = 0

  private prevYaw = 0
  private prevPitch = 0
  private readonly sway = new THREE.Vector2()
  private bobPhase = 0
  private bobAmount = 0

  private readonly onChange: (s: WeaponState) => void

  constructor(onChange: (s: WeaponState) => void) {
    this.onChange = onChange
    this.materials = createViewmodelMaterials()
    this.models = WEAPONS.map((w) => {
      const model = buildViewmodel(w.id, this.materials)
      model.visible = false
      this.holder.add(model)
      return model
    })
    this.scene.add(this.holder)
    // Luz própria da camada das armas (parecida com a do mundo).
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#8f8a80', 1.6))
    const key = new THREE.DirectionalLight('#fff6ea', 1.8)
    key.position.set(0.6, 1, 0.4)
    this.scene.add(key)
    this.models[this.index].visible = true
  }

  get current(): WeaponDef {
    return WEAPONS[this.index]
  }

  get state(): WeaponState {
    return { index: this.index, name: this.current.name, changedAt: performance.now() }
  }

  select(i: number) {
    if (i < 0 || i >= WEAPONS.length || i === this.next) return
    this.next = i
    if (this.phase !== 'lower') {
      this.phase = 'lower'
      this.phaseT = 0
    }
  }

  setHolstered(h: boolean) {
    this.holstered = h
  }

  /**
   * Lê a troca de arma (1–4, roda) e anima o modelo. `yaw/pitch` vêm do
   * olhar; `speed` e `grounded`, do corpo do jogador.
   */
  frame(dt: number, input: Input | null, yaw: number, pitch: number, speed: number, grounded: boolean) {
    if (input) {
      for (let i = 0; i < WEAPONS.length; i++) if (input.consume(`Digit${i + 1}`)) this.select(i)
      const wheel = input.consumeWheel()
      if (wheel) this.select((this.next + wheel + WEAPONS.length) % WEAPONS.length)
    }

    // Troca: abaixa a atual, troca o modelo, levanta a nova.
    let drop = 0
    if (this.phase === 'lower') {
      this.phaseT += dt / LOWER_TIME
      drop = Math.min(1, this.phaseT)
      if (this.phaseT >= 1) {
        this.models[this.index].visible = false
        this.index = this.next
        this.models[this.index].visible = true
        this.phase = 'raise'
        this.phaseT = 0
        this.onChange(this.state)
      }
    } else if (this.phase === 'raise') {
      this.phaseT += dt / RAISE_TIME
      drop = 1 - Math.min(1, this.phaseT)
      if (this.phaseT >= 1) this.phase = 'idle'
    }
    // Guardada: fica toda abaixada.
    this.holsterT = THREE.MathUtils.clamp(this.holsterT + (this.holstered ? dt : -dt) / RAISE_TIME, 0, 1)
    drop = Math.max(drop, this.holsterT)
    const eased = drop * drop * (3 - 2 * drop)

    // Balanço: a arma "fica para trás" quando a câmera gira. Armas pesadas
    // reagem mais devagar.
    const dYaw = Math.atan2(Math.sin(yaw - this.prevYaw), Math.cos(yaw - this.prevYaw))
    const dPitch = pitch - this.prevPitch
    this.prevYaw = yaw
    this.prevPitch = pitch
    const w = this.current
    const target = new THREE.Vector2(
      THREE.MathUtils.clamp(dYaw * 1.6, -0.05, 0.05),
      THREE.MathUtils.clamp(-dPitch * 1.6, -0.05, 0.05),
    )
    const rate = 14 / (1 + w.mass * 0.25)
    this.sway.lerp(target, 1 - Math.exp(-rate * dt))

    // Passada ao andar.
    const moving = grounded ? Math.min(1.5, speed / 4.2) : 0
    this.bobAmount += (moving - this.bobAmount) * (1 - Math.exp(-8 * dt))
    this.bobPhase += dt * (5 + speed * 1.2)
    const bobX = Math.sin(this.bobPhase) * 0.006 * this.bobAmount
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.008 * this.bobAmount
    // Respiração leve parada.
    const breathe = Math.sin(performance.now() / 1000 * 1.6) * 0.0015

    const model = this.models[this.index]
    model.position.set(
      w.hip.x + this.sway.x + bobX,
      w.hip.y + this.sway.y + bobY + breathe - eased * LOWER_DROP,
      w.hip.z,
    )
    model.rotation.set(
      w.hipRotation.x - eased * 0.6 + this.sway.y * 2,
      w.hipRotation.y + this.sway.x * 2,
      w.hipRotation.z + this.sway.x * 1.5,
    )
  }

  /** Desenha a camada das armas por cima do que já foi renderizado. */
  render(renderer: THREE.WebGLRenderer, aspect: number) {
    if (this.camera.aspect !== aspect) {
      this.camera.aspect = aspect
      this.camera.updateProjectionMatrix()
    }
    renderer.autoClear = false
    renderer.clearDepth()
    renderer.render(this.scene, this.camera)
    renderer.autoClear = true
  }

  dispose() {
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose()
    })
    this.materials.dispose()
  }
}
