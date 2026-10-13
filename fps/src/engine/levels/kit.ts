import * as THREE from 'three'
import type { BlockDef, Motion } from '../blocks/types.ts'

/**
 * Small helpers for writing levels by the height of what the player stands on
 * (`top`), instead of by block centers. Every number is relative to the level base.
 */

/** Floating slab whose top is at `top`. */
export function slab(
  x: number,
  z: number,
  top: number,
  width: number,
  depth: number,
  extra: Partial<BlockDef> & { thick?: number } = {},
): BlockDef {
  const { thick = 0.6, ...rest } = extra
  return { x, z, y: top - thick / 2, size: [width, thick, depth], ...rest }
}

/** Column from the level base up to `top`. */
export function pillar(x: number, z: number, top: number, width: number, depth: number, color?: number): BlockDef {
  return { x, z, y: top / 2, size: [width, top, depth], color }
}

/** Red block starting at `bottom`. Touching it sends the player back to the level start. */
export function hazard(x: number, z: number, bottom: number, size: [number, number, number], motion?: Motion): BlockDef {
  return { type: 'hazard', x, z, y: bottom + size[1] / 2, size, motion }
}

/** Trampoline whose surface is at `top`. `power` is the launch speed (13 ≈ 3.5 blocks up). */
export function pad(x: number, z: number, top: number, power = 13, width = 2, depth = 2): BlockDef {
  return { type: 'bounce', x, z, y: top - 0.25, size: [width, 0.5, depth], power }
}

/** Fragile floor tile: it breaks a moment after being stepped on. */
export function crumble(x: number, z: number, top: number, width = 1.6, depth = 1.6): BlockDef {
  return { type: 'crumble', x, z, y: top - 0.2, size: [width, 0.4, depth] }
}

/** Energy platform, solid for 60% of each `period`. Phases 0 and 0.5 take turns. */
export function blink(
  x: number,
  z: number,
  top: number,
  phase: number,
  color: number,
  period = 2.8,
  width = 2,
  depth = 2,
): BlockDef {
  return { type: 'blink', x, z, y: top - 0.2, size: [width, 0.4, depth], color, blink: { period, phase } }
}

/** Lamp post standing on a surface at `top`. */
export function lamp(x: number, z: number, top: number, color?: number): BlockDef {
  return { type: 'lamp', x, z, y: top + 0.7, size: [0.2, 1.4, 0.2], color }
}

/** Chevrons on a surface at `top`, pointing from (x, z) toward (toX, toZ). */
export function arrow(x: number, z: number, top: number, toX: number, toZ: number, color?: number): BlockDef {
  return {
    type: 'arrow',
    x,
    z,
    y: top + 0.02,
    size: [1.1, 0.02, 1.1],
    rotation: Math.atan2(-(toZ - z), toX - x),
    color,
  }
}

/** Colour between `from` and `to`, `t` in 0..1. */
export function shade(from: number, to: number, t: number) {
  return new THREE.Color(from).lerp(new THREE.Color(to), t).getHex()
}
