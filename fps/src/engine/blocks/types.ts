import * as THREE from 'three'

/**
 * Makes a block move, starting at its home position, in world units:
 * - `x` / `y` / `z`: slides back and forth, offset = amplitude * sin(2π · t / period + phase)
 * - `orbit`: circles around its home in the x-z plane, with radius `amplitude`
 */
export type Motion = {
  axis: 'x' | 'y' | 'z' | 'orbit'
  amplitude: number
  period: number
  phase?: number
}

/** A platform that comes and goes: solid for the `on` fraction (0..1) of every `period` seconds. */
export type Blink = {
  period: number
  on?: number
  /** Offset in the cycle, 0..1. Platforms with phases 0 and 0.5 take turns. */
  phase?: number
}

/**
 * A block as written in a level definition.
 * `y` defaults to half of its height, so blocks sit on the floor unless raised.
 * `motion` makes it move; the player is carried along when standing on it.
 */
export type BlockDef = {
  type?: string
  x: number
  z: number
  y?: number
  size?: [number, number, number]
  color?: number
  motion?: Motion
  /** Bounce pads: upward speed given to the player. */
  power?: number
  /** Blinking platforms: their on/off cycle. */
  blink?: Blink
  /** Decor: turn around the vertical axis, in radians. */
  rotation?: number
}

/** A block def with its size and center already resolved by the builder. */
export type ResolvedBlock = {
  def: BlockDef
  size: THREE.Vector3
  center: THREE.Vector3
  /** Whether the block has a `motion`, so it can look different. */
  moving: boolean
}

/**
 * How a block behaves in the world:
 * - `solid`  -> stands in the way and can be walked on
 * - `hazard` -> touching it sends the player back to the spawn
 * - `decor`  -> visual only
 */
export type BlockKind = 'solid' | 'hazard' | 'decor'

/** Extra behaviour for solid blocks, driven by the engine's `Gimmicks`. */
export type BlockSpecial = 'bounce' | 'crumble' | 'blink'

/**
 * A reusable block type. Add a new one by exporting an object like this and
 * registering it in `blocks/index.ts`.
 */
export type BlockType = {
  id: string
  label: string
  kind: BlockKind
  special?: BlockSpecial
  build(block: ResolvedBlock): THREE.Object3D
}
