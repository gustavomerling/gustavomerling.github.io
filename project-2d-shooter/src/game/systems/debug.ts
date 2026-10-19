import type { World } from '@engine/ecs/world';
import { assembleWeapon } from '../content/weapons/assemble';
import { WEAPONS } from '../content/weapons/catalog';
import { rigHitParts } from '../character/hitbox';
import { ENEMIES } from '../content/enemies/catalog';
import { Body, Brain, Npc, PlayerControl, Position, Rig, Smoke } from '../world/components';
import { bodyCenter } from '../world/geometry';
import { spawnEnemy, spawnPickup, weaponState } from '../world/prefabs';
import type { RunContext } from './context';
import { lineOfSight } from './ai';

const SPAWN_CYCLE = ['intern', 'security', 'it-guy', 'manager'];

/**
 * Debug keys, handled by the scene before (and even while) the simulation is frozen:
 *   F3 overlay · F4 god mode · F6 spawn enemy at cursor · F7 drop items at cursor
 *   F8 freeze/unfreeze · F9 advance one step while frozen · F10 replay this attempt
 * Returns true if the scene should replay.
 */
export function handleDebugKeys(world: World, ctx: RunContext): { replay: boolean } {
  const { input, debug } = ctx;
  if (input.pressed('debug')) {
    debug.overlay = !debug.overlay;
    if (!debug.overlay) ctx.bus.emit('debug', null);
  }
  if (input.pressed('debugGod')) debug.god = !debug.god;
  if (input.pressed('debugStep')) debug.stepMode = !debug.stepMode;
  debug.stepOnce = input.pressed('debugTick');

  const cursor = ctx.camera.screenToWorldSim(input.pointer);
  if (input.pressed('debugSpawn')) {
    const id = SPAWN_CYCLE[debug.spawnIndex++ % SPAWN_CYCLE.length]!;
    const feet = dropToFloor(ctx, cursor.x, cursor.y);
    spawnEnemy(world, id, feet, -1);
  }
  if (input.pressed('debugItems')) {
    const v = () => ({ x: ctx.rng.range(-60, 60), y: -120 });
    spawnPickup(world, 'health', cursor, 20, v());
    spawnPickup(world, 'ammo', cursor, 1, v());
    spawnPickup(world, 'money', cursor, 5, v());
    const gun = ctx.rng.pick(WEAPONS.all());
    spawnPickup(world, 'weapon', cursor, 1, v(), weaponState(assembleWeapon(gun)));
  }
  return { replay: input.pressed('debugReplay') };
}

/** First floor below a point (so debug spawns don't end up inside walls). */
function dropToFloor(ctx: RunContext, x: number, y: number): { x: number; y: number } {
  const ts = ctx.grid.tileSize;
  for (let py = y; py < ctx.grid.heightPx; py += 1) {
    if (ctx.grid.isSolidAtPixel(x, py)) return { x, y: Math.floor(py / ts) * ts };
  }
  return { x, y };
}

/** World-space debug drawing: hit capsules, AI sight and state, smoke radius. */
export function drawDebugWorld(ctx2d: CanvasRenderingContext2D, world: World, ctx: RunContext): void {
  // Rooms.
  ctx2d.strokeStyle = 'rgba(255,0,255,0.35)';
  ctx2d.lineWidth = 1;
  ctx2d.font = '8px monospace';
  ctx2d.textAlign = 'left';
  for (const room of ctx.level.rooms) {
    ctx2d.strokeRect(room.rect.x + 0.5, room.rect.y + 0.5, room.rect.w - 1, room.rect.h - 1);
    ctx2d.fillStyle = 'rgba(255,0,255,0.6)';
    ctx2d.fillText(`#${room.index + 1} ${room.templateId}`, room.rect.x + 20, room.rect.y + 26);
  }

  // Hit capsules.
  ctx2d.strokeStyle = 'rgba(0,255,255,0.7)';
  for (const [, pos, body, rig] of world.query(Position, Body, Rig)) {
    for (const part of rigHitParts(rig.animator, pos.x + body.w / 2, pos.y + body.h)) {
      ctx2d.beginPath();
      ctx2d.arc(part.x0, part.y0, part.radius, 0, Math.PI * 2);
      if (part.x0 !== part.x1 || part.y0 !== part.y1) {
        ctx2d.moveTo(part.x0, part.y0);
        ctx2d.lineTo(part.x1, part.y1);
        ctx2d.arc(part.x1, part.y1, part.radius, 0, Math.PI * 2);
      }
      ctx2d.stroke();
    }
  }

  // AI: sight range towards facing, line to the player (green = clear), state label.
  const p = world.first(Position, Body, PlayerControl);
  const pc = p ? bodyCenter(p[1], p[2]) : null;
  const smokes = [...world.query(Position, Smoke)].map(([, pos, s]) => ({ x: pos.x, y: pos.y, radius: s.radius }));
  for (const [, pos, body, brain, npc] of world.query(Position, Body, Brain, Npc)) {
    const def = ENEMIES.get(npc.defId);
    const eye = { x: pos.x + body.w / 2, y: pos.y + (brain.crouching ? 12 : 4) };
    ctx2d.strokeStyle = brain.alert > 0 ? 'rgba(255,80,80,0.35)' : 'rgba(255,255,0,0.25)';
    ctx2d.beginPath();
    const a0 = brain.facing > 0 ? -0.5 : Math.PI - 0.5;
    ctx2d.arc(eye.x, eye.y, def.sightRange, a0, a0 + 1);
    ctx2d.stroke();
    if (pc) {
      const clear = lineOfSight(ctx.grid, eye.x, eye.y, pc.x, pc.y, smokes);
      ctx2d.strokeStyle = clear ? 'rgba(0,255,0,0.4)' : 'rgba(255,0,0,0.25)';
      ctx2d.beginPath();
      ctx2d.moveTo(eye.x, eye.y);
      ctx2d.lineTo(pc.x, pc.y);
      ctx2d.stroke();
    }
    ctx2d.fillStyle = '#ff0';
    const state = brain.staggerLeft > 0 ? 'STAG' : brain.windupLeft > 0 ? 'WIND' : brain.seeTime > 0 ? 'SEE' : brain.alert > 0 ? `ALR ${brain.alert.toFixed(1)}` : 'calm';
    ctx2d.fillText(`${state}${brain.crouching ? ' C' : ''}`, pos.x - 4, pos.y - 8);
  }

  ctx2d.strokeStyle = 'rgba(200,200,255,0.6)';
  for (const s of smokes) {
    ctx2d.beginPath();
    ctx2d.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
    ctx2d.stroke();
  }
}
