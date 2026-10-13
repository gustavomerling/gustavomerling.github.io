import * as THREE from 'three'
import { BLOCK_TYPES } from './blocks/index.ts'
import type { BlockDef } from './blocks/types.ts'
import type { Special } from './Gimmicks.ts'
import { texture } from './textures.ts'
import type { LevelDef, RampDef } from './levels/types.ts'
import { Ramp, RAMP_MARGIN, type Ground } from './Ramp.ts'
import type { Mover } from './Movers.ts'

/** A level placed in the world: where it starts and where a fall ends. */
export type BuiltLevel = {
  id: string
  name: string
  tagline: string
  /** Position in the tower, from 0 at the bottom. */
  index: number
  /** World Y of the level's base. */
  base: number
  height: number
  /** Where the player appears when this level starts or respawns. */
  spawn: THREE.Vector3
}

export type BuiltWorld = {
  group: THREE.Group
  colliders: THREE.Box3[]
  hazards: THREE.Box3[]
  movers: Mover[]
  /** Trampolines, fragile floors and blinking platforms. */
  specials: Special[]
  /** Walkable slopes (ramps), for the player's ground check. */
  grounds: Ground[]
  /** Falling below this world Y is a fall: the bottom of the tower. */
  fallY: number
  /** Ordered from the bottom level up. */
  levels: BuiltLevel[]
  /** World position of the finish line, if any level defines one. */
  goal: THREE.Vector3 | null
  /** World Y of the top of the tower. */
  top: number
}

const FLOOR_THICKNESS = 1
// World units covered by one repeat of the floor texture.
const FLOOR_TILE = 4

/**
 * Stacks the levels one above the other and turns them into a Three.js group
 * plus the collision boxes the engine uses. This is the only place that knows
 * how level data becomes geometry, so new block types only need registering.
 */
export function buildWorld(defs: LevelDef[]): BuiltWorld {
  const group = new THREE.Group()
  const colliders: THREE.Box3[] = []
  const hazards: THREE.Box3[] = []
  const movers: Mover[] = []
  const specials: Special[] = []
  const grounds: Ground[] = []
  const levels: BuiltLevel[] = []

  let base = 0
  let goal: THREE.Vector3 | null = null
  for (const [index, def] of defs.entries()) {
    addLevel(def, base, { group, colliders, hazards, movers, specials, grounds })
    if (def.goal) goal = new THREE.Vector3(def.goal[0], base + def.goal[1], def.goal[2])
    levels.push({
      id: def.id,
      name: def.name,
      tagline: def.tagline,
      index,
      base,
      height: def.height,
      spawn: new THREE.Vector3(def.spawn[0], base + def.spawn[1], def.spawn[2]),
    })
    base += def.height
  }

  // Only the bottom level sets how far a fall can go; the levels above it are
  // caught by whatever is below them (a floor, or the level under them).
  const fallY = defs[0].fallLimit ?? -Infinity
  return { group, colliders, hazards, movers, specials, grounds, fallY, levels, goal, top: base }
}

type World = Pick<BuiltWorld, 'group' | 'colliders' | 'hazards' | 'movers' | 'specials' | 'grounds'>

function addLevel(level: LevelDef, base: number, world: World) {
  const { size } = level

  if (level.floor !== false) {
    const geometry = new THREE.PlaneGeometry(size, size)
    const uv = geometry.getAttribute('uv') as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * size) / FLOOR_TILE, (uv.getY(i) * size) / FLOOR_TILE)
    const floor = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({
        color: 0x4a5462,
        map: texture('floor'),
        bumpMap: texture('floor', 'data'),
        bumpScale: 1.5,
        roughness: 0.9,
        metalness: 0,
      }),
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.y = base
    floor.receiveShadow = true
    world.group.add(floor)

    // A thick slab under the floor, so the ground floats like the rest of the tower.
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(size, FLOOR_THICKNESS * 2, size),
      new THREE.MeshStandardMaterial({ color: 0x262c35, map: texture('stone'), roughness: 0.95 }),
    )
    slab.position.y = base - FLOOR_THICKNESS - 0.005
    slab.receiveShadow = true
    world.group.add(slab)

    // The floor is a collider limited to the level bounds, so the edges are open
    // and walking off makes the player fall.
    world.colliders.push(
      new THREE.Box3().setFromCenterAndSize(
        new THREE.Vector3(0, base - FLOOR_THICKNESS / 2, 0),
        new THREE.Vector3(size, FLOOR_THICKNESS, size),
      ),
    )
  }

  for (const def of level.ramps ?? []) {
    assertRampInside(level, def)
    const ramp = new Ramp(def, base)
    world.group.add(ramp.mesh)
    world.grounds.push(ramp)
  }

  for (const def of level.blocks) {
    const type = BLOCK_TYPES[def.type ?? 'solid']
    if (!type) {
      console.warn(`Unknown block type "${def.type}" — skipping.`)
      continue
    }

    const sizeVector = new THREE.Vector3(...(def.size ?? [1, 1, 1]))
    const center = new THREE.Vector3(def.x, base + (def.y ?? sizeVector.y / 2), def.z)
    const boxes = placements(center, sizeVector, def.motion)
    // Decor (lamps on a top platform) may poke above the level; it never collides.
    for (const box of boxes) assertInside(level, base, def, box, type.kind === 'decor')

    const mesh = type.build({ def, size: sizeVector, center, moving: def.motion !== undefined })
    world.group.add(mesh)

    if (type.kind !== 'decor') {
      // The box for a moving block is the one that moves; the mover keeps it updated.
      const box = new THREE.Box3().setFromCenterAndSize(center, sizeVector)
      if (type.kind === 'hazard') world.hazards.push(box)
      else world.colliders.push(box)

      if (type.special) {
        if (def.motion) console.warn(`Level "${level.id}": a ${type.id} block cannot move, motion ignored.`)
        world.specials.push({ kind: type.special, box, mesh, def, center: center.clone(), size: sizeVector })
        continue
      }

      if (def.motion) {
        world.movers.push({
          mesh,
          box,
          size: sizeVector,
          home: center.clone(),
          center: center.clone(),
          motion: def.motion,
          delta: new THREE.Vector3(),
        })
      }
    }
  }
}

/** Boxes a block occupies over its whole path: the home spot and both ends of its motion. */
function placements(center: THREE.Vector3, size: THREE.Vector3, motion: BlockDef['motion']) {
  const centers = [center]
  if (motion) {
    const axes = motion.axis === 'orbit' ? (['x', 'z'] as const) : [motion.axis]
    for (const axis of axes) {
      for (const sign of [-1, 1]) {
        const end = center.clone()
        end[axis] += sign * motion.amplitude
        centers.push(end)
      }
    }
  }
  return centers.map((c) => new THREE.Box3().setFromCenterAndSize(c, size))
}

/** A ramp must stay inside the play area and rise no higher than its level. */
function assertRampInside(level: LevelDef, def: RampDef) {
  const half = level.size / 2
  const edge = def.width / 2 + RAMP_MARGIN
  const inside = def.path.every(([x, z]) => Math.abs(x) + edge <= half && Math.abs(z) + edge <= half)
  if (!inside || def.rise > level.height || (def.from ?? 0) < 0 || (def.from ?? 0) > def.rise) {
    throw new Error(
      `Level "${level.id}": a ramp leaves the ${level.size}x${level.size}x${level.height} area (or rises above it).`,
    )
  }
}

/**
 * Scope rule: every level is built inside the play area (`size x size`, centered
 * on the origin) and within its own `height`. Breaking it is a content bug, so
 * it fails loudly instead of quietly building outside the area.
 */
function assertInside(level: LevelDef, base: number, def: BlockDef, box: THREE.Box3, decor = false) {
  const half = level.size / 2
  const inside =
    box.min.x >= -half &&
    box.max.x <= half &&
    box.min.z >= -half &&
    box.max.z <= half &&
    (decor || (box.min.y >= base && box.max.y <= base + level.height))
  if (!inside) {
    throw new Error(
      `Level "${level.id}": block at (${def.x}, ${def.z}) is outside the ${level.size}x${level.size}x${level.height} area.`,
    )
  }
}
