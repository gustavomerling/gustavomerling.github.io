import * as THREE from 'three'
import { BuildMode, type BuildState } from './build/BuildMode'
import { Gunfire } from './weapons/Gunfire'
import { WeaponSystem, type WeaponState } from './weapons/WeaponSystem'
import { ColliderDebug } from './debug/ColliderDebug'
import { createLoop } from './engine/loop'
import { initPhysics, Physics, RAPIER } from './engine/physics'
import { Npc, type NpcDebug } from './npc/Npc'
import { POSE_IDS, type PoseId } from './npc/poses'
import { createRenderContext } from './engine/render'
import { FpsLook } from './player/FpsLook'
import { Input } from './player/Input'
import { PlayerBody } from './player/PlayerBody'
import { buildLab, buildLights, LAB } from './world/lab'
import { createMaterials } from './world/materials'
import { createProps } from './world/props'

export interface GameStats {
  fps: number
  /** Tempo médio de CPU por frame gasto na física, em ms. */
  physicsMs: number
  /** Tempo médio de CPU por frame para montar o render, em ms (a GPU roda depois). */
  renderMs: number
  bodies: number
  npc: NpcDebug
  player: {
    x: number
    y: number
    z: number
    speed: number
    grounded: boolean
    crouching: boolean
  }
}

export interface DebugState {
  /** Painel de debug visível durante o jogo. */
  panel: boolean
  colliders: boolean
  paused: boolean
  /** Força dos motores do NPC: 0 = mole, 1 = estátua. */
  npcStrength: number
  /** Pose-alvo dos motores do NPC. */
  npcPose: PoseId
  /** Controle de equilíbrio do NPC ligado. */
  npcBalance: boolean
  /** NPC levanta sozinho depois de cair. */
  npcAutoGetUp: boolean
  /** NPC olha para o jogador. */
  npcLook: boolean
}

export interface GameEvents {
  onLockChange: (locked: boolean) => void
  onStats: (stats: GameStats) => void
  onDebugChange: (debug: DebugState) => void
  onBuildChange: (build: BuildState) => void
  onWeaponChange: (weapon: WeaponState) => void
  /** Um tiro acertou o NPC (marcador na mira). */
  onHitMarker: () => void
}

export interface Game {
  /** Captura o mouse e entra no jogo. */
  lock: () => void
  setSensitivity: (value: number) => void
  setPixelRatio: (value: number) => void
  setDebug: (patch: Partial<DebugState>) => void
  /** Avança a física um único passo (com a física pausada). */
  stepOnce: () => void
  /** Volta jogador e objetos para o estado inicial. */
  resetScene: () => void
  /** Remove tudo o que o jogador construiu. */
  clearBuilt: () => void
  dispose: () => void
}

/**
 * Monta e roda o jogo dentro de `host`. Tudo aqui é imperativo e fica fora
 * do React; o React só recebe eventos/estado para o HUD.
 */
export async function createGame(host: HTMLElement, events: GameEvents, initialDebug: DebugState): Promise<Game> {
  await initPhysics()

  const ctx = createRenderContext(host)
  const physics = new Physics()
  const materials = createMaterials(ctx.renderer)
  const disposers: (() => void)[] = []

  disposers.push(buildLights(ctx.scene))
  disposers.push(buildLab(ctx.scene, physics, materials))
  const props = createProps(ctx.scene, physics, materials)
  disposers.push(() => props.dispose())

  const input = new Input()
  disposers.push(() => input.dispose())
  const look = new FpsLook(ctx.renderer.domElement, (locked) => {
    input.enabled = locked
    if (!locked) input.clear()
    events.onLockChange(locked)
  })
  disposers.push(() => look.dispose())

  const player = new PlayerBody(physics.world, LAB.playerSpawn)
  const eye = new THREE.Vector3()
  const lookAtCenter = () => look.lookAt(player.eyePosition(1, eye), new THREE.Vector3(0, 1.2, 0))
  lookAtCenter()

  // NPC: ragdoll ativo (boneco de crash test), de frente para o jogador.
  const npc = new Npc(physics, ctx.scene)
  disposers.push(() => npc.dispose())
  const NPC_SPAWN = new THREE.Vector3(0, 0, 9)
  const NPC_YAW = Math.PI
  npc.spawn(NPC_SPAWN, NPC_YAW)

  const npcLookTarget = new THREE.Vector3()
  const lookForward = () => new THREE.Vector3(-Math.sin(look.yaw), 0, -Math.cos(look.yaw))
  /** Debug (F/G): empurrão horizontal no peito do NPC, na direção do olhar. */
  const pushNpc = (impulse: number) => npc.push(lookForward().multiplyScalar(impulse))

  /** Debug (T): solta o NPC 2,5 m à frente do jogador, de 1,5 m de altura, girando. */
  const dropRagdoll = () => {
    const feet = player.eyePosition(1, new THREE.Vector3()).setY(0).addScaledVector(lookForward(), 2.5)
    const r = () => Math.random() * 2 - 1
    npc.drop(feet, look.yaw + Math.PI, {
      lift: 1.5,
      tilt: new THREE.Euler(r() * 1.2, 0, r() * 1.2),
      spin: new THREE.Vector3(r() * 3, r() * 3, r() * 3),
    })
  }

  const build = new BuildMode(ctx.scene, physics, materials, player.collider, events.onBuildChange)
  disposers.push(() => build.dispose())
  events.onBuildChange(build.state)

  const weapons = new WeaponSystem(events.onWeaponChange)
  disposers.push(() => weapons.dispose())
  events.onWeaponChange(weapons.state)
  const gunfire = new Gunfire(ctx.scene, physics, player.collider)
  disposers.push(() => gunfire.dispose())
  const camPos = new THREE.Vector3()
  const camDir = new THREE.Vector3()
  const muzzle = new THREE.Vector3()

  /** Tiro a partir do centro da tela, com uma pequena dispersão. */
  const shoot = () => {
    const w = weapons.current
    ctx.camera.updateMatrixWorld()
    ctx.camera.getWorldPosition(camPos)
    ctx.camera.getWorldDirection(camDir)
    const spread = w.automatic ? 0.006 : 0.002
    camDir.x += (Math.random() - 0.5) * spread
    camDir.y += (Math.random() - 0.5) * spread
    camDir.z += (Math.random() - 0.5) * spread
    camDir.normalize()
    const impulse = w.impulse ?? 10
    const hit = gunfire.fire(camPos, camDir, weapons.muzzleWorld(ctx.camera, muzzle), impulse)
    if (hit?.body && npc.owns(hit.body)) {
      npc.hit(hit.body, camDir.clone().multiplyScalar(impulse), hit.point)
      events.onHitMarker()
    }
    // Recuo: a mira sobe e desvia um pouco para o lado.
    const recoil = w.recoil ?? 0.01
    look.pitch = Math.min(look.pitch + recoil, Math.PI / 2 - 0.01)
    look.yaw += (Math.random() - 0.5) * recoil * 0.6
  }

  /**
   * Arma encostada: se há algo à frente mais perto que o comprimento da
   * arma, ela recolhe (não atravessa) e, se for um corpo solto (NPC, caixa),
   * empurra de leve conforme o quanto encosta.
   */
  const weaponContact = (dt: number) => {
    const w = weapons.current
    ctx.camera.getWorldPosition(camPos)
    ctx.camera.getWorldDirection(camDir)
    const hit = physics.world.castRay(new RAPIER.Ray(camPos, camDir), w.length, true, undefined, undefined, player.collider)
    if (!hit || build.active) {
      weapons.setTuck(0)
      return
    }
    const penetration = (w.length - hit.timeOfImpact) / w.length
    weapons.setTuck(penetration * 1.3)
    const body = hit.collider.parent()
    if (body?.isDynamic() && player.speed > 0.2) {
      const point = camPos.clone().addScaledVector(camDir, hit.timeOfImpact)
      body.applyImpulseAtPoint(camDir.clone().setY(0).multiplyScalar(220 * penetration * dt), point, true)
    }
  }

  const colliderDebug = new ColliderDebug(ctx.scene, physics.world, (c) => c.handle === player.collider.handle)
  disposers.push(() => colliderDebug.dispose())

  // --- Debug ---------------------------------------------------------------
  const debug: DebugState = { ...initialDebug }
  let stepRequested = false
  const setDebug = (patch: Partial<DebugState>) => {
    Object.assign(debug, patch)
    debug.npcStrength = Math.round(Math.min(1, Math.max(0, debug.npcStrength)) * 100) / 100
    colliderDebug.visible = debug.colliders
    if (debug.npcStrength !== npc.strength) npc.setStrength(debug.npcStrength)
    if (debug.npcPose !== npc.poseId) npc.setPose(debug.npcPose)
    if (debug.npcBalance !== npc.balanceEnabled) npc.setBalance(debug.npcBalance)
    npc.autoGetUp = debug.npcAutoGetUp
    events.onDebugChange({ ...debug })
  }
  setDebug({})

  const resetScene = () => {
    props.reset()
    build.resetPlaced()
    gunfire.clearMarks()
    npc.spawn(NPC_SPAWN, NPC_YAW)
    player.respawn()
    lookAtCenter()
  }

  /** Atalhos: ` abre/fecha o painel; P, V e . só valem com o painel aberto. */
  const handleDebugKeys = () => {
    if (input.consume('KeyR')) resetScene()
    if (input.consume('KeyT')) dropRagdoll()
    if (input.consume('KeyF')) pushNpc(40)
    if (input.consume('KeyG')) pushNpc(110)
    if (input.consume('Backquote')) setDebug({ panel: !debug.panel })
    if (!debug.panel) return
    if (input.consume('KeyP')) setDebug({ paused: !debug.paused })
    if (input.consume('KeyV')) setDebug({ colliders: !debug.colliders })
    if (input.consume('Period')) stepRequested = true
    if (input.consume('BracketLeft')) setDebug({ npcStrength: debug.npcStrength - 0.1 })
    if (input.consume('BracketRight')) setDebug({ npcStrength: debug.npcStrength + 0.1 })
    if (input.consume('KeyK')) setDebug({ npcBalance: !debug.npcBalance })
    if (input.consume('KeyL')) setDebug({ npcAutoGetUp: !debug.npcAutoGetUp })
    if (input.consume('KeyO')) setDebug({ npcLook: !debug.npcLook })
    if (input.consume('KeyN')) {
      setDebug({ npcPose: POSE_IDS[(POSE_IDS.indexOf(debug.npcPose) + 1) % POSE_IDS.length] })
    }
  }

  // --- Medição de desempenho, enviada ao HUD 2× por segundo -----------------
  let frames = 0
  let physicsAcc = 0
  let renderAcc = 0
  let statsTimer = 0
  const emitStats = () => {
    const t = player.body.translation()
    events.onStats({
      fps: frames / statsTimer,
      physicsMs: physicsAcc / frames,
      renderMs: renderAcc / frames,
      bodies: physics.world.bodies.len(),
      npc: { ...npc.debug },
      player: {
        x: t.x,
        y: t.y,
        z: t.z,
        speed: player.speed,
        grounded: player.isGrounded,
        crouching: player.isCrouching,
      },
    })
  }

  const loop = createLoop({
    fixedUpdate: (dt) => {
      handleDebugKeys()
      if (debug.paused && !stepRequested) return
      stepRequested = false

      const t0 = performance.now()
      npc.lookTarget = debug.npcLook ? player.eyePosition(1, npcLookTarget) : null
      npc.update(dt)
      player.update(
        dt,
        {
          forward: input.axis('KeyS', 'KeyW'),
          right: input.axis('KeyA', 'KeyD'),
          sprint: input.isDown('ShiftLeft') || input.isDown('ShiftRight'),
          // Ctrl ficaria perigoso: Ctrl+W fecha a aba do navegador.
          crouch: input.isDown('KeyC'),
          jump: input.consume('Space'),
        },
        look.yaw,
      )
      physics.step()
      physicsAcc += performance.now() - t0
    },
    render: (alpha, frameDt) => {
      const t0 = performance.now()
      // Pausado, mostra o último passo exato (sem interpolar entre dois passos).
      const a = debug.paused ? 1 : alpha
      physics.interpolate(a)
      ctx.camera.position.copy(player.eyePosition(a, eye))
      look.apply(ctx.camera)
      build.frame(ctx.camera, input)
      weapons.setHolstered(build.active)
      ctx.camera.updateMatrixWorld()
      if (weapons.trigger(build.active ? null : input, frameDt)) shoot()
      weaponContact(frameDt)
      weapons.frame(frameDt, build.active ? null : input, look.yaw, look.pitch, player.speed, player.isGrounded)
      gunfire.update(frameDt)
      colliderDebug.update()
      ctx.renderer.render(ctx.scene, ctx.camera)
      weapons.render(ctx.renderer, ctx.camera.aspect)

      frames++
      renderAcc += performance.now() - t0
      statsTimer += frameDt
      if (statsTimer >= 0.5) {
        emitStats()
        frames = 0
        physicsAcc = 0
        renderAcc = 0
        statsTimer = 0
      }
    },
  })
  loop.start()

  return {
    lock: () => void look.lock(),
    setSensitivity: (value) => {
      look.sensitivity = value
    },
    setPixelRatio: (value) => ctx.setPixelRatio(value),
    setDebug,
    stepOnce: () => {
      stepRequested = true
    },
    resetScene,
    clearBuilt: () => build.clear(),
    dispose() {
      loop.stop()
      for (const d of disposers.reverse()) d()
      materials.dispose()
      physics.dispose()
      ctx.dispose()
    },
  }
}
