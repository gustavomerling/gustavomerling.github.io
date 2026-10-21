import type { World } from '@engine/ecs/world';
import { Tile } from '@engine/physics/tilegrid';
import { PLAYER_TUNING, TILE } from '../config';
import type { AssembledWeapon } from '../content/weapons/assemble';
import { Arsenal, Body, Health, Pickup, PlayerControl, Position } from '../world/components';
import { bodyCenter } from '../world/geometry';
import { weaponState } from '../world/prefabs';
import type { RunSystem } from './context';

/** Most guns the player carries (keys 1-4). */
export const MAX_SLOTS = 4;
/** How close (px, centre to gun) the player must be to pick a gun up. */
export const PICKUP_RANGE = 14;
const MAX_PICKUPS = 24;

export function spawnPickup(world: World, weapon: AssembledWeapon, x: number, y: number, vx: number, vy: number): void {
  const e = world.create();
  world.add(e, Pickup, { weapon, x, y, vx, vy, angle: 0, spin: vx >= 0 ? 7 : -7, resting: false });
  const all = [...world.query(Pickup)];
  for (let i = 0; i < all.length - MAX_PICKUPS; i++) world.destroy(all[i]![0]);
}

/** The pickup the player would grab right now (closest in range), if any. */
export function nearestPickup(world: World): { e: number; dist: number } | null {
  const p = world.first(Position, Body, PlayerControl);
  if (!p) return null;
  const c = bodyCenter(p[1], p[2]);
  let best: { e: number; dist: number } | null = null;
  for (const [e, g] of world.query(Pickup)) {
    const dist = Math.hypot(g.x - c.x, g.y - (c.y + 6));
    if (dist <= PICKUP_RANGE && (!best || dist < best.dist)) best = { e, dist };
  }
  return best;
}

/**
 * Dropped guns: they tumble to the floor and wait. F next to one takes it: same gun ->
 * a full magazine for the one carried; free slot -> added; full -> swapped with the gun
 * in hand (which is dropped in its place).
 */
export const pickupSystem: RunSystem = {
  name: 'pickups',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    if (dt <= 0) return;
    const grid = ctx.grid;
    const solid = (x: number, y: number) => grid.isSolidAtPixel(x, y) || (grid.atPixel(x, y) === Tile.OneWay && y % TILE < 3);
    for (const [, g] of world.query(Pickup)) {
      if (g.resting) continue;
      g.vy = Math.min(g.vy + PLAYER_TUNING.gravity * dt, PLAYER_TUNING.maxFallSpeed);
      const nx = g.x + g.vx * dt;
      if (solid(nx, g.y)) g.vx = -g.vx * 0.3;
      else g.x = nx;
      const ny = g.y + g.vy * dt;
      if (g.vy > 0 && solid(g.x, ny + 1.5)) {
        g.y = Math.floor((ny + 1.5) / TILE) * TILE - 1.5;
        if (g.vy > 90) {
          g.vy = -g.vy * 0.3;
          g.vx *= 0.5;
        } else {
          g.resting = true;
          g.angle = Math.round(g.angle / Math.PI) * Math.PI;
        }
      } else {
        g.y = ny;
      }
      if (!g.resting) g.angle += g.spin * dt;
    }

    if (!ctx.input.pressed('interact')) return;
    const near = nearestPickup(world);
    const p = world.first(Position, Body, Arsenal, PlayerControl, Health);
    if (!near || !p || p[5].hp <= 0) return;
    const [, pos, body, arsenal, pc] = p;
    const g = world.get(near.e, Pickup)!;
    world.destroy(near.e);

    const same = arsenal.weapons.findIndex((w) => w.weapon.def.id === g.weapon.def.id);
    if (same >= 0) {
      const ws = arsenal.weapons[same]!;
      ws.ammo = ws.weapon.stats.magazine;
      ws.reloadLeft = 0;
      arsenal.active = same;
      return;
    }
    const fresh = weaponState(g.weapon);
    fresh.cooldown = 0.28;
    if (arsenal.weapons.length < MAX_SLOTS) {
      arsenal.weapons.push(fresh);
      arsenal.active = arsenal.weapons.length - 1;
    } else {
      const old = arsenal.weapons[arsenal.active]!;
      const c = bodyCenter(pos, body);
      spawnPickup(world, old.weapon, c.x, c.y, -pc.facing * 40, -120);
      arsenal.weapons[arsenal.active] = fresh;
    }
  },
};
