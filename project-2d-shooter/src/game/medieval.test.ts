import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/core/events';
import { World } from '@engine/ecs/world';
import { Input } from '@engine/input/input';
import { Rng } from '@engine/math/rng';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import type { Renderer } from '@engine/render/renderer';
import { BIOMES } from './content/biomes/catalog';
import { ENEMIES } from './content/enemies/catalog';
import { RUN_MODES } from './content/modes/catalog';
import { PLAYER_DEF } from './content/characters/player';
import { assembleWeapon } from './content/weapons/assemble';
import { WEAPONS } from './content/weapons/catalog';
import type { GameEvents } from './events';
import { DEFAULT_BINDINGS } from './input/actions';
import { generateLevel } from './procgen/level';
import { ROOM_COLS, ROOM_ROWS } from './procgen/rooms';
import { RunScene } from './scenes/RunScene';
import type { RunContext } from './systems/context';
import { projectileSystem } from './systems/combat';
import { applyDamage } from './systems/damage';
import { MAGIC_SHIELD, medievalSystem, SWORD_REFERENCE_SPEED, swordDamage } from './systems/medieval';
import { Aim, Arsenal, Body, Guard, Health, Intent, PlayerControl, Position, Projectile, SwordState } from './world/components';
import { bodyCenter } from './world/geometry';
import { spawnEnemy, spawnPlayer, spawnProjectile, weaponState } from './world/prefabs';

function testCtx(): RunContext {
  return {
    clock: { dt: 1 / 60 } as RunContext['clock'],
    playerDt: 1 / 60,
    grid: new TileGrid(20, 20, 16),
    noises: [],
    debug: { god: false },
    stats: { kills: 0, headshots: 0, shots: 0, hits: 0, time: 0 },
    feedback: { hitMarker: 0, hitKill: false, hitHead: false, spread: 0, busy: false },
    rng: Rng.fromString('medieval-test'),
  } as unknown as RunContext;
}

function makeScene(seed: string, mode: 'medieval' = 'medieval') {
  const input = new Input(DEFAULT_BINDINGS);
  const scene = new RunScene({
    renderer: { width: 480, height: 270 } as Renderer,
    input,
    bus: new EventBus<GameEvents>(),
    seed,
    biomeId: 'alleys',
    mode,
    frameStats: { fps: 0, steps: 0 },
    debugOverlay: false,
    grid: false,
    onExit: () => undefined,
    onReplay: () => undefined,
  });
  scene.enter();
  return scene;
}

describe('medieval content', () => {
  it('registers the five kit weapons and the skeleton enemies', () => {
    const mode = RUN_MODES.get('medieval');
    expect(mode.biomeId).toBe('castle');
    expect(mode.loadout?.map((w) => w.weaponId)).toEqual(['iron-sword', 'shortbow', 'kite-shield', 'fire-staff', 'ward-staff']);
    for (const id of ['iron-sword', 'shortbow', 'kite-shield', 'fire-staff', 'ward-staff']) {
      expect(WEAPONS.get(id).infiniteAmmo, id).toBe(true);
    }
    expect(WEAPONS.get('shortbow').projectileKind).toBe('arrow');
    expect(WEAPONS.get('fire-staff').explosionRadius).toBeGreaterThan(0);
    for (const id of ['skeleton-archer', 'skeleton-knight', 'skeleton-mage']) {
      const def = ENEMIES.get(id);
      expect(def.skeleton, id).toBe(true);
    }
    expect(ENEMIES.get('skeleton-knight').shield).toBe(true);
    expect(ENEMIES.get('skeleton-mage').weaponId).toBe('fire-staff');
  });

  it('generates a flat, straight castle with four rooms and matching ground levels', () => {
    for (const seed of ['CASTLE-1', 'CASTLE-2', 'CASTLE-3']) {
      const level = generateLevel(seed, BIOMES.get('castle'));
      expect(level.rooms).toHaveLength(4);
      expect(level.rooms[0]!.templateId).toBe('castle-gate');
      expect(level.rooms[3]!.templateId).toBe('castle-bridge');
      for (const room of level.rooms) {
        expect(room.outdoor, seed).toBe(true);
        expect(room.noUpperDoors, seed).toBe(true);
      }
      let oneWays = 0;
      let ladders = 0;
      for (let r = 0; r < ROOM_ROWS; r++) {
        for (let c = 0; c < level.grid.cols; c++) {
          if (level.grid.get(c, r) === Tile.OneWay) oneWays++;
          if (level.grid.get(c, r) === Tile.Ladder) ladders++;
        }
      }
      expect(oneWays, seed).toBe(0);
      expect(ladders, seed).toBe(0);
      expect(level.spawn.y, seed).toBe(level.exit.y);
      for (const room of level.rooms) {
        const c0 = (room.rect.x / level.grid.tileSize) | 0;
        for (let c = c0; c < c0 + ROOM_COLS; c++) expect(level.grid.get(c, ROOM_ROWS - 1), `${seed} ${c}`).toBe(Tile.Solid);
      }
    }
  });

  it('starts a medieval run with the loadout, infinite ammo and the castle biome', () => {
    const scene = makeScene('MEDIEVAL-RUN');
    const [, , , , , arsenal] = scene.world.first(Position, Body, Health, PlayerControl, Arsenal)!;
    expect(arsenal.weapons.map((w) => w.weapon.def.id)).toEqual(['iron-sword', 'shortbow', 'kite-shield', 'fire-staff', 'ward-staff']);
    for (const w of arsenal.weapons) expect(w.ammo).toBe(Infinity);
    expect(scene.level.rooms.map((r) => r.templateId)).toEqual(['castle-gate', expect.any(String), expect.any(String), 'castle-bridge']);
    const player = scene.world.first(Guard, SwordState);
    expect(player).not.toBeNull();

    // The whole pipeline runs with the medieval content (AI, bows, shields, effects, HUD).
    for (let i = 0; i < 120; i++) scene.update(1 / 60);
    expect(scene.world.first(Health, PlayerControl)![1].hp).toBeGreaterThan(0);
  });
});

describe('medieval shields', () => {
  it('blocks frontal damage, not hits from behind; the magic bubble blocks every side', () => {
    const world = new World();
    const ctx = testCtx();
    const e = spawnPlayer(world, PLAYER_DEF, { x: 100, y: 200 });
    const guard = world.get(e, Guard)!;
    const health = world.get(e, Health)!;
    const pc = world.get(e, PlayerControl)!;
    pc.facing = 1;
    guard.raised = true;
    const at = { x: 110, y: 186 };

    expect(applyDamage(world, ctx, e, { amount: 20, zone: 'torso', at, angle: Math.PI, from: { x: 160, y: 186 }, by: 'enemy' })).toBe('blocked');
    expect(health.hp).toBe(health.max);
    expect(guard.flash).toBeGreaterThan(0);

    expect(applyDamage(world, ctx, e, { amount: 20, zone: 'torso', at, angle: 0, from: { x: 40, y: 186 }, by: 'enemy' })).toBe('hit');
    expect(health.hp).toBe(health.max - 20);

    health.invulnLeft = 0;
    guard.magicLeft = 1;
    expect(applyDamage(world, ctx, e, { amount: 20, zone: 'torso', at, angle: 0, from: { x: 40, y: 186 }, by: 'enemy' })).toBe('blocked');
    expect(health.hp).toBe(health.max - 20);
  });

  it('scales the sword with cursor speed', () => {
    expect(swordDamage(24, 0)).toBeCloseTo(24 * 0.6);
    expect(swordDamage(24, SWORD_REFERENCE_SPEED)).toBeCloseTo(24);
    expect(swordDamage(24, SWORD_REFERENCE_SPEED * 4)).toBeCloseTo(24 * 1.8);
  });
});

describe('medieval projectiles', () => {
  it('a fireball hits its target and splashes nearby skeletons', () => {
    const world = new World();
    const ctx = testCtx();
    const a = spawnEnemy(world, 'skeleton-archer', { x: 100, y: 200 }, 1);
    const b = spawnEnemy(world, 'skeleton-mage', { x: 140, y: 200 }, -1);
    const apos = world.get(a, Position)!;
    const abody = world.get(a, Body)!;
    const center = bodyCenter(apos, abody);
    const weapon = assembleWeapon(WEAPONS.get('fire-staff'));
    spawnProjectile(world, 'player', weapon, { x: center.x - 4, y: center.y }, 0);
    projectileSystem.update(world, ctx);

    expect(world.get(a, Health)!.hp).toBeLessThan(world.get(a, Health)!.max);
    expect(world.get(b, Health)!.hp).toBeLessThan(world.get(b, Health)!.max);
    expect([...world.query(Projectile)]).toHaveLength(0);
  });
});

describe('medieval sword', () => {
  it('a fast cursor flick swings the sword and hurts a skeleton in front', () => {
    const world = new World();
    const ctx = testCtx();
    const p = spawnPlayer(world, PLAYER_DEF, { x: 100, y: 200 });
    const [, ppos, pbody, arsenal] = world.first(Position, Body, Arsenal, PlayerControl)!;
    expect(p).toBeDefined();
    arsenal.weapons = [weaponState(assembleWeapon(WEAPONS.get('iron-sword')))];
    arsenal.active = 0;
    const sword = world.get(p, SwordState)!;
    const aim = world.get(p, Aim)!;
    const enemy = spawnEnemy(world, 'skeleton-knight', { x: 130, y: 200 }, 1);
    const health = world.get(enemy, Health)!;

    const cx = ppos.x + pbody.w / 2;
    const cy = ppos.y + pbody.h / 2;
    sword.lastX = cx;
    sword.lastY = cy;
    aim.x = cx + 30;
    aim.y = cy;
    medievalSystem.update(world, ctx);
    expect(sword.swingLeft).toBeGreaterThan(0);
    expect(health.hp).toBeLessThan(health.max);

    const hp = health.hp;
    aim.x = cx + 60;
    medievalSystem.update(world, ctx);
    expect(health.hp).toBe(hp);
  });

  it('casting the ward staff raises a timed magic bubble', () => {
    const world = new World();
    const ctx = testCtx();
    const p = spawnPlayer(world, PLAYER_DEF, { x: 100, y: 200 });
    const [, , , arsenal] = world.first(Position, Body, Arsenal, PlayerControl)!;
    arsenal.weapons = [weaponState(assembleWeapon(WEAPONS.get('ward-staff')))];
    arsenal.active = 0;
    const intent = world.get(p, Intent)!;
    intent.firePressed = true;
    medievalSystem.update(world, ctx);
    const guard = world.get(p, Guard)!;
    expect(guard.magicLeft).toBeGreaterThan(0);
    expect(guard.magicLeft).toBeLessThanOrEqual(MAGIC_SHIELD.duration);
    expect(ctx.noises.length).toBe(1);
  });
});
