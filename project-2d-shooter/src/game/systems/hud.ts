import { containsPoint } from '@engine/math/rect';
import { ITEMS } from '../content/items/catalog';
import type { HudState } from '../events';
import { Arsenal, Body, Focus, Health, PlayerControl, Position, Wallet } from '../world/components';
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
      const item = arsenal.items[arsenal.activeItem];

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
        itemName: item ? ITEMS.get(item.itemId).name : '-',
        itemCount: item?.count ?? 0,
        money: world.get(e, Wallet)?.money ?? 0,
        focus: Math.round((world.get(e, Focus)?.value ?? 0) * 100) / 100,
        slowmo: ctx.clock.targetScale < 1,
        biomeName: ctx.biome.name,
        floorLabel: ctx.biome.floorLabel,
        seed: ctx.level.seed,
        god: ctx.debug.god,
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
          particles: ctx.particles.active,
          timeScale: Math.round(ctx.clock.scale * 100) / 100,
          playerState: pc.state,
          playerPos: `${Math.round(pos.x)},${Math.round(pos.y)}`,
          room: currentRoom(ctx, bodyCenter(pos, body)),
        });
      }
    },
  };
}

function currentRoom(ctx: RunContext, p: { x: number; y: number }): string {
  const room = ctx.level.rooms.find((r) => containsPoint(r.rect, p.x, p.y));
  return room ? `${room.index + 1}/${ctx.level.rooms.length} ${room.templateId}` : '-';
}
