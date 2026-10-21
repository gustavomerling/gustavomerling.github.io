import type { Entity, World } from '@engine/ecs/world';
import type { Vec2 } from '@engine/math/vec2';
import type { VerletBody } from '@engine/physics/verlet';
import { HumanoidAnimator } from '../character/animator';
import { rigStyle, type RigStyle } from '../character/draw';
import type { HumanoidProportions } from '../character/humanoid';
import { ATTACHMENTS } from '../content/attachments/catalog';
import type { PlayerDef } from '../content/characters/player';
import { ENEMIES } from '../content/enemies/catalog';
import { assembleWeapon, type AssembledWeapon } from '../content/weapons/assemble';
import { WEAPONS } from '../content/weapons/catalog';
import { PLAYER_TUNING, RICOCHET } from '../config';
import {
  Aim,
  Arsenal,
  Body,
  Brain,
  CameraTarget,
  emptyIntent,
  Faction,
  Focus,
  Guard,
  Health,
  Intent,
  Npc,
  PlayerControl,
  Position,
  Projectile,
  Ragdoll,
  Rig,
  SwordState,
  Velocity,
  type BodyData,
  type HealthData,
  type Team,
  type WeaponState,
} from './components';

/** Entity recipes. Systems never assemble entities by hand; they call these. */

const body = (w: number, h: number, extra: Partial<BodyData> = {}): BodyData => ({
  w,
  h,
  gravityScale: 1,
  groundFriction: 0,
  playerTime: false,
  onGround: false,
  onOneWay: false,
  hitWall: false,
  dropTimer: 0,
  climbing: false,
  mantling: false,
  ...extra,
});

const health = (hp: number): HealthData => ({ hp, max: hp, invulnLeft: 0, lastHit: null });

const at = (x: number, y: number) => ({ x, y, prevX: x, prevY: y });

/** Ammo is endless for now (no pickups yet): reloading still takes time. */
export function weaponState(weapon: AssembledWeapon, reserve = Infinity): WeaponState {
  return {
    weapon,
    ammo: weapon.def.infiniteAmmo ? Infinity : weapon.stats.magazine,
    reloadLeft: 0,
    cooldown: 0,
    burstLeft: 0,
    bloom: 0,
    reserve,
  };
}

const guardState = (): { raised: boolean; flash: number; magicLeft: number; magicMax: number; magicCooldownLeft: number } => ({
  raised: false,
  flash: 0,
  magicLeft: 0,
  magicMax: 4,
  magicCooldownLeft: 0,
});

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
    wallJumpLockLeft: 0,
    wallJumpDir: 1,
    wallCoyoteLeft: 0,
    wallSide: 1,
    wallKickLeft: 0,
    takeoffLeft: 0,
    takeoffCut: false,
    fallTopY: feet.y,
    wasGrounded: false,
    rollLeft: 0,
    rollDir: 1,
    kickLeft: 0,
    kickCooldownLeft: 0,
    mantleLeft: 0,
    mantleTotal: 0,
    mantleFromX: 0,
    mantleFromY: 0,
    mantleToX: 0,
    mantleToY: 0,
    mantleLedgeX: 0,
    mantleLedgeY: 0,
    mantleDir: 1,
    mantleCooldownLeft: 0,
  });
  world.add(e, Aim, { x: feet.x + 32, y: feet.y - h / 2, angle: 0 });
  world.add(e, Intent, emptyIntent());
  world.add(e, Faction, { team: 'player' });
  world.add(e, Health, health(def.maxHp));
  world.add(e, Focus, { value: 1 });
  world.add(e, Guard, guardState());
  world.add(e, SwordState, {
    lastX: feet.x + 32,
    lastY: feet.y - h / 2,
    speed: 0,
    cooldownLeft: 0,
    swingLeft: 0,
    swingTotal: 0.18,
    swingAngle: 0,
    hit: new Set<number>(),
  });
  world.add(e, Arsenal, {
    weapons: def.startingWeapons.map((w) =>
      weaponState(assembleWeapon(WEAPONS.get(w.weaponId), w.attachments.map((id) => ATTACHMENTS.get(id)))),
    ),
    active: 0,
  });
  world.add(e, CameraTarget, { lookahead: 0.22 });
  world.add(e, Rig, { animator: new HumanoidAnimator(h), style: rigStyle('#f2f2f2') });
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
    downed: false,
    idleLeft: 1 + (feet.x % 3),
  });
  if (def.weaponId) world.add(e, Arsenal, { weapons: [weaponState(assembleWeapon(WEAPONS.get(def.weaponId)))], active: 0 });
  if (def.shield) world.add(e, Guard, guardState());
  world.add(e, Rig, {
    animator: new HumanoidAnimator(def.size.h),
    style: rigStyle(def.color, { skeleton: def.skeleton, shield: def.shield }),
  });
  return e;
}

export function spawnProjectile(
  world: World,
  team: Team,
  weapon: AssembledWeapon,
  origin: Vec2,
  angle: number,
  damageScale = 1,
  speedScale = 1,
  shot?: { hit: boolean },
): Entity {
  const e = world.create();
  const s = weapon.stats;
  const kind = weapon.def.projectileKind ?? 'bullet';
  const ricochetAmmo = weapon.behaviors.has('ricochet');
  world.add(e, Position, at(origin.x, origin.y));
  const speed = s.projectileSpeed * speedScale;
  world.add(e, Velocity, { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed });
  world.add(e, Projectile, {
    team,
    damage: s.damage * damageScale,
    distanceLeft: s.range,
    kind,
    explosionRadius: weapon.def.explosionRadius ?? 0,
    behaviors: weapon.behaviors,
    bouncesLeft: kind === 'bullet' ? (ricochetAmmo ? RICOCHET.ricochetAmmoBounces : RICOCHET.bounces) : 0,
    alwaysRicochet: ricochetAmmo,
    power: s.penetration,
    hit: new Set<number>(),
    origin: { ...origin },
    shot,
  });
  return e;
}

export function spawnRagdoll(world: World, verlet: VerletBody, props: HumanoidProportions, style: RigStyle): Entity {
  const e = world.create();
  world.add(e, Ragdoll, { body: verlet, props, style, age: 0 });
  return e;
}
