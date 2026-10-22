import type { World } from '@engine/ecs/world';
import { containsPoint, overlaps } from '@engine/math/rect';
import type { HudState } from '../events';
import { GUNPLAY, TILE } from '../config';
import { FENCING_KITS } from '../content/blades/kits';
import { Aim, Arsenal, Body, Fencer, Focus, Health, Pickup, PlayerControl, Position, type ArsenalData } from '../world/components';
import { bodyCenter, bodyRect } from '../world/geometry';
import type { HudCues, RunContext, RunSystem } from './context';
import { MAX_SLOTS, nearestPickup } from './pickups';

const FIRE_MODE_LABEL = { semi: 'SEMI', burst: 'RAJADA', auto: 'AUTO' } as const;

/** Readability cue tuning (seconds are real time: slow motion doesn't drag the UI). */
export const HUD_CUES = {
  /** How long the "took damage" arc and edge flash last. */
  hurtSeconds: 0.6,
  /** How long the kill confirmation stays on the crosshair. */
  killSeconds: 0.45,
  /** Magazine fraction at or below which the crosshair suggests R. */
  lowAmmo: 0.25,
} as const;

/** Text under the crosshair: out of ammo, or a reload suggestion when the magazine runs low. */
export function ammoHint(ammo: number, magazine: number, reserve: number, infinite: boolean, reloading: boolean): string {
  if (infinite || reloading || magazine <= 0) return '';
  if (ammo === 0 && reserve <= 0) return 'SEM MUNIÇÃO';
  if (magazine >= 4 && ammo <= Math.ceil(magazine * HUD_CUES.lowAmmo) && reserve > 0) return 'R';
  return '';
}

/** What F would do with the gun on the floor, given what the player carries. */
export function pickupPrompt(arsenal: ArsenalData, floorGunId: string, floorGunName: string): string {
  const same = arsenal.weapons.find((w) => w.weapon.def.id === floorGunId);
  if (same) return `[F] munição: ${same.weapon.def.name}`;
  const held = arsenal.weapons[arsenal.active];
  if (arsenal.weapons.length >= MAX_SLOTS && held) return `[F] trocar ${held.weapon.def.name} por ${floorGunName}`;
  return `[F] pegar ${floorGunName}`;
}

/** 0..1 of the way from the spawn to the exit (horizontal: the map runs left to right). */
export function exitProgress(spawnX: number, exitX: number, x: number): number {
  const span = exitX - spawnX;
  if (Math.abs(span) < 1) return 1;
  return Math.min(1, Math.max(0, (x - spawnX) / span));
}

/** Publishes HUD/debug snapshots to the UI, only when they change; keeps the crosshair cues fresh. */
export function createHudSystem(): RunSystem {
  let lastHud = '';
  let prevHp = Number.NaN;
  let prevKills = 0;
  let prevHeadshots = 0;
  const cues: HudCues = {
    screenW: 0,
    screenH: 0,
    player: { x: 0, y: 0 },
    hurt: 0,
    hurtFrom: null,
    kill: 0,
    killHead: false,
    reload: 0,
    ammoHint: '',
    ammoEmpty: false,
    exit: null,
    exitTiles: 0,
  };
  return {
    name: 'hud',
    update(world, ctx) {
      const player = world.first(Position, Body, Health, Arsenal, PlayerControl);
      if (!player) return;
      const [e, pos, body, health, arsenal, pc] = player;
      const ws = arsenal.weapons[arsenal.active];
      const aim = world.get(e, Aim);
      const center = bodyCenter(pos, body);
      if (ws && aim) {
        // Cone of the next shot, measured at the cursor's distance.
        const dist = Math.hypot(aim.x - center.x, aim.y - center.y);
        const half = ((ws.weapon.stats.spreadDeg + ws.bloom * GUNPLAY.bloomDeg) * Math.PI) / 180;
        ctx.feedback.spread = Math.min(40, dist * Math.tan(half));
        ctx.feedback.busy = ws.reloadLeft > 0 || ws.cooldown > 0.2;
      }

      const fencer = world.get(e, Fencer);
      const fireMode = !ws || fencer ? '' : FIRE_MODE_LABEL[ws.weapon.fireMode];
      const stamina = fencer ? Math.round((fencer.stamina / FENCING_KITS.get(fencer.kitId).stamina) * 50) / 50 : null;
      const reload = ws && ws.reloadLeft > 0 ? Math.round((1 - ws.reloadLeft / ws.weapon.stats.reloadTime) * 20) / 20 : 0;
      const infinite = ws?.weapon.def.infiniteAmmo ?? false;

      updateCues(cues, world, ctx, center, health.hp, prevHp);
      prevHp = health.hp;
      if (ctx.stats.kills > prevKills) {
        cues.kill = HUD_CUES.killSeconds;
        cues.killHead = ctx.stats.headshots > prevHeadshots;
      }
      prevKills = ctx.stats.kills;
      prevHeadshots = ctx.stats.headshots;
      cues.reload = ws && ws.reloadLeft > 0 && !fencer ? Math.max(0.001, 1 - ws.reloadLeft / ws.weapon.stats.reloadTime) : 0;
      cues.ammoHint = ws && !fencer ? ammoHint(ws.ammo, ws.weapon.stats.magazine, ws.reserve, infinite, ws.reloadLeft > 0) : '';
      cues.ammoEmpty = cues.ammoHint !== '' && cues.ammoHint !== 'R';
      ctx.feedback.cues = cues;

      const hud: HudState = {
        hp: Math.max(0, Math.ceil(health.hp)),
        maxHp: health.max,
        weaponName: ws?.weapon.def.name ?? '-',
        weaponModel: ws?.weapon.def.model ?? '',
        weaponAttachments: ws?.weapon.attachments.map((a) => a.id) ?? [],
        ammo: ws?.ammo ?? 0,
        magazine: ws?.weapon.stats.magazine ?? 0,
        reserve: ws?.reserve ?? 0,
        reloading: (ws?.reloadLeft ?? 0) > 0,
        fireMode,
        infinite,
        weaponHint: ws?.weapon.def.hint ?? '',
        stamina,
        guardBroken: fencer?.phase === 'stunned',
        attachments: ws?.weapon.attachments.map((a) => a.name) ?? [],
        weapons: arsenal.weapons.map((w, i) => ({ name: w.weapon.def.name, active: i === arsenal.active })),
        reload,
        kills: ctx.stats.kills,
        headshots: ctx.stats.headshots,
        time: Math.floor(ctx.stats.time),
        focus: Math.round((world.get(e, Focus)?.value ?? 0) * 100) / 100,
        slowmo: ctx.clock.targetScale < 1,
        biomeName: ctx.biome.name,
        floorLabel: ctx.biome.floorLabel,
        roomName: currentRoom(ctx, center)?.name ?? '-',
        seed: ctx.level.seed,
        god: ctx.debug.god,
        grid: ctx.debug.grid,
        frozen: ctx.debug.stepMode,
        prompt: health.hp > 0 ? interactPrompt(world, ctx, arsenal, bodyRect(pos, body)) : '',
        progress: Math.round(exitProgress(ctx.level.spawn.x, ctx.level.exit.x, center.x) * 50) / 50,
        horde: ctx.horde
          ? {
              alive: ctx.horde.alive,
              max: ctx.horde.maxAlive,
              wave: ctx.horde.wave,
              warning: ctx.horde.warning,
              grabbed: ctx.horde.grabbed,
              struggle: ctx.horde.struggle,
            }
          : null,
      };
      const json = JSON.stringify(hud);
      if (json !== lastHud) {
        lastHud = json;
        ctx.bus.emit('hud', hud);
      }

      if (ctx.debug.overlay && ctx.clock.tick % 15 === 0) {
        ctx.bus.emit('debug', {
          fps: ctx.frameStats.fps,
          steps: ctx.frameStats.steps,
          entities: world.entityCount,
          timeScale: Math.round(ctx.clock.scale * 100) / 100,
          playerState: pc.state,
          playerPos: `${Math.round(pos.x)},${Math.round(pos.y)}`,
          room: currentRoomDebug(ctx, center),
        });
      }
    },
  };
}

/** Screen-space cues: player on screen, damage direction, exit indicator; timers run in real time. */
function updateCues(cues: HudCues, world: World, ctx: RunContext, center: { x: number; y: number }, hp: number, prevHp: number): void {
  const real = ctx.clock.realDt;
  const view = ctx.camera.view;
  cues.screenW = ctx.camera.viewWidth;
  cues.screenH = ctx.camera.viewHeight;
  cues.player = { x: center.x - view.x, y: center.y - view.y };
  cues.hurt = Math.max(0, cues.hurt - real);
  cues.kill = Math.max(0, cues.kill - real);

  const player = world.first(Health, PlayerControl);
  if (hp < prevHp && player) {
    cues.hurt = HUD_CUES.hurtSeconds;
    // lastHit stores the knockback (direction the blow travels, minus a fixed lift): the source is the other way.
    const hit = player[1].lastHit;
    const dx = hit ? hit.vx : 0;
    const dy = hit ? hit.vy + 60 : 0;
    cues.hurtFrom = Math.abs(dx) + Math.abs(dy) > 0.5 ? Math.atan2(-dy, -dx) : null;
  }

  const exit = ctx.level.exit;
  const ex = exit.x - view.x;
  const ey = exit.y - 15 - view.y;
  const onScreen = ex >= 0 && ex <= cues.screenW && ey >= 0 && ey <= cues.screenH;
  cues.exit = onScreen ? null : { x: ex, y: ey };
  cues.exitTiles = Math.round(Math.hypot(exit.x - center.x, exit.y - 15 - center.y) / TILE);
}

function interactPrompt(world: World, ctx: RunContext, arsenal: ArsenalData, rect: ReturnType<typeof bodyRect>): string {
  const { exit } = ctx.level;
  // Same door rect RunScene.checkExit uses.
  if (overlaps(rect, { x: exit.x - 10, y: exit.y - 30, w: 20, h: 30 })) return '[F / W] sair';
  const near = nearestPickup(world);
  const gun = near ? world.get(near.e, Pickup) : undefined;
  return gun ? pickupPrompt(arsenal, gun.weapon.def.id, gun.weapon.def.name) : '';
}

function currentRoom(ctx: RunContext, p: { x: number; y: number }) {
  return ctx.level.rooms.find((r) => containsPoint(r.rect, p.x, p.y));
}

function currentRoomDebug(ctx: RunContext, p: { x: number; y: number }): string {
  const room = currentRoom(ctx, p);
  return room ? `${room.index + 1}/${ctx.level.rooms.length} ${room.name}` : '-';
}
