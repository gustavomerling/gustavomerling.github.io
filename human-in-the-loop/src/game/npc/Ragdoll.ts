import * as THREE from 'three'
import { Physics, RAPIER } from '../engine/physics'
import { buildPartVisual, createDummyMaterials, disposeVisual, type DummyMaterials } from './dummyVisual'
import type { Pose } from './poses'
import { JOINTS, PARTS, type JointDef, type PartDef, type PartName } from './skeleton'

export interface RagdollPart {
  def: PartDef
  body: RAPIER.RigidBody
  visual: THREE.Object3D
}

export interface PhysicalMotor {
  /** N·m por rad. */
  stiffness: number
  /** N·m·s por rad. */
  damping: number
}

export interface RagdollJoint {
  def: JointDef
  joint: RAPIER.ImpulseJoint
  /** Amortecimento base (atrito da junta), somado ao dos motores. */
  friction: number
  /** Rigidez extra pela carga de gravidade (ver BASE_STIFFNESS). */
  loadStiffness: number
}

/** Atrito interno das juntas (por kg da parte filha): o corpo não balança como pêndulo sem fim. */
const JOINT_FRICTION_PER_KG = 0.04
/**
 * Rigidez dos motores (modelo "baseado em aceleração" do Rapier: a rigidez
 * é multiplicada pela inércia da parte, em 1/s²).
 *
 * k = força² × (BASE + carga / ERRO_ALVO), onde carga = torque máximo que a
 * gravidade faz nesta junta ÷ inércia da parte filha. Assim uma junta que
 * sustenta muito peso longe (ombro com braço esticado, coluna) recebe mais
 * rigidez, e na força 1 nenhuma junta cede mais que ~ERRO_ALVO rad.
 */
const BASE_STIFFNESS = 400
const TARGET_SAG = 0.06
/** Fração do amortecimento crítico (1 = chega no alvo sem passar). */
const DAMPING_RATIO = 0.9
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
  private readonly materials: DummyMaterials
  private readonly skins = new Map<PartName, THREE.MeshStandardMaterial>()
  private readonly baseSkin = new THREE.Color()
  readonly root = new THREE.Group()

  constructor(physics: Physics, scene: THREE.Scene) {
    this.physics = physics
    const world = physics.world
    this.root.name = 'ragdoll'
    this.materials = createDummyMaterials()
    this.baseSkin.copy(this.materials.skin.color)
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

      // Cada parte tem sua própria cor de pele (para mostrar o dano nela).
      const skin = this.materials.skin.clone()
      this.skins.set(def.name, skin)
      const visual = buildPartVisual(def, { ...this.materials, skin })
      this.root.add(visual)
      physics.sync(body, visual)
      this.parts.set(def.name, { def, body, visual })
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
        hinge.configureMotorModel(RAPIER.MotorModel.AccelerationBased)
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
          raw(ball).jointConfigureMotorModel(ball.handle, axis, RAPIER.MotorModel.AccelerationBased)
          raw(ball).jointConfigureMotorVelocity(ball.handle, axis, 0, friction)
        })
        joint = ball
      }
      // Partes vizinhas não colidem entre si (elas se sobrepõem na junta).
      joint.setContactsEnabled(false)
      this.joints.push({ def, joint, friction, loadStiffness: gravityLoad(def, child.body) / TARGET_SAG })
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

  /**
   * Motores PD em todas as juntas: cada eixo puxa para o ângulo da `pose`.
   * `strength` 0 = mole (só atrito), 1 = rígido como uma estátua.
   * A rigidez cresce com o quadrado da força: o meio do controle fica
   * "humano" e o topo fica realmente duro.
   * `physical` troca juntas específicas para motor por força (N·m/rad),
   * usado nas pernas enquanto sustentam o corpo em pé.
   */
  setMotors(
    pose: Pose,
    strength: number,
    physical: Partial<Record<PartName, PhysicalMotor>> = {},
    scale: Partial<Record<PartName, number>> = {},
  ) {
    const s2 = strength * strength
    for (const { def, joint, friction, loadStiffness } of this.joints) {
      // Normal: rigidez por aceleração (independe da massa da parte).
      // "Física" (N·m/rad), para juntas que sustentam o corpo em pé: é
      // convertida para aceleração dividindo pela inércia da parte filha.
      // (O modelo por força do Rapier fica instável no pé, que é leve.)
      const phys = physical[def.child]
      const inertia = phys ? this.inertiaOf(def.child) : 1
      const k = (phys ? phys.stiffness / inertia : s2 * (BASE_STIFFNESS + loadStiffness)) * (scale[def.child] ?? 1)
      const damping = phys ? phys.damping / inertia : friction + DAMPING_RATIO * 2 * Math.sqrt(k)
      const target = pose[def.child] ?? [0, 0, 0]
      if (def.type === 'hinge') {
        const t = clamp(target[0], def.limits.x)
        ;(joint as RAPIER.RevoluteImpulseJoint).configureMotor(t, 0, k, damping)
      } else {
        const ranges = [def.limits.x, def.limits.y, def.limits.z]
        AXES.forEach((axis, i) => {
          const t = ranges[i] ? clamp(target[i], ranges[i]!) : target[i]
          raw(joint).jointConfigureMotor(joint.handle, axis, t, 0, k, damping)
        })
      }
    }
    // Motores só agem em corpos acordados.
    for (const part of this.parts.values()) part.body.wakeUp()
  }

  /**
   * Cinemático: as partes ignoram a física e seguem posições definidas
   * (animação de levantar). Ao voltar, viram corpos dinâmicos de novo.
   */
  setKinematic(on: boolean) {
    const type = on ? RAPIER.RigidBodyType.KinematicPositionBased : RAPIER.RigidBodyType.Dynamic
    for (const p of this.parts.values()) p.body.setBodyType(type, true)
  }

  /** Inércia média (kg·m²) de uma parte. */
  private inertiaOf(name: PartName) {
    const i = this.parts.get(name)!.body.principalInertia()
    return (i.x + i.y + i.z) / 3
  }

  /** Centro de massa e sua velocidade (soma ponderada das partes). */
  centerOfMass(pos: THREE.Vector3, vel: THREE.Vector3) {
    pos.set(0, 0, 0)
    vel.set(0, 0, 0)
    let total = 0
    for (const { body, def } of this.parts.values()) {
      const t = body.translation()
      const v = body.linvel()
      pos.x += t.x * def.mass
      pos.y += t.y * def.mass
      pos.z += t.z * def.mass
      vel.x += v.x * def.mass
      vel.y += v.y * def.mass
      vel.z += v.z * def.mass
      total += def.mass
    }
    pos.divideScalar(total)
    vel.divideScalar(total)
  }

  get totalMass() {
    let m = 0
    for (const { def } of this.parts.values()) m += def.mass
    return m
  }

  part(name: PartName) {
    return this.parts.get(name)!
  }

  /** Corpo rígido a partir de um colisor (para saber se algo acertou o NPC). */
  /**
   * Mostra o dano de uma parte (0 = intacta, 1 = destruída): a pele escurece
   * para um tom de hematoma. Sem gore.
   */
  setDamageTint(name: PartName, damage: number) {
    const skin = this.skins.get(name)
    if (!skin) return
    skin.color.copy(this.baseSkin).lerp(BRUISE, Math.min(1, damage) * 0.85)
    skin.roughness = 0.55 + damage * 0.3
  }

  /** Nome da parte de um corpo rígido (ou null se não for do ragdoll). */
  partOf(body: RAPIER.RigidBody): PartName | null {
    for (const [name, part] of this.parts) if (part.body.handle === body.handle) return name
    return null
  }

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
    disposeVisual(this.root)
    this.materials.dispose()
    for (const s of this.skins.values()) s.dispose()
  }
}

interface RawJointSet {
  jointSetLimits: (handle: number, axis: number, min: number, max: number) => void
  jointConfigureMotorVelocity: (handle: number, axis: number, targetVel: number, factor: number) => void
  jointConfigureMotorPosition: (handle: number, axis: number, target: number, stiffness: number, damping: number) => void
  jointSetMotorMaxForce: (handle: number, axis: number, maxForce: number) => void
  jointConfigureMotorModel: (handle: number, axis: number, model: number) => void
  jointConfigureMotor: (handle: number, axis: number, target: number, targetVel: number, stiffness: number, damping: number) => void
}

/** Partes que dependem de `name` na árvore de juntas (incluindo ela). */
function subtree(name: PartName): PartDef[] {
  const own = PARTS.find((p) => p.name === name)!
  return [own, ...JOINTS.filter((j) => j.parent === name).flatMap((j) => subtree(j.child))]
}

/**
 * Pior torque da gravidade na junta (tudo o que pende dela, com o braço de
 * alavanca na horizontal) dividido pela inércia da parte filha: a
 * "aceleração angular" que o motor precisa vencer.
 */
function gravityLoad(def: JointDef, childBody: RAPIER.RigidBody) {
  const parts = subtree(def.child)
  const mass = parts.reduce((m, p) => m + p.mass, 0)
  const com = new THREE.Vector3()
  for (const p of parts) com.addScaledVector(new THREE.Vector3(...p.center), p.mass / mass)
  const lever = com.distanceTo(new THREE.Vector3(...def.anchor))
  const torque = mass * 9.81 * lever
  const inertia = childBody.principalInertia()
  const meanInertia = (inertia.x + inertia.y + inertia.z) / 3
  return torque / meanInertia
}

/** Tom de hematoma (dano), misturado à pele. */
const BRUISE = new THREE.Color('#6e3f45')

const clamp = (v: number, [min, max]: [number, number]) => Math.min(max, Math.max(min, v))

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
