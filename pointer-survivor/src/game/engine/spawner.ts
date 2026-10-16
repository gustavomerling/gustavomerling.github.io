import { ENEMY_BY_ID, isActive } from '../enemies'
import { MAX_ENEMIES, type WaveDef } from '../waves'
import type { World } from './World'

function currentWave(waves: WaveDef[], time: number): WaveDef {
  return waves.find((w) => time >= w.from && time < w.to) ?? waves[waves.length - 1]
}

function pickWeighted(mix: Record<string, number>): string | null {
  const entries = Object.entries(mix).filter(([id]) => {
    const def = ENEMY_BY_ID[id]
    return def && isActive(def)
  })
  const total = entries.reduce((sum, [, w]) => sum + w, 0)
  let r = Math.random() * total
  for (const [id, w] of entries) {
    r -= w
    if (r <= 0) return id
  }
  return entries[0]?.[0] ?? null
}

/** A point just outside a random arena edge. */
function edgePoint(w: number, h: number, margin: number): { x: number; y: number } {
  const side = Math.floor(Math.random() * 4)
  const t = Math.random()
  switch (side) {
    case 0:
      return { x: t * w, y: -margin }
    case 1:
      return { x: w + margin, y: t * h }
    case 2:
      return { x: t * w, y: h + margin }
    default:
      return { x: -margin, y: t * h }
  }
}

export class Spawner {
  private timer = 0.5

  update(world: World, dt: number) {
    const { map } = world
    if (!world.bossSpawned && world.time >= map.boss.at) {
      const def = ENEMY_BY_ID[map.boss.id]
      // enter from the edge farthest from the player
      const top = world.player.y > world.height / 2
      if (def) world.spawnBoss(def, world.width / 2, top ? -def.radius : world.height + def.radius)
    }

    const wave = currentWave(map.waves, world.time)
    this.timer -= dt
    if (this.timer > 0) return
    this.timer = wave.interval
    for (let i = 0; i < wave.batch; i++) {
      if (world.enemies.length >= MAX_ENEMIES) return
      const id = pickWeighted(wave.mix)
      if (!id) return
      const def = ENEMY_BY_ID[id]
      const p = edgePoint(world.width, world.height, def.radius + 4)
      world.spawnEnemy(def, p.x, p.y, wave.hpScale)
    }
  }
}
