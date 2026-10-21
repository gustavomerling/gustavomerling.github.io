import { containsPoint } from '@engine/math/rect';
import type { HudState } from '../events';
import { Aim, Arsenal, Body, Focus, Health, PlayerControl, Position } from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunContext, RunSystem } from './context';

const FIRE_MODE_LABEL = { semi: 'SEMI', burst: 'RAJADA', auto: 'AUTO' } as const;

/** Publishes HUD/debug snapshots to the UI, only when they change. */
export function createHudSystem(): RunSystem {
  let lastHud = '';
  return {
    name: 'hud',
    update(world, ctx) {
      const player = world.first(Position, Body, Health, Arsenal, PlayerControl);
      if (!player) return;
      const [e, pos, body, health, arsenal, pc] = player;
      const ws = arsenal.weapons[arsenal.active];
      const aim = world.get(e, Aim);
      if (ws && aim) {
        // Cone of the next shot, measured at the cursor's distance.
        const c = bodyCenter(pos, body);
        const dist = Math.hypot(aim.x - c.x, aim.y - c.y);
        const half = ((ws.weapon.stats.spreadDeg + ws.bloom * 6) * Math.PI) / 180;
        ctx.feedback.spread = Math.min(40, dist * Math.tan(half));
        ctx.feedback.busy = ws.reloadLeft > 0 || ws.cooldown > 0.2;
      }

      const custom = ws?.weapon.behaviors;
      const fireMode = !ws
        ? ''
        : custom?.has('cursorSwing')
          ? 'GOLPE'
          : custom?.has('shield')
            ? 'BLOQUEIO'
            : custom?.has('magicShield')
              ? 'MAGIA'
              : FIRE_MODE_LABEL[ws.weapon.fireMode];

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
        infinite: ws?.weapon.def.infiniteAmmo ?? false,
        weaponHint: ws?.weapon.def.hint ?? '',
        attachments: ws?.weapon.attachments.map((a) => a.name) ?? [],
        weapons: arsenal.weapons.map((w, i) => ({ name: w.weapon.def.name, active: i === arsenal.active })),
        reload: ws && ws.reloadLeft > 0 ? Math.round((1 - ws.reloadLeft / ws.weapon.stats.reloadTime) * 20) / 20 : 0,
        kills: ctx.stats.kills,
        headshots: ctx.stats.headshots,
        time: Math.floor(ctx.stats.time),
        focus: Math.round((world.get(e, Focus)?.value ?? 0) * 100) / 100,
        slowmo: ctx.clock.targetScale < 1,
        biomeName: ctx.biome.name,
        floorLabel: ctx.biome.floorLabel,
        roomName: currentRoom(ctx, bodyCenter(pos, body))?.name ?? '-',
        seed: ctx.level.seed,
        god: ctx.debug.god,
        grid: ctx.debug.grid,
        frozen: ctx.debug.stepMode,
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
          room: currentRoomDebug(ctx, bodyCenter(pos, body)),
        });
      }
    },
  };
}

function currentRoom(ctx: RunContext, p: { x: number; y: number }) {
  return ctx.level.rooms.find((r) => containsPoint(r.rect, p.x, p.y));
}

function currentRoomDebug(ctx: RunContext, p: { x: number; y: number }): string {
  const room = currentRoom(ctx, p);
  return room ? `${room.index + 1}/${ctx.level.rooms.length} ${room.name}` : '-';
}
