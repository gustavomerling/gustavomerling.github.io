import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { VerletBody } from '@engine/physics/verlet';
import { Tile } from '@engine/physics/tilegrid';
import { HumanoidAnimator } from '../character/animator';
import { rigStyle, type RigStyle } from '../character/draw';
import type { HumanoidProportions } from '../character/humanoid';
import { ATTACHMENTS } from '../content/attachments/catalog';
import type { PlayerDef } from '../content/characters/player';
import { ENEMIES } from '../content/enemies/catalog';
import { assembleWeapon, type AssembledWeapon } from '../content/weapons/assemble';
import { WEAPONS } from '../content/weapons/catalog';
import { PICKUPS, PLAYER_TUNING, PROPS, RICOCHET, TILE } from '../config';
import type { RunContext } from '../systems/context';
import {
  Aim,
  Arsenal,
  Body,
  Brain,
  Breakable,
  CameraTarget,
  Effect,
  emptyIntent,
  Faction,
  Focus,
  Hazard,
  Health,
  Intent,
  Npc,
  Pickup,
  PlayerControl,
  Position,
  Projectile,
  Ragdoll,
  Rig,
  Smoke,
  Thrown,
  Velocity,
  Visual,
  Wallet,
  type BodyData,
  type BreakableKind,
  type HazardKind,
  type HealthData,
  type PickupKind,
  type Team,
  type WeaponState,
} from './components';

/** Entity recipes. Systems never assemble entities by hand; they call these. */

const body = (w: number, h: number, extra: Partial<BodyData> = {}): BodyData => ({
  w,
  h,
  gravityScale: 1,
  bounce: 0,
  groundFriction: 0,
  playerTime: false,
  onGround: false,
  onOneWay: false,
  hitWall: false,
  dropTimer: 0,
  ...extra,
});

const health = (hp: number): HealthData => ({ hp, max: hp, stunLeft: 0, invulnLeft: 0, lastHit: null });

const at = (x: number, y: number) => ({ x, y, prevX: x, prevY: y });

export function weaponState(weapon: AssembledWeapon, reserve = weapon.stats.magazine * PICKUPS.startingReserveMagazines): WeaponState {
  return { weapon, ammo: weapon.stats.magazine, reloadLeft: 0, cooldown: 0, burstLeft: 0, bloom: 0, reserve };
}

/** `feet` = bottom-centre position. */
export function spawnPlayer(world: World, def: PlayerDef, feet: Vec2): Entity {
  const e = world.create();
  const w = PLAYER_TUNING.width;
  const h = PLAYER_TUNING.standHeight;
  world.add(e, Position, at(feet.x - w / 2, feet.y - h));
  world.add(e, Velocity, { x: 0, y: 0 });
  world.add(e, Body, body(w, h, { playerTime: true }));
  world.add(e, PlayerControl, {
    state: 'idle',
    facing: 1,
    coyoteLeft: 0,
    jumpBufferLeft: 0,
    slideLeft: 0,
    slideCooldownLeft: 0,
    slideDir: 1,
    slideQueued: false,
  });
  world.add(e, Aim, { x: feet.x + 32, y: feet.y - h / 2, angle: 0 });
  world.add(e, Intent, emptyIntent());
  world.add(e, Faction, { team: 'player' });
  world.add(e, Health, health(def.maxHp));
  world.add(e, Wallet, { money: 0 });
  world.add(e, Focus, { value: 1 });
  world.add(e, Arsenal, {
    weapons: def.startingWeapons.map((w) =>
      weaponState(assembleWeapon(WEAPONS.get(w.weaponId), w.attachments.map((id) => ATTACHMENTS.get(id)))),
    ),
    active: 0,
    items: def.startingItems.map((i) => ({ ...i })),
    activeItem: 0,
  });
  world.add(e, CameraTarget, { lookahead: 0.22 });
  world.add(e, Visual, { kind: 'box', color: '#ffffff' });
  world.add(e, Rig, { animator: new HumanoidAnimator(h), style: rigStyle('#ffffff') });
  return e;
}

/** Enemy: body, health, rig, AI brain and (for shooters) a gun with endless reserve ammo. */
export function spawnEnemy(world: World, enemyId: string, feet: Vec2, facing: 1 | -1 = -1): Entity {
  const def = ENEMIES.get(enemyId);
  const e = world.create();
  world.add(e, Position, at(feet.x - def.size.w / 2, feet.y - def.size.h));
  world.add(e, Velocity, { x: 0, y: 0 });
  world.add(e, Body, body(def.size.w, def.size.h, { groundFriction: 900 }));
  world.add(e, Faction, { team: 'enemy' });
  world.add(e, Health, health(def.hp));
  world.add(e, Npc, { defId: def.id });
  world.add(e, Aim, { x: feet.x + facing * 32, y: feet.y - def.size.h * 0.65, angle: facing > 0 ? 0 : Math.PI });
  world.add(e, Intent, emptyIntent());
  world.add(e, Brain, {
    facing,
    alert: 0,
    seeTime: 0,
    lastSeen: null,
    burstLeft: 0,
    pauseLeft: 0,
    lastAmmo: 0,
    windupLeft: 0,
    cooldownLeft: 0,
    staggerLeft: 0,
    crouching: false,
    idleLeft: 1 + (feet.x % 3),
  });
  if (def.weaponId) {
    world.add(e, Arsenal, { weapons: [weaponState(assembleWeapon(WEAPONS.get(def.weaponId)), Infinity)], active: 0, items: [], activeItem: 0 });
  }
  world.add(e, Visual, { kind: 'box', color: def.debugColor });
  world.add(e, Rig, { animator: new HumanoidAnimator(def.size.h), style: rigStyle(def.debugColor) });
  return e;
}

export function spawnProjectile(
  world: World,
  team: Team,
  weapon: AssembledWeapon,
  origin: Vec2,
  angle: number,
  damageScale = 1,
): Entity {
  const e = world.create();
  const s = weapon.stats;
  const ricochetAmmo = weapon.behaviors.has('ricochet');
  world.add(e, Position, at(origin.x, origin.y));
  world.add(e, Velocity, { x: Math.cos(angle) * s.projectileSpeed, y: Math.sin(angle) * s.projectileSpeed });
  world.add(e, Projectile, {
    team,
    damage: s.damage * damageScale,
    distanceLeft: s.range,
    behaviors: weapon.behaviors,
    bouncesLeft: ricochetAmmo ? RICOCHET.ricochetAmmoBounces : RICOCHET.bounces,
    alwaysRicochet: ricochetAmmo,
    piercesLeft: weapon.behaviors.has('pierce') ? 1 : 0,
    hit: new Set<number>(),
    origin: { ...origin },
  });
  world.add(e, Visual, { kind: 'trail', color: team === 'player' ? '#fff6a0' : '#ff7a7a', length: 12 });
  return e;
}

export function spawnThrown(world: World, itemId: string, fuse: number, origin: Vec2, velocity: Vec2): Entity {
  const e = world.create();
  world.add(e, Position, at(origin.x - 2, origin.y - 2));
  world.add(e, Velocity, { ...velocity });
  world.add(e, Body, body(4, 4, { bounce: 0.45, groundFriction: 420 }));
  world.add(e, Thrown, { itemId, fuseLeft: fuse });
  world.add(e, Visual, { kind: 'box', color: itemId === 'flashbang' ? '#e6e6ff' : '#9be36b', fill: '#000' });
  return e;
}

/** Something to collect. `velocity` pops it out of the corpse/crate. */
export function spawnPickup(world: World, kind: PickupKind, center: Vec2, amount: number, velocity: Vec2, weapon?: WeaponState): Entity {
  const e = world.create();
  const size = kind === 'weapon' ? { w: 10, h: 4 } : { w: 5, h: 5 };
  world.add(e, Position, at(center.x - size.w / 2, center.y - size.h / 2));
  world.add(e, Velocity, { ...velocity });
  world.add(e, Body, body(size.w, size.h, { bounce: 0.3, groundFriction: 500 }));
  world.add(e, Pickup, { kind, amount, weapon, age: 0 });
  return e;
}

/**
 * Tile-aligned destructible (crate, door, barrel). Its tiles become Breakable so movement,
 * bullets and line of sight treat it as a wall until it breaks.
 * `col,row` = bottom-left tile.
 */
export function spawnBreakable(world: World, ctx: Pick<RunContext, 'grid' | 'breakables'>, kind: BreakableKind, col: number, row: number): Entity {
  const def = PROPS[kind];
  const e = world.create();
  const tiles: number[] = [];
  for (let r = row - def.h + 1; r <= row; r++) {
    for (let c = col; c < col + def.w; c++) {
      ctx.grid.set(c, r, Tile.Breakable);
      const idx = ctx.grid.index(c, r);
      tiles.push(idx);
      ctx.breakables.set(idx, e);
    }
  }
  world.add(e, Position, at(col * TILE, (row - def.h + 1) * TILE));
  world.add(e, Breakable, { kind, tiles, w: def.w * TILE, h: def.h * TILE });
  world.add(e, Health, health(def.hp));
  return e;
}

/**
 * Non-blocking props that react to bullets. Lamps hang from the ceiling (fall when shot),
 * extinguishers sit on walls (burst into a smoke cloud). They're `neutral`: anyone can hit them.
 */
export function spawnHazard(world: World, kind: HazardKind, center: Vec2): Entity {
  const e = world.create();
  const size = kind === 'lamp' ? { w: 10, h: 4 } : { w: 4, h: 7 };
  world.add(e, Position, at(center.x - size.w / 2, center.y - size.h / 2));
  world.add(e, Velocity, { x: 0, y: 0 });
  world.add(e, Body, body(size.w, size.h, { gravityScale: 0 }));
  world.add(e, Faction, { team: 'neutral' });
  world.add(e, Health, health(PROPS[kind].hp));
  world.add(e, Hazard, { kind, triggered: false });
  return e;
}

export function spawnSmoke(world: World, center: Vec2, radius: number, life: number): Entity {
  const e = world.create();
  world.add(e, Position, at(center.x, center.y));
  world.add(e, Smoke, { radius, life });
  return e;
}

export function spawnRagdoll(world: World, verlet: VerletBody, props: HumanoidProportions, style: RigStyle): Entity {
  const e = world.create();
  world.add(e, Ragdoll, { body: verlet, props, style, age: 0 });
  return e;
}

export function spawnEffect(
  world: World,
  kind: 'ring' | 'flash',
  center: Vec2,
  radius: number,
  life: number,
  color: string,
  intensity = 1,
): Entity {
  const e = world.create();
  world.add(e, Position, at(center.x, center.y));
  world.add(e, Effect, { kind, life, maxLife: life, radius, color, intensity });
  return e;
}

/** Floating damage number (or short word like "esquiva"). */
export function spawnDamageNumber(world: World, at_: Vec2, text: string, color: string): Entity {
  const e = world.create();
  world.add(e, Position, at(at_.x, at_.y));
  world.add(e, Effect, { kind: 'text', life: 0.8, maxLife: 0.8, radius: 0, color, text });
  return e;
}
