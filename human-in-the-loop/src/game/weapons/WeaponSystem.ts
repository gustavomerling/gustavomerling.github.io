import * as THREE from 'three'
import type { Input } from '../player/Input'
import type { Melee } from './Melee'
import { BAT_SWING } from './Melee'
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
  /** Armas disponíveis (por índice de WEAPONS); as "só do chão" começam fora. */
  owned: boolean[]
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
  /**
   * Inércia (passo 28): a arma é uma massa presa à mão por uma mola. Ao
   * virar, ela fica para trás (rotação) e, ao acelerar, pular ou pousar, ela
   * se desloca (posição). Armas pesadas têm mola mais mole e ficam mais para trás.
   */
  private readonly swayRot = new THREE.Vector2()
  private readonly swayRotVel = new THREE.Vector2()
  private readonly swayPos = new THREE.Vector3()
  private readonly swayPosVel = new THREE.Vector3()
  private readonly prevLocalVel = new THREE.Vector3()
  /** Velocidade do jogador no mundo (definida pelo jogo a cada frame). */
  readonly playerVelocity = new THREE.Vector3()
  /** Mãos: 0..1 de "estender para agarrar" e pulso do arremesso. */
  private grabT = 0
  private grabbing = false
  private throwT = 0
  readonly owned: boolean[] = WEAPONS.map((w) => !w.pickupOnly)
  private bobPhase = 0
  private bobAmount = 0

  /** Coice do tiro (decai como mola) e tempo até poder atirar de novo. */
  private kickAmount = 0
  private cooldown = 0
  /** 0..1: quanto a arma está recolhida por haver algo encostado à frente. */
  private tuck = 0
  private tuckTarget = 0
  private readonly flash: THREE.Mesh
  private flashTime = 0

  /** Golpe corpo a corpo em andamento (para animar). */
  melee: Melee | null = null
  private shake = 0

  /** 0..1: quanto está mirando pela alça (iron sight). */
  ads = 0
  private aiming = false
  private breathT = 0

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

    // Clarão do disparo (um "X" de planos aditivos, preso ao cano).
    const flashMat = new THREE.MeshBasicMaterial({
      color: '#ffd27a',
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    const plane = new THREE.PlaneGeometry(0.09, 0.09)
    this.flash = new THREE.Mesh(plane, flashMat)
    const cross = new THREE.Mesh(plane, flashMat)
    cross.rotation.y = Math.PI / 2
    this.flash.add(cross)
    this.flash.visible = false
  }

  /**
   * Gatilho: devolve true quando sai um tiro agora. Semiautomática exige
   * soltar o botão; automática atira enquanto segura, na cadência.
   */
  trigger(input: Input | null, dt: number): boolean {
    this.cooldown -= dt
    const w = this.current
    if (!input || w.kind !== 'gun' || this.phase !== 'idle' || this.holstered) {
      input?.consume('Mouse0')
      return false
    }
    const pressed = input.consume('Mouse0')
    const wants = w.automatic ? input.isDown('Mouse0') : pressed
    if (!wants || this.cooldown > 0) return false
    this.cooldown = 1 / (w.fireRate ?? 5)
    this.kickAmount = Math.min(1.5, this.kickAmount + 1)
    this.showFlash()
    return true
  }

  /** Pede para mirar pela alça (só armas de fogo, prontas e não recolhidas). */
  setAiming(aiming: boolean) {
    this.aiming = aiming
  }

  /** Arma pronta (não está trocando nem guardada). */
  get ready() {
    return this.phase === 'idle' && !this.holstered
  }

  /** Pode mirar agora? */
  get canAim() {
    return this.current.kind === 'gun' && this.phase === 'idle' && !this.holstered
  }

  /**
   * Respiração ao mirar: um "oito" lento que desloca a mira de verdade
   * (pitch, yaw em rad). Fora da mira é zero.
   */
  breathOffset(): [number, number] {
    const a = (this.current.breath ?? 0) * this.ads
    const t = this.breathT
    return [Math.sin(t * 1.3) * a, Math.sin(t * 0.65) * a * 1.4]
  }

  /** Quanto a arma deve recolher (0..1), por algo encostado à frente. */
  setTuck(amount: number) {
    this.tuckTarget = THREE.MathUtils.clamp(amount, 0, 1)
  }

  /** Ponto do cano no mundo (aproximado), para o traço da bala sair da arma. */
  muzzleWorld(mainCamera: THREE.Camera, out: THREE.Vector3) {
    const model = this.models[this.index]
    const muzzle = model.userData.muzzle as THREE.Vector3 | undefined
    if (!muzzle) return out.set(0, -0.1, -0.5).applyMatrix4(mainCamera.matrixWorld)
    model.updateMatrix()
    return out.copy(muzzle).applyMatrix4(model.matrix).applyMatrix4(mainCamera.matrixWorld)
  }

  private showFlash() {
    const model = this.models[this.index]
    const muzzle = model.userData.muzzle as THREE.Vector3 | undefined
    if (!muzzle) return
    model.add(this.flash)
    this.flash.position.copy(muzzle)
    this.flash.rotation.z = Math.random() * Math.PI
    this.flash.scale.setScalar(0.8 + Math.random() * 0.5)
    this.flash.visible = true
    this.flashTime = 0.045
  }

  get current(): WeaponDef {
    return WEAPONS[this.index]
  }

  get state(): WeaponState {
    return { index: this.index, name: this.current.name, owned: [...this.owned], changedAt: performance.now() }
  }

  /** Arma pega do chão: passa a estar disponível e já é empunhada. */
  give(i: number) {
    if (i < 0 || i >= WEAPONS.length) return
    const isNew = !this.owned[i]
    this.owned[i] = true
    if (isNew) this.onChange(this.state)
    this.select(i)
  }

  /** Mãos agarrando algo (estendidas para a frente). */
  setGrab(on: boolean) {
    this.grabbing = on
  }

  /** Empurrão das mãos ao arremessar. */
  pulseThrow() {
    this.throwT = 1
  }

  /**
   * Fator extra de sensibilidade ao mirar pela alça: arma pesada vira mais
   * devagar (rifle ~0,8, pistola ~0,94).
   */
  get aimSensitivityScale() {
    return 1 / (1 + this.ads * this.current.mass * 0.07)
  }

  /** Próxima arma disponível a partir de `from`, no sentido `dir` (±1). */
  private cycle(from: number, dir: number) {
    const n = WEAPONS.length
    for (let k = 1; k <= n; k++) {
      const i = (((from + dir * k) % n) + n) % n
      if (this.owned[i]) return i
    }
    return from
  }

  select(i: number) {
    if (i < 0 || i >= WEAPONS.length || i === this.next || !this.owned[i]) return
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
      if (wheel) this.select(this.cycle(this.next, Math.sign(wheel)))
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

    const w = this.current
    this.updateInertia(dt, yaw, pitch, w)

    // Passada ao andar.
    const moving = grounded ? Math.min(1.5, speed / 4.2) : 0
    this.bobAmount += (moving - this.bobAmount) * (1 - Math.exp(-8 * dt))
    this.bobPhase += dt * (5 + speed * 1.2)
    const bobX = Math.sin(this.bobPhase) * 0.006 * this.bobAmount
    const bobY = -Math.abs(Math.cos(this.bobPhase)) * 0.008 * this.bobAmount
    // Respiração leve parada.
    const breathe = Math.sin(performance.now() / 1000 * 1.6) * 0.0015

    // Mira pela alça: sobe/desce no tempo da arma (armas pesadas, mais lentas).
    const wantAds = this.aiming && this.canAim && this.tuckTarget < 0.3
    const adsSpeed = dt / (w.adsTime ?? 0.2)
    this.ads = THREE.MathUtils.clamp(this.ads + (wantAds ? adsSpeed : -adsSpeed), 0, 1)
    const ads = this.ads * this.ads * (3 - 2 * this.ads)
    this.breathT += dt

    // Coice: volta como mola. Recolher: puxa para trás e inclina para cima.
    this.kickAmount *= Math.exp(-14 * dt)
    const kick = this.kickAmount * (w.id === 'rifle' ? 0.6 : 1)
    this.tuck += (this.tuckTarget - this.tuck) * (1 - Math.exp(-12 * dt))
    this.flashTime -= dt
    if (this.flashTime <= 0) this.flash.visible = false

    const model = this.models[this.index]
    // Mirando, balanço e passada diminuem (a inércia de arma pesada ainda aparece).
    const loose = 1 - ads * 0.85
    const heavy = 1 - ads * 0.65
    const sp = this.swayPos
    const sr = this.swayRot
    const hipPos = new THREE.Vector3(
      w.hip.x + bobX * loose + (sp.x - sr.x * 0.12) * heavy - this.tuck * 0.04,
      w.hip.y + (bobY + breathe) * loose + (sp.y + sr.y * 0.12) * heavy - eased * LOWER_DROP - this.tuck * 0.05,
      w.hip.z + sp.z * heavy + kick * 0.035 + this.tuck * w.length * 0.45,
    )
    // Posição de mira: a linha alça-massa no eixo da câmera.
    const sight = model.userData.sight as THREE.Vector3 | undefined
    if (sight && ads > 0) {
      const adsPos = new THREE.Vector3(-sight.x, -sight.y, -(w.adsEye ?? 0.2) - sight.z + kick * 0.02)
      hipPos.lerp(adsPos, ads)
    }
    model.position.copy(hipPos)
    model.rotation.set(
      w.hipRotation.x * (1 - ads) + sr.y * heavy - eased * 0.6 + kick * 0.09 * (1 - ads * 0.6) + this.tuck * 0.7,
      w.hipRotation.y * (1 - ads) + sr.x * heavy + this.tuck * 0.3,
      w.hipRotation.z * (1 - ads) + sr.x * 0.8 * heavy,
    )
    this.applyMelee(model, dt)

    // A câmera das armas também fecha um pouco (a arma não "cresce" demais).
    const vmFov = THREE.MathUtils.lerp(58, 48, ads)
    if (Math.abs(this.camera.fov - vmFov) > 0.01) {
      this.camera.fov = vmFov
      this.camera.updateProjectionMatrix()
    }
  }

  /**
   * Mola da arma (passo 28). Giro: a arma fica no mundo numa fração
   * `inertia` do giro da câmera e a mola a traz de volta (com um leve
   * balanço). Movimento: mudanças de velocidade (arrancar, frear, pular,
   * pousar) deslocam a arma no sentido contrário, mais nas pesadas.
   */
  private updateInertia(dt: number, yaw: number, pitch: number, w: WeaponDef) {
    const dYaw = Math.atan2(Math.sin(yaw - this.prevYaw), Math.cos(yaw - this.prevYaw))
    const dPitch = pitch - this.prevPitch
    this.prevYaw = yaw
    this.prevPitch = pitch

    const inertia = w.inertia ?? w.mass / (w.mass + 2)
    const maxRot = 0.06 + inertia * 0.16
    this.swayRot.x = THREE.MathUtils.clamp(this.swayRot.x - dYaw * inertia, -maxRot, maxRot)
    this.swayRot.y = THREE.MathUtils.clamp(this.swayRot.y - dPitch * inertia, -maxRot, maxRot)

    // Velocidade no espaço da câmera (direita, cima, frente).
    const v = this.playerVelocity
    const sin = Math.sin(yaw)
    const cos = Math.cos(yaw)
    const lx = v.x * cos - v.z * sin
    const lz = -v.x * sin - v.z * cos
    const k = 0.0015 + w.mass * 0.0016
    const maxPos = 0.012 + w.mass * 0.009
    const p = this.swayPos
    p.x = THREE.MathUtils.clamp(p.x - (lx - this.prevLocalVel.x) * k, -maxPos, maxPos)
    p.y = THREE.MathUtils.clamp(p.y - (v.y - this.prevLocalVel.y) * k * 0.6, -maxPos, maxPos)
    p.z = THREE.MathUtils.clamp(p.z + (lz - this.prevLocalVel.z) * k, -maxPos, maxPos)
    this.prevLocalVel.set(lx, v.y, lz)

    // Mola-amortecedor com subpassos (estável mesmo com mola dura e frame longo).
    const omega = 2 * Math.PI * (w.swayFreq ?? 6)
    const damp = 2 * 0.55 * omega
    const n = Math.max(1, Math.ceil(dt / (1 / 240)))
    const h = dt / n
    for (let i = 0; i < n; i++) {
      this.swayRotVel.x += (-omega * omega * this.swayRot.x - damp * this.swayRotVel.x) * h
      this.swayRotVel.y += (-omega * omega * this.swayRot.y - damp * this.swayRotVel.y) * h
      this.swayRot.addScaledVector(this.swayRotVel, h)
      this.swayPosVel.x += (-omega * omega * p.x - damp * this.swayPosVel.x) * h
      this.swayPosVel.y += (-omega * omega * p.y - damp * this.swayPosVel.y) * h
      this.swayPosVel.z += (-omega * omega * p.z - damp * this.swayPosVel.z) * h
      p.addScaledVector(this.swayPosVel, h)
    }
  }

  /**
   * Animação do golpe por cima da pose normal.
   * Taco: carregar puxa para trás sobre o ombro; o golpe gira no mesmo arco
   * usado pelo cálculo físico; a recuperação volta à pose normal.
   * Mãos: a mão direita recua ao carregar e vai à frente no soco.
   */
  private applyMelee(model: THREE.Group, dt: number) {
    const m = this.melee
    const w = this.current
    const right = model.children[0]
    const left = model.children[1]
    if (w.kind === 'hands' && right && left) {
      // Agarrando: as duas mãos vão à frente e se aproximam do centro.
      this.grabT = THREE.MathUtils.clamp(this.grabT + (this.grabbing ? dt : -dt) / 0.12, 0, 1)
      this.throwT = Math.max(0, this.throwT - dt / 0.25)
      const g = this.grabT * this.grabT * (3 - 2 * this.grabT)
      const t = Math.sin(this.throwT * Math.PI)
      right.position.set(0.17 - 0.07 * g, 0.07 * g + 0.03 * t, -0.24 * g - 0.18 * t)
      left.position.set(-0.17 + 0.07 * g, 0.07 * g + 0.03 * t, -0.24 * g - 0.18 * t)
      right.rotation.x = left.rotation.x = 0.2 + 0.35 * g
    }
    if (!m || m.phase === 'idle') return
    if (m.blocked && m.phase === 'recovering' && this.shake <= 0) this.shake = 0.12
    this.shake = Math.max(0, this.shake - dt)
    const jitter = this.shake > 0 ? (Math.random() - 0.5) * 0.02 : 0

    if (w.kind === 'hands' && right) {
      const c = m.phase === 'charging' ? m.progress : 0
      const punch = m.phase === 'swinging' ? Math.sin(m.progress * Math.PI * 0.5) : m.phase === 'recovering' ? 1 - m.progress : 0
      right.position.set(0.17 - punch * 0.12, punch * 0.08, c * 0.08 - punch * 0.32 + jitter)
      return
    }
    if (w.id !== 'bat') return

    if (m.phase === 'charging') {
      const c = m.progress
      model.position.x += 0.08 * c
      model.position.y += 0.06 * c
      model.position.z += 0.06 * c
      model.rotation.x += 0.35 * c
      model.rotation.y -= 0.7 * c
      return
    }
    // Pose do golpe: taco quase horizontal, girando da direita para a esquerda.
    const s = m.phase === 'swinging' ? m.progress : 1
    const weight = m.phase === 'swinging' ? 1 : 1 - m.progress * m.progress * (3 - 2 * m.progress)
    const yaw = THREE.MathUtils.lerp(BAT_SWING.fromYaw, BAT_SWING.toYaw, s)
    const swingPos = new THREE.Vector3(THREE.MathUtils.lerp(0.22, -0.18, s), -0.24 + jitter, -0.22)
    model.position.lerp(swingPos, weight)
    model.rotation.set(
      THREE.MathUtils.lerp(model.rotation.x, BAT_SWING.pitch + 0.1, weight),
      THREE.MathUtils.lerp(model.rotation.y, yaw, weight),
      THREE.MathUtils.lerp(model.rotation.z, -0.2, weight),
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
    this.flash.geometry.dispose()
    ;(this.flash.material as THREE.Material).dispose()
    this.materials.dispose()
  }
}
