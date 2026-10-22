import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/core/events';
import { Input, type InputFrame } from '@engine/input/input';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import type { Renderer } from '@engine/render/renderer';
import type { GameEvents } from './events';
import { DEFAULT_BINDINGS } from './input/actions';
import type { LevelData, PlacedRoom } from './procgen/level';
import { NavCache, type NavStep } from './pathing/navgraph';
import { BIOMES } from './content/biomes/catalog';
import { PLAYER_TUNING } from './config';
import { ROOM_ROWS, ROOM_TEMPLATES, STOREY_ROWS } from './procgen/rooms';
import { RunScene } from './scenes/RunScene';
import { assembleWeapon } from './content/weapons/assemble';
import { WEAPONS } from './content/weapons/catalog';
import { Arsenal, Body, Brain, Debris, Health, Npc, Pickup, PlayerControl, Position, Projectile, Velocity } from './world/components';
import { spawnPickup } from './systems/pickups';
import { spawnEnemy, spawnProjectile, weaponState } from './world/prefabs';

function makeScene(seed: string) {
  const input = new Input(DEFAULT_BINDINGS);
  let exited = false;
  const scene = new RunScene({
    renderer: { width: 480, height: 270 } as Renderer,
    input,
    bus: new EventBus<GameEvents>(),
    seed,
    biomeId: 'alleys',
    frameStats: { fps: 0, steps: 0 },
    debugOverlay: false,
    grid: false,
    onExit: () => {
      exited = true;
    },
    onReplay: () => undefined,
  });
  scene.enter();
  return { scene, input, exited: () => exited };
}

const frame = (down: string[], pressed: string[] = []): InputFrame => ({
  down,
  pressed,
  released: [],
  wheel: 0,
  px: 240,
  py: 170,
  inside: true,
});

/** Removes enemies so the bot tests layout connectivity, not combat skill. */
function clearThreats(scene: RunScene): void {
  for (const [e] of [...scene.world.query(Npc)]) scene.world.destroy(e);
  scene.world.flush();
}

/** Top of the ground row and of the first-storey slab, in world units. */
const groundTop = (ts: number) => (ROOM_ROWS - 1) * ts;
const firstFloorTop = (ts: number) => (ROOM_ROWS - 1 - STOREY_ROWS) * ts;

function roomOf(level: LevelData, templateId: string): PlacedRoom {
  const room = level.rooms.find((r) => r.templateId === templateId);
  if (!room) throw new Error(`level has no ${templateId} room`);
  return room;
}

function ladderBase(grid: TileGrid, room: PlacedRoom): { col: number; row: number } {
  const ts = grid.tileSize;
  const c0 = room.rect.x / ts;
  const r0 = room.rect.y / ts;
  let best: { col: number; row: number } | null = null;
  for (let r = r0; r < r0 + room.rect.h / ts; r++) {
    for (let c = c0; c < c0 + room.rect.w / ts; c++) {
      if (grid.get(c, r) === Tile.Ladder && (!best || r > best.row)) best = { col: c, row: r };
    }
  }
  if (!best) throw new Error(`${room.name} has no ladder`);
  return best;
}

/**
 * Plays the level like a person would, with keys only: asks the route graph (built for the
 * player's own jump) where to go next, walks there, jumps where the route jumps, and climbs the
 * ladders it takes (W up, then a hop off to the side at the top). Presses F now and then for the
 * exit.
 */
function playRoute(scene: RunScene, input: ReturnType<typeof makeScene>['input'], exited: () => boolean, maxFrames = 9000) {
  const level = scene.level;
  const nav = new NavCache(level.grid);
  const motor = { moveSpeed: PLAYER_TUNING.airSpeed, jumpSpeed: PLAYER_TUNING.jumpSpeed };
  const [, pos, , body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
  const visited = new Set<number>();
  let step: NavStep | null = null;
  let climb: NavStep | null = null;
  let jumpHold = 0;
  let frames = 0;
  for (; frames < maxFrames && !exited(); frames++) {
    const feet = { x: pos.x + body.w / 2, y: pos.y + body.h };
    const down: string[] = [];
    const pressed: string[] = [];
    if (frames % 5 === 0) pressed.push('KeyF');
    const toward = (x: number) => {
      if (x > feet.x + 2) down.push('KeyD');
      else if (x < feet.x - 2) down.push('KeyA');
    };

    if (body.climbing) {
      const target = climb ?? step;
      if (target && feet.y > target.y) down.push('KeyW');
      else if (target) {
        // At the top: hop off towards the floor beside the ladder.
        pressed.push('Space');
        toward(target.x);
        climb = null;
      }
    } else {
      if (body.onGround) {
        // No step: either at the exit, or over a gap the route says to drop into (keep going).
        const next = nav.step('player', motor, feet, level.exit);
        const atExit = Math.abs(feet.x - level.exit.x) < 24 && Math.abs(feet.y - level.exit.y) < 8;
        if (next || atExit) step = next;
        if (step?.ladderX === undefined) climb = null;
      }
      if (!step) {
        toward(level.exit.x);
      } else if (step.ladderX !== undefined && body.onGround) {
        if (Math.abs(step.ladderX - feet.x) > 3) toward(step.ladderX);
        else {
          down.push('KeyW');
          climb = step;
        }
      } else {
        toward(step.x);
        if (step.up && body.onGround && jumpHold <= 0) {
          pressed.push('Space');
          jumpHold = 24;
        }
      }
    }
    if (jumpHold > 0) {
      down.push('Space');
      jumpHold--;
    }

    input.beginTick();
    input.inject(frame(down, pressed));
    scene.update(1 / 60);
    const cx = pos.x + body.w / 2;
    const idx = level.rooms.findIndex((r) => cx >= r.rect.x && cx < r.rect.x + r.rect.w);
    if (idx >= 0) visited.add(idx);
  }
  return { frames, visited, end: `feet ${Math.round(pos.x + body.w / 2)},${Math.round(pos.y + body.h)} exit ${level.exit.x},${level.exit.y}` };
}

describe('map traversal', () => {
  it(
    'a bot playing with the real controls follows the route to the exit, on every chunk both ways round',
    () => {
      // Every middle chunk, plain and mirrored, plus the fixed first and last buildings.
      const expected = new Set<string>();
      for (const t of ROOM_TEMPLATES.filter((t) => t.tags.includes('alley'))) {
        expected.add(t.id);
        if (t.id !== BIOMES.get('alleys').startTemplate && t.id !== BIOMES.get('alleys').endTemplate) expected.add(`${t.id}(m)`);
      }
      const coverage = new Set<string>();
      let runs = 0;
      for (let i = 0; i < 40 && coverage.size < expected.size; i++) {
        const seed = `TRAV-${i}`;
        const { scene, input, exited } = makeScene(seed);
        const level = scene.level;
        const tag = (r: PlacedRoom) => `${r.templateId}${r.mirrored ? '(m)' : ''}`;
        // Only seeds that bring something new: keeps the test short.
        if (level.rooms.every((r) => coverage.has(tag(r)))) continue;
        clearThreats(scene);
        const { frames, visited, end } = playRoute(scene, input, exited);
        runs++;
        expect(exited(), `${seed} got stuck after ${frames} frames at ${end} (${visited.size}/${level.rooms.length} rooms: ${level.rooms.map(tag).join(' ')})`).toBe(true);
        expect(visited.size, `${seed} skipped a room`).toBe(level.rooms.length);
        for (const r of level.rooms) coverage.add(tag(r));
      }
      expect(runs).toBeGreaterThan(0);
      expect([...coverage].sort()).toEqual([...expected].sort());
    },
    120_000,
  );

  it('climbs a hatch ladder from the ground floor to the upper floor', () => {
    const { scene, input } = makeScene('LADDER-1');
    clearThreats(scene);
    const level = scene.level;
    const room = roomOf(level, 'building-1');
    const { col } = ladderBase(level.grid, room);
    const ts = level.grid.tileSize;
    const [, pos, vel, body, pc] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
    const center = col * level.grid.tileSize + level.grid.tileSize / 2;

    pos.x = center - body.w / 2;
    pos.y = groundTop(ts) - body.h;
    vel.x = 0;
    vel.y = 0;
    body.climbing = false;
    body.onGround = true;
    const startTop = pos.y;

    // Ladder locks A/D: even holding right, the body only moves up and stays centred.
    for (let i = 0; i < 170; i++) {
      const holdRight = i < 80;
      input.beginTick();
      input.inject(frame(holdRight ? ['KeyW', 'KeyD'] : ['KeyW'], i === 0 ? ['KeyW'] : []));
      scene.update(1 / 60);
      if (i === 60) {
        expect(pc.state, 'climbing animation state').toBe('climb');
        expect(Math.abs(pos.x + body.w / 2 - center), 'A/D must not move the climber').toBeLessThanOrEqual(1);
      }
    }
    expect(startTop - pos.y, 'player did not climb').toBeGreaterThan(60);
    expect(pos.y + body.h, 'player did not clear the upper floor').toBeLessThan(firstFloorTop(ts));

    for (let i = 0; i < 70; i++) {
      input.beginTick();
      input.inject(frame(['KeyA']));
      scene.update(1 / 60);
    }
    expect(body.onGround, 'player did not land on the upper floor').toBe(true);
    expect(Math.abs(pos.y + body.h - firstFloorTop(ts))).toBeLessThanOrEqual(2);
  });

  it('walks out of an upper storey through the side window, vaulting its sill', () => {
    const { scene, input } = makeScene('SIDEWIN-1');
    clearThreats(scene);
    const level = scene.level;
    const room = roomOf(level, 'building-1');
    const ts = level.grid.tileSize;
    const [, pos, vel, body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
    // Second storey, a few tiles left of the right wall.
    pos.x = room.rect.x + room.rect.w - 5 * ts;
    pos.y = firstFloorTop(ts) - body.h;
    vel.x = 0;
    vel.y = 0;
    body.onGround = true;

    // Past the 2-tile-thick wall, still up on the second storey (it may walk off the landing later).
    const outside = room.rect.x + room.rect.w + ts;
    let crossedHigh = false;
    for (let i = 0; i < 150 && !crossedHigh; i++) {
      input.beginTick();
      input.inject(frame(['KeyD']));
      scene.update(1 / 60);
      crossedHigh = pos.x > outside && pos.y + body.h <= firstFloorTop(ts) + 2;
    }
    expect(crossedHigh, 'player should step out through the window onto the landing').toBe(true);
  });

  it('the camera follows the player up to the top storey', () => {
    const { scene, input } = makeScene('CAMERA-1');
    clearThreats(scene);
    const ts = scene.level.grid.tileSize;
    const [, pos, vel, body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
    const settle = () => {
      for (let i = 0; i < 90; i++) {
        input.beginTick();
        input.inject(frame([]));
        scene.update(1 / 60);
      }
    };
    settle();
    const groundY = scene.camera.y;
    // Drop the player on the top storey (its floor is the slab under row 5).
    pos.y = STOREY_ROWS * ts - body.h;
    pos.prevY = pos.y;
    vel.y = 0;
    settle();
    expect(groundY - scene.camera.y, 'camera did not rise with the player').toBeGreaterThan(40);
  });

  it('a two-tile obstacle blocks walking; jumping while holding the direction clears it', () => {
    // Building 1 has a 3x2 block (cols 5-7, the two rows above the ground) right after the spawn.
    const placeLeftOfBlock = () => {
      const { scene, input } = makeScene('OBSTACLE-1');
      clearThreats(scene);
      const level = scene.level;
      const room = roomOf(level, 'building-1');
      const ts = level.grid.tileSize;
      const oc = room.rect.x / ts;
      const [, pos, vel, body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
      const blockLeft = (oc + 5) * ts;
      pos.x = blockLeft - body.w - 4;
      pos.y = groundTop(ts) - body.h;
      vel.x = 0;
      vel.y = 0;
      body.onGround = true;
      body.climbing = false;
      body.mantling = false;
      return { scene, input, pos, vel, body, blockLeft, blockRight: blockLeft + 3 * ts };
    };

    // Walking alone: blocked at the sofa's left face.
    const walk = placeLeftOfBlock();
    for (let i = 0; i < 120; i++) {
      walk.input.beginTick();
      walk.input.inject(frame(['KeyD']));
      walk.scene.update(1 / 60);
    }
    expect(Math.round(walk.pos.x + walk.body.w), 'walking alone should stop at the block').toBeLessThanOrEqual(walk.blockLeft + 1);

    // Jumping while holding the direction: over it.
    const jump = placeLeftOfBlock();
    for (let i = 0; i < 180; i++) {
      jump.input.beginTick();
      jump.input.inject(frame(['KeyD'], i % 24 === 0 ? ['Space'] : []));
      jump.scene.update(1 / 60);
    }
    expect(jump.pos.x, 'jumping while holding the direction should clear the block').toBeGreaterThan(jump.blockRight);
  });

  it('vaults a one-tile obstacle while walking, without jumping', () => {
    // Building 1 has a 1-tile block at col 11, right above the ground.
    const { scene, input } = makeScene('VAULT-1');
    clearThreats(scene);
    const level = scene.level;
    const room = roomOf(level, 'building-1');
    const ts = level.grid.tileSize;
    const oc = room.rect.x / ts;
    const [, pos, vel, body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
    const blockLeft = (oc + 11) * ts;
    pos.x = blockLeft - body.w - 4;
    pos.y = groundTop(ts) - body.h;
    vel.x = 0;
    vel.y = 0;
    body.onGround = true;
    body.climbing = false;
    body.mantling = false;

    for (let i = 0; i < 150; i++) {
      input.beginTick();
      input.inject(frame(['KeyD']));
      scene.update(1 / 60);
    }
    expect(pos.x, 'the one-tile block should be vaulted by walking into it').toBeGreaterThan(blockLeft + ts);
  });

  it('bullets go through bodies while they have power, then drop; a rifle crosses more than a pistol', () => {
    const shoot = (weaponId: string) => {
      const { scene, input } = makeScene('BALLISTICS-1');
      clearThreats(scene);
      const grid = scene.level.grid;
      const ts = grid.tileSize;
      const floor = groundTop(ts);
      const ground = ROOM_ROWS - 1;
      // A stretch of open floor 10 tiles long.
      let col = -1;
      for (let c = 2; c < grid.cols - 12 && col < 0; c++) {
        let open = true;
        for (let k = 0; k < 10 && open; k++) {
          open = grid.get(c + k, ground) === Tile.Solid;
          for (let r = ground - 3; r < ground && open; r++) open = grid.get(c + k, r) === Tile.Empty;
        }
        if (open) col = c;
      }
      const x0 = col * ts;
      // Three security guards in a row, shot from the left at chest height.
      const guards = [70, 100, 130].map((dx) => spawnEnemy(scene.world, 'security', { x: x0 + dx, y: floor }));
      spawnProjectile(scene.world, 'player', assembleWeapon(WEAPONS.get(weaponId)), { x: x0 + 4, y: floor - 14 }, 0);
      // Targets stay put and don't react: once shot, guards would hunt down their route, and this test is about bullets.
      const spots = guards.map((g) => ({ ...scene.world.get(g, Position)! }));
      for (let i = 0; i < 20; i++) {
        guards.forEach((g, k) => {
          Object.assign(scene.world.get(g, Position)!, spots[k]);
          const brain = scene.world.get(g, Brain)!;
          brain.alert = 0;
          brain.lastSeen = null;
          brain.climb = null;
        });
        input.beginTick();
        input.inject(frame([]));
        scene.update(1 / 60);
      }
      const hurt = guards.filter((g) => {
        const h = scene.world.get(g, Health);
        return !h || h.hp < h.max;
      }).length;
      return { hurt, bullets: [...scene.world.query(Projectile)].length, debris: [...scene.world.query(Debris)].length };
    };
    const rifle = shoot('ak47');
    const pistol = shoot('glock');
    expect(rifle.hurt, 'AK goes through all three').toBe(3);
    expect(pistol.hurt, 'pistol runs out of power first').toBeLessThan(3);
    expect(pistol.bullets, 'spent pistol bullet dropped').toBe(0);
    expect(pistol.debris, 'blood and the dropped bullet').toBeGreaterThan(3);
  });

  it('a killed enemy drops its gun; F next to a gun takes it (full: swaps the one in hand)', () => {
    const { scene, input } = makeScene('PICKUP-1');
    clearThreats(scene);
    const [pe, pos, , body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
    const arsenal = scene.world.get(pe, Arsenal)!;
    const step = (pressed: string[] = []) => {
      input.beginTick();
      input.inject(frame([], pressed));
      scene.update(1 / 60);
    };
    // A dying guard drops his Glock.
    const guard = spawnEnemy(scene.world, 'security', { x: pos.x + 60, y: pos.y + body.h });
    scene.world.get(guard, Health)!.hp = 0;
    for (let i = 0; i < 60; i++) step();
    expect([...scene.world.query(Pickup)].map(([, g]) => g.weapon.def.id)).toEqual(['glock']);

    // Full inventory (5): taking a bizon swaps out the gun in hand, which lands on the floor.
    for (const [e] of [...scene.world.query(Pickup)]) scene.world.destroy(e);
    arsenal.weapons.push(weaponState(assembleWeapon(WEAPONS.get('sniper'))));
    arsenal.active = 1;
    spawnPickup(scene.world, assembleWeapon(WEAPONS.get('bizon')), pos.x + body.w / 2, pos.y + body.h - 2, 0, 0);
    for (let i = 0; i < 20; i++) step();
    step(['KeyF']);
    expect(arsenal.weapons.map((w) => w.weapon.def.id)).toEqual(['glock', 'bizon', 'shotgun', 'ak47', 'sniper']);
    for (let i = 0; i < 60; i++) step();
    expect([...scene.world.query(Pickup)].map(([, g]) => g.weapon.def.id)).toEqual(['uzi']);
  });

  it('Q kicks: an enemy right in front is hurt and shoved away', () => {
    const { scene, input } = makeScene('KICK-1');
    clearThreats(scene);
    const [, pos, , body, pc] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
    pc.facing = 1;
    const guard = spawnEnemy(scene.world, 'security', { x: pos.x + body.w + 8, y: pos.y + body.h });
    const x0 = scene.world.get(guard, Position)!.x;
    for (let i = 0; i < 30; i++) {
      input.beginTick();
      input.inject(frame([], i === 2 ? ['KeyQ'] : []));
      scene.update(1 / 60);
    }
    const h = scene.world.get(guard, Health)!;
    expect(h.hp).toBeLessThan(h.max);
    expect(scene.world.get(guard, Position)!.x).toBeGreaterThan(x0 + 4);
  });

  it('a fall of more than 4 tiles ends in a roll; 4 tiles or less does not', () => {
    const drop = (tiles: number) => {
      const { scene, input } = makeScene('ROLL-1');
      clearThreats(scene);
      const grid = scene.level.grid;
      const ts = grid.tileSize;
      const ground = ROOM_ROWS - 1;
      // A column with open air from the ground up to 8 tiles (an alley), and its neighbour.
      let col = -1;
      for (let c = 2; c < grid.cols - 2 && col < 0; c++) {
        let open = grid.get(c, ground) === Tile.Solid;
        for (let r = ground - 9; r < ground && open; r++) open = grid.get(c, r) === Tile.Empty && grid.get(c + 1, r) === Tile.Empty;
        if (open) col = c;
      }
      expect(col, 'no open column').toBeGreaterThan(0);
      const [, pos, vel, body, pc] = scene.world.first(Position, Velocity, Body, PlayerControl)!;
      pos.x = col * ts + 2;
      pos.prevX = pos.x;
      pos.y = groundTop(ts) - body.h - tiles * ts - 1;
      pos.prevY = pos.y;
      vel.x = 0;
      vel.y = 0;
      body.onGround = false;
      pc.wasGrounded = false;
      pc.fallTopY = pos.y + body.h;
      const states = new Set<string>();
      for (let i = 0; i < 90; i++) {
        input.beginTick();
        input.inject(frame([]));
        scene.update(1 / 60);
        states.add(pc.state);
      }
      return states;
    };
    expect(drop(5).has('roll'), '5 tiles').toBe(true);
    expect(drop(3.9).has('roll'), '3.9 tiles').toBe(false);
  });

  it('wall jumps climb the shaft in the alley, higher than a normal jump reaches', () => {
    // Find a seed whose level has the shaft alley.
    let found: ReturnType<typeof makeScene> | null = null;
    for (let i = 0; i < 40 && !found; i++) {
      const candidate = makeScene(`WALLJUMP-${i}`);
      if (candidate.scene.level.rooms.some((r) => r.templateId === 'alley-2' && !r.mirrored)) found = candidate;
    }
    expect(found, 'no seed generated the shaft alley').not.toBeNull();
    const { scene, input } = found!;
    clearThreats(scene);
    const level = scene.level;
    // The shaft is on the left of the chunk as drawn (not mirrored).
    const room = level.rooms.find((r) => r.templateId === 'alley-2' && !r.mirrored)!;
    const ts = level.grid.tileSize;
    const landingRow = ROOM_TEMPLATES.find((t) => t.id === 'alley-2')!.rows.findIndex((row) => row.slice(1, 5) === '====');
    const [, pos, vel, body] = scene.world.first(Position, Velocity, Body, PlayerControl)!;

    // Stand at the bottom of the shaft (cols 1-4), next to its right wall.
    pos.x = (room.rect.x / ts + 3.5) * ts - body.w / 2;
    pos.y = groundTop(ts) - body.h;
    vel.x = 0;
    vel.y = 0;
    body.onGround = true;
    body.climbing = false;
    body.mantling = false;

    // Hold right; tapping jump bounces between the shaft walls and gains height.
    let highestFeet = pos.y + body.h;
    for (let i = 0; i < 900; i++) {
      input.beginTick();
      input.inject(frame(['KeyD'], i % 8 === 0 ? ['Space'] : []));
      scene.update(1 / 60);
      highestFeet = Math.min(highestFeet, pos.y + body.h);
    }
    expect(highestFeet, 'wall jumps should reach the shaft landing').toBeLessThanOrEqual(landingRow * ts + 2);
  });
});
