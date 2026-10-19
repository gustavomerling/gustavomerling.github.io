import type { Entity } from '@engine/ecs/world';
import { DEG2RAD } from '@engine/math/math';
import type { Vec2 } from '@engine/math/vec2';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import type { HumanoidAnimator } from '../character/animator';
import { raycastParts, rigHitParts, type HitPart } from '../character/hitbox';
import { ITEMS } from '../content/items/catalog';
import { AI, HIT_ZONES, RICOCHET, type HitZone } from '../config';
import { fx } from '../fx/emitters';
import {
  Aim,
  Arsenal,
  Body,
  CameraTarget,
  Faction,
  Health,
  Intent,
  PlayerControl,
  Position,
  Projectile,
  Rig,
  Thrown,
  Velocity,
  type BodyData,
} from '../world/components';
import { bodyCenter, bodyRect, shoulder } from '../world/geometry';
import { spawnEffect, spawnProjectile, spawnThrown } from '../world/prefabs';
import type { RunSystem } from './context';
import { applyDamage } from './damage';
import { explode } from './explosions';

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
        ctx.sfx.switchWeapon();
      }

      const ws = arsenal.weapons[arsenal.active]!;
      const { stats, fireMode } = ws.weapon;
      ws.cooldown = Math.max(0, ws.cooldown - dt);
      ws.bloom = Math.max(0, ws.bloom - dt * 2.5);

      const startReload = () => {
        if (ws.reserve <= 0 || ws.ammo >= stats.magazine) return;
        ws.reloadLeft = stats.reloadTime;
        if (isPlayer) ctx.sfx.reloadStart();
      };

      if (ws.reloadLeft > 0) {
        ws.reloadLeft -= dt;
        if (ws.reloadLeft <= 0) {
          ws.reloadLeft = 0;
          const take = Math.min(stats.magazine - ws.ammo, ws.reserve);
          ws.ammo += take;
          ws.reserve -= take;
          if (isPlayer) ctx.sfx.reloadEnd();
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
        if (isPlayer) ctx.sfx.dryFire();
        startReload(); // auto-reload on empty click (if there's reserve)
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

      // Feel: flash, smoke, brass, sound, kick.
      const silenced = ws.weapon.behaviors.has('silenced');
      const cls = ws.weapon.def.weaponClass;
      fx.muzzleFlash(ctx.particles, muzzle, toAim, cls, silenced);
      const sh = shoulder(pos, body);
      fx.casing(ctx.particles, { x: (sh.x + muzzle.x) / 2, y: (sh.y + muzzle.y) / 2 - 1 }, animator?.facing ?? (Math.cos(toAim) >= 0 ? 1 : -1));
      ctx.sfx.gunshot(cls, silenced, isPlayer, ctx.clock.scale);
      ws.bloom = Math.min(1, ws.bloom + stats.recoil);
      animator?.kick(stats.recoil);
      if (world.has(e, CameraTarget)) {
        ctx.camera.addTrauma(stats.recoil * 0.6);
        ctx.camera.kick(-Math.cos(toAim) * stats.recoil * 6, -Math.sin(toAim) * stats.recoil * 6);
      }
      if (isPlayer) ctx.noises.push({ x: muzzle.x, y: muzzle.y, radius: stats.noise });
    }
  },
};

/** Bullets leave from the rig's gun barrel when there is one, else from the shoulder. */
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

/** Moves bullets: body-part hits on rigs, props, breakables, ricochets, pierce and range. */
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

        // Characters/props first (a bullet grazing a wall can still hit someone standing at it).
        for (const [t, tpos, tbody, health, faction] of targets) {
          if (faction.team === proj.team || proj.hit.has(t) || health.hp <= 0 || !world.isAlive(t)) continue;
          const r = bodyRect(tpos, tbody);
          // Broad phase: segment bounds vs a slightly inflated collider (limbs/gun stick out).
          const pad = 8;
          if (Math.max(pos.x, nx) < r.x - pad || Math.min(pos.x, nx) > r.x + r.w + pad) continue;
          if (Math.max(pos.y, ny) < r.y - pad || Math.min(pos.y, ny) > r.y + r.h + pad) continue;

          let zone: HitZone;
          let s = 1;
          const parts = partsOf(t, tpos, tbody);
          if (parts) {
            const hit = raycastParts(parts, pos.x, pos.y, nx, ny);
            if (!hit) continue;
            zone = hit.zone;
            s = hit.s;
          } else {
            if (!(nx >= r.x - 1 && nx < r.x + r.w + 1 && ny >= r.y - 1 && ny < r.y + r.h + 1)) continue;
            zone = 'torso';
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
          const breakable = ctx.grid.atPixel(nx, ny) === Tile.Breakable ? ctx.breakables.get(tileIndex(ctx.grid, nx, ny)) : undefined;
          if (breakable !== undefined) {
            // Wood soaks the bullet.
            applyDamage(world, ctx, breakable, { amount: proj.damage, zone: 'torso', at: { x: pos.x, y: pos.y }, angle, by: proj.team });
            world.destroy(e);
            alive = false;
            break;
          }
          const axis = proj.bouncesLeft > 0 ? ricochetAxis(ctx.grid, pos.x, pos.y, nx, ny, vel.x, vel.y, proj.alwaysRicochet) : null;
          if (axis) {
            if (axis === 'x') vel.x = -vel.x;
            else vel.y = -vel.y;
            proj.bouncesLeft--;
            proj.damage *= RICOCHET.damageKept;
            fx.ricochet(ctx.particles, pos);
            ctx.sfx.ricochet(ctx.clock.scale);
          } else {
            fx.wallImpact(ctx.particles, pos, angle);
            ctx.sfx.wallHit(ctx.clock.scale);
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

const tileIndex = (grid: TileGrid, x: number, y: number) => grid.index(Math.floor(x / grid.tileSize), Math.floor(y / grid.tileSize));

/** Throwing (grenade/flashbang), fuses and their effects. */
export const throwableSystem: RunSystem = {
  name: 'throwables',
  update(world, ctx) {
    for (const [, pos, body, aim, arsenal, intent] of world.query(Position, Body, Aim, Arsenal, Intent)) {
      if (arsenal.items.length === 0) continue;
      if (intent.nextItem) arsenal.activeItem = (arsenal.activeItem + 1) % arsenal.items.length;
      const slot = arsenal.items[arsenal.activeItem]!;
      if (!intent.throwPressed || slot.count <= 0) continue;
      slot.count--;
      const def = ITEMS.get(slot.itemId);
      const from = shoulder(pos, body);
      const v = { x: Math.cos(aim.angle) * def.throwSpeed, y: Math.sin(aim.angle) * def.throwSpeed - 60 };
      spawnThrown(world, def.id, def.fuseSeconds, from, v);
      ctx.sfx.whoosh();
    }

    const dt = ctx.clock.dt;
    const player = world.first(Position, Body, PlayerControl);
    for (const [e, pos, thrown] of world.query(Position, Thrown)) {
      thrown.fuseLeft -= dt;
      if (thrown.fuseLeft > 0) continue;
      const def = ITEMS.get(thrown.itemId);
      const center = { x: pos.x + 2, y: pos.y + 2 };

      if (def.effect === 'explosion') {
        // Grenades don't hurt the player (decision still open, see docs).
        explode(world, ctx, center, def.radius, def.damage, { hurtsPlayer: false, by: 'player' });
      } else {
        for (const [, tpos, tbody, health, faction] of world.query(Position, Body, Health, Faction)) {
          if (faction.team !== 'enemy') continue;
          const c = bodyCenter(tpos, tbody);
          if (Math.hypot(c.x - center.x, c.y - center.y) <= def.radius) health.stunLeft = Math.max(health.stunLeft, def.stunSeconds);
        }
        ctx.noises.push({ x: center.x, y: center.y, radius: 400 });
        spawnEffect(world, 'ring', center, def.radius, 0.25, '#ffffff');
        const p = player ? bodyCenter(player[1], player[2]) : null;
        if (p && Math.hypot(p.x - center.x, p.y - center.y) < def.radius * 1.5) spawnEffect(world, 'flash', center, 0, 0.6, '#ffffff');
        ctx.sfx.flashbang();
      }
      world.destroy(e);
    }
  },
};
