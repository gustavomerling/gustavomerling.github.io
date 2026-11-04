import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { JOINTS, PARTS, type JointDef, type PartDef, type PartName } from './skeleton'

export interface RagdollPart {
  def: PartDef
  body: RAPIER.RigidBody
  mesh: THREE.Mesh
}

export interface RagdollJoint {
  def: JointDef
  joint: RAPIER.ImpulseJoint
}

/** Atrito interno das juntas (por kg da parte filha): o corpo não balança como pêndulo sem fim. */
const JOINT_FRICTION_PER_KG = 0.04
/** Iterações extras do solver para os corpos do ragdoll: cadeias de juntas ficam mais firmes. */
const EXTRA_SOLVER_ITERATIONS = 8

const AXES = [RAPIER.JointAxis.AngX, RAPIER.JointAxis.AngY, RAPIER.JointAxis.AngZ] as const

/**
 * Ragdoll físico do NPC: 16 corpos rígidos ligados por juntas com limites
 * anatômicos. Neste passo ele é passivo (mole); motores vêm depois.
 */
export class Ragdoll {
  readonly parts = new Map<PartName, RagdollPart>()
  readonly joints: RagdollJoint[] = []
  private readonly physics: Physics
  private readonly geometries: THREE.BufferGeometry[] = []
  readonly root = new THREE.Group()

  constructor(physics: Physics, scene: THREE.Scene, material: THREE.Material) {
    this.physics = physics
    const world = physics.world
    this.root.name = 'ragdoll'
    scene.add(this.root)

    for (const def of PARTS) {
      const body = world.createRigidBody(
        RAPIER.RigidBodyDesc.dynamic()
          .setTranslation(...def.center)
          .setLinearDamping(0.05)
          .setAngularDamping(0.3)
          .setAdditionalSolverIterations(EXTRA_SOLVER_ITERATIONS),
      )
      world.createCollider(colliderFor(def).setMass(def.mass).setFriction(0.8).setRestitution(0), body)

      const geo = geometryFor(def)
      this.geometries.push(geo)
      const mesh = new THREE.Mesh(geo, material)
      mesh.castShadow = mesh.receiveShadow = true
      mesh.name = def.name
      this.root.add(mesh)
      physics.sync(body, mesh)
      this.parts.set(def.name, { def, body, mesh })
    }

    for (const def of JOINTS) {
      const parent = this.parts.get(def.parent)!
      const child = this.parts.get(def.child)!
      const a1 = localAnchor(def.anchor, parent.def.center)
      const a2 = localAnchor(def.anchor, child.def.center)
      const friction = JOINT_FRICTION_PER_KG * child.def.mass

      let joint: RAPIER.ImpulseJoint
      if (def.type === 'hinge') {
        const hinge = world.createImpulseJoint(
          RAPIER.JointData.revolute(a1, a2, { x: 1, y: 0, z: 0 }),
          parent.body,
          child.body,
          true,
        ) as RAPIER.RevoluteImpulseJoint
        hinge.setLimits(def.limits.x[0], def.limits.x[1])
        hinge.configureMotorVelocity(0, friction)
        joint = hinge
      } else {
        const ball = world.createImpulseJoint(
          RAPIER.JointData.spherical(a1, a2),
          parent.body,
          child.body,
          true,
        )
        const ranges = [def.limits.x, def.limits.y, def.limits.z]
        AXES.forEach((axis, i) => {
          const r = ranges[i]
          if (r) raw(ball).jointSetLimits(ball.handle, axis, r[0], r[1])
          raw(ball).jointConfigureMotorVelocity(ball.handle, axis, 0, friction)
        })
        joint = ball
      }
      // Partes vizinhas não colidem entre si (elas se sobrepõem na junta).
      joint.setContactsEnabled(false)
      this.joints.push({ def, joint })
    }
  }

  /**
   * Coloca o ragdoll na pose de referência com os pés em `feet`, virado
   * para `yaw` (0 = olhando para -Z). `lift` sobe o corpo inteiro,
   * `tilt` inclina (para quedas variadas), `spin` dá giro inicial.
   */
  placeAt(feet: THREE.Vector3, yaw: number, opts: { lift?: number; tilt?: THREE.Euler; spin?: THREE.Vector3 } = {}) {
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, yaw, 0))
    if (opts.tilt) rot.multiply(new THREE.Quaternion().setFromEuler(opts.tilt))
    const origin = feet.clone().setY(feet.y + (opts.lift ?? 0))
    const p = new THREE.Vector3()
    for (const part of this.parts.values()) {
      p.set(...part.def.center).applyQuaternion(rot).add(origin)
      part.body.setTranslation(p, true)
      part.body.setRotation(rot, true)
      part.body.setLinvel({ x: 0, y: 0, z: 0 }, true)
      const spin = opts.spin ?? { x: 0, y: 0, z: 0 }
      part.body.setAngvel(spin, true)
      this.physics.teleport(part.body)
    }
  }

  /** Corpo rígido a partir de um colisor (para saber se algo acertou o NPC). */
  hasBody(body: RAPIER.RigidBody) {
    for (const part of this.parts.values()) if (part.body.handle === body.handle) return true
    return false
  }

  dispose() {
    for (const { joint } of this.joints) this.physics.world.removeImpulseJoint(joint, true)
    for (const part of this.parts.values()) {
      this.physics.unsync(part.body)
      this.physics.world.removeRigidBody(part.body)
    }
    this.root.removeFromParent()
    for (const g of this.geometries) g.dispose()
  }
}

interface RawJointSet {
  jointSetLimits: (handle: number, axis: number, min: number, max: number) => void
  jointConfigureMotorVelocity: (handle: number, axis: number, targetVel: number, factor: number) => void
  jointConfigureMotorPosition: (handle: number, axis: number, target: number, stiffness: number, damping: number) => void
  jointSetMotorMaxForce: (handle: number, axis: number, maxForce: number) => void
}

/**
 * A API JS do Rapier só expõe limites/motores de juntas de 1 eixo, mas o
 * motor físico aceita limites e motores por eixo angular em juntas
 * esféricas. Acessamos o conjunto de juntas "cru" para chamar direto.
 */
export function raw(joint: RAPIER.ImpulseJoint): RawJointSet {
  return (joint as unknown as { rawSet: RawJointSet }).rawSet
}

function localAnchor(anchor: [number, number, number], center: [number, number, number]) {
  return { x: anchor[0] - center[0], y: anchor[1] - center[1], z: anchor[2] - center[2] }
}

function colliderFor(def: PartDef): RAPIER.ColliderDesc {
  const s = def.shape
  switch (s.kind) {
    case 'box':
      return RAPIER.ColliderDesc.cuboid(s.size[0] / 2, s.size[1] / 2, s.size[2] / 2)
    case 'capsule':
      return RAPIER.ColliderDesc.capsule(s.length / 2 - s.radius, s.radius)
    case 'sphere':
      return RAPIER.ColliderDesc.ball(s.radius)
  }
}

function geometryFor(def: PartDef): THREE.BufferGeometry {
  const s = def.shape
  switch (s.kind) {
    case 'box':
      return new THREE.BoxGeometry(...s.size)
    case 'capsule':
      return new THREE.CapsuleGeometry(s.radius, s.length - 2 * s.radius, 4, 12)
    case 'sphere':
      return new THREE.SphereGeometry(s.radius, 20, 14)
  }
}
