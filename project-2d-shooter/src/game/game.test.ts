import { describe, expect, it } from 'vitest';
import { Tile, TileGrid } from '@engine/physics/tilegrid';
import { HumanoidAnimator } from './character/animator';
import { raycastParts, rigHitParts } from './character/hitbox';
import { HB } from './character/humanoid';
import { HIT_ZONES, PLAYER_TUNING, TILE, VIEW } from './config';
import { ricochetAxis, segmentEntersRect, zoneAt } from './systems/combat';
import { ATTACHMENTS } from './content/attachments/catalog';
import { BIOME_ORDER, BIOMES } from './content/biomes/catalog';
import { PLAYER_DEF } from './content/characters/player';
import { ENEMIES } from './content/enemies/catalog';
import { assembleWeapon } from './content/weapons/assemble';
import { WEAPONS } from './content/weapons/catalog';
import { GUN_MODELS, withAttachments } from './content/weapons/models';
import { DEFAULT_BINDINGS, ACTIONS } from './input/actions';
import { generateLevel, type LevelData } from './procgen/level';
import { DOOR_ROWS, ROOM_COLS, ROOM_ROWS, ROOM_TEMPLATES, SLAB_ROWS, STOREY_ROWS, sideWindowRows, validateTemplate } from './procgen/rooms';

describe('content integrity', () => {
  it('every enemy weapon, biome enemy and starting weapon exists', () => {
    for (const e of ENEMIES.all()) if (e.weaponId) expect(WEAPONS.has(e.weaponId)).toBe(true);
    for (const b of BIOMES.all()) for (const e of b.enemyPool) expect(ENEMIES.has(e.id)).toBe(true);
    for (const id of BIOME_ORDER) expect(BIOMES.has(id)).toBe(true);
    for (const w of PLAYER_DEF.startingWeapons) {
      expect(() => assembleWeapon(WEAPONS.get(w.weaponId), w.attachments.map((a) => ATTACHMENTS.get(a)))).not.toThrow();
    }
  });

  it('every weapon has a gun model', () => {
    for (const w of WEAPONS.all()) expect(GUN_MODELS.has(w.model), w.id).toBe(true);
  });

  it('attachments show on the gun model: suppressor moves the muzzle and shrinks the flash; same loadout, same object', () => {
    const glock = GUN_MODELS.get('glock');
    const quiet = withAttachments(glock, ['suppressor']);
    expect(quiet.muzzle.x).toBeGreaterThan(glock.muzzle.x + 2);
    expect(quiet.flash).toBeLessThan(glock.flash);
    expect(quiet.parts.length).toBe(glock.parts.length + 1);
    expect(withAttachments(glock, ['suppressor'])).toBe(quiet);
    expect(withAttachments(glock, [])).toBe(glock);
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

  it('the map mixes named buildings (with windows) and open-air alleys', () => {
    const chunks = ROOM_TEMPLATES.filter((t) => t.tags.includes('alley'));
    const names = chunks.map((c) => c.name ?? c.id);
    expect(new Set(names).size).toBe(names.length);
    expect(chunks.some((c) => c.outdoor)).toBe(true);
    for (const c of chunks) {
      expect(c.name, c.id).toBeTruthy();
      if (c.outdoor) continue;
      expect(c.style, c.id).toBeDefined();
      expect(c.rows.join(''), c.id).toContain('W');
    }
  });

  it('buildings follow the storey grid: every storey has the same headroom', () => {
    for (const t of ROOM_TEMPLATES.filter((c) => !c.outdoor)) {
      // Slabs: rows that are solid across most of the building.
      const slabs = t.rows
        .map((row, r) => ({ r, solid: [...row.slice(1, -1)].filter((ch) => ch === '#').length }))
        .filter(({ solid }) => solid >= (ROOM_COLS - 2) / 3)
        .map(({ r }) => r);
      for (const r of slabs) expect((ROOM_ROWS - 1 - r) % STOREY_ROWS, `${t.id}: slab on row ${r} is off the storey grid`).toBe(0);
    }
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
  const states = ['idle', 'run', 'sprint', 'crouch', 'slide', 'takeoff', 'air', 'wallSlide', 'wallJump', 'roll', 'climb', 'mantle', 'crawl'] as const;
  const gun = (id: string) => GUN_MODELS.get(id);

  it('produces finite poses in every state, armed and unarmed, both facings', () => {
    for (const model of [null, ...GUN_MODELS.all()]) {
      const anim = new HumanoidAnimator(24);
      for (const state of states) {
        for (const facing of [1, -1] as const) {
          for (let i = 0; i < 30; i++) {
            anim.update(1 / 60, { state, vx: 120 * facing, vy: -50, facing, aimAngle: 0.4, gun: model, progress: i / 30, cycle: 1 - i / 30 });
          }
          for (const t of anim.sample(0.5)) {
            for (const v of [t.x0, t.y0, t.x1, t.y1, t.angle]) expect(Number.isFinite(v)).toBe(true);
          }
        }
      }
    }
  });

  it('standing idle: feet on the ground, head above them, inside the collider height', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 120; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: gun('glock') });
    const bones = anim.sample(1);
    expect(bones[HB.legFrontLower]!.y1).toBeCloseTo(0, 0);
    expect(bones[HB.legBackLower]!.y1).toBeCloseTo(0, 0);
    const headTop = Math.min(bones[HB.head]!.y0, bones[HB.head]!.y1);
    expect(headTop).toBeLessThan(-20);
    expect(headTop).toBeGreaterThan(-27);
  });

  it('crouching keeps the body roughly within the crouch collider', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 120; i++) anim.update(1 / 60, { state: 'crouch', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: null });
    const head = anim.sample(1)[HB.head]!;
    expect(Math.min(head.y0, head.y1)).toBeGreaterThan(-18);
  });

  it('crawling keeps the body low, on the floor', () => {
    const anim = new HumanoidAnimator(22);
    for (let i = 0; i < 120; i++) anim.update(1 / 60, { state: 'crawl', vx: 20, vy: 0, facing: 1, aimAngle: 0, gun: null });
    const bones = anim.sample(1);
    const head = bones[HB.head]!;
    expect(Math.min(head.y0, head.y1)).toBeGreaterThan(-16);
    expect(bones[HB.torso]!.y0).toBeGreaterThan(-5);
  });

  it('the gun points where the character aims, muzzle ahead of the hand', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: -0.5, gun: gun('ak47') });
    expect(anim.sampleGunAngle(1)).toBeCloseTo(-0.5, 3);
    const hand = anim.sample(1)[HB.armFrontLower]!;
    const muzzle = anim.muzzleLocal()!;
    const along = (muzzle.x - hand.x1) * Math.cos(-0.5) + (muzzle.y - hand.y1) * Math.sin(-0.5);
    expect(along).toBeCloseTo(GUN_MODELS.get('ak47').muzzle.x, 3);
  });

  it('both arms read separately on the gun (elbows apart, hands on grip and support)', () => {
    for (const id of ['glock', 'ak47', 'shotgun']) {
      const anim = new HumanoidAnimator(24);
      for (let i = 0; i < 60; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: gun(id) });
      const b = anim.sample(1);
      const elbowGap = Math.hypot(b[HB.armFrontUpper]!.x1 - b[HB.armBackUpper]!.x1, b[HB.armFrontUpper]!.y1 - b[HB.armBackUpper]!.y1);
      expect(elbowGap, `${id} elbows overlap`).toBeGreaterThan(1.5);
    }
  });

  it('on a ladder the body turns its back: shoulders spread, feet move only up and down, no muzzle', () => {
    const anim = new HumanoidAnimator(24);
    const feetX: number[] = [];
    const feetY: number[] = [];
    for (let i = 0; i < 90; i++) {
      anim.update(1 / 60, { state: 'climb', vx: 0, vy: -60, facing: 1, aimAngle: 0, gun: gun('glock') });
      if (i >= 40) {
        const b = anim.sample(1);
        feetX.push(b[HB.legFrontLower]!.x1);
        feetY.push(b[HB.legFrontLower]!.y1);
      }
    }
    expect(anim.backView).toBeGreaterThan(0.95);
    const b = anim.sample(1);
    expect(b[HB.armFrontUpper]!.x0 - b[HB.armBackUpper]!.x0).toBeGreaterThan(3);
    expect(Math.max(...feetX) - Math.min(...feetX), 'feet drift sideways').toBeLessThan(0.3);
    expect(Math.max(...feetY) - Math.min(...feetY), 'feet should step up and down').toBeGreaterThan(4);
    expect(anim.muzzleLocal()).toBeNull();
  });

  it('reloading drops the magazine once, carries a new one and seats it', () => {
    const anim = new HumanoidAnimator(24);
    const n = 90;
    let dropped = 0;
    let carried = false;
    let detached = false;
    for (let i = 0; i <= n; i++) {
      anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: gun('ak47'), reload: i < n ? i / n : undefined });
      dropped += anim.events.filter((e) => e.kind === 'mag').length;
      anim.events.length = 0;
      carried ||= anim.magInHand;
      detached ||= !anim.magAttached;
    }
    expect(dropped).toBe(1);
    expect(carried && detached).toBe(true);
    expect(anim.magAttached).toBe(true);
  });

  it('a shot ejects a casing (the shotgun only when pumped); switching guns dips the old one first', () => {
    const anim = new HumanoidAnimator(24);
    const idle = (model: string, cycle = 0) => anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: gun(model), cycle });
    for (let i = 0; i < 30; i++) idle('uzi');
    anim.kick(0.1);
    expect(anim.events.map((e) => e.kind)).toEqual(['casing']);
    anim.events.length = 0;

    for (let i = 0; i < 5; i++) idle('shotgun');
    expect(anim.gun?.id, 'old gun still in hand at the start of the swap').toBe('uzi');
    expect(anim.sampleGunAngle(1), 'old gun dips').toBeGreaterThan(0.3);
    for (let i = 0; i < 30; i++) idle('shotgun');
    expect(anim.gun?.id).toBe('shotgun');
    anim.events.length = 0;
    anim.kick(0.6);
    expect(anim.events).toHaveLength(0);
    for (let i = 0; i < 40; i++) idle('shotgun', 1 - i / 40);
    expect(anim.events.map((e) => e.kind)).toEqual(['casing']);
  });

  it('sliding mirrors with the aim instead of locking it (feet lead the travel)', () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 30; i++) anim.update(1 / 60, { state: 'slide', vx: 200, vy: 0, facing: -1, aimAngle: Math.PI, gun: gun('glock') });
    const b = anim.sample(1);
    // Facing left while sliding right: in local space the travel is -x, so the lead foot is at -x.
    expect(Math.min(b[HB.legFrontLower]!.x1, b[HB.legBackLower]!.x1)).toBeLessThan(-5);
  });

  it('a roll spins once and ends upright', () => {
    const anim = new HumanoidAnimator(24);
    const frames = 25;
    let minTorsoY = 0;
    for (let i = 0; i <= frames; i++) {
      anim.update(1 / 60, { state: 'roll', vx: 130, vy: 0, facing: 1, aimAngle: 0, gun: gun('glock'), progress: i / frames });
      const torso = anim.sample(1)[HB.torso]!;
      // Upside down at some point: the neck end below the hip end.
      minTorsoY = Math.min(minTorsoY, torso.y0 - torso.y1);
    }
    expect(minTorsoY).toBeLessThan(-3);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: gun('glock') });
    const torso = anim.sample(1)[HB.torso]!;
    expect(torso.y1).toBeLessThan(torso.y0);
  });

  it('jump phases: anticipation dips, the rise tucks the knees, the fall reaches down', () => {
    const anim = new HumanoidAnimator(24);
    const step = (state: 'idle' | 'takeoff' | 'air', vy: number, n: number) => {
      for (let i = 0; i < n; i++) anim.update(1 / 60, { state, vx: 0, vy, facing: 1, aimAngle: 0, gun: null });
      return anim.sample(1).map((t) => ({ ...t }));
    };
    const hipY = (b: ReturnType<typeof step>) => b[HB.torso]!.y0;
    const standing = hipY(step('idle', 0, 60));
    expect(hipY(step('takeoff', 0, 3)), 'anticipation lowers the hips').toBeGreaterThan(standing + 1);
    const rise = step('air', -250, 12);
    const fall = step('air', 300, 20);
    expect(rise[HB.legFrontLower]!.y1, 'knees up while rising').toBeLessThan(fall[HB.legFrontLower]!.y1 - 2);
  });
});


describe('rig hitboxes', () => {
  const standing = () => {
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < 60; i++) anim.update(1 / 60, { state: 'idle', vx: 0, vy: 0, facing: -1, aimAngle: Math.PI, gun: GUN_MODELS.get('glock') });
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

});


describe('collider hitboxes (bodies without a rig)', () => {
  const r = { x: 100, y: 100, w: 10, h: 24 };

  it('the zone comes from the height inside the collider', () => {
    expect(zoneAt(r, 102)).toBe('head');
    expect(zoneAt(r, 112)).toBe('torso');
    expect(zoneAt(r, 122)).toBe('leg');
  });

  it('a bullet segment enters the collider where it first touches it', () => {
    expect(segmentEntersRect(80, 110, 120, 110, r)).toBeCloseTo(0.5);
    expect(segmentEntersRect(80, 90, 120, 90, r)).toBeNull();
    expect(segmentEntersRect(105, 110, 106, 111, r)).toBe(0); // starts inside
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
      expect(level.rooms.map((r) => r.cell.cx)).toEqual(level.rooms.map((_, i) => i));
      expect(level.rooms.every((r) => r.cell.cy === 0)).toBe(true);
      expect(level.spawn.x).toBeLessThan(level.rooms[0]!.rect.x + level.rooms[0]!.rect.w);
      expect(level.exit.x).toBeGreaterThan(level.rooms[level.rooms.length - 1]!.rect.x);
      if (biome.startTemplate) expect(level.rooms[0]!.templateId).toBe(biome.startTemplate);
      if (biome.endTemplate) expect(level.rooms[level.rooms.length - 1]!.templateId).toBe(biome.endTemplate);
    }
  });

  it('the level is taller than the view, so the camera follows the player up', () => {
    const level = generateLevel('TALL', BIOMES.get('alleys'));
    expect(level.grid.heightPx).toBeGreaterThan(VIEW.height);
  });

  it('never repeats a chunk twice in a row, and alternates buildings with alleys', () => {
    const biome = BIOMES.get('alleys');
    for (let s = 0; s < 40; s++) {
      const rooms = generateLevel(`rhythm-${s}`, biome).rooms;
      for (let i = 1; i < rooms.length; i++) expect(rooms[i]!.templateId, `rhythm-${s}`).not.toBe(rooms[i - 1]!.templateId);
      // Every alley sits between two buildings.
      for (let i = 1; i < rooms.length - 1; i++) {
        if (rooms[i]!.outdoor) expect(rooms[i - 1]!.outdoor || rooms[i + 1]!.outdoor, `rhythm-${s}`).toBe(false);
      }
      expect(rooms.some((r) => r.outdoor), `rhythm-${s}`).toBe(true);
    }
  });

  it('enemies spawn outside the first room', () => {
    const level = generateLevel('X', BIOMES.get('alleys'));
    expect(level.enemySpawns.length).toBeGreaterThan(3);
    expect(level.enemySpawns.every((e) => e.roomIndex > 0)).toBe(true);
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

  it('spawn and exit stand on floor in open space, across many seeds', () => {
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

  it('every room has a name and a doorway at each connection', () => {
    const level = generateLevel('CHUNKS', BIOMES.get('alleys'));
    for (const room of level.rooms) {
      expect(room.name, room.templateId).toBeTruthy();
      if (!room.outdoor) expect(room.windows.length, room.name).toBeGreaterThan(0);
      for (const dir of room.connections) {
        const firstCol = room.rect.x / level.grid.tileSize;
        const col = dir === 'left' ? firstCol : firstCol + ROOM_COLS - 1;
        for (let row = DOOR_ROWS.from; row <= DOOR_ROWS.to; row++) {
          expect(level.grid.get(col, row), `${room.name} ${dir} door row ${row}`).toBe(Tile.Empty);
        }
      }
    }
  });

  it('ladder tiles form continuous vertical runs with floor support', () => {
    for (let s = 0; s < 10; s++) {
      const level = generateLevel(`LADDER-${s}`, BIOMES.get('alleys'));
      for (const room of level.rooms) {
        const c0 = room.rect.x / level.grid.tileSize;
        for (let r = 0; r < ROOM_ROWS; r++) {
          for (let c = c0; c < c0 + ROOM_COLS; c++) {
            if (level.grid.get(c, r) !== Tile.Ladder) continue;
            const above = level.grid.get(c, r - 1) === Tile.Ladder;
            const below = level.grid.get(c, r + 1) === Tile.Ladder;
            expect(above || below, `${room.name}: floating ladder tile at ${c},${r}`).toBe(true);
            if (above) continue;
            let bottom = r;
            while (level.grid.get(c, bottom + 1) === Tile.Ladder) bottom++;
            const floor = level.grid.get(c, bottom + 1);
            expect(floor === Tile.Solid || floor === Tile.OneWay, `${room.name}: ladder run at ${c},${r}-${bottom} does not reach a floor`).toBe(true);
          }
        }
      }
    }
  });

  it('the wall-jump shaft tops out above normal jump height', () => {
    const t = ROOM_TEMPLATES.find((c) => c.id === 'alley-2')!;
    const jumpTiles = (PLAYER_TUNING.jumpSpeed * PLAYER_TUNING.jumpSpeed) / (2 * PLAYER_TUNING.gravity) / TILE;
    const landing = t.rows.findIndex((row) => row.slice(1, 5) === '====');
    expect(landing).toBeGreaterThan(0);
    expect(ROOM_ROWS - 1 - landing).toBeGreaterThan(jumpTiles + 1);
  });

  it('every platform and floor in the map is reachable from the spawn', () => {
    const biome = BIOMES.get('alleys');
    for (let s = 0; s < 20; s++) expectReachableSurfaces(generateLevel(`reach-${s}`, biome));
  });

  it('neighbouring chunks are joined by a side window centred in the wall of every upper storey', () => {
    const level = generateLevel('WINDOWS', BIOMES.get('alleys'));
    const ts = level.grid.tileSize;
    for (const room of level.rooms) {
      if (!room.connections.includes('right')) continue;
      const wallA = (room.rect.x + room.rect.w) / ts - 1;
      for (const slab of SLAB_ROWS) {
        for (const col of [wallA, wallA + 1]) {
          const rows = sideWindowRows(slab);
          for (const r of rows) expect(level.grid.get(col, r), `${room.name} window ${col},${r}`).toBe(Tile.Empty);
          // Wall above and below the opening (the sill is a 1-tile step).
          expect(level.grid.get(col, rows[0]! - 1)).toBe(Tile.Solid);
          expect(level.grid.get(col, rows[rows.length - 1]! + 1)).toBe(Tile.Solid);
        }
        // Something to stand on at both sides of the window.
        for (const col of [wallA - 1, wallA + 2]) expect(level.grid.get(col, slab), `${room.name} sill ${col},${slab}`).not.toBe(Tile.Empty);
      }
    }
  });
});

type CellRC = { c: number; r: number };

/** Standable cells of the whole level: empty with headroom, standing on a solid or one-way tile. */
function standableCells(level: LevelData): CellRC[] {
  const cells: CellRC[] = [];
  for (let r = 1; r < level.grid.rows - 1; r++) {
    for (let c = 0; c < level.grid.cols; c++) {
      if (level.grid.get(c, r) !== Tile.Empty || level.grid.get(c, r - 1) !== Tile.Empty) continue;
      const below = level.grid.get(c, r + 1);
      if (below === Tile.Solid || below === Tile.OneWay) cells.push({ c, r });
    }
  }
  return cells;
}

/** True when a continuous ladder column connects the two standable cells vertically. */
function ladderConnects(level: LevelData, a: CellRC, b: CellRC): boolean {
  const r0 = Math.min(a.r, b.r);
  const r1 = Math.max(a.r, b.r);
  for (let col = Math.min(a.c, b.c) - 2; col <= Math.max(a.c, b.c) + 2; col++) {
    if (Math.abs(a.c - col) > 2 || Math.abs(b.c - col) > 2) continue;
    let full = true;
    for (let r = r0; r <= r1; r++) {
      if (level.grid.get(col, r) !== Tile.Ladder) {
        full = false;
        break;
      }
    }
    if (full) return true;
  }
  return false;
}

/** Wall jumps: a solid column next to both cells covers the climb (the last 3 rows are a jump). */
function wallConnects(level: LevelData, from: CellRC, to: CellRC): boolean {
  if (to.r >= from.r) return false;
  for (let col = Math.min(from.c, to.c) - 2; col <= Math.max(from.c, to.c) + 2; col++) {
    if (Math.abs(from.c - col) > 2 || Math.abs(to.c - col) > 2) continue;
    let solid = true;
    for (let r = to.r + 1; r <= from.r - 3 && solid; r++) solid = level.grid.get(col, r) === Tile.Solid;
    if (solid) return true;
  }
  return false;
}

/**
 * Coarse reachability check over the whole level, from the spawn: walks, 1-tile steps, jumps up
 * to 3 tiles / 4 across, ladders and wall jumps (every rule spans at most 4 columns, so cells are
 * bucketed by column). It ignores walls in between: a design guard so nothing is left floating.
 */
function expectReachableSurfaces(level: LevelData): void {
  const cells = standableCells(level);
  const byCol = new Map<number, CellRC[]>();
  for (const cell of cells) byCol.set(cell.c, [...(byCol.get(cell.c) ?? []), cell]);
  const ts = level.grid.tileSize;
  const start = { c: Math.floor(level.spawn.x / ts), r: level.spawn.y / ts - 1 };
  const key = (p: CellRC) => `${p.c},${p.r}`;
  const seen = new Set([key(start)]);
  const queue = [start];
  while (queue.length > 0) {
    const from = queue.shift()!;
    for (let c = from.c - 4; c <= from.c + 4; c++) {
      for (const to of byCol.get(c) ?? []) {
        if (seen.has(key(to))) continue;
        const dc = Math.abs(to.c - from.c);
        const dr = to.r - from.r;
        const walk = dc === 1 && Math.abs(dr) <= 1;
        const jump = dr >= -3 && dr <= 12;
        if (!walk && !jump && !ladderConnects(level, from, to) && !wallConnects(level, from, to)) continue;
        seen.add(key(to));
        queue.push(to);
      }
    }
  }
  const missing = cells.filter((p) => !seen.has(key(p)));
  const where = missing.slice(0, 8).map((p) => `${level.rooms[Math.floor(p.c / ROOM_COLS)]?.templateId} ${p.c},${p.r}`);
  expect(where, `${level.seed}: unreachable surfaces`).toEqual([]);
}
