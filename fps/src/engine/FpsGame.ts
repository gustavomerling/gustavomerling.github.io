import * as THREE from 'three'
import { BINDINGS } from './controls.ts'
import { Gimmicks } from './Gimmicks.ts'
import { Goal } from './Goal.ts'
import { buildWorld, type BuiltLevel } from './LevelBuilder.ts'
import type { LevelDef } from './levels/types.ts'
import { Movers } from './Movers.ts'
import type { Ground } from './Ramp.ts'
import { Player, type PlayerInput } from './Player.ts'
import { DEFAULT_SETTINGS, type GameSettings } from './settings.ts'
import { Sky, SKY_HORIZON } from './Sky.ts'
import { Sound } from './Sound.ts'

export type RespawnReason = 'fall' | 'hazard' | 'restart'

/** How a run went, reported when the player reaches the goal. */
export type RunStats = {
  /** Seconds played (paused time does not count). */
  time: number
  falls: number
  /** True when the run started at the first level, so it can count as a record. */
  fullRun: boolean
}

export type FpsCallbacks = {
  onLockChange?: (locked: boolean) => void
  onRespawn?: (reason: RespawnReason, falls: number) => void
  /** `reached` is true the first time the player gets to this level in the run. */
  onLevelChange?: (index: number, reached: boolean) => void
  onFinish?: (stats: RunStats) => void
}

const MOUSE_SENSITIVITY = 0.0022
// Largest mouse delta (pixels) taken in one event. Bigger ones are discarded.
const MAX_MOUSE_DELTA = 100
// Debug: mouse events turning the view more than this (radians) are logged.
const DEBUG_TURN_STEP = 0.05

// Tolerance when deciding which level a height belongs to (feet on a base).
const LEVEL_EPSILON = 1e-3

// Running widens the view a little, for a sense of speed.
const RUN_FOV_BOOST = 7
const FOV_SMOOTHING = 6

// The sun sits at this offset from the player and follows them up the tower,
// so every level gets shadows (a fixed sun only covered the bottom levels).
const SUN_OFFSET = new THREE.Vector3(18, 30, 12)
const SHADOW_SPAN = 22

// The player's lantern: a warm light just above and to the right of the eye.
const LANTERN_COLOR = 0xffd49a
const LANTERN_INTENSITY = 14
const LANTERN_RANGE = 16
const LANTERN_OFFSET = new THREE.Vector3(0.35, 0.25, -0.2)

// Landing marker under the player while airborne.
const MARKER_MIN_GAP = 0.25
const MARKER_MAX_GAP = 14

function fmtVec(v: THREE.Vector3) {
  return `(${v.x.toFixed(2)}, ${v.y.toFixed(2)}, ${v.z.toFixed(2)})`
}

/**
 * Owns the renderer, scene, camera, input and the game loop, and drives a
 * `Player` through the stacked levels. Level/block specifics live elsewhere.
 */
export class FpsGame {
  private readonly container: HTMLElement
  private readonly callbacks: FpsCallbacks
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock = new THREE.Clock()
  private readonly resizeObserver: ResizeObserver
  private readonly sound = new Sound()
  private readonly sky: Sky
  private readonly sun: THREE.DirectionalLight
  private readonly goal: Goal | null
  private readonly marker: THREE.Mesh
  private readonly pulses: THREE.MeshStandardMaterial[] = []
  private readonly glows: THREE.MeshBasicMaterial[] = []
  private readonly gimmicks: Gimmicks
  private readonly lantern: THREE.PointLight
  private lanternOn = true

  private readonly player: Player
  private readonly colliders: THREE.Box3[]
  private readonly hazards: THREE.Box3[]
  private readonly movers: Movers
  private readonly grounds: Ground[]
  private readonly fallY: number
  private readonly levels: BuiltLevel[]
  /** World Y of the top of the tower. */
  readonly top: number
  /** Level the player is on or last stood on; stays put while airborne. */
  private current: BuiltLevel
  private readonly keys = new Set<string>()

  private settings: GameSettings = DEFAULT_SETTINGS
  private locked = false
  private lastMouseTime = Number.NaN
  private lastMovementX = 0
  private frame = 0
  private disposed = false
  private time = 0

  private elapsedTime = 0
  private fallCount = 0
  private highest = 0
  private fullRun: boolean
  private finished = false

  constructor(container: HTMLElement, defs: LevelDef[], callbacks: FpsCallbacks = {}, startLevel = 0) {
    this.container = container
    this.callbacks = callbacks

    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    container.appendChild(this.renderer.domElement)

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(SKY_HORIZON)
    this.scene.fog = new THREE.Fog(SKY_HORIZON, 30, 95)

    this.camera = new THREE.PerspectiveCamera(this.settings.fov, 1, 0.1, 500)

    const world = buildWorld(defs)
    this.scene.add(world.group)
    this.colliders = world.colliders
    this.hazards = world.hazards
    this.movers = new Movers(world.movers)
    this.grounds = world.grounds
    this.fallY = world.fallY
    this.levels = world.levels
    this.top = world.top
    this.current = world.levels[startLevel]
    this.highest = startLevel
    this.fullRun = startLevel === 0
    this.player = new Player(this.current.spawn)
    this.gimmicks = new Gimmicks(world.specials)

    world.group.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return
      if (object.userData.pulse && object.material instanceof THREE.MeshStandardMaterial) this.pulses.push(object.material)
      if (object.userData.glow && object.material instanceof THREE.MeshBasicMaterial) this.glows.push(object.material)
    })

    this.sun = this.addLights()
    this.sky = new Sky(SUN_OFFSET)
    this.scene.add(this.sky.group, ...this.sky.layers)

    this.lantern = new THREE.PointLight(LANTERN_COLOR, LANTERN_INTENSITY, LANTERN_RANGE, 1.4)
    this.scene.add(this.lantern)

    this.goal = world.goal ? new Goal(world.goal) : null
    if (this.goal) this.scene.add(this.goal.group)

    this.marker = createMarker()
    this.scene.add(this.marker)

    this.renderer.domElement.addEventListener('click', this.onCanvasClick)
    document.addEventListener('pointerlockchange', this.onPointerLockChange)
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    document.addEventListener('mousemove', this.onMouseMove)

    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()

    this.player.applyToCamera(this.camera)
    this.animate()
  }

  /** Seconds played in this run. */
  get elapsed() {
    return this.elapsedTime
  }

  get falls() {
    return this.fallCount
  }

  /** Height of the player's feet, in world units. */
  get height() {
    return this.player.position.y
  }

  get isFullRun() {
    return this.fullRun
  }

  get levelIndex() {
    return this.current.index
  }

  requestLock() {
    this.sound.unlock()
    const canvas = this.renderer.domElement
    // Raw mouse input avoids OS acceleration and the odd jumpy delta; fall back if unsupported.
    const lock = (options?: { unadjustedMovement: boolean }) =>
      (canvas.requestPointerLock as (options?: object) => unknown).call(canvas, options) as unknown
    const result = lock({ unadjustedMovement: true })
    if (result instanceof Promise) {
      result.catch(() => {
        const fallback = lock()
        if (fallback instanceof Promise) fallback.catch(() => {})
      })
    }
  }

  applySettings(settings: GameSettings) {
    this.settings = settings
    this.sound.setVolume(settings.volume, settings.muted)
  }

  /** Back to the start of the current level. */
  respawn() {
    this.triggerRespawn('restart', this.current)
  }

  /** Starts a fresh run at the given level: timer, falls and goal reset. */
  restart(levelIndex = 0) {
    const level = this.levels[levelIndex] ?? this.levels[0]
    this.elapsedTime = 0
    this.fallCount = 0
    this.finished = false
    this.fullRun = level.index === 0
    this.highest = level.index
    this.respawnAt(level)
    this.gimmicks.reset(this.player)
    this.callbacks.onLevelChange?.(level.index, false)
  }

  dispose() {
    this.disposed = true
    cancelAnimationFrame(this.frame)

    this.renderer.domElement.removeEventListener('click', this.onCanvasClick)
    document.removeEventListener('pointerlockchange', this.onPointerLockChange)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    document.removeEventListener('mousemove', this.onMouseMove)
    this.resizeObserver.disconnect()

    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock()

    this.scene.traverse((object) => {
      const isSprite = object instanceof THREE.Sprite
      if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.Points || isSprite) {
        // Sprites share one geometry across the whole app; only their material is theirs.
        if (!isSprite) object.geometry.dispose()
        const materials = Array.isArray(object.material) ? object.material : [object.material]
        for (const material of materials) {
          // Procedural textures are shared between blocks (and games), so they stay.
          if ('map' in material && material.map instanceof THREE.Texture && !material.map.userData.shared) {
            material.map.dispose()
          }
          material.dispose()
        }
      }
    })

    this.sound.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private addLights() {
    const hemisphere = new THREE.HemisphereLight(0xb4ccff, 0x262b33, 0.6)
    this.scene.add(hemisphere)

    const sun = new THREE.DirectionalLight(0xffe6c4, 2.2)
    sun.position.copy(SUN_OFFSET)
    sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    sun.shadow.bias = -0.0006
    sun.shadow.normalBias = 0.03

    const camera = sun.shadow.camera
    camera.left = -SHADOW_SPAN
    camera.right = SHADOW_SPAN
    camera.top = SHADOW_SPAN
    camera.bottom = -SHADOW_SPAN
    camera.near = 1
    camera.far = 100
    camera.updateProjectionMatrix()

    this.scene.add(sun)
    this.scene.add(sun.target)

    const fill = new THREE.DirectionalLight(0x8fb3ff, 0.5)
    fill.position.set(-18, 12, -20)
    this.scene.add(fill)
    return sun
  }

  private readonly onCanvasClick = () => {
    if (!this.locked && !this.finished) this.requestLock()
  }

  private readonly onPointerLockChange = () => {
    this.locked = document.pointerLockElement === this.renderer.domElement
    if (!this.locked) this.keys.clear()
    this.callbacks.onLockChange?.(this.locked)
  }

  private readonly onKeyDown = (event: KeyboardEvent) => {
    if (!this.locked) return
    if (BINDINGS.restart.includes(event.code) && !event.repeat) this.respawn()
    if (BINDINGS.lantern.includes(event.code) && !event.repeat) this.lanternOn = !this.lanternOn
    this.keys.add(event.code)
  }

  private readonly onKeyUp = (event: KeyboardEvent) => {
    this.keys.delete(event.code)
  }

  private readonly onMouseMove = (event: MouseEvent) => {
    if (!this.locked) return
    const sensitivity = MOUSE_SENSITIVITY * this.settings.sensitivity
    const yawBefore = this.player.yaw
    const previous = { time: this.lastMouseTime, movementX: this.lastMovementX }
    this.lastMouseTime = event.timeStamp
    this.lastMovementX = event.movementX

    // A real hand never moves this much in one event; bigger deltas are system glitches.
    if (Math.abs(event.movementX) > MAX_MOUSE_DELTA || Math.abs(event.movementY) > MAX_MOUSE_DELTA) {
      console.log('[big-turn] discarded', {
        movementX: event.movementX,
        movementY: event.movementY,
        msSincePrevious: Number((event.timeStamp - previous.time).toFixed(1)),
        previousMovementX: previous.movementX,
        trusted: event.isTrusted,
      })
      return
    }

    this.player.look(event.movementX, event.movementY, sensitivity)

    // Debug: a single mouse event that turns the view a lot, with what was going on around it.
    const turn = Math.abs(event.movementX * sensitivity)
    if (turn > DEBUG_TURN_STEP) {
      console.log('[big-turn]', {
        movementX: event.movementX,
        movementY: event.movementY,
        degrees: Number(THREE.MathUtils.radToDeg(turn).toFixed(1)),
        yaw: `${yawBefore.toFixed(3)} -> ${this.player.yaw.toFixed(3)}`,
        pitch: Number(this.player.pitch.toFixed(3)),
        msSincePrevious: Number((event.timeStamp - previous.time).toFixed(1)),
        previousMovementX: previous.movementX,
        trusted: event.isTrusted,
        buttons: event.buttons,
        player: fmtVec(this.player.position),
        onGround: this.player.onGround,
        level: this.current.name,
        lockedTo: document.pointerLockElement?.tagName ?? null,
        window: `${window.innerWidth}x${window.innerHeight}`,
        screen: `${window.screen.width}x${window.screen.height}`,
      })
    }
  }

  private resize() {
    const width = this.container.clientWidth || window.innerWidth
    const height = this.container.clientHeight || window.innerHeight
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private readonly animate = () => {
    if (this.disposed) return
    this.frame = requestAnimationFrame(this.animate)
    const delta = Math.min(this.clock.getDelta(), 0.05)
    this.update(delta)
    this.renderer.render(this.scene, this.camera)
  }

  private update(delta: number) {
    this.time += delta
    if (this.locked && !this.finished) this.elapsedTime += delta

    const input: PlayerInput = {
      forward: (this.anyDown(BINDINGS.forward) ? 1 : 0) - (this.anyDown(BINDINGS.backward) ? 1 : 0),
      strafe: (this.anyDown(BINDINGS.right) ? 1 : 0) - (this.anyDown(BINDINGS.left) ? 1 : 0),
      jump: this.anyDown(BINDINGS.jump),
      run: this.anyDown(BINDINGS.run),
    }

    this.movers.update(delta)
    this.player.update(delta, input, this.colliders, this.movers.items, this.grounds)
    const gimmicks = this.gimmicks.update(delta, this.time, this.player)
    if (gimmicks.bounce > 0) {
      this.player.launch(gimmicks.bounce)
      this.sound.bounce()
    }
    if (gimmicks.cracked) this.sound.crack()
    this.playPlayerSounds()
    const y = this.player.position.y

    if (this.player.onGround) this.setCurrent(this.levelAt(y))

    if (y < this.fallY) {
      // Fell past the bottom of the tower: come back at the start of the level it ended in.
      this.triggerRespawn('fall', this.levelAt(y))
    } else if (this.hazards.some((hazard) => this.player.overlaps(hazard))) {
      this.triggerRespawn('hazard', this.current)
    } else if (this.goal && !this.finished && this.goal.contains(this.player.position)) {
      this.finish()
    }

    this.updateEffects(delta)
    this.player.applyToCamera(this.camera, this.settings.headBob ? 1 : 0)
    this.sky.update(this.camera.position, this.time)
    this.updateLantern(delta)
  }

  private playPlayerSounds() {
    const { events } = this.player
    if (events.jumped) this.sound.jump()
    if (events.landed > 0) this.sound.land(events.landed)
    else if (events.step) this.sound.step()
  }

  private updateEffects(delta: number) {
    const position = this.player.position

    // Sun and its shadow box follow the player.
    this.sun.position.copy(position).add(SUN_OFFSET)
    this.sun.target.position.copy(position)

    // Wider view while sprinting.
    const sprinting = this.player.speed > 6
    const fov = this.settings.fov + (sprinting ? RUN_FOV_BOOST : 0)
    const nextFov = THREE.MathUtils.damp(this.camera.fov, fov, FOV_SMOOTHING, delta)
    if (Math.abs(nextFov - this.camera.fov) > 1e-3) {
      this.camera.fov = nextFov
      this.camera.updateProjectionMatrix()
    }

    const pulse = 0.55 + 0.45 * Math.sin(this.time * 4)
    for (const material of this.pulses) material.emissiveIntensity = 0.4 + pulse
    const glow = 0.55 + 0.35 * Math.sin(this.time * 3)
    for (const material of this.glows) material.opacity = glow

    this.goal?.update(this.time)
    this.updateMarker()
  }

  /** The lantern rides with the camera and fades when switched. */
  private updateLantern(delta: number) {
    this.lantern.position.copy(LANTERN_OFFSET).applyQuaternion(this.camera.quaternion).add(this.camera.position)
    const target = this.lanternOn ? LANTERN_INTENSITY : 0
    this.lantern.intensity = THREE.MathUtils.damp(this.lantern.intensity, target, 8, delta)
  }

  /** Shows where the player will land: a soft spot on the surface under the feet. */
  private updateMarker() {
    const { x, y, z } = this.player.position
    let surface = -Infinity
    for (const box of this.colliders) {
      if (x >= box.min.x && x <= box.max.x && z >= box.min.z && z <= box.max.z && box.max.y <= y + 0.05) {
        surface = Math.max(surface, box.max.y)
      }
    }
    for (const ground of this.grounds) {
      const height = ground.height(x, z)
      if (height !== null && height <= y + 0.05) surface = Math.max(surface, height)
    }

    const gap = y - surface
    const material = this.marker.material as THREE.MeshBasicMaterial
    if (!Number.isFinite(surface) || gap < MARKER_MIN_GAP || gap > MARKER_MAX_GAP) {
      this.marker.visible = false
      return
    }
    this.marker.visible = true
    this.marker.position.set(x, surface + 0.03, z)
    this.marker.scale.setScalar(1 + gap * 0.04)
    material.opacity = 0.75 * (1 - gap / MARKER_MAX_GAP)
  }

  private finish() {
    this.finished = true
    this.sound.win()
    this.callbacks.onFinish?.({ time: this.elapsedTime, falls: this.fallCount, fullRun: this.fullRun })
    if (document.pointerLockElement === this.renderer.domElement) document.exitPointerLock()
  }

  /** The highest level whose base is at or below `y`. */
  private levelAt(y: number) {
    let found = this.levels[0]
    for (const level of this.levels) {
      if (level.base <= y + LEVEL_EPSILON) found = level
    }
    return found
  }

  private setCurrent(level: BuiltLevel) {
    if (level === this.current) return
    this.current = level
    const reached = level.index > this.highest
    if (reached) {
      this.highest = level.index
      this.sound.levelUp()
    }
    this.callbacks.onLevelChange?.(level.index, reached)
  }

  private respawnAt(level: BuiltLevel) {
    this.setCurrent(level)
    this.player.respawn(level.spawn)
    this.player.applyToCamera(this.camera)
  }

  private triggerRespawn(reason: RespawnReason, level: BuiltLevel) {
    if (reason === 'restart') this.sound.restart()
    else {
      this.fallCount += 1
      this.sound.fall()
    }
    this.respawnAt(level)
    this.gimmicks.reset(this.player)
    this.callbacks.onRespawn?.(reason, this.fallCount)
  }

  private anyDown(codes: readonly string[]) {
    return codes.some((code) => this.keys.has(code))
  }
}

/** A soft round shadow, drawn on the surface below the player. */
function createMarker() {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (context) {
    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    gradient.addColorStop(0, 'rgba(10, 16, 24, 0.95)')
    gradient.addColorStop(0.55, 'rgba(10, 16, 24, 0.6)')
    gradient.addColorStop(0.8, 'rgba(82, 209, 255, 0.35)')
    gradient.addColorStop(1, 'rgba(82, 209, 255, 0)')
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace

  const marker = new THREE.Mesh(
    new THREE.PlaneGeometry(0.9, 0.9),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      fog: false,
    }),
  )
  marker.rotation.x = -Math.PI / 2
  marker.renderOrder = 2
  marker.visible = false
  return marker
}
