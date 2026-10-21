import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/core/events';
import { Input, type InputFrame } from '@engine/input/input';
import { Tile, type TileGrid } from '@engine/physics/tilegrid';
import type { Renderer } from '@engine/render/renderer';
import type { GameEvents } from './events';
import { DEFAULT_BINDINGS } from './input/actions';
import type { LevelData, PlacedRoom } from './procgen/level';
import { ROOM_ROWS, ROOM_TEMPLATES, STOREY_ROWS } from './procgen/rooms';
import { RunScene } from './scenes/RunScene';
import { assembleWeapon } from './content/weapons/assemble';
import { WEAPONS } from './content/weapons/catalog';
import { Arsenal, Body, Debris, Health, Npc, Pickup, PlayerControl, Position, Projectile, Velocity } from './world/components';
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

describe('map traversal', () => {
  it(
    'walks from the first building to the exit through every room',
    () => {
      const coverage = new Set<string>();
      const expected = ROOM_TEMPLATES.filter((t) => t.tags.includes('alley')).map((t) => t.id).sort();
      let runs = 0;

      for (let i = 0; i < 24 && coverage.size < expected.length; i++) {
        const seed = `TRAV-${i}`;
        const { scene, input, exited } = makeScene(seed);
        clearThreats(scene);
        const level = scene.level;
        const [, pos, body, pc] = scene.world.first(Position, Body, PlayerControl)!;
        const visited = new Set<number>();

        // Simple agent: advance, shoot, use the exit, hop when blocked, back off if
        // the way is still blocked, climb down a ladder it ends up on. It never jumps
        // while running, so hatches are not accidental.
        let lastX = pos.x;
        let lastProgress = 0;
        let lastRecovery = -1000;
        let backtrack = false;
        let backtrackUntil = 0;
        let frames = 0;
        for (; frames < 6000 && !exited(); frames++) {
          const down: string[] = [];
          const pressed: string[] = [];
          if (backtrack) {
            down.push('KeyA', 'KeyS');
            if (frames >= backtrackUntil) backtrack = false;
          } else {
            down.push('KeyD', 'Mouse0');
            pressed.push('Mouse0');
            if (frames % 5 === 0) pressed.push('KeyF');
            const stuck = frames - lastProgress;
            if (pc.state === 'climb') down.push('KeyS');
            else if (stuck > 30) pressed.push('Space');
            if (stuck > 240 && frames - lastRecovery > 300) {
              backtrack = true;
              backtrackUntil = frames + 60;
              lastRecovery = frames;
            }
          }
          if (pos.x > lastX + 1) {
            lastX = pos.x;
            lastProgress = frames;
          }
          input.beginTick();
          input.inject(frame(down, pressed));
          scene.update(1 / 60);

          const cx = pos.x + body.w / 2;
          const idx = level.rooms.findIndex((r) => cx >= r.rect.x && cx < r.rect.x + r.rect.w);
          if (idx >= 0) visited.add(idx);
        }

        runs++;
        expect(
          exited(),
          `${seed} got stuck after ${frames} frames (${visited.size}/${level.rooms.length} rooms)`,
        ).toBe(true);
        expect(visited.size, `${seed} skipped a room`).toBe(level.rooms.length);
        for (const idx of visited) coverage.add(level.rooms[idx]!.templateId);
      }

      expect(runs).toBeGreaterThan(0);
      expect([...coverage].sort()).toEqual(expected);
    },
    60_000,
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
      for (let i = 0; i < 20; i++) {
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
      if (candidate.scene.level.rooms.some((r) => r.templateId === 'alley-2')) found = candidate;
    }
    expect(found, 'no seed generated the shaft alley').not.toBeNull();
    const { scene, input } = found!;
    clearThreats(scene);
    const level = scene.level;
    const room = roomOf(level, 'alley-2');
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
