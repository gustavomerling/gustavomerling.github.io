import { containsPoint } from '@engine/math/rect';
import type { HudState } from '../events';
import { Arsenal, Body, Focus, Health, PlayerControl, Position } from '../world/components';
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
      const other = arsenal.weapons.find((_, i) => i !== arsenal.active);

      const hud: HudState = {
        hp: Math.max(0, Math.ceil(health.hp)),
        maxHp: health.max,
        weaponName: ws?.weapon.def.name ?? '-',
        ammo: ws?.ammo ?? 0,
        magazine: ws?.weapon.stats.magazine ?? 0,
        reserve: ws?.reserve ?? 0,
        reloading: (ws?.reloadLeft ?? 0) > 0,
        fireMode: ws ? FIRE_MODE_LABEL[ws.weapon.fireMode] : '',
        attachments: ws?.weapon.attachments.map((a) => a.name) ?? [],
        otherWeapon: other?.weapon.def.name ?? null,
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
