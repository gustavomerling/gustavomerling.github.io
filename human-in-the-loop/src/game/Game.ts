import * as THREE from 'three'
import { createLoop } from './engine/loop'
import { initPhysics, Physics, RAPIER } from './engine/physics'
import { createRenderContext } from './engine/render'
import { FpsLook } from './player/FpsLook'
import { Input } from './player/Input'
import { PlayerBody } from './player/PlayerBody'
import { buildLab, buildLights, LAB } from './world/lab'
import { createMaterials } from './world/materials'

export interface GameStats {
  fps: number
  /** Tempo médio de CPU por frame gasto na física, em ms. */
  physicsMs: number
  /** Tempo médio de CPU por frame para montar o render, em ms (a GPU roda depois). */
  renderMs: number
}

export interface GameEvents {
  onLockChange: (locked: boolean) => void
  onStats: (stats: GameStats) => void
}

export interface Game {
  /** Captura o mouse e entra no jogo. */
  lock: () => void
  setSensitivity: (value: number) => void
  setPixelRatio: (value: number) => void
  dispose: () => void
}

/**
 * Monta e roda o jogo dentro de `host`. Tudo aqui é imperativo e fica fora
 * do React; o React só recebe eventos/estado para o HUD.
 */
export async function createGame(host: HTMLElement, events: GameEvents): Promise<Game> {
  await initPhysics()

  const ctx = createRenderContext(host)
  const physics = new Physics()
  const materials = createMaterials(ctx.renderer)
  const disposers: (() => void)[] = []

  disposers.push(buildLights(ctx.scene))
  disposers.push(buildLab(ctx.scene, physics, materials))

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
  look.lookAt(player.eyePosition(1, eye), new THREE.Vector3(0, 1.2, 0))

  // Algumas caixas dinâmicas para empurrar e testar física/interpolação.
  const propGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
  disposers.push(() => propGeo.dispose())
  const propSpots: [number, number][] = [
    [-1, 6],
    [0, 6.3],
    [1, 6],
    [0.5, 5.5],
  ]
  propSpots.forEach(([x, z], i) => {
    const body = physics.world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(x, 3 + i * 0.9, z)
        .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(i * 0.4, i * 0.7, 0))),
    )
    physics.world.createCollider(RAPIER.ColliderDesc.cuboid(0.3, 0.3, 0.3).setDensity(300).setFriction(0.7), body)
    const mesh = new THREE.Mesh(propGeo, materials.prop)
    mesh.castShadow = mesh.receiveShadow = true
    ctx.scene.add(mesh)
    physics.sync(body, mesh)
  })

  // Medição simples de desempenho, enviada ao HUD 2× por segundo.
  let frames = 0
  let physicsAcc = 0
  let renderAcc = 0
  let statsTimer = 0

  const loop = createLoop({
    fixedUpdate: (dt) => {
      const t0 = performance.now()
      if (input.consume('KeyR')) player.respawn()
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
      physics.interpolate(alpha)
      ctx.camera.position.copy(player.eyePosition(alpha, eye))
      look.apply(ctx.camera)
      ctx.renderer.render(ctx.scene, ctx.camera)

      frames++
      renderAcc += performance.now() - t0
      statsTimer += frameDt
      if (statsTimer >= 0.5) {
        events.onStats({ fps: frames / statsTimer, physicsMs: physicsAcc / frames, renderMs: renderAcc / frames })
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
    dispose() {
      loop.stop()
      for (const d of disposers.reverse()) d()
      materials.dispose()
      physics.dispose()
      ctx.dispose()
    },
  }
}
