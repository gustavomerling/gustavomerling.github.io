import { describe, expect, it } from 'vitest';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import { HumanoidAnimator } from './character/animator';
import { raycastParts, rigHitParts } from './character/hitbox';
import { HIT_ZONES } from './config';
import { ricochetAxis } from './systems/combat';
import { HB } from './character/humanoid';
import { ATTACHMENTS } from './content/attachments/catalog';
import { BIOME_ORDER, BIOMES } from './content/biomes/catalog';
import { PLAYER_DEF } from './content/characters/player';
import { ENEMIES } from './content/enemies/catalog';
import { ITEMS } from './content/items/catalog';
import { assembleWeapon } from './content/weapons/assemble';
import { WEAPONS } from './content/weapons/catalog';
import { DEFAULT_BINDINGS, ACTIONS } from './input/actions';
import { generateLevel } from './procgen/level';
import { ROOM_TEMPLATES, validateTemplate } from './procgen/rooms';

describe('content integrity', () => {
  it('every enemy weapon, biome enemy and starting item exists', () => {
    for (const e of ENEMIES.all()) if (e.weaponId) expect(WEAPONS.has(e.weaponId)).toBe(true);
    for (const b of BIOMES.all()) for (const e of b.enemyPool) expect(ENEMIES.has(e.id)).toBe(true);
    for (const id of BIOME_ORDER) expect(BIOMES.has(id)).toBe(true);
    for (const i of PLAYER_DEF.startingItems) expect(ITEMS.has(i.itemId)).toBe(true);
    for (const w of PLAYER_DEF.startingWeapons) {
      expect(() => assembleWeapon(WEAPONS.get(w.weaponId), w.attachments.map((a) => ATTACHMENTS.get(a)))).not.toThrow();
    }
  });

  it('every attachment fits at least one gun', () => {
    for (const a of ATTACHMENTS.all()) {
      const fits = WEAPONS.all().some((w) => {
        try {
          assembleWeapon(w, [a]);
          return true;
        } catch {
          return false;
        }
      });
      expect(fits, a.id).toBe(true);
    }
  });

  it('every action has at least one binding', () => {
    for (const a of ACTIONS) expect(DEFAULT_BINDINGS[a].length, a).toBeGreaterThan(0);
  });

  it('room templates are well-formed', () => {
    for (const t of ROOM_TEMPLATES) expect(validateTemplate(t)).toEqual([]);
  });

  it('every biome has room templates', () => {
    for (const b of BIOMES.all()) expect(ROOM_TEMPLATES.some((t) => t.tags.some((tag) => b.roomTags.includes(tag))), b.id).toBe(true);
  });
});

describe('assembleWeapon', () => {
  const glock = WEAPONS.get('glock');

  it('applies add before mul and rounds integer stats', () => {
    const w = assembleWeapon(glock, [ATTACHMENTS.get('extended-mag')]);
    expect(w.stats.magazine).toBe(Math.round(17 * 1.5));
    expect(w.stats.reloadTime).toBeCloseTo(1.1 * 1.15);
  });

  it('collects behaviours and fire mode overrides', () => {
    const w = assembleWeapon(glock, [ATTACHMENTS.get('auto-kit'), ATTACHMENTS.get('ricochet-rounds')]);
    expect(w.fireMode).toBe('auto');
    expect(w.behaviors.has('ricochet')).toBe(true);
  });

  it('rejects invalid combos', () => {
    expect(() => assembleWeapon(glock, [ATTACHMENTS.get('suppressor'), ATTACHMENTS.get('compensator')])).toThrow(/already taken/);
    expect(() => assembleWeapon(WEAPONS.get('ak47'), [ATTACHMENTS.get('auto-kit')])).toThrow();
  });
});

describe('humanoid rig', () => {
  const states = ['idle', 'run', 'sprint', 'crouch', 'slide', 'air'] as const;

  it('produces finite poses in every state, armed and unarmed, both facings', () => {
    for (const weaponClass of [null, 'pistol', 'smg', 'rifle'] as const) {
      const anim = new HumanoidAnimator(24);
      for (const state of states) {
        for (const facing of [1, -1] as const) {
          for (let i = 0; i < 30; i++) anim.update(1 / 60, { state, vx: 120 * facing, vy: -50, facing, aimAngle: 0.4, weaponClass });
          for (const t of anim.sample(0.5)) {
            for (const v of [t.x0, t.y0, t.x1, t.y1, t.angle]) expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
  });

  it('standing idle: feet on the ground, head above them, inside the collider height', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 120; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, weaponClass: 'pistol' });
    const bones = anim.sample(1);
    expect(bones[HB.legFrontLower]!.y1).toBeCloseTo(0, 0);
    expect(bones[HB.legBackLower]!.y1).toBeCloseTo(0, 0);
    const headTop = Math.min(bones[HB.head]!.y0, bones[HB.head]!.y1);
    expect(headTop).toBeLessThan(-20);
    expect(headTop).toBeGreaterThan(-27);
  });

  it('crouching keeps the body roughly within the crouch collider', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 120; i++) anim.update(1 / 60, { state: 'crouch', vx: 0, vy: 0, facing: 1, aimAngle: 0, weaponClass: null });
    const head = anim.sample(1)[HB.head]!;
    expect(Math.min(head.y0, head.y1)).toBeGreaterThan(-18);
  });

  it('the gun points where the character aims', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: -0.5, weaponClass: 'rifle' });
    const hand = anim.sample(1)[HB.armFrontLower]!;
    const muzzle = anim.muzzleLocal()!;
    expect(Math.atan2(muzzle.y - hand.y1, muzzle.x - hand.x1)).toBeCloseTo(-0.5, 3);
  });
});

describe('hitboxes', () => {
  const standing = () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: -1, aimAngle: Math.PI, weaponClass: 'pistol' });
    // Feet at (100, 200), facing left.
    return rigHitParts(anim, 100, 200);
  };

  it('a horizontal shot at head height is a headshot, at knee height a leg shot', () => {
    const parts = standing();
    const head = parts.find((p) => p.zone === 'head')!;
    expect(raycastParts(parts, 40, head.y0, 160, head.y0)?.zone).toBe('head');
    expect(raycastParts(parts, 40, 196, 160, 196)?.zone).toBe('leg');
    expect(raycastParts(parts, 40, 150, 160, 150)).toBeNull();
  });

  it('head hurts more than torso, torso more than legs', () => {
    expect(HIT_ZONES.head.multiplier).toBeGreaterThan(HIT_ZONES.torso.multiplier);
    expect(HIT_ZONES.torso.multiplier).toBeGreaterThan(HIT_ZONES.leg.multiplier);
  });
});

describe('ricochet', () => {
  // Wall on column 5 (x 80..96).
  const grid = new TileGrid(10, 10, 16);
  grid.fill(5, 0, 1, 10, Tile.Solid);

  it('grazing shots bounce, steep ones stop', () => {
    // Moving right and mostly down: 20° from the wall surface -> bounce off X.
    const graze = (20 * Math.PI) / 180;
    expect(ricochetAxis(grid, 79, 50, 81, 55, Math.sin(graze) * 100, Math.cos(graze) * 100, false)).toBe('x');
    // Head-on (90°) -> stop.
    expect(ricochetAxis(grid, 79, 50, 81, 50, 100, 0, false)).toBeNull();
    // 60° -> stop, unless ricochet ammo.
    const steep = (60 * Math.PI) / 180;
    expect(ricochetAxis(grid, 79, 50, 81, 51, Math.sin(steep) * 100, Math.cos(steep) * 100, false)).toBeNull();
    expect(ricochetAxis(grid, 79, 50, 81, 51, Math.sin(steep) * 100, Math.cos(steep) * 100, true)).toBe('x');
  });
});

describe('procgen', () => {
  it('levels run left to right: one row, spawn in the first room, exit in the last', () => {
    for (const biome of BIOMES.all()) {
      const level = generateLevel('LTR', biome);
      expect(level.rooms.every((r) => r.cell.cy === 0)).toBe(true);
      expect(level.rooms.map((r) => r.cell.cx)).toEqual(level.rooms.map((_, i) => i));
      expect(level.spawn.x).toBeLessThan(level.rooms[0]!.rect.x + level.rooms[0]!.rect.w);
      expect(level.exit.x).toBeGreaterThan(level.rooms[level.rooms.length - 1]!.rect.x);
      if (biome.startTemplate) expect(level.rooms[0]!.templateId).toBe(biome.startTemplate);
      if (biome.endTemplate) expect(level.rooms[level.rooms.length - 1]!.templateId).toBe(biome.endTemplate);
    }
  });

  it('peaceful biomes (apartment) spawn no enemies; the test scenario does', () => {
    expect(generateLevel('X', BIOMES.get('apartment')).enemySpawns).toEqual([]);
    expect(generateLevel('X', BIOMES.get('alleys')).enemySpawns.length).toBeGreaterThan(3);
  });

  it('same seed -> same level; different seed -> different level', () => {
    const biome = BIOMES.get('alleys');
    const a = generateLevel('ABCD-1234', biome);
    const b = generateLevel('ABCD-1234', biome);
    const c = generateLevel('ZZZZ-9999', biome);
    expect(Array.from(a.grid.data)).toEqual(Array.from(b.grid.data));
    expect(a.spawn).toEqual(b.spawn);
    expect(Array.from(a.grid.data)).not.toEqual(Array.from(c.grid.data));
  });

  it('spawn and exit stand on floor in open space, across many seeds and biomes', () => {
    for (const biome of BIOMES.all()) {
      for (let s = 0; s < 40; s++) {
        const level = generateLevel(`seed-${s}`, biome);
        for (const p of [level.spawn, level.exit]) {
          const ts = level.grid.tileSize;
          const col = Math.floor(p.x / ts);
          const row = p.y / ts; // feet are on a tile boundary
          expect(Number.isInteger(row)).toBe(true);
          expect(level.grid.get(col, row - 1)).toBe(Tile.Empty);
          expect(level.grid.get(col, row - 2)).toBe(Tile.Empty);
          expect(level.grid.get(col, row)).not.toBe(Tile.Empty);
        }
        expect(level.rooms.length).toBeGreaterThanOrEqual(biome.rooms.min);
        expect(level.rooms.length).toBeLessThanOrEqual(biome.rooms.max);
      }
    }
  });
});
