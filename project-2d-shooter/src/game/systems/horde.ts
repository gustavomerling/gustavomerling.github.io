import type { Entity, World } from '@engine/ecs/world';
import { clamp, lerp } from '@engine/math/math';
import type { Vec2 } from '@engine/math/vec2';
import { AI } from '../config';
import { ENEMIES, type ZombieTraits } from '../content/enemies/catalog';
import type { HordeDef, HordeEnemy, Ramp } from '../content/modes/catalog';
import { Arsenal, Body, Brain, Health, Npc, PlayerControl, Position, Zombie } from '../world/components';
import { spawnEnemy } from '../world/prefabs';
import type { HordeState, RunContext, RunSystem } from './context';
import { zombieBurst } from './zombies';

/** Spawns never land this close (px) to a living zombie (no stacks at birth). */
const SPAWN_CLEARANCE = 20;
/** Spawns stay this far (px) outside the camera view. */
const VIEW_MARGIN = 24;
/** Members of a group still waiting when a surge ends are dropped (the breather is real). */
const MAX_QUEUE = 6;

export function createHordeState(def: HordeDef, spots: Vec2[]): HordeState {
  return {
    def,
    spots,
    phase: 'calm',
    timer: def.firstSurge,
    warning: false,
    wave: 0,
    intensity: 0,
    alive: 0,
    maxAlive: Math.round(def.maxAlive.start),
    grabbed: false,
    struggle: 0,
  };
}

/** Bookkeeping that the HUD has no use for. */
interface Inner {
  elapsed: number;
  groupTimer: number;
  queue: number;
  queueTimer: number;
  /** Ammo: reserves set once, then refilled per kill. */
  armed: boolean;
  kills: number;
  /** Last position of every zombie that bursts on death (the burst happens where it died). */
  bursters: Map<Entity, { at: Vec2; traits: ZombieTraits }>;
}
const inners = new WeakMap<HordeState, Inner>();

const ramp = (r: Ramp, t: number) => lerp(r.start, r.end, t);

/**
 * Zombie mode pressure. Breathers (nothing new spawns) alternate with surges (groups keep
 * coming, one zombie at a time, from behind the player and out of view). Intensity grows with
 * time alive and progress towards the exit, and drives every number in the HordeDef.
 * Also: finite ammo refilled by kills, bloater bursts, and recycling zombies left far behind
 * or stuck out of view. Uses the gameplay RNG, so replays stay exact.
 */
export const hordeSystem: RunSystem = {
  name: 'horde',
  update(world, ctx) {
    const horde = ctx.horde;
    const dt = ctx.clock.dt;
    if (!horde || dt <= 0) return;
    let inner = inners.get(horde);
    if (!inner) {
      inner = { elapsed: 0, groupTimer: 0, queue: 0, queueTimer: 0, armed: false, kills: ctx.stats?.kills ?? 0, bursters: new Map() };
      inners.set(horde, inner);
    }
    const { def } = horde;

    burstTheDead(world, ctx, inner);

    const p = world.first(Position, Body, PlayerControl, Health);
    if (!p || p[4].hp <= 0) return;
    const player = { e: p[0], x: p[1].x + p[2].w / 2, feet: p[1].y + p[2].h };
    inner.elapsed += dt;

    ammoEconomy(world, ctx, def, inner, player.e);

    // Pressure.
    const progress = ctx.level ? clamp((player.x - ctx.level.spawn.x) / Math.max(1, ctx.level.exit.x - ctx.level.spawn.x), 0, 1) : 0;
    horde.intensity = clamp((1 - def.progressWeight) * (inner.elapsed / def.rampSeconds) + def.progressWeight * progress, 0, 1);
    const t = horde.intensity;
    horde.maxAlive = Math.round(ramp(def.maxAlive, t));

    recycle(world, ctx, def, inner, player);
    horde.alive = countNear(world, def, player.x);
    const grabber = [...world.query(Zombie, Npc, Health)].find(([, z, , h]) => z.grab && h.hp > 0);
    horde.grabbed = grabber !== undefined;
    horde.struggle = grabber ? Math.min(1, grabber[1].grab!.presses / (ENEMIES.get(grabber[2].defId).zombie?.grab?.struggle ?? 1)) : 0;

    // Phases.
    horde.timer -= dt;
    if (horde.timer <= 0) {
      if (horde.phase === 'calm') {
        horde.phase = 'surge';
        horde.wave++;
        horde.timer = ramp(def.surge, t);
        inner.groupTimer = 0;
      } else {
        horde.phase = 'calm';
        horde.timer = ramp(def.calm, t);
        inner.queue = 0;
      }
    }
    horde.warning = horde.phase === 'calm' && horde.timer <= def.warning;

    if (horde.phase === 'surge') {
      inner.groupTimer -= dt;
      if (inner.groupTimer <= 0) {
        inner.groupTimer = ramp(def.groupEvery, t);
        inner.queue = Math.min(MAX_QUEUE, inner.queue + Math.max(1, Math.round(ramp(def.groupSize, t))));
      }
    }

    // One member of the group at a time, while under the cap.
    inner.queueTimer -= dt;
    if (inner.queue <= 0 || inner.queueTimer > 0 || horde.alive >= horde.maxAlive) return;
    inner.queueTimer = def.spawnStagger;
    const enemyId = pickEnemy(world, ctx, def, t, player.x);
    if (!enemyId) return;
    const spot = pickSpot(world, ctx, horde, enemyId, player);
    if (!spot) return; // nothing fair right now: try again after the stagger
    const e = spawnEnemy(world, enemyId, spot, spot.x < player.x ? 1 : -1);
    const brain = world.get(e, Brain);
    if (brain) {
      // They come for you: they know where you are from the start.
      brain.alert = AI.memory;
      brain.lastSeen = { x: player.x, y: player.feet - 12 };
    }
    inner.queue--;
  },
};

/** Weighted pick that slides towards the late weights and respects per-type caps near the player. */
function pickEnemy(world: World, ctx: RunContext, def: HordeDef, t: number, playerX: number): string | null {
  const near = new Map<string, number>();
  for (const [, npc, pos, health, brain] of world.query(Npc, Position, Health, Brain)) {
    if (hunting(def, playerX, pos.x, health.hp, brain.alert)) near.set(npc.defId, (near.get(npc.defId) ?? 0) + 1);
  }
  const options = def.pool
    .filter((e: HordeEnemy) => e.cap === undefined || (near.get(e.id) ?? 0) < e.cap)
    .map((e) => ({ item: e.id, weight: lerp(e.weight, e.lateWeight ?? e.weight, t) }))
    .filter((o) => o.weight > 0);
  return options.length > 0 ? ctx.rng.weighted(options) : null;
}

/**
 * A fair place to appear: on a floor, in the distance band (behind the player first, ahead only
 * when nothing behind fits), out of the camera view, not on top of another zombie, and with a
 * route to the player.
 */
export function pickSpot(world: World, ctx: RunContext, horde: HordeState, enemyId: string, player: { x: number; feet: number }): Vec2 | null {
  const { def, spots } = horde;
  const enemy = ENEMIES.get(enemyId);
  const cam = ctx.camera;
  const view = cam ? { x: cam.x - cam.viewWidth / 2 - VIEW_MARGIN, y: cam.y - cam.viewHeight / 2 - VIEW_MARGIN, w: cam.viewWidth + VIEW_MARGIN * 2, h: cam.viewHeight + VIEW_MARGIN * 2 } : null;
  const others: Vec2[] = [];
  for (const [, pos, body, health] of world.query(Position, Body, Health, Npc)) if (health.hp > 0) others.push({ x: pos.x + body.w / 2, y: pos.y + body.h });

  const fair = (s: Vec2) => {
    if (view && s.x >= view.x && s.x <= view.x + view.w && s.y - enemy.size.h <= view.y + view.h && s.y >= view.y) return false;
    if (others.some((o) => Math.abs(o.x - s.x) < SPAWN_CLEARANCE && Math.abs(o.y - s.y) < 8)) return false;
    if (!ctx.nav) return true;
    return ctx.nav.step(enemy.id, { moveSpeed: enemy.moveSpeed, jumpSpeed: AI.melee.jumpSpeed }, s, { x: player.x, y: player.feet }) !== null;
  };
  for (const side of [-1, 1]) {
    // The band starts at the view's edge when that is further (wide windows, camera held at a map end).
    const edge = view ? (side < 0 ? player.x - view.x : view.x + view.w - player.x) : 0;
    const min = Math.max(def.minDistance, edge);
    const max = min + def.maxDistance - def.minDistance;
    const band = spots.filter((s) => {
      const d = (s.x - player.x) * side;
      return d >= min && d <= max;
    });
    // Shuffle-free random order: pick, test, drop, repeat (keeps the RNG use small and stable).
    while (band.length > 0) {
      const i = ctx.rng.int(0, band.length - 1);
      const s = band[i]!;
      if (fair(s)) return s;
      band.splice(i, 1);
    }
  }
  return null;
}

/** Zombies hunting the player nearby (the ones the cap is about; sleepers ahead don't count). */
function countNear(world: World, def: HordeDef, playerX: number): number {
  let n = 0;
  for (const [, , pos, health, brain] of world.query(Npc, Position, Health, Brain)) if (hunting(def, playerX, pos.x, health.hp, brain.alert)) n++;
  return n;
}

const hunting = (def: HordeDef, playerX: number, x: number, hp: number, alert: number) => hp > 0 && alert > 0 && Math.abs(x - playerX) <= def.despawnDistance;

/**
 * Zombies far behind the player, or stuck (barely moved in `stuckSeconds`), are removed while
 * out of view, so the cap goes to zombies that can still reach you. Not a kill.
 */
function recycle(world: World, ctx: RunContext, def: HordeDef, inner: Inner, player: { x: number; feet: number }): void {
  const cam = ctx.camera;
  const dt = ctx.clock.dt;
  for (const [e, z, pos, body, health, brain] of world.query(Zombie, Position, Body, Health, Brain)) {
    if (health.hp <= 0) continue;
    const cx = pos.x + body.w / 2;
    if (Math.abs(cx - z.watchX) > TILE_STUCK) {
      z.watchX = cx;
      z.stuck = 0;
    } else if (brain.alert > 0 && !z.grab) {
      z.stuck += dt;
    }
    const inView = cam ? Math.abs(cx - cam.x) < cam.viewWidth / 2 + VIEW_MARGIN && Math.abs(pos.y + body.h / 2 - cam.y) < cam.viewHeight / 2 + VIEW_MARGIN : false;
    if (inView) continue;
    const farBehind = player.x - cx > def.despawnDistance;
    const stuck = z.stuck >= def.stuckSeconds && Math.hypot(cx - player.x, pos.y + body.h - player.feet) > 96;
    if (farBehind || stuck) {
      inner.bursters.delete(e);
      world.destroy(e);
    }
  }
}
/** Moving less than this (px) counts as not moving, for the stuck watch. */
const TILE_STUCK = 8;

/** Bloaters burst where they died (they are gone from the world one step later). */
function burstTheDead(world: World, ctx: RunContext, inner: Inner): void {
  for (const [e, burster] of inner.bursters) {
    if (world.has(e, Npc)) continue;
    inner.bursters.delete(e);
    zombieBurst(world, ctx, burster.at, burster.traits);
  }
  for (const [e, npc, pos, body, health] of world.query(Npc, Position, Body, Health)) {
    if (health.hp <= 0 && !inner.bursters.has(e)) continue;
    const traits = ENEMIES.get(npc.defId).zombie;
    if (traits?.burst) inner.bursters.set(e, { at: { x: pos.x + body.w / 2, y: pos.y + body.h / 2 }, traits });
  }
}

/** Finite reserves at the start; every kill gives a share of a magazine back to each gun. */
function ammoEconomy(world: World, ctx: RunContext, def: HordeDef, inner: Inner, player: Entity): void {
  const arsenal = world.get(player, Arsenal);
  if (!arsenal) return;
  const kills = ctx.stats?.kills ?? 0;
  const gained = kills - inner.kills;
  inner.kills = kills;
  for (const ws of arsenal.weapons) {
    if (ws.weapon.def.infiniteAmmo) continue;
    const mag = ws.weapon.stats.magazine;
    if (!inner.armed || !Number.isFinite(ws.reserve)) ws.reserve = Math.round(mag * def.ammo.startMagazines);
    else if (gained > 0) ws.reserve = Math.min(Math.round(mag * def.ammo.maxMagazines), ws.reserve + Math.ceil(mag * def.ammo.perKill) * gained);
  }
  inner.armed = true;
}
