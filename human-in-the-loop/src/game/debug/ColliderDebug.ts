import * as THREE from 'three'
import type { RAPIER } from '../engine/physics'

/**
 * Desenha as formas de colisão do Rapier por cima da cena (linhas que
 * atravessam paredes, para ver tudo). Só recalcula quando visível.
 */
export class ColliderDebug {
  private readonly lines: THREE.LineSegments
  private readonly geometry = new THREE.BufferGeometry()
  private readonly material = new THREE.LineBasicMaterial({
    vertexColors: true,
    depthTest: false,
    transparent: true,
    opacity: 0.75,
  })
  private readonly world: RAPIER.World
  private readonly hidden: (c: RAPIER.Collider) => boolean

  /** `hidden`: coliders que não devem aparecer (ex.: o próprio jogador, colado na câmera). */
  constructor(scene: THREE.Scene, world: RAPIER.World, hidden: (c: RAPIER.Collider) => boolean) {
    this.world = world
    this.hidden = hidden
    this.lines = new THREE.LineSegments(this.geometry, this.material)
    this.lines.frustumCulled = false
    this.lines.renderOrder = 999
    this.lines.visible = false
    scene.add(this.lines)
  }

  get visible() {
    return this.lines.visible
  }

  set visible(v: boolean) {
    this.lines.visible = v
  }

  update() {
    if (!this.lines.visible) return
    const { vertices, colors } = this.world.debugRender(undefined, (c) => !this.hidden(c))
    this.geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 4))
  }

  dispose() {
    this.lines.removeFromParent()
    this.geometry.dispose()
    this.material.dispose()
  }
}
