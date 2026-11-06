import type RAPIER from '@dimforge/rapier3d-compat'
import { integrateSpin, tireForce, type TireParams, type TireResult } from './tires'
import { VEHICLE } from './vehicle-config'

export type Vec3 = { x: number; y: number; z: number }

/** Comandos usados pelos pneus. driveTorque é o torque do motor em cada roda traseira (vem do trem de força). */
export type DriveCommands = {
  brake: number
  handbrake: boolean
  driveTorque: number
  /** ABS ligado: solta o freio da roda que trava. */
  abs: boolean
}

export type Vehicle = {
  /** Número de rodas (sempre 4). */
  wheelCount: number
  /** Avança a suspensão do Rapier. Chamar antes de applyTires e world.step(). */
  update: (dt: number) => void
  /** Aplica as forças dos pneus no chassi e avança a rotação das rodas. Chamar antes de world.step(). */
  applyTires: (dt: number, cmd: DriveCommands) => void
  /** Último resultado do pneu da roda i (escorregamento e forças). */
  tire: (i: number) => TireResult
  /** Força da mola da roda i (N). */
  suspensionForce: (i: number) => number
  /** Velocidade angular da roda i (rad/s), para girar o modelo. */
  spin: (i: number) => number
  /** Comprimento atual da suspensão da roda i (m). */
  suspensionLength: (i: number) => number
  /** A roda i toca o chão? */
  inContact: (i: number) => boolean
  /** Posição da roda i no referencial do chassi (m). */
  wheelLocal: (i: number) => Vec3
  dispose: () => void
}

/** Rodas na ordem: 0 frente-esquerda, 1 frente-direita, 2 traseira-esquerda, 3 traseira-direita. */
const CORNERS: Array<[number, number]> = [
  [-VEHICLE.wheels.trackHalf, VEHICLE.wheels.wheelbaseHalf],
  [VEHICLE.wheels.trackHalf, VEHICLE.wheels.wheelbaseHalf],
  [-VEHICLE.wheels.trackHalf, -VEHICLE.wheels.wheelbaseHalf],
  [VEHICLE.wheels.trackHalf, -VEHICLE.wheels.wheelbaseHalf],
]

/**
 * Suspensão com quatro rodas (controlador de veículo do Rapier, por raycast).
 * Cada roda tem uma mola e amortecedor; o chassi é o corpo rígido dado.
 */
export function createVehicle(world: RAPIER.World, chassis: RAPIER.RigidBody): Vehicle {
  const ctl = world.createVehicleController(chassis)
  ctl.indexUpAxis = 1
  ctl.setIndexForwardAxis = 2

  const w = VEHICLE.wheels
  const s = VEHICLE.suspension
  const tire: TireParams = { ...VEHICLE.tire, radius: w.radius }
  const brakes = VEHICLE.brakes

  // Velocidade angular de cada roda e último resultado do pneu (para debug)
  const spin = [0, 0, 0, 0]
  const tires: TireResult[] = CORNERS.map(() => ({ Fx: 0, Fy: 0, slipRatio: 0, slipAngle: 0 }))

  CORNERS.forEach(([x, z], i) => {
    ctl.addWheel(
      { x, y: w.connectionY, z },
      { x: 0, y: -1, z: 0 }, // suspensão aponta para baixo
      { x: -1, y: 0, z: 0 }, // eixo da roda ao longo de x
      w.restLength,
      w.radius,
    )
    ctl.setWheelSuspensionStiffness(i, s.stiffness)
    ctl.setWheelSuspensionCompression(i, s.compression)
    ctl.setWheelSuspensionRelaxation(i, s.relaxation)
    ctl.setWheelMaxSuspensionForce(i, s.maxForce)
    ctl.setWheelMaxSuspensionTravel(i, w.maxTravel)
    // Atrito do controlador desligado: quem gera aderência agora é o modelo de pneu (tires.ts)
    ctl.setWheelFrictionSlip(i, 0)
    ctl.setWheelSideFrictionStiffness(i, 0)
  })

  const applyTires = (dt: number, cmd: DriveCommands) => {
    const q = chassis.rotation()
    // Frente do carro (+z local) no referencial do mundo
    const f0 = rotateByQuat({ x: 0, y: 0, z: 1 }, q)

    CORNERS.forEach((_, i) => {
      const rear = i >= 2
      const drive = rear ? cmd.driveTorque : 0
      // Freio por roda: dianteiro ou traseiro, mais o freio de mão nas traseiras
      let brake = cmd.brake * (rear ? brakes.rear : brakes.front) + (cmd.handbrake && rear ? brakes.handbrake : 0)
      // ABS: a roda que trava (escorregamento além do limite) tem o freio reduzido
      if (cmd.abs && tires[i].slipRatio < brakes.absSlipLimit) brake *= brakes.absReduction

      const point = ctl.wheelContactPoint(i)
      const normal = ctl.wheelContactNormal(i)
      if (!ctl.wheelIsInContact(i) || !point || !normal) {
        // No ar: sem força de contato, só a roda gira livre com motor e freio
        tires[i] = { Fx: 0, Fy: 0, slipRatio: 0, slipAngle: 0 }
        spin[i] = integrateSpin(tire, spin[i], 0, drive, brake, dt)
        return
      }

      // Base do contato: f (frente projetada no chão) e s (lateral, à direita do carro)
      const n = normalize(normal)
      const f = normalize(sub(f0, scale(n, dot(f0, n))))
      const s = cross(n, f)

      const v = chassis.velocityAtPoint(point)
      const vLong = dot(v, f)
      const vLat = dot(v, s)
      const load = Math.max(ctl.wheelSuspensionForce(i) ?? 0, 0)

      const r = tireForce(tire, load, vLong, vLat, spin[i])
      tires[i] = r

      // Força do pneu no chassi, aplicada no ponto de contato
      const F = add(scale(f, r.Fx), scale(s, r.Fy))
      chassis.applyImpulseAtPoint(scale(F, dt), point, true)

      spin[i] = integrateSpin(tire, spin[i], r.Fx, drive, brake, dt)
    })
  }

  return {
    wheelCount: CORNERS.length,
    update: (dt) => ctl.updateVehicle(dt),
    applyTires,
    tire: (i) => tires[i],
    suspensionForce: (i) => ctl.wheelSuspensionForce(i) ?? 0,
    spin: (i) => spin[i],
    suspensionLength: (i) => ctl.wheelSuspensionLength(i) ?? w.restLength,
    inContact: (i) => ctl.wheelIsInContact(i),
    wheelLocal: (i) => {
      const [x, z] = CORNERS[i]
      const len = ctl.wheelSuspensionLength(i) ?? w.restLength
      return { x, y: w.connectionY - len, z }
    },
    dispose: () => ctl.free(),
  }
}

// Vetores pequenos, sem dependências (o Rapier não traz operações de vetor úteis aqui)
function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}
function cross(a: Vec3, b: Vec3): Vec3 {
  return { x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x }
}
function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}
function sub(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}
function scale(a: Vec3, k: number): Vec3 {
  return { x: a.x * k, y: a.y * k, z: a.z * k }
}
function normalize(a: Vec3): Vec3 {
  const len = Math.hypot(a.x, a.y, a.z) || 1
  return scale(a, 1 / len)
}
/** Rotaciona v pelo quaternion q (v' = v + 2w(u×v) + 2u×(u×v)). */
function rotateByQuat(v: Vec3, q: { x: number; y: number; z: number; w: number }): Vec3 {
  const u = { x: q.x, y: q.y, z: q.z }
  const t = scale(cross(u, v), 2)
  return add(add(v, scale(t, q.w)), cross(u, t))
}
