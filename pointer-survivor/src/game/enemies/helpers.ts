import { drawSprite, spriteFrame, spriteSize } from '../sprites'
import type { World } from '../engine/World'
import type { Enemy, EnemyDef } from '../types'

/** Returns white while the enemy is flashing from a hit, else the given color (for custom draw()). */
export function tint(e: Enemy, color: string): string {
  return e.flash > 0 ? '#ffffff' : color
}

/** Identity helper so defs get full type checking. */
export function defineEnemy(def: EnemyDef): EnemyDef {
  return def
}

/** Draws an enemy at the current origin: custom draw() if given, else its sprite. */
export function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, time: number) {
  const def = e.def
  if (def.draw) return def.draw(ctx, e, time)
  if (!def.sprite) return
  const flipX = (def.sprite.flip ?? true) && e.vx < 0
  drawSprite(ctx, def.sprite, spriteFrame(def.sprite, time, e.uid), { flipX, flash: e.flash > 0 })
}

/** Approximate on-screen size in game units (largest side). */
export function enemyVisualSize(def: EnemyDef): number {
  if (def.sprite) {
    const s = spriteSize(def.sprite)
    return Math.max(s.width, s.height) * s.pixel
  }
  return def.radius * 2.4
}

/**
 * Bosses spawn off-screen; this walks them in before they start attacking.
 * Returns true while still entering.
 */
export function bossEnter(e: Enemy, world: World): boolean {
  const margin = e.def.radius + 10
  const inside = e.x > margin && e.x < world.width - margin && e.y > margin && e.y < world.height - margin
  if (inside) return false
  const dx = world.width / 2 - e.x
  const dy = world.height / 2 - e.y
  const d = Math.hypot(dx, dy) || 1
  e.vx = (dx / d) * 70
  e.vy = (dy / d) * 70
  return true
}

/** Walk toward the player (smoothed). */
export function seek(e: Enemy, world: World, dt: number, speed = e.def.speed) {
  const dx = world.player.x - e.x
  const dy = world.player.y - e.y
  const d = Math.hypot(dx, dy) || 1
  const k = Math.min(1, dt * 3)
  e.vx += ((dx / d) * speed - e.vx) * k
  e.vy += ((dy / d) * speed - e.vy) * k
}
