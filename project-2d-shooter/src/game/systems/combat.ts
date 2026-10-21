import type { Entity } from '@engine/ecs/world';
import { DEG2RAD } from '@engine/math/math';
import type { Rect } from '@engine/math/rect';
import type { Vec2 } from '@engine/math/vec2';
import type { TileGrid } from '@engine/physics/tilegrid';
import type { HumanoidAnimator } from '../character/animator';
import { raycastParts, rigHitParts, type HitPart } from '../character/hitbox';
import { AI, HIT_ZONES, RICOCHET, type HitZone } from '../config';
import { Aim, Arsenal, Body, Faction, Health, Intent, PlayerControl, Position, Projectile, Rig, Velocity, type BodyData } from '../world/components';
import { bodyRect, shoulder } from '../world/geometry';
import { spawnProjectile } from '../world/prefabs';
import type { RunSystem } from './context';
import { applyDamage } from './damage';

/** Mouse aim -> the player's Aim component and facing. */
export const aimSystem: RunSystem = {
  name: 'aim',
  update(world, ctx) {
    for (const [, pos, body, aim, pc, health] of world.query(Position, Body, Aim, PlayerControl, Health)) {
      if (health.hp <= 0) continue;
      const target = ctx.camera.screenToWorldSim(ctx.input.pointer);
      const from = shoulder(pos, body);
      aim.x = target.x;
      aim.y = target.y;
      aim.angle = Math.atan2(target.y - from.y, target.x - from.x);
      if (pc.state !== 'slide') pc.facing = target.x >= from.x ? 1 : -1;
    }
  },
};

/** Weapon switching, reload (from reserve), trigger handling and firing — for anyone with an Intent. */
export const weaponSystem: RunSystem = {
  name: 'weapons',
  update(world, ctx) {
    for (const [e, pos, body, aim, arsenal, faction, intent] of world.query(Position, Body, Aim, Arsenal, Faction, Intent)) {
      const dt = body.playerTime ? ctx.playerDt : ctx.clock.dt;
      const n = arsenal.weapons.length;
      if (n === 0 || dt <= 0) continue;
      const isPlayer = faction.team === 'player';

      if (intent.switchBy !== 0 && n > 1) {
        arsenal.weapons[arsenal.active]!.reloadLeft = 0;
        arsenal.active = (arsenal.active + intent.switchBy + n) % n;
      }

      const ws = arsenal.weapons[arsenal.active]!;
      const { stats, fireMode } = ws.weapon;
      ws.cooldown = Math.max(0, ws.cooldown - dt);
      ws.bloom = Math.max(0, ws.bloom - dt * 2.5);

      const startReload = () => {
        if (ws.reserve <= 0 || ws.ammo >= stats.magazine) return;
        ws.reloadLeft = stats.reloadTime;
      };

      if (ws.reloadLeft > 0) {
        ws.reloadLeft -= dt;
        if (ws.reloadLeft <= 0) {
          ws.reloadLeft = 0;
          const take = Math.min(stats.magazine - ws.ammo, ws.reserve);
          ws.ammo += take;
          ws.reserve -= take;
        }
      } else if (intent.reload) {
        startReload();
      }

      if (fireMode === 'burst' && intent.firePressed && ws.burstLeft === 0) ws.burstLeft = ws.weapon.def.burstCount ?? 3;
      const wantsShot = fireMode === 'auto' ? intent.fireHeld : fireMode === 'burst' ? ws.burstLeft > 0 : intent.firePressed;
      if (!wantsShot || ws.cooldown > 0 || ws.reloadLeft > 0) continue;

      if (ws.ammo <= 0) {
        ws.burstLeft = 0;
        ws.cooldown = 0.25;
        startReload(); // auto-reload on empty click
        continue;
      }

      ws.ammo--;
      ws.cooldown = 1 / stats.fireRate;
      if (ws.burstLeft > 0) ws.burstLeft--;
      const animator = world.get(e, Rig)?.animator;
      let muzzle = muzzlePoint(animator, pos, body, aim.angle);
      // Barrel poking into a wall: fire from the shoulder so the bullet hits that wall, not what's behind it.
      if (ctx.grid.isSolidAtPixel(muzzle.x, muzzle.y)) muzzle = shoulder(pos, body);
      // Converge on the aim point from the barrel (unless it's basically on the gun).
      const toAim = Math.hypot(aim.x - muzzle.x, aim.y - muzzle.y) > 12 ? Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x) : aim.angle;
      const spread = (stats.spreadDeg + ws.bloom * 6) * DEG2RAD;
      for (let i = 0; i < stats.pellets; i++) {
        spawnProjectile(world, faction.team, ws.weapon, muzzle, toAim + ctx.rng.range(-spread, spread), isPlayer ? 1 : AI.damageScale);
      }
      ws.bloom = Math.min(1, ws.bloom + stats.recoil);
      animator?.kick(stats.recoil);
      // Enemies hear the shot (the silencer shrinks `noise` in its stats).
      if (isPlayer) ctx.noises.push({ x: muzzle.x, y: muzzle.y, radius: stats.noise });
    }
  },
};

/** Bullets leave from the rig's gun barrel when there is one, else from just in front of the shoulder. */
function muzzlePoint(animator: HumanoidAnimator | undefined, pos: { x: number; y: number }, body: BodyData, angle: number): Vec2 {
  const local = animator?.muzzleLocal();
  if (animator && local) return { x: pos.x + body.w / 2 + animator.facing * local.x, y: pos.y + body.h + local.y };
  const from = shoulder(pos, body);
  return { x: from.x + Math.cos(angle) * 8, y: from.y + Math.sin(angle) * 8 };
}

/**
 * Which velocity component to flip when a bullet moving (vx, vy) from (x, y) hits the wall at
 * (nx, ny), or null if it should stop. Bounces only at a grazing angle below the limit
 * (angle between the path and the wall surface), unless `always` (ricochet ammo).
 */
export function ricochetAxis(
  grid: TileGrid,
  x: number,
  y: number,
  nx: number,
  ny: number,
  vx: number,
  vy: number,
  always: boolean,
): 'x' | 'y' | null {
  const blockX = grid.isSolidAtPixel(nx, y);
  const blockY = grid.isSolidAtPixel(x, ny);
  // Corner (or diagonal into a tile corner): no clean surface to glance off.
  if (blockX === blockY) return null;
  const axis = blockX ? 'x' : 'y';
  const speed = Math.hypot(vx, vy);
  if (speed === 0) return null;
  const normal = Math.abs(axis === 'x' ? vx : vy);
  const grazeDeg = Math.asin(Math.min(1, normal / speed)) / DEG2RAD;
  return always || grazeDeg < RICOCHET.maxGrazeDeg ? axis : null;
}

/**
 * Where the segment (x0,y0)->(x1,y1) first enters the rect, as a 0..1 fraction of the segment,
 * or null if it misses (slab method).
 */
export function segmentEntersRect(x0: number, y0: number, x1: number, y1: number, r: Rect): number | null {
  let t0 = 0;
  let t1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (const [p, d, lo, hi] of [
    [x0, dx, r.x, r.x + r.w],
    [y0, dy, r.y, r.y + r.h],
  ] as const) {
    if (d === 0) {
      if (p < lo || p > hi) return null;
      continue;
    }
    let a = (lo - p) / d;
    let b = (hi - p) / d;
    if (a > b) [a, b] = [b, a];
    t0 = Math.max(t0, a);
    t1 = Math.min(t1, b);
    if (t0 > t1) return null;
  }
  return t0;
}

/** Fallback for bodies without a rig: region by height inside the collider (top 25% head, bottom 35% legs). */
export function zoneAt(r: Rect, y: number): HitZone {
  const t = (y - r.y) / r.h;
  return t < 0.25 ? 'head' : t > 0.65 ? 'leg' : 'torso';
}

/** Moves bullets: hits on the rig's bones (or the collider), ricochets, pierce and range. */
export const projectileSystem: RunSystem = {
  name: 'projectiles',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    if (dt <= 0) return;
    const targets = [...world.query(Position, Body, Health, Faction)];
    const partsCache = new Map<Entity, HitPart[]>();
    const partsOf = (t: Entity, pos: { x: number; y: number }, body: BodyData): HitPart[] | null => {
      const rig = world.get(t, Rig);
      if (!rig) return null;
      let parts = partsCache.get(t);
      if (!parts) {
        parts = rigHitParts(rig.animator, pos.x + body.w / 2, pos.y + body.h);
        partsCache.set(t, parts);
      }
      return parts;
    };

    for (const [e, pos, vel, proj] of world.query(Position, Velocity, Projectile)) {
      const dist = Math.hypot(vel.x * dt, vel.y * dt);
      const steps = Math.max(1, Math.ceil(dist / 4));
      let alive = true;

      for (let i = 0; i < steps && alive; i++) {
        const nx = pos.x + (vel.x * dt) / steps;
        const ny = pos.y + (vel.y * dt) / steps;
        const angle = Math.atan2(vel.y, vel.x);

        // Characters first (a bullet grazing a wall can still hit someone standing at it).
        for (const [t, tpos, tbody, health, faction] of targets) {
          if (faction.team === proj.team || proj.hit.has(t) || health.hp <= 0 || !world.isAlive(t)) continue;
          const r = bodyRect(tpos, tbody);
          // Broad phase: the collider, slightly inflated (limbs and the gun stick out).
          const pad = 8;
          if (segmentEntersRect(pos.x, pos.y, nx, ny, { x: r.x - pad, y: r.y - pad, w: r.w + pad * 2, h: r.h + pad * 2 }) === null) continue;

          let zone: HitZone;
          let s: number;
          const parts = partsOf(t, tpos, tbody);
          if (parts) {
            const hit = raycastParts(parts, pos.x, pos.y, nx, ny);
            if (!hit) continue;
            zone = hit.zone;
            s = hit.s;
          } else {
            const enter = segmentEntersRect(pos.x, pos.y, nx, ny, r);
            if (enter === null) continue;
            s = enter;
            zone = zoneAt(r, pos.y + (ny - pos.y) * s);
          }

          proj.hit.add(t);
          const at = { x: pos.x + (nx - pos.x) * s, y: pos.y + (ny - pos.y) * s };
          const result = applyDamage(world, ctx, t, {
            amount: proj.damage * HIT_ZONES[zone].multiplier,
            zone,
            at,
            angle,
            from: proj.origin,
            by: proj.team,
          });
          if (result === 'dodged') continue; // passes through a dodging target
          if (proj.piercesLeft > 0) {
            proj.piercesLeft--;
          } else {
            world.destroy(e);
            alive = false;
          }
          break;
        }
        if (!alive) break;

        if (ctx.grid.isSolidAtPixel(nx, ny)) {
          const axis = proj.bouncesLeft > 0 ? ricochetAxis(ctx.grid, pos.x, pos.y, nx, ny, vel.x, vel.y, proj.alwaysRicochet) : null;
          if (axis) {
            if (axis === 'x') vel.x = -vel.x;
            else vel.y = -vel.y;
            proj.bouncesLeft--;
            proj.damage *= RICOCHET.damageKept;
          } else {
            world.destroy(e);
            alive = false;
          }
          break;
        }

        pos.x = nx;
        pos.y = ny;
      }

      proj.distanceLeft -= dist;
      if (alive && proj.distanceLeft <= 0) world.destroy(e);
    }
  },
};
