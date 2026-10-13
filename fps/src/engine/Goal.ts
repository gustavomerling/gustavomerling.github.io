import * as THREE from 'three'

const COLOR = 0x6dffc8
const RADIUS = 0.6
const BEAM_HEIGHT = 30
// How close (horizontally) and how high above the pad the player must be to finish.
const REACH = 0.9
const REACH_HEIGHT = 2.2

/**
 * The finish line on top of the tower: a glowing pad with a light beam that can
 * be seen from the levels below, and a spinning crystal above it.
 */
export class Goal {
  readonly group = new THREE.Group()
  private readonly position: THREE.Vector3
  private readonly crystal: THREE.Mesh
  private readonly ring: THREE.Mesh
  private readonly beam: THREE.Mesh
  private readonly light: THREE.PointLight

  constructor(position: THREE.Vector3) {
    this.position = position.clone()
    this.group.position.copy(position)

    this.ring = new THREE.Mesh(
      new THREE.TorusGeometry(RADIUS, 0.05, 12, 48),
      new THREE.MeshBasicMaterial({ color: COLOR }),
    )
    this.ring.rotation.x = Math.PI / 2
    this.ring.position.y = 0.04
    this.group.add(this.ring)

    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(RADIUS, 48),
      new THREE.MeshBasicMaterial({ color: COLOR, transparent: true, opacity: 0.25, depthWrite: false }),
    )
    pad.rotation.x = -Math.PI / 2
    pad.position.y = 0.03
    this.group.add(pad)

    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(RADIUS * 0.7, RADIUS, BEAM_HEIGHT, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: COLOR,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    )
    this.beam.position.y = BEAM_HEIGHT / 2
    this.group.add(this.beam)

    this.crystal = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28),
      new THREE.MeshStandardMaterial({ color: COLOR, emissive: COLOR, emissiveIntensity: 1.4, roughness: 0.2 }),
    )
    this.crystal.position.y = 1.4
    this.group.add(this.crystal)

    this.light = new THREE.PointLight(COLOR, 6, 8, 2)
    this.light.position.y = 1.2
    this.group.add(this.light)
  }

  update(time: number) {
    this.crystal.rotation.y = time * 1.6
    this.crystal.rotation.x = Math.sin(time * 0.8) * 0.4
    this.crystal.position.y = 1.4 + Math.sin(time * 2) * 0.12
    const pulse = 0.5 + 0.5 * Math.sin(time * 3)
    this.ring.scale.setScalar(1 + pulse * 0.08)
    ;(this.beam.material as THREE.MeshBasicMaterial).opacity = 0.08 + pulse * 0.08
    this.light.intensity = 4 + pulse * 3
  }

  /** True when the feet at `feet` are standing in the goal. */
  contains(feet: THREE.Vector3) {
    const dx = feet.x - this.position.x
    const dz = feet.z - this.position.z
    const dy = feet.y - this.position.y
    return Math.hypot(dx, dz) < REACH && dy > -0.2 && dy < REACH_HEIGHT
  }
}
