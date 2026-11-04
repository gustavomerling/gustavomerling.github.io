import * as THREE from 'three'
import { BuildMode, type BuildState } from './build/BuildMode'
import { ColliderDebug } from './debug/ColliderDebug'
import { createLoop } from './engine/loop'
import { initPhysics, Physics } from './engine/physics'
import { Ragdoll } from './npc/Ragdoll'
import { palette } from './palette'
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
}

export interface GameEvents {
  onLockChange: (locked: boolean) => void
  onStats: (stats: GameStats) => void
  onDebugChange: (debug: DebugState) => void
  onBuildChange: (build: BuildState) => void
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

  // NPC: ragdoll passivo (passo 6), de frente para o jogador.
  const npcMaterial = new THREE.MeshStandardMaterial({ color: palette.mannequin, roughness: 0.55 })
  disposers.push(() => npcMaterial.dispose())
  const ragdoll = new Ragdoll(physics, ctx.scene, npcMaterial)
  disposers.push(() => ragdoll.dispose())
  const NPC_SPAWN = new THREE.Vector3(0, 0, 9)
  const NPC_YAW = Math.PI
  ragdoll.placeAt(NPC_SPAWN, NPC_YAW)

  /** Debug (T): solta o NPC 2,5 m à frente do jogador, de 1,5 m de altura, girando. */
  const dropRagdoll = () => {
    const forward = new THREE.Vector3(-Math.sin(look.yaw), 0, -Math.cos(look.yaw))
    const feet = player.eyePosition(1, new THREE.Vector3()).setY(0).addScaledVector(forward, 2.5)
    const r = () => Math.random() * 2 - 1
    ragdoll.placeAt(feet, look.yaw + Math.PI, {
      lift: 1.5,
      tilt: new THREE.Euler(r() * 1.2, 0, r() * 1.2),
      spin: new THREE.Vector3(r() * 3, r() * 3, r() * 3),
    })
  }

  const build = new BuildMode(ctx.scene, physics, materials, player.collider, events.onBuildChange)
  disposers.push(() => build.dispose())
  events.onBuildChange(build.state)

  const colliderDebug = new ColliderDebug(ctx.scene, physics.world, (c) => c.handle === player.collider.handle)
  disposers.push(() => colliderDebug.dispose())

  // --- Debug ---------------------------------------------------------------
  const debug: DebugState = { ...initialDebug }
  let stepRequested = false
  const setDebug = (patch: Partial<DebugState>) => {
    Object.assign(debug, patch)
    colliderDebug.visible = debug.colliders
    events.onDebugChange({ ...debug })
  }
  setDebug({})

  const resetScene = () => {
    props.reset()
    build.resetPlaced()
    ragdoll.placeAt(NPC_SPAWN, NPC_YAW)
    player.respawn()
    lookAtCenter()
  }

  /** Atalhos: ` abre/fecha o painel; P, V e . só valem com o painel aberto. */
  const handleDebugKeys = () => {
    if (input.consume('KeyR')) resetScene()
    if (input.consume('KeyT')) dropRagdoll()
    if (input.consume('Backquote')) setDebug({ panel: !debug.panel })
    if (!debug.panel) return
    if (input.consume('KeyP')) setDebug({ paused: !debug.paused })
    if (input.consume('KeyV')) setDebug({ colliders: !debug.colliders })
    if (input.consume('Period')) stepRequested = true
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
      colliderDebug.update()
      ctx.renderer.render(ctx.scene, ctx.camera)

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
