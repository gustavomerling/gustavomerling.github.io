import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/core/events';
import type { Entity } from '@engine/ecs/world';
import { World } from '@engine/ecs/world';
import { Input } from '@engine/input/input';
import { Rng } from '@engine/math/rng';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import type { Renderer } from '@engine/render/renderer';
import { FENCE_AI, FENCING_KITS, RIPOSTE_MULTIPLIER } from './content/blades/kits';
import { BIOMES } from './content/biomes/catalog';
import { PLAYER_DEF } from './content/characters/player';
import { ENEMIES } from './content/enemies/catalog';
import { RUN_MODES } from './content/modes/catalog';
import { WEAPONS } from './content/weapons/catalog';
import type { GameEvents } from './events';
import { KICK } from './config';
import { DEFAULT_BINDINGS } from './input/actions';
import { generateLevel } from './procgen/level';
import { ROOM_COLS, ROOM_ROWS } from './procgen/rooms';
import { RunScene } from './scenes/RunScene';
import type { RunContext } from './systems/context';
import { applyDamage } from './systems/damage';
import { fencerBrain } from './systems/fencerAi';
import { enter, fencingSystem } from './systems/fencing';
import { GUARD_KICK, playerMeleeSystem } from './systems/melee';
import { Aim, Arsenal, Body, Brain, Fencer, Health, Intent, Npc, PlayerControl, Position, Velocity } from './world/components';
import { spawnEnemy, spawnPlayer } from './world/prefabs';

const MEDIEVAL_PLAYER = { ...PLAYER_DEF, startingWeapons: RUN_MODES.get('medieval').loadout! };

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

function makeScene(seed: string, input = new Input(DEFAULT_BINDINGS)) {
  const scene = new RunScene({
    renderer: { width: 480, height: 270 } as Renderer,
    input,
    bus: new EventBus<GameEvents>(),
    seed,
    biomeId: 'alleys',
    mode: 'medieval',
    frameStats: { fps: 0, steps: 0 },
    debugOverlay: false,
    grid: false,
    onExit: () => undefined,
    onReplay: () => undefined,
  });
  scene.enter();
  return scene;
}

/** The player (facing right) and one enemy `gap` px to its right, facing it. No AI: tests drive the intents. */
function duel(enemyId: string, gap: number) {
  const world = new World();
  const ctx = testCtx();
  const player = spawnPlayer(world, MEDIEVAL_PLAYER, { x: 100, y: 200 });
  world.get(player, PlayerControl)!.facing = 1;
  const enemy = spawnEnemy(world, enemyId, { x: 100 + gap, y: 200 }, -1);
  /** Runs the fencing system for `steps` steps; `press` sets intents before each one (fire is a one-step press). */
  const run = (steps: number, press?: (i: number) => void) => {
    for (let i = 0; i < steps; i++) {
      for (const e of [player, enemy]) {
        const intent = world.get(e, Intent)!;
        intent.firePressed = false;
      }
      press?.(i);
      fencingSystem.update(world, ctx);
    }
  };
  const intent = (e: Entity) => world.get(e, Intent)!;
  const fencer = (e: Entity) => world.get(e, Fencer)!;
  return { world, ctx, player, enemy, run, intent, fencer };
}

const steps = (seconds: number) => Math.ceil(seconds * 60);

describe('medieval content', () => {
  it('fights with sword and shield: one blade, two kits, three skeletons', () => {
    const mode = RUN_MODES.get('medieval');
    expect(mode.biomeId).toBe('castle');
    expect(mode.loadout?.map((w) => w.weaponId)).toEqual(['iron-sword']);
    expect(WEAPONS.get('iron-sword').behaviors).toContain('blade');
    expect(FENCING_KITS.get('player').swings).toHaveLength(3);
    expect(FENCING_KITS.get('skeleton').swings.length).toBeGreaterThan(0);
    for (const id of ['skeleton', 'skeleton-knight', 'skeleton-archer']) expect(ENEMIES.get(id).skeleton, id).toBe(true);
    expect(ENEMIES.get('skeleton').brain).toBe('fencer');
    expect(ENEMIES.get('skeleton-knight').shield).toBe(true);
    expect(ENEMIES.get('skeleton-knight').fencingKit).toBe('knight');
    expect(mode.enemyPool!.map((e) => e.id)).toContain('skeleton-archer');
    // Every AI kit attacks from inside its own blade's reach and measures from outside it.
    for (const id of ['skeleton', 'knight']) {
      const ai = FENCING_KITS.get(id).ai!;
      expect(ai.strikeRange, id).toBeLessThan(ai.measure.min);
      expect(ai.measure.min, id).toBeLessThan(ai.measure.max);
    }
    expect(ENEMIES.get('skeleton-archer').weaponId).toBe('shortbow');
    for (const e of mode.enemyPool!) expect(() => ENEMIES.get(e.id)).not.toThrow();
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
      let extras = 0;
      for (let r = 0; r < ROOM_ROWS; r++) {
        for (let c = 0; c < level.grid.cols; c++) {
          const t = level.grid.get(c, r);
          if (t === Tile.OneWay || t === Tile.Ladder) extras++;
        }
      }
      expect(extras, seed).toBe(0);
      expect(level.spawn.y, seed).toBe(level.exit.y);
      for (const room of level.rooms) {
        const c0 = (room.rect.x / level.grid.tileSize) | 0;
        for (let c = c0; c < c0 + ROOM_COLS; c++) expect(level.grid.get(c, ROOM_ROWS - 1), `${seed} ${c}`).toBe(Tile.Solid);
      }
    }
  });

  it('starts a medieval run as a sword-and-shield fighter and plays through the pipeline', () => {
    const scene = makeScene('MEDIEVAL-RUN');
    const [e, , , , , arsenal] = scene.world.first(Position, Body, Health, PlayerControl, Arsenal)!;
    expect(arsenal.weapons.map((w) => w.weapon.def.id)).toEqual(['iron-sword']);
    expect(scene.world.get(e, Fencer)).toMatchObject({ kitId: 'player', shield: true, phase: 'ready' });
    for (let i = 0; i < 120; i++) scene.update(1 / 60);
    expect(scene.world.first(Health, PlayerControl)![1].hp).toBeGreaterThan(0);
  });

  it('the campaign player has no shield', () => {
    const world = new World();
    const p = spawnPlayer(world, PLAYER_DEF, { x: 100, y: 200 });
    expect(world.get(p, Fencer)).toBeUndefined();
  });
});

describe('sword', () => {
  it('a click winds up, cuts and recovers; the cut hurts a skeleton in reach once', () => {
    const d = duel('skeleton', 18);
    const hp = d.world.get(d.enemy, Health)!;
    const swing = FENCING_KITS.get('player').swings[0]!;
    d.run(1, () => (d.intent(d.player).firePressed = true));
    expect(d.fencer(d.player).phase).toBe('windup');
    d.run(steps(swing.windup + swing.active));
    expect(hp.hp).toBe(hp.max - swing.damage);
    expect(d.fencer(d.enemy).phase).toBe('hurt');
    d.run(steps(swing.recover) + 2);
    expect(hp.hp).toBe(hp.max - swing.damage);
    expect(d.fencer(d.player).phase).toBe('ready');
  });

  it('misses a skeleton out of reach', () => {
    const d = duel('skeleton', 45);
    d.run(1, () => (d.intent(d.player).firePressed = true));
    d.run(steps(0.6));
    const hp = d.world.get(d.enemy, Health)!;
    expect(hp.hp).toBe(hp.max);
  });

  it('clicking again chains the combo: cut, cut, thrust, then it starts over', () => {
    const d = duel('skeleton', 200);
    const seen: number[] = [];
    d.run(steps(2.5), (i) => {
      if (i % 6 === 0 && i < steps(1.2)) d.intent(d.player).firePressed = true;
      const f = d.fencer(d.player);
      if (f.phase === 'windup' && seen[seen.length - 1] !== f.swing) seen.push(f.swing);
    });
    expect(seen.slice(0, 3)).toEqual([0, 1, 2]);
    expect(seen[3]).toBe(0);
  });

  it('a stunned fighter takes extra damage (riposte)', () => {
    const d = duel('skeleton', 18);
    enter(d.fencer(d.enemy), 'stunned', 2);
    d.run(1, () => (d.intent(d.player).firePressed = true));
    d.run(steps(0.3));
    const hp = d.world.get(d.enemy, Health)!;
    expect(hp.max - hp.hp).toBeCloseTo(FENCING_KITS.get('player').swings[0]!.damage * RIPOSTE_MULTIPLIER);
  });
});

describe('shield', () => {
  const blow = (from: number) => ({ amount: 10, zone: 'torso' as const, at: { x: 100, y: 188 }, angle: from > 100 ? Math.PI : 0, from: { x: from, y: 188 }, by: 'enemy' as const });

  it('parries a blow right after going up, blocks it later for stamina, and never covers the back', () => {
    const d = duel('skeleton', 200);
    const f = d.fencer(d.player);
    const health = d.world.get(d.player, Health)!;
    d.intent(d.player).blockHeld = true;
    d.run(1);
    expect(f.phase).toBe('block');
    expect(applyDamage(d.world, d.ctx, d.player, blow(130))).toBe('parried');
    expect(f.stamina).toBe(FENCING_KITS.get('player').stamina);

    d.run(steps(0.4));
    expect(applyDamage(d.world, d.ctx, d.player, blow(130))).toBe('blocked');
    expect(f.stamina).toBe(FENCING_KITS.get('player').stamina - 10 * FENCING_KITS.get('player').blockCost);
    expect(health.hp).toBe(health.max);

    expect(applyDamage(d.world, d.ctx, d.player, blow(60))).toBe('hit');
    expect(health.hp).toBe(health.max - 10);
  });

  it('runs out of stamina: the guard breaks and the fighter is stunned', () => {
    const d = duel('skeleton', 200);
    const f = d.fencer(d.player);
    d.intent(d.player).blockHeld = true;
    d.run(steps(0.4));
    for (let i = 0; i < 20 && f.phase === 'block'; i++) applyDamage(d.world, d.ctx, d.player, blow(130));
    expect(f.phase).toBe('stunned');
    expect(f.stamina).toBe(0);
    d.run(steps(FENCING_KITS.get('player').guardBreakStun) + 1);
    expect(f.phase).toBe('block'); // still holding the button: back up
  });

  it("a skeleton's cut parried by the player leaves it stunned", () => {
    const d = duel('skeleton', 18);
    const swing = FENCING_KITS.get('skeleton').swings[0]!;
    d.world.get(d.enemy, Brain)!.facing = -1;
    d.run(1, () => (d.intent(d.enemy).firePressed = true));
    // Raise the shield just before the cut lands.
    d.run(steps(swing.windup) - 4);
    d.intent(d.player).blockHeld = true;
    d.run(steps(swing.active) + 4);
    expect(d.fencer(d.enemy).phase).toBe('stunned');
    const hp = d.world.get(d.player, Health)!;
    expect(hp.hp).toBe(hp.max);
  });

  it("the knight's raised shield stops the player's cut and bounces it", () => {
    const d = duel('skeleton-knight', 18);
    d.world.get(d.enemy, Brain)!.facing = -1;
    d.intent(d.enemy).blockHeld = true;
    d.run(steps(0.3));
    d.run(1, () => (d.intent(d.player).firePressed = true));
    d.run(steps(0.3));
    const hp = d.world.get(d.enemy, Health)!;
    expect(hp.hp).toBe(hp.max);
    expect(d.fencer(d.enemy).stamina).toBeLessThan(FENCING_KITS.get('knight').stamina);
  });
});

/** Medieval scene with the player at the spawn and one fresh enemy `gap` px to the right. */
function arena(enemyId: string, gap: number) {
  const input = new Input(DEFAULT_BINDINGS);
  // Pointer on the right of the screen: the player faces the enemy.
  input.pointer.x = 420;
  input.pointer.y = 135;
  const scene = makeScene('MEDIEVAL-AI', input);
  const w = scene.world;
  // Only the enemy under test.
  for (const [e] of [...w.query(Brain)]) w.destroy(e);
  w.flush();
  const [player, pos, body] = w.first(Position, Body, PlayerControl)!;
  const feet = { x: pos.x + body.w / 2 + gap, y: pos.y + body.h };
  const enemy = spawnEnemy(w, enemyId, feet, -1);
  return { scene, w, player, enemy, input };
}

describe('skeleton AI', () => {
  it('a skeleton walks up and cuts a player who stands still', () => {
    const { scene, w, player } = arena('skeleton', 90);
    for (let i = 0; i < steps(4); i++) scene.update(1 / 60);
    const hp = w.get(player, Health)!;
    expect(hp.hp).toBeLessThan(hp.max);
  });

  it('a player holding the shield up takes nothing from its first cuts', () => {
    const { scene, w, player, input } = arena('skeleton', 90);
    input.simulate('Mouse2', true);
    const f = w.get(player, Fencer)!;
    let blocked = 0;
    for (let i = 0; i < steps(3); i++) {
      scene.update(1 / 60);
      if (f.flash > 0.17) blocked++;
      if (blocked >= 2) break;
    }
    expect(blocked).toBeGreaterThanOrEqual(1);
    const hp = w.get(player, Health)!;
    expect(hp.hp).toBe(hp.max);
  });
});

describe('fencing depth', () => {
  const blow = { amount: 10, zone: 'torso' as const, at: { x: 100, y: 188 }, angle: Math.PI, from: { x: 130, y: 188 }, by: 'enemy' as const };

  it('mashing the shield only blocks: a parry needs it down for a moment before the raise', () => {
    const d = duel('skeleton', 200);
    const kit = FENCING_KITS.get('player');
    const i = d.intent(d.player);
    i.blockHeld = true;
    d.run(1);
    i.blockHeld = false;
    d.run(2);
    i.blockHeld = true;
    d.run(1);
    expect(applyDamage(d.world, d.ctx, d.player, blow)).toBe('blocked');
    i.blockHeld = false;
    d.run(steps(kit.parryRearm) + 1);
    i.blockHeld = true;
    d.run(1);
    expect(applyDamage(d.world, d.ctx, d.player, blow)).toBe('parried');
  });

  it('every swing costs the player stamina (the guard runs on it too)', () => {
    const d = duel('skeleton', 200);
    d.run(1, () => (d.intent(d.player).firePressed = true));
    expect(d.fencer(d.player).stamina).toBe(FENCING_KITS.get('player').stamina - FENCING_KITS.get('player').swings[0]!.staminaCost!);
  });

  /** The knight 18 px to the right, facing the player, shield up for a while. */
  function knightGuarding() {
    const d = duel('skeleton-knight', 18);
    d.world.get(d.enemy, Brain)!.facing = -1;
    d.intent(d.enemy).blockHeld = true;
    d.run(steps(0.3));
    return d;
  }

  it('a cut stopped by a shield recovers slowly (the opening for a counter)', () => {
    const d = knightGuarding();
    const swing = FENCING_KITS.get('player').swings[0]!;
    d.run(1, () => (d.intent(d.player).firePressed = true));
    let recover = 0;
    d.run(steps(swing.windup + swing.active) + 2, () => {
      const f = d.fencer(d.player);
      if (f.phase === 'recover' && recover === 0) recover = f.duration;
    });
    expect(recover).toBeCloseTo(swing.recover * FENCING_KITS.get('player').blockedRecover);
  });

  it("the heavy finisher breaks a knight's guard on its own", () => {
    const d = knightGuarding();
    const heavy = FENCING_KITS.get('player').swings[2]!;
    d.fencer(d.player).opener = 2;
    d.run(1, () => (d.intent(d.player).firePressed = true));
    expect(d.fencer(d.player).swing).toBe(2);
    d.run(steps(heavy.windup + heavy.active) + 2);
    expect(d.fencer(d.enemy).phase).toBe('stunned');
    expect(d.fencer(d.enemy).stamina).toBe(0);
    const hp = d.world.get(d.enemy, Health)!;
    expect(hp.hp).toBe(hp.max);
  });

  it('a kick knocks a raised shield aside and eats its stamina, without damage', () => {
    const d = knightGuarding();
    const input = new Input(DEFAULT_BINDINGS);
    d.ctx.input = input;
    input.simulate('KeyQ', true);
    for (let i = 0; i < steps(KICK.time); i++) {
      input.beginTick();
      playerMeleeSystem.update(d.world, d.ctx);
    }
    const f = d.fencer(d.enemy);
    expect(f.phase).toBe('hurt');
    expect(f.duration).toBe(GUARD_KICK.open);
    expect(f.stamina).toBeCloseTo(FENCING_KITS.get('knight').stamina - KICK.damage * FENCING_KITS.get('knight').blockCost * GUARD_KICK.guardDamage);
    const hp = d.world.get(d.enemy, Health)!;
    expect(hp.hp).toBe(hp.max);
  });

  it("the knight's counter-cut is armoured: hitting it doesn't stop it", () => {
    const d = duel('skeleton-knight', 18);
    d.world.get(d.enemy, Brain)!.facing = -1;
    const counter = FENCING_KITS.get('knight').swings[1]!;
    expect(counter.armor).toBe(true);
    d.fencer(d.enemy).opener = 1;
    d.run(1, () => {
      d.intent(d.enemy).firePressed = true;
      d.intent(d.player).firePressed = true;
    });
    const hp = d.world.get(d.enemy, Health)!;
    const phases = new Set<string>();
    d.run(steps(counter.windup + counter.active), () => phases.add(d.fencer(d.enemy).phase));
    expect(hp.hp).toBeLessThan(hp.max);
    expect(phases.has('hurt')).toBe(false);
    expect(phases.has('strike')).toBe(true);
    const php = d.world.get(d.player, Health)!;
    expect(php.hp).toBeLessThan(php.max);
  });
});

describe('fencer AI', () => {
  /** One AI step for the duel's enemy (what aiSystem does for a 'fencer' brain that sees the player). */
  function think(d: ReturnType<typeof duel>) {
    const w = d.world;
    const intent = d.intent(d.enemy);
    intent.firePressed = false;
    intent.blockHeld = false;
    const ppos = w.get(d.player, Position)!;
    const pbody = w.get(d.player, Body)!;
    const center = { x: ppos.x + pbody.w / 2, y: ppos.y + pbody.h / 2 };
    const npc = w.get(d.enemy, Npc)!;
    fencerBrain(
      w,
      d.enemy,
      d.ctx,
      ENEMIES.get(npc.defId),
      w.get(d.enemy, Brain)!,
      intent,
      w.get(d.enemy, Aim)!,
      w.get(d.enemy, Position)!,
      w.get(d.enemy, Velocity)!,
      w.get(d.enemy, Body)!,
      { e: d.player, center },
      true,
      1 / 60,
    );
  }

  it('the knight answers a blocked cut with its quick counter (most of the time)', () => {
    let counters = 0;
    const trials = 12;
    for (let t = 0; t < trials; t++) {
      const d = duel('skeleton-knight', 18);
      d.ctx.rng = Rng.fromString(`counter-${t}`);
      const brain = d.world.get(d.enemy, Brain)!;
      brain.facing = -1;
      brain.cooldownLeft = 99; // never attacks on its own here
      d.fencer(d.enemy).ai.mode = 'measure';
      d.run(steps(0.3), () => think(d));
      expect(d.fencer(d.enemy).phase).toBe('block');
      d.run(1, () => {
        think(d);
        d.intent(d.player).firePressed = true;
      });
      let countered = false;
      d.run(steps(0.6), () => {
        think(d);
        const f = d.fencer(d.enemy);
        if (f.phase === 'windup' && f.swing === FENCING_KITS.get('knight').ai!.counterSwing) countered = true;
      });
      if (countered) counters++;
    }
    expect(counters).toBeGreaterThan(0);
    expect(counters).toBeLessThan(trials);
  });

  it('a knight is slow to turn: the player behind it has a moment', () => {
    const d = duel('skeleton-knight', 18);
    const brain = d.world.get(d.enemy, Brain)!;
    brain.facing = -1;
    d.fencer(d.enemy).ai.mode = 'measure';
    d.run(1, () => think(d));
    // The player rolls past: perception turns the brain at once, the body follows later.
    d.world.get(d.player, Position)!.x += 40;
    let turnedAfter = -1;
    for (let i = 0; i < steps(1) && turnedAfter < 0; i++) {
      brain.facing = 1;
      d.run(1, () => think(d));
      if (brain.facing === 1) turnedAfter = i;
    }
    expect(turnedAfter / 60).toBeGreaterThanOrEqual(FENCING_KITS.get('knight').turnTime - 0.05);
    expect(turnedAfter / 60).toBeLessThan(FENCING_KITS.get('knight').turnTime + 0.1);
  });

  it('attack tokens: two skeletons around the player never swing at the same time', () => {
    const { scene, w, player } = arena('skeleton', 60);
    const [, pos, body] = w.first(Position, Body, PlayerControl)!;
    spawnEnemy(w, 'skeleton', { x: pos.x + body.w / 2 - 60, y: pos.y + body.h }, 1);
    let both = 0;
    let attacks = 0;
    let wasSwinging = false;
    for (let i = 0; i < steps(6); i++) {
      scene.update(1 / 60);
      const swinging = [...w.query(Fencer, Npc)].filter(([, f]) => f.phase === 'windup' || f.phase === 'strike').length;
      if (swinging > FENCE_AI.attackers) both++;
      if (swinging > 0 && !wasSwinging) attacks++;
      wasSwinging = swinging > 0;
    }
    expect(attacks).toBeGreaterThan(1);
    expect(both).toBe(0);
    expect(w.get(player, Health)!.hp).toBeGreaterThan(0);
  });

  it('a waiting skeleton keeps out of reach instead of standing in the player\'s face', () => {
    const { scene, w, player, enemy } = arena('skeleton', 80);
    const brain = w.get(enemy, Brain)!;
    const ppos = w.get(player, Position)!;
    const epos = w.get(enemy, Position)!;
    const ai = FENCING_KITS.get('skeleton').ai!;
    const gaps: number[] = [];
    for (let i = 0; i < steps(3); i++) {
      brain.cooldownLeft = 99; // never gets to attack
      scene.update(1 / 60);
      if (i > steps(1.5)) gaps.push(Math.abs(epos.x - ppos.x));
    }
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(ai.measure.min - 6);
    expect(Math.max(...gaps)).toBeLessThanOrEqual(ai.measure.max + 6);
  });
});
