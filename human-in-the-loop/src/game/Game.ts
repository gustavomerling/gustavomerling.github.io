import * as THREE from 'three'
import { createLoop } from './engine/loop'
import { initPhysics, Physics, RAPIER } from './engine/physics'
import { createRenderContext } from './engine/render'
import { FpsLook } from './player/FpsLook'
import { buildLab, buildLights, LAB } from './world/lab'
import { createMaterials } from './world/materials'

export interface GameEvents {
  onLockChange: (locked: boolean) => void
}

export interface Game {
  /** Captura o mouse e entra no jogo. */
  lock: () => void
  setSensitivity: (value: number) => void
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

  // Câmera em primeira pessoa, parada no ponto de nascimento (o corpo do
  // jogador entra no passo 3).
  const look = new FpsLook(ctx.renderer.domElement, events.onLockChange)
  ctx.camera.position.copy(LAB.playerSpawn)
  look.lookAt(LAB.playerSpawn, new THREE.Vector3(0, 1.2, 0))
  disposers.push(() => look.dispose())

  // Algumas caixas dinâmicas para validar física, sombras e interpolação.
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

  const loop = createLoop({
    fixedUpdate: () => physics.step(),
    render: (alpha) => {
      physics.interpolate(alpha)
      look.apply(ctx.camera)
      ctx.renderer.render(ctx.scene, ctx.camera)
    },
  })
  loop.start()

  return {
    lock: () => void look.lock(),
    setSensitivity: (value) => {
      look.sensitivity = value
    },
    dispose() {
      loop.stop()
      for (const d of disposers.reverse()) d()
      materials.dispose()
      physics.dispose()
      ctx.dispose()
    },
  }
}
