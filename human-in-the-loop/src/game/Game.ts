import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { createLoop } from './engine/loop'
import { initPhysics, Physics, RAPIER } from './engine/physics'
import { createRenderContext } from './engine/render'
import { buildLab, buildLights, LAB } from './world/lab'
import { createMaterials } from './world/materials'

export interface Game {
  dispose: () => void
}

/**
 * Monta e roda o jogo dentro de `host`. Tudo aqui é imperativo e fica fora
 * do React; o React só recebe eventos/estado para o HUD.
 */
export async function createGame(host: HTMLElement): Promise<Game> {
  await initPhysics()

  const ctx = createRenderContext(host)
  const physics = new Physics()
  const materials = createMaterials(ctx.renderer)
  const disposers: (() => void)[] = []

  disposers.push(buildLights(ctx.scene))
  disposers.push(buildLab(ctx.scene, physics, materials))

  // Câmera provisória (órbita) até a câmera em primeira pessoa do passo 2.
  ctx.camera.position.copy(LAB.playerSpawn).add(new THREE.Vector3(0, 3, 4))
  const orbit = new OrbitControls(ctx.camera, ctx.renderer.domElement)
  orbit.target.set(0, 1, 0)
  orbit.enableDamping = true
  orbit.maxPolarAngle = Math.PI / 2 - 0.05
  orbit.update()
  disposers.push(() => orbit.dispose())

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
      orbit.update()
      ctx.renderer.render(ctx.scene, ctx.camera)
    },
  })
  loop.start()

  return {
    dispose() {
      loop.stop()
      for (const d of disposers.reverse()) d()
      materials.dispose()
      physics.dispose()
      ctx.dispose()
    },
  }
}
