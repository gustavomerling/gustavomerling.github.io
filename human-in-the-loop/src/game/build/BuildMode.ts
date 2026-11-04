import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import type { Input } from '../player/Input'
import type { Materials } from '../world/materials'
import { CATALOG, type CatalogItem } from './catalog'

const REACH = 9
const GRID = 0.5
const ROT_STEP = Math.PI / 4
/** Só dá para construir em superfícies quase horizontais. */
const MIN_UP = 0.7

interface Placed {
  item: CatalogItem
  body: RAPIER.RigidBody
  object: THREE.Object3D
  start: { pos: THREE.Vector3; rot: THREE.Quaternion }
}

export interface BuildState {
  active: boolean
  selected: number
  placed: number
}

/**
 * Modo construção: prévia fantasma onde a mira toca o chão (ou o topo de
 * algo), encaixe na grade de 0,5 m, giro em passos de 45°. Clique esquerdo
 * coloca, direito remove o que foi construído.
 */
export class BuildMode {
  active = false
  selected = 0
  private rotation = 0
  private readonly placed: Placed[] = []
  private readonly byCollider = new Map<number, Placed>()

  private readonly ghosts: THREE.Object3D[]
  private readonly ghostOk = new THREE.MeshBasicMaterial({
    color: '#e8742c',
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  })
  private readonly ghostBad = new THREE.MeshBasicMaterial({
    color: '#d23c3c',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  })
  private readonly removeHighlight = new THREE.BoxHelper(new THREE.Object3D(), '#d23c3c')
  private placement: { pos: THREE.Vector3; rot: THREE.Quaternion; valid: boolean } | null = null
  private removeTarget: Placed | null = null

  private readonly scene: THREE.Scene
  private readonly physics: Physics
  private readonly materials: Materials
  private readonly playerCollider: RAPIER.Collider
  private readonly onChange: (s: BuildState) => void

  constructor(
    scene: THREE.Scene,
    physics: Physics,
    materials: Materials,
    playerCollider: RAPIER.Collider,
    onChange: (s: BuildState) => void,
  ) {
    this.scene = scene
    this.physics = physics
    this.materials = materials
    this.playerCollider = playerCollider
    this.onChange = onChange

    // Uma prévia por item, montada com a mesma malha do objeto real.
    this.ghosts = CATALOG.map((item) => {
      const { object } = item.build(materials)
      object.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.castShadow = o.receiveShadow = false
          o.renderOrder = 10
        }
      })
      object.visible = false
      scene.add(object)
      return object
    })
    this.removeHighlight.visible = false
    scene.add(this.removeHighlight)
  }

  get state(): BuildState {
    return { active: this.active, selected: this.selected, placed: this.placed.length }
  }

  setActive(active: boolean) {
    this.active = active
    if (!active) this.hidePreview()
    this.emit()
  }

  /** Lê a entrada e atualiza a prévia. Chamado uma vez por frame. */
  frame(camera: THREE.Camera, input: Input) {
    if (input.consume('KeyB')) this.setActive(!this.active)
    if (!this.active) return

    const wheel = input.consumeWheel()
    let selected = this.selected
    if (wheel) selected = (selected + wheel + CATALOG.length) % CATALOG.length
    for (let i = 0; i < CATALOG.length; i++) if (input.consume(`Digit${i + 1}`)) selected = i
    if (selected !== this.selected) {
      this.selected = selected
      this.emit()
    }
    if (input.consume('KeyQ')) this.rotation += ROT_STEP
    if (input.consume('KeyE')) this.rotation -= ROT_STEP

    this.updatePreview(camera)

    if (input.consume('Mouse0') && this.placement?.valid) {
      this.place(CATALOG[this.selected], this.placement.pos, this.placement.rot)
    }
    if (input.consume('Mouse2') && this.removeTarget) {
      this.remove(this.removeTarget)
    }
  }

  /** Volta os objetos soltos para onde foram colocados (as construções ficam). */
  resetPlaced() {
    for (const p of this.placed) {
      if (!p.item.dynamic) continue
      p.body.setTranslation(p.start.pos, true)
      p.body.setRotation(p.start.rot, true)
      p.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      p.body.setAngvel({ x: 0, y: 0, z: 0 }, true)
      this.physics.teleport(p.body)
    }
  }

  clear() {
    for (const p of [...this.placed]) this.remove(p)
  }

  dispose() {
    this.clear()
    for (const g of this.ghosts) {
      g.removeFromParent()
      disposeObject(g)
    }
    this.removeHighlight.removeFromParent()
    this.removeHighlight.dispose()
    this.ghostOk.dispose()
    this.ghostBad.dispose()
  }

  private emit() {
    this.onChange(this.state)
  }

  private hidePreview() {
    for (const g of this.ghosts) g.visible = false
    this.removeHighlight.visible = false
    this.placement = null
    this.removeTarget = null
  }

  private updatePreview(camera: THREE.Camera) {
    this.hidePreview()
    const origin = camera.getWorldPosition(new THREE.Vector3())
    const dir = camera.getWorldDirection(new THREE.Vector3())
    const hit = this.physics.world.castRayAndGetNormal(
      new RAPIER.Ray(origin, dir),
      REACH,
      true,
      undefined,
      undefined,
      this.playerCollider,
    )
    if (!hit) return

    // Mirando algo construído: marca para remoção (botão direito).
    const target = this.byCollider.get(hit.collider.handle)
    if (target) {
      this.removeTarget = target
      this.removeHighlight.setFromObject(target.object)
      this.removeHighlight.visible = true
    }

    if (hit.normal.y < MIN_UP) return
    const item = CATALOG[this.selected]
    const point = origin.clone().addScaledVector(dir, hit.timeOfImpact)
    const pos = new THREE.Vector3(
      Math.round(point.x / GRID) * GRID,
      point.y + item.size.y / 2 + 0.002,
      Math.round(point.z / GRID) * GRID,
    )
    const rot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation)
    const valid = this.hasRoom(item, pos, rot)
    this.placement = { pos, rot, valid }

    const ghost = this.ghosts[this.selected]
    ghost.position.copy(pos)
    ghost.quaternion.copy(rot)
    ghost.visible = true
    const mat = valid ? this.ghostOk : this.ghostBad
    ghost.traverse((o) => {
      if (o instanceof THREE.Mesh) o.material = mat
    })
  }

  /**
   * Testa a caixa envolvente (um pouco encolhida, para encostar é permitido).
   * As consultas do Rapier só enxergam um colisor novo depois do próximo passo
   * de física; com a física pausada (debug) dá para empilhar dois objetos no
   * mesmo lugar. Aceitável por ser só no modo debug.
   */
  private hasRoom(item: CatalogItem, pos: THREE.Vector3, rot: THREE.Quaternion) {
    const h = item.size.clone().multiplyScalar(0.5).subScalar(0.03)
    let blocked = false
    this.physics.world.intersectionsWithShape(pos, rot, new RAPIER.Cuboid(h.x, h.y, h.z), (c) => {
      if (c.isSensor()) return true
      blocked = true
      return false
    })
    return !blocked
  }

  private place(item: CatalogItem, pos: THREE.Vector3, rot: THREE.Quaternion) {
    const { object, colliders } = item.build(this.materials)
    const desc = (item.dynamic ? RAPIER.RigidBodyDesc.dynamic() : RAPIER.RigidBodyDesc.fixed())
      .setTranslation(pos.x, pos.y, pos.z)
      .setRotation(rot)
    const body = this.physics.world.createRigidBody(desc)
    const placed: Placed = { item, body, object, start: { pos: pos.clone(), rot: rot.clone() } }
    for (const c of colliders) {
      const collider = this.physics.world.createCollider(c, body)
      this.byCollider.set(collider.handle, placed)
    }
    this.scene.add(object)
    this.physics.sync(body, object)
    this.placed.push(placed)
    this.emit()
  }

  private remove(p: Placed) {
    for (let i = 0; i < p.body.numColliders(); i++) this.byCollider.delete(p.body.collider(i).handle)
    this.physics.unsync(p.body)
    this.physics.world.removeRigidBody(p.body)
    p.object.removeFromParent()
    disposeObject(p.object)
    this.placed.splice(this.placed.indexOf(p), 1)
    if (this.removeTarget === p) this.hidePreview()
    this.emit()
  }
}

/** Libera as geometrias (os materiais são compartilhados e ficam). */
function disposeObject(o: THREE.Object3D) {
  o.traverse((c) => {
    if (c instanceof THREE.Mesh) c.geometry.dispose()
  })
}
