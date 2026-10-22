import type { Entity, World } from '@engine/ecs/world';
import type { RunContext, RunSystem } from '../systems/context';
import { Arsenal, Body, Decal, Fencer, Health, Npc, PlayerControl, Position, Velocity, Zombie } from '../world/components';
import { SHOT_BY_MODEL, type SfxId } from './sounds';

interface GunSeen {
  active: number;
  ammo: number;
  cooldown: number;
  reload: number;
}
interface FencerSeen {
  phase: string;
  flash: number;
  parryFlash: number;
}
interface HealthSeen {
  hp: number;
  lastHit: unknown;
}

/** Footstep every this many px walked; landings louder than this fall speed make a thud. */
const STEP_PX = 30;
const LAND_SPEED = 220;
/** Seconds between zombie groans (random in range), per scene. */
const GROAN_GAP: [number, number] = [2.5, 6];

/**
 * Listens to the simulation by watching state change between steps (ammo dropping = shot,
 * Health.lastHit replaced = hit, ...) and emits `sfx` events. Read-only: it never writes
 * gameplay state and uses Math.random (not ctx.rng), so the simulation stays deterministic.
 * Runs last in the pipeline. One instance per scene (`createAudioSystem()`).
 */
export function createAudioSystem(): RunSystem {
  const guns = new Map<Entity, GunSeen>();
  const fencers = new Map<Entity, FencerSeen>();
  const healths = new Map<Entity, HealthSeen>();
  const zombies = new Map<Entity, { rush: string; grabbed: boolean }>();
  let maxDecal = -1;
  let player = { ground: true, vy: 0, walked: 0, ready: false };
  let hordeWarning = false;
  let groanIn = 3;

  return {
    name: 'audio',
    update(world: World, ctx: RunContext) {
      const view = ctx.camera.view;
      const cx = view.x + view.w / 2;
      const cy = view.y + view.h / 2;
      const emit = (id: SfxId, x?: number, y?: number, gain = 1) => {
        let pan = 0;
        if (x !== undefined && y !== undefined) {
          pan = Math.max(-1, Math.min(1, (x - cx) / (view.w / 2))) * 0.75;
          const off = Math.max(0, Math.abs(x - cx) - view.w / 2, Math.abs(y - cy) - view.h / 2);
          gain *= 1 / (1 + off / 120);
        }
        if (gain >= 0.08) ctx.bus.emit('sfx', { id, pan, gain });
      };
      const at = (e: Entity): { x: number; y: number } | null => {
        const p = world.get(e, Position);
        if (!p) return null;
        const b = world.get(e, Body);
        return b ? { x: p.x + b.w / 2, y: p.y + b.h / 2 } : { x: p.x, y: p.y };
      };
      const isPlayer = (e: Entity) => world.has(e, PlayerControl);

      // --- guns: shots, dry clicks, reloads ---
      for (const [e, arsenal] of world.query(Arsenal)) {
        const ws = arsenal.weapons[arsenal.active];
        if (!ws) continue;
        const prev = guns.get(e);
        const now: GunSeen = { active: arsenal.active, ammo: ws.ammo, cooldown: ws.cooldown, reload: ws.reloadLeft };
        guns.set(e, now);
        if (!prev || prev.active !== now.active || ws.weapon.behaviors.has('blade')) continue;
        const p = at(e);
        const mine = isPlayer(e);
        const gain = mine ? 1 : 0.65;
        if (now.cooldown > prev.cooldown + 1e-6) {
          if (now.ammo < prev.ammo || ws.weapon.def.infiniteAmmo) {
            emit(SHOT_BY_MODEL[ws.weapon.def.model] ?? 'shot.pistol', p?.x, p?.y, gain);
          } else if (mine && prev.ammo <= 0) {
            emit('empty');
          }
        }
        if (mine && !ws.weapon.def.infiniteAmmo) {
          if (prev.reload <= 0 && now.reload > 0) emit('reload.start');
          else if (prev.reload > 0 && now.reload <= 0 && now.ammo > prev.ammo) emit('reload.done');
        }
      }

      // --- hits, hurt, deaths (Health.lastHit is a new object on every hit) ---
      const seen = new Set<Entity>();
      for (const [e, health] of world.query(Health)) {
        seen.add(e);
        const prev = healths.get(e);
        healths.set(e, { hp: health.hp, lastHit: health.lastHit });
        if (!prev) continue;
        if (health.lastHit && health.lastHit !== prev.lastHit) {
          const p = at(e);
          if (isPlayer(e)) emit('hurt');
          else if (health.lastHit.zone === 'head') emit('headshot', p?.x, p?.y);
          else emit('impact.flesh', p?.x, p?.y);
        }
        if (prev.hp > 0 && health.hp <= 0) dies(e);
      }
      // Entities destroyed this step are skipped by queries but still readable until flush.
      for (const [e, prev] of healths) {
        if (seen.has(e)) continue;
        healths.delete(e);
        const health = world.get(e, Health);
        if (!health) continue;
        if (health.lastHit && health.lastHit !== prev.lastHit) {
          const p = at(e);
          emit(health.lastHit.zone === 'head' ? 'headshot' : 'impact.flesh', p?.x, p?.y);
        }
        if (prev.hp > 0 && health.hp <= 0) dies(e);
      }
      function dies(e: Entity) {
        const p = at(e);
        if (isPlayer(e)) emit('death.player');
        else if (world.get(e, Npc)?.defId === 'bloater') emit('burst', p?.x, p?.y);
        else emit('death.enemy', p?.x, p?.y);
      }

      // --- bullet holes = wall impacts (entity ids only grow) ---
      let newest = maxDecal;
      let impacts = 0;
      for (const [e, d] of world.query(Decal)) {
        if (e <= maxDecal) continue;
        newest = Math.max(newest, e);
        if (impacts++ < 2 && maxDecal >= 0) emit('impact.wall', d.x, d.y);
      }
      maxDecal = Math.max(newest, 0);

      // --- sword and shield ---
      for (const [e, f] of world.query(Fencer)) {
        const prev = fencers.get(e);
        fencers.set(e, { phase: f.phase, flash: f.flash, parryFlash: f.parryFlash });
        if (!prev) continue;
        const p = at(e);
        if (f.phase === 'strike' && prev.phase !== 'strike') emit('swing', p?.x, p?.y);
        if (f.parryFlash > prev.parryFlash + 1e-6) emit('parry', p?.x, p?.y);
        else if (f.flash > prev.flash + 1e-6) {
          emit(f.phase === 'stunned' && prev.phase !== 'stunned' ? 'guardBreak' : 'block', p?.x, p?.y);
        }
      }

      // --- zombies: grab, runner tell, idle groans ---
      const groaners: Entity[] = [];
      for (const [e, z] of world.query(Zombie)) {
        const prev = zombies.get(e);
        const grabbed = z.grab !== null;
        zombies.set(e, { rush: z.rush, grabbed });
        const p = at(e);
        if (p && Math.abs(p.x - cx) < view.w * 0.7 && Math.abs(p.y - cy) < view.h * 0.7) groaners.push(e);
        if (!prev) continue;
        if (grabbed && !prev.grabbed) emit('grab', p?.x, p?.y);
        if (z.rush === 'tell' && prev.rush !== 'tell') emit('shriek', p?.x, p?.y);
      }
      if (zombies.size > 200) for (const e of zombies.keys()) if (!world.isAlive(e)) zombies.delete(e);
      groanIn -= ctx.clock.dt;
      if (groanIn <= 0) {
        groanIn = GROAN_GAP[0] + Math.random() * (GROAN_GAP[1] - GROAN_GAP[0]);
        const e = groaners[Math.floor(Math.random() * groaners.length)];
        if (e !== undefined && (world.get(e, Health)?.hp ?? 0) > 0) {
          const p = at(e);
          emit('groan', p?.x, p?.y, 0.8);
        }
      }

      // --- horde warning ---
      const warning = ctx.horde?.warning ?? false;
      if (warning && !hordeWarning) emit('horde');
      hordeWarning = warning;

      // --- player footsteps / landing ---
      const me = world.first(PlayerControl, Body, Velocity);
      if (me) {
        const [, pc, body, vel] = me;
        if (player.ready && body.onGround && !player.ground && player.vy > LAND_SPEED) {
          emit('land', undefined, undefined, Math.min(1.4, player.vy / 400));
          player.walked = 0;
        }
        if (body.onGround && Math.abs(vel.x) > 25 && pc.state !== 'slide' && pc.state !== 'roll') {
          player.walked += Math.abs(vel.x) * ctx.playerDt;
          if (player.walked >= STEP_PX) {
            player.walked = 0;
            emit('step');
          }
        }
        player = { ground: body.onGround, vy: vel.y, walked: player.walked, ready: true };
      }

      // Forget guns/fencers of entities that are gone.
      if (guns.size > 64) for (const e of guns.keys()) if (!world.isAlive(e)) guns.delete(e);
      if (fencers.size > 64) for (const e of fencers.keys()) if (!world.isAlive(e)) fencers.delete(e);
    },
  };
}
