import type RAPIER from '@dimforge/rapier3d-compat'
import { VEHICLE } from './vehicle-config'

export type Vec3 = { x: number; y: number; z: number }

export type Vehicle = {
  /** Número de rodas (sempre 4). */
  wheelCount: number
  /** Avança a suspensão e as forças das rodas. Chamar antes de world.step(). */
  update: (dt: number) => void
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
  })

  return {
    wheelCount: CORNERS.length,
    update: (dt) => ctl.updateVehicle(dt),
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
