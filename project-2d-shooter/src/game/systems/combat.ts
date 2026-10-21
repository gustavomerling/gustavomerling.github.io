import type { Entity } from '@engine/ecs/world';
import { clamp, DEG2RAD } from '@engine/math/math';
import { segmentDistance } from '@engine/math/segment';
import type { Rect } from '@engine/math/rect';
import type { Vec2 } from '@engine/math/vec2';
import type { TileGrid } from '@engine/physics/tilegrid';
import type { HumanoidAnimator } from '../character/animator';
import { raycastParts, rigHitParts, type HitPart } from '../character/hitbox';
import { AI, BALLISTICS, HIT_ZONES, IMPACT, RICOCHET, type HitZone } from '../config';
import { Aim, Arsenal, Body, Brain, Faction, Guard, Health, Intent, PlayerControl, Position, Projectile, Ragdoll, Rig, Velocity, type BodyData, type PlayerState, type ProjectileData } from '../world/components';
import { GUN_MODELS, withAttachments } from '../content/weapons/models';
import { bodyCenter, bodyRect, shoulder } from '../world/geometry';
import { spawnProjectile } from '../world/prefabs';
import type { RunSystem } from './context';
import { applyDamage } from './damage';
import { dropSlug, spawnBlood, spawnExplosion, spawnImpact, spawnShieldFx, spawnShotFx } from './effects';

/** Moves that set the facing themselves (the mouse can't turn the body mid-move). */
const FACING_LOCKED: ReadonlySet<PlayerState> = new Set(['roll', 'mantle', 'wallSlide']);
/** A bullet passing this close (px, box around the body centre) suppresses an enemy. */
const SUPPRESS_RADIUS = 16;
/** Seconds after a weapon swap before the new gun can fire (matches the swap animation). */
const SWITCH_DELAY = 0.28;
/** Both hands busy (or the gun slung): no shooting. */
const HANDS_BUSY: ReadonlySet<PlayerState> = new Set(['climb', 'mantle', 'roll']);

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
      if (!FACING_LOCKED.has(pc.state)) pc.facing = target.x >= from.x ? 1 : -1;
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

      const next = intent.select >= 0 && intent.select < n ? intent.select : (arsenal.active + intent.switchBy + n) % n;
      if (next !== arsenal.active) {
        arsenal.weapons[arsenal.active]!.reloadLeft = 0;
        arsenal.active = next;
        const drawn = arsenal.weapons[next]!;
        drawn.cooldown = Math.max(drawn.cooldown, SWITCH_DELAY);
      }

      const ws = arsenal.weapons[arsenal.active]!;
      const { stats, fireMode } = ws.weapon;
      ws.cooldown = Math.max(0, ws.cooldown - dt);
      ws.bloom = Math.max(0, ws.bloom - dt * 2.5);
      // Sword, shield and magic are driven by the medieval system; they never fire bullets here.
      const { behaviors } = ws.weapon;
      if (behaviors.has('cursorSwing') || behaviors.has('shield') || behaviors.has('magicShield')) continue;

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

      const state = world.get(e, PlayerControl)?.state;
      if (state && HANDS_BUSY.has(state)) continue;

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
      if (isPlayer) ctx.stats.shots++;
      const shot = { hit: false };
      if (ws.burstLeft > 0) ws.burstLeft--;
      const animator = world.get(e, Rig)?.animator;
      let muzzle = muzzlePoint(animator, pos, body, aim.angle);
      // Barrel poking into a wall: fire from the shoulder so the bullet hits that wall, not what's behind it.
      if (ctx.grid.isSolidAtPixel(muzzle.x, muzzle.y)) muzzle = shoulder(pos, body);
      // Converge on the aim point from the barrel (unless it's basically on the gun).
      const toAim = Math.hypot(aim.x - muzzle.x, aim.y - muzzle.y) > 12 ? Math.atan2(aim.y - muzzle.y, aim.x - muzzle.x) : aim.angle;
      const spread = (stats.spreadDeg + ws.bloom * 6) * DEG2RAD;
      const damageScale = isPlayer ? 1 : AI.damageScale;
      if (stats.pellets <= 1) {
        spawnProjectile(world, faction.team, ws.weapon, muzzle, toAim + ctx.rng.range(-spread, spread), damageScale, 1, shot);
      } else {
        // Shotgun: pellets fanned evenly across the spread (with jitter) and at slightly different speeds.
        const lane = (spread * 2) / stats.pellets;
        for (let i = 0; i < stats.pellets; i++) {
          const angle = toAim - spread + lane * (i + 0.5) + ctx.rng.range(-lane / 2, lane / 2);
          spawnProjectile(world, faction.team, ws.weapon, muzzle, angle, damageScale, ctx.rng.range(0.85, 1.05), shot);
        }
      }
      ws.bloom = Math.min(1, ws.bloom + stats.recoil);
      animator?.kick(stats.recoil);
      const gun = withAttachments(GUN_MODELS.get(ws.weapon.def.model), ws.weapon.attachments.map((a) => a.id));
      spawnShotFx(world, muzzle.x, muzzle.y, toAim, gun.flash * (body.h / 24), Math.random);
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

/** Fireball blast: damages everyone but the projectile's team, weaker with distance. */
function explodeProjectile(world: Parameters<RunSystem['update']>[0], ctx: Parameters<RunSystem['update']>[1], proj: ProjectileData, at: Vec2): void {
  const radius = proj.explosionRadius;
  if (radius <= 0) return;
  spawnExplosion(world, at.x, at.y, radius);
  for (const [t, tpos, tbody, health, faction] of [...world.query(Position, Body, Health, Faction)]) {
    if (faction.team === proj.team || health.hp <= 0 || proj.hit.has(t)) continue;
    const center = bodyCenter(tpos, tbody);
    const dist = Math.hypot(center.x - at.x, center.y - at.y);
    if (dist > radius + tbody.w / 2) continue;
    const falloff = 1 - 0.65 * clamp(dist / radius, 0, 1);
    const angle = Math.atan2(center.y - at.y, center.x - at.x);
    const result = applyDamage(world, ctx, t, {
      amount: proj.damage * falloff,
      zone: 'torso',
      at: center,
      angle,
      from: { ...at },
      by: proj.team,
      knockback: 160 * falloff,
    });
    if (result === 'blocked') spawnShieldFx(world, center.x, center.y, angle, (world.get(t, Guard)?.magicLeft ?? 0) > 0);
    else spawnBlood(world, center.x, center.y, angle, proj.damage * falloff * 0.5, false);
  }
}

/**
 * Moves bullets: hits on the rig's bones (or the collider), blood, going through bodies
 * (spending penetration, then dropping), wall impacts, ricochets and range.
 */
export const projectileSystem: RunSystem = {
  name: 'projectiles',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    if (dt <= 0) return;
    const targets = [...world.query(Position, Body, Health, Faction)];
    // Ragdolls get an id in the bullet's `hit` set too (offset so they never clash with entity ids).
    const ragdolls = [...world.query(Ragdoll)].map(([re, rag]) => [re, { body: rag.body, id: -1 - re }] as const);
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
          let cost: number | null = null;
          const parts = partsOf(t, tpos, tbody);
          if (parts) {
            const hit = raycastParts(parts, pos.x, pos.y, nx, ny);
            if (!hit) continue;
            zone = hit.zone;
            s = hit.s;
            // Crossing the body costs every part on the bullet's line (an arm in front of the chest too).
            const hx = pos.x + (nx - pos.x) * s;
            const hy = pos.y + (ny - pos.y) * s;
            const crossed = new Set<HitZone>();
            for (const part of parts) {
              const { dist } = segmentDistance(hx, hy, hx + Math.cos(angle) * 30, hy + Math.sin(angle) * 30, part.x0, part.y0, part.x1, part.y1);
              if (dist <= part.radius) crossed.add(part.zone);
            }
            cost = [...crossed].reduce((sum, z) => sum + BALLISTICS.partCost[z], 0);
          } else {
            const enter = segmentEntersRect(pos.x, pos.y, nx, ny, r);
            if (enter === null) continue;
            s = enter;
            zone = zoneAt(r, pos.y + (ny - pos.y) * s);
          }

          proj.hit.add(t);
          const at = { x: pos.x + (nx - pos.x) * s, y: pos.y + (ny - pos.y) * s };
          const amount = proj.damage * HIT_ZONES[zone].multiplier;
          const result = applyDamage(world, ctx, t, {
            amount,
            zone,
            at,
            angle,
            from: proj.origin,
            by: proj.team,
            knockback:
              zone === 'head' ? Math.min(IMPACT.maxKnockback, amount * IMPACT.knockbackPerDamage * BALLISTICS.headshotKnock) : undefined,
          });
          if (result === 'dodged') continue; // passes through a dodging target
          if (result === 'blocked') {
            spawnShieldFx(world, at.x, at.y, angle, (world.get(t, Guard)?.magicLeft ?? 0) > 0);
            if (proj.kind === 'fireball') explodeProjectile(world, ctx, proj, at);
            world.destroy(e);
            alive = false;
            break;
          }
          if (proj.team === 'player' && proj.shot && !proj.shot.hit) {
            proj.shot.hit = true;
            ctx.stats.hits++;
          }

          // Through the body: spend penetration; the rest carries on weaker, or the bullet drops.
          // Arrows and fireballs always stop at the first body.
          proj.power -= cost ?? BALLISTICS.partCost[zone];
          const through = proj.power > 0 && proj.kind === 'bullet';
          spawnBlood(world, at.x, at.y, angle, amount, through);
          if (through) {
            proj.damage *= BALLISTICS.damageKept;
            vel.x *= BALLISTICS.speedKept;
            vel.y *= BALLISTICS.speedKept;
          } else {
            if (proj.kind === 'fireball') explodeProjectile(world, ctx, proj, at);
            else if (proj.kind === 'bullet') dropSlug(world, at.x, at.y, vel.x * 0.08, vel.y * 0.08);
            world.destroy(e);
            alive = false;
          }
          break;
        }
        if (!alive) break;

        // Dead bodies: the bullet shoves the nearest joint, draws blood and loses power going through.
        for (const [, rag] of ragdolls) {
          if (proj.hit.has(rag.id)) continue;
          const b = rag.body;
          let hitPoint = -1;
          for (let k = 0; k < b.size; k++) {
            if (segmentDistance(pos.x, pos.y, nx, ny, b.x[k]!, b.y[k]!, b.x[k]!, b.y[k]!).dist <= 2.2) {
              hitPoint = k;
              break;
            }
          }
          if (hitPoint < 0) continue;
          proj.hit.add(rag.id);
          const push = Math.min(260, proj.damage * 8);
          b.addVelocity(hitPoint, Math.cos(angle) * push, Math.sin(angle) * push - 40, Math.max(dt, 1 / 120));
          proj.power -= BALLISTICS.partCost.torso;
          spawnBlood(world, b.x[hitPoint]!, b.y[hitPoint]!, angle, proj.damage * 0.5, proj.power > 0);
          if (proj.power <= 0) {
            dropSlug(world, b.x[hitPoint]!, b.y[hitPoint]!, vel.x * 0.08, vel.y * 0.08);
            world.destroy(e);
            alive = false;
          }
          break;
        }
        if (!alive) break;

        if (ctx.grid.isSolidAtPixel(nx, ny)) {
          const axis = proj.bouncesLeft > 0 ? ricochetAxis(ctx.grid, pos.x, pos.y, nx, ny, vel.x, vel.y, proj.alwaysRicochet) : null;
          if (proj.kind === 'fireball') explodeProjectile(world, ctx, proj, { x: pos.x, y: pos.y });
          // Where it struck: the last free point, and the surface it faces.
          const wallX = ctx.grid.isSolidAtPixel(nx, pos.y);
          spawnImpact(world, pos.x, pos.y, angle, wallX ? 'x' : 'y', !axis);
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

        // Near misses: a bullet whizzing past makes enemies flinch, duck and turn to the shooter.
        if (proj.team === 'player' && i === steps - 1) {
          for (const [t, tpos, tbody, health, faction] of targets) {
            if (faction.team === proj.team || proj.hit.has(t) || health.hp <= 0) continue;
            const brain = world.get(t, Brain);
            if (!brain) continue;
            const cx = tpos.x + tbody.w / 2;
            const cy = tpos.y + tbody.h / 2;
            if (Math.abs(nx - cx) > SUPPRESS_RADIUS || Math.abs(ny - cy) > SUPPRESS_RADIUS) continue;
            brain.alert = AI.memory;
            if (brain.seeTime === 0) brain.lastSeen = { ...proj.origin };
            brain.pauseLeft = Math.max(brain.pauseLeft, 0.35);
            brain.crouching = true;
          }
        }
      }

      proj.distanceLeft -= dist;
      // Out of range: the spent bullet falls instead of vanishing.
      if (alive && proj.distanceLeft <= 0) {
        if (proj.kind === 'fireball') explodeProjectile(world, ctx, proj, { x: pos.x, y: pos.y });
        else if (proj.kind === 'bullet') dropSlug(world, pos.x, pos.y, vel.x * 0.1, vel.y * 0.1);
        world.destroy(e);
      }
    }
  },
};
