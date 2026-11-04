import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'

const RANGE = 200
const MAX_MARKS = 80
const TRACER_TIME = 0.06
const PUFF_TIME = 0.28

export interface ShotHit {
  point: THREE.Vector3
  normal: THREE.Vector3
  body: RAPIER.RigidBody | null
  collider: RAPIER.Collider
}

interface Fading {
  object: THREE.Object3D
  material: THREE.Material & { opacity: number }
  age: number
  life: number
  grow?: number
}

/**
 * Resolve um disparo: raio a partir do centro da tela, impulso físico no
 * ponto atingido (gira e empurra a parte certa), marca de impacto presa à
 * superfície (acompanha objetos que se mexem), traço da bala e poeirinha.
 */
export class Gunfire {
  private readonly scene: THREE.Scene
  private readonly physics: Physics
  private readonly excluded: RAPIER.Collider
  private readonly marks: THREE.Mesh[] = []
  private readonly fading: Fading[] = []

  private readonly markGeo = new THREE.CircleGeometry(0.018, 10)
  private readonly markMat = new THREE.MeshBasicMaterial({
    color: '#2a2a2c',
    transparent: true,
    opacity: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    depthWrite: false,
  })
  private readonly puffGeo = new THREE.SphereGeometry(0.04, 8, 6)

  constructor(scene: THREE.Scene, physics: Physics, playerCollider: RAPIER.Collider) {
    this.scene = scene
    this.physics = physics
    this.excluded = playerCollider
  }

  /**
   * Dispara de `origin` na direção `dir`. `muzzle` é de onde o traço sai
   * (perto da arma). Devolve o que foi atingido, se algo.
   */
  fire(origin: THREE.Vector3, dir: THREE.Vector3, muzzle: THREE.Vector3, impulse: number): ShotHit | null {
    const hit = this.physics.world.castRayAndGetNormal(
      new RAPIER.Ray(origin, dir),
      RANGE,
      true,
      undefined,
      undefined,
      this.excluded,
    )
    const end = origin.clone().addScaledVector(dir, hit ? hit.timeOfImpact : RANGE)
    this.tracer(muzzle, end)
    if (!hit) return null

    const normal = new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z)
    const body = hit.collider.parent()
    if (body && body.isDynamic()) {
      body.applyImpulseAtPoint(dir.clone().multiplyScalar(impulse), end, true)
    }
    this.mark(end, normal, body)
    this.puff(end, normal)
    return { point: end, normal, body, collider: hit.collider }
  }

  /** Anima traços e poeira. Chamado por frame. */
  update(dt: number) {
    for (let i = this.fading.length - 1; i >= 0; i--) {
      const f = this.fading[i]
      f.age += dt
      const u = f.age / f.life
      if (u >= 1) {
        f.object.removeFromParent()
        if (f.object instanceof THREE.Line) f.object.geometry.dispose()
        f.material.dispose()
        this.fading.splice(i, 1)
        continue
      }
      f.material.opacity = (1 - u) * (f.grow ? 0.5 : 0.9)
      if (f.grow) f.object.scale.setScalar(1 + u * f.grow)
    }
  }

  /** Remove todas as marcas (reset da cena). */
  clearMarks() {
    for (const m of this.marks) m.removeFromParent()
    this.marks.length = 0
  }

  dispose() {
    this.clearMarks()
    for (const f of this.fading) {
      f.object.removeFromParent()
      f.material.dispose()
    }
    this.markGeo.dispose()
    this.markMat.dispose()
    this.puffGeo.dispose()
  }

  private tracer(from: THREE.Vector3, to: THREE.Vector3) {
    const geo = new THREE.BufferGeometry().setFromPoints([from, to])
    const material = new THREE.LineBasicMaterial({ color: '#fff2c8', transparent: true, opacity: 0.9 })
    const line = new THREE.Line(geo, material)
    line.frustumCulled = false
    this.scene.add(line)
    this.fading.push({ object: line, material, age: 0, life: TRACER_TIME })
  }

  private puff(point: THREE.Vector3, normal: THREE.Vector3) {
    const material = new THREE.MeshBasicMaterial({ color: '#cfcac0', transparent: true, opacity: 0.5, depthWrite: false })
    const puff = new THREE.Mesh(this.puffGeo, material)
    puff.position.copy(point).addScaledVector(normal, 0.03)
    this.scene.add(puff)
    this.fading.push({ object: puff, material, age: 0, life: PUFF_TIME, grow: 2.5 })
  }

  /** Marca de impacto, presa ao objeto atingido (se ele se mexe) ou à cena. */
  private mark(point: THREE.Vector3, normal: THREE.Vector3, body: RAPIER.RigidBody | null) {
    const mark = new THREE.Mesh(this.markGeo, this.markMat)
    mark.position.copy(point).addScaledVector(normal, 0.002)
    mark.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal)
    mark.rotateZ(Math.random() * Math.PI)
    mark.scale.setScalar(0.8 + Math.random() * 0.5)

    const owner = body && !body.isFixed() ? this.physics.objectOf(body) : null
    if (owner) {
      owner.updateMatrixWorld(true)
      owner.attach(mark) // converte para o espaço do objeto: acompanha o movimento
    } else {
      this.scene.add(mark)
    }
    this.marks.push(mark)
    if (this.marks.length > MAX_MARKS) this.marks.shift()!.removeFromParent()
  }
}
