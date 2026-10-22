import type { World } from '@engine/ecs/world';
import { Tile } from '@engine/physics/tilegrid';
import { PLAYER_TUNING, TILE } from '../config';
import { Body, Debris, Decal, Fx, PlayerControl, Position, type DebrisData, type FxData } from '../world/components';
import type { RunSystem } from './context';
import { ACCENT, ENEMY, FX, theme } from '../render/palette';
import { addShake, fxSetting, JUICE, nearPlayer } from './juice';

const MAX_DEBRIS = 400;
const MAX_FX = 200;
const MAX_DECALS = 300;

export type DebrisSpec = Pick<DebrisData, 'x' | 'y' | 'vx' | 'vy' | 'angle' | 'spin' | 'shape' | 'color' | 'life'>;

export function spawnDebris(world: World, d: DebrisSpec): void {
  const e = world.create();
  world.add(e, Debris, { ...d, prevX: d.x, prevY: d.y, prevAngle: d.angle, age: 0, resting: false });
}

/** One visual particle. Effects use Math.random, never the gameplay RNG. */
function fx(world: World, f: Omit<FxData, 'age'>): void {
  const e = world.create();
  world.add(e, Fx, { ...f, age: 0 });
}

/** Particle switch (settings.particles). Muzzle flashes and bullet holes stay on regardless: they carry gameplay info. */
const particles = () => fxSetting('particles');

/**
 * Muzzle flash pointing along `angle`, plus smoke drifting out of the barrel and, on big guns,
 * a couple of hot sparks. The player's heavy guns kick the camera back a little.
 */
export function spawnShotFx(world: World, x: number, y: number, angle: number, size: number, rand: () => number): void {
  fx(world, { kind: 'flash', x, y, vx: 0, vy: 0, angle, size, life: 0.05 });
  if (size >= 1.1 && nearPlayer(world, x, y)) addShake(world, JUICE.shakeHeavyShot * Math.min(1, (size - 0.9) / 0.7), angle + Math.PI);
  if (!particles()) return;
  const puffs = Math.round(2 + size * 1.5);
  for (let i = 0; i < puffs; i++) {
    const speed = (12 + rand() * 30) * size;
    const a = angle + (rand() - 0.5) * 0.9;
    fx(world, {
      kind: 'smoke',
      x: x + Math.cos(angle) * i * 0.8,
      y: y + Math.sin(angle) * i * 0.8,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 6,
      angle: 0,
      size: (0.9 + rand() * 0.8) * size,
      life: 0.5 + rand() * 0.5,
    });
  }
  const sparks = size >= 1.1 ? 3 : 0;
  for (let i = 0; i < sparks; i++) {
    const a = angle + (rand() - 0.5) * 0.5;
    const speed = 180 + rand() * 160;
    fx(world, { kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, angle: a, size: 1, life: 0.05 + rand() * 0.05, color: FX.flashCore });
  }
}

/** Sparks when a shield eats a hit: more, faster and white on a parry, with a bright ring. */
export function spawnShieldFx(world: World, x: number, y: number, angle: number, parry: boolean): void {
  if (!particles()) return;
  const color = parry ? FX.parry : FX.spark;
  for (let i = 0; i < (parry ? 16 : 7); i++) {
    const a = angle + Math.PI + (Math.random() - 0.5) * (parry ? 2.4 : 1.8);
    const speed = (parry ? 90 : 45) + Math.random() * (parry ? 180 : 90);
    fx(world, { kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, angle: a, size: 1, life: 0.1 + Math.random() * 0.12, color });
  }
  if (parry) fx(world, { kind: 'ring', x, y, vx: 0, vy: 0, angle: 0, size: 9, life: 0.18, color: FX.parry });
}

/** Guard broken: a wide ring and a starburst of sparks all around the shield. */
export function spawnGuardBreakFx(world: World, x: number, y: number): void {
  if (!particles()) return;
  fx(world, { kind: 'ring', x, y, vx: 0, vy: 0, angle: 0, size: 14, life: 0.25, color: FX.spark });
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2 + Math.random() * 0.3;
    const speed = 110 + Math.random() * 120;
    fx(world, { kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, angle: a, size: 1, life: 0.14 + Math.random() * 0.1, color: FX.spark });
  }
}

/** Headshot: a small warm ring and a pop of flat blobs out of the head (bone chips on a skeleton). */
export function spawnHeadshotPop(world: World, x: number, y: number, angle: number, killed: boolean, skeleton: boolean): void {
  if (!particles()) return;
  fx(world, { kind: 'ring', x, y, vx: 0, vy: 0, angle: 0, size: killed ? 7 : 4.5, life: 0.16, color: ACCENT.warm });
  const n = killed ? 5 : 2;
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - 0.5) * 1.4 - 0.3;
    const speed = 30 + Math.random() * 50;
    fx(world, {
      kind: 'puff',
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 30,
      angle: 0,
      size: 0.9 + Math.random() * 0.8,
      life: 0.22 + Math.random() * 0.12,
      color: skeleton ? ENEMY.skeleton.chips : FX.blood[i % 2]!,
    });
  }
}

/** A bloater bursting: a ring the size of the blast, a cloud of flat blobs, and a shake that fades with distance. */
export function spawnBurstFx(world: World, x: number, y: number, radius: number): void {
  const player = world.first(PlayerControl, Position, Body);
  if (player) {
    const [, , pos, body] = player;
    const d = Math.hypot(pos.x + body.w / 2 - x, pos.y + body.h / 2 - y);
    const falloff = 1 - Math.min(1, d / (radius * 4));
    if (falloff > 0) addShake(world, JUICE.shakeBurst * falloff, Math.atan2(pos.y - y, pos.x - x));
  }
  if (!particles()) return;
  fx(world, { kind: 'ring', x, y, vx: 0, vy: 0, angle: 0, size: radius, life: 0.3, color: ENEMY.undead.bloater });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + Math.random() * 0.4;
    const speed = 40 + Math.random() * 90;
    fx(world, {
      kind: 'puff',
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 25,
      angle: 0,
      size: 1.4 + Math.random() * 1.4,
      life: 0.3 + Math.random() * 0.2,
      color: i % 3 === 0 ? FX.blood[0]! : ENEMY.undead.bloater,
    });
  }
}

/** Dust kicked up by the feet (landings, slides, wall slides). Visual only. */
export function spawnDust(world: World, x: number, y: number, count: number, spreadX: number): void {
  if (!particles()) return;
  for (let i = 0; i < count; i++) {
    const vx = (Math.random() - 0.5) * 2 * spreadX;
    fx(world, { kind: 'dust', x: x + vx * 0.03, y: y - 1, vx, vy: -8 - Math.random() * 12, angle: 0, size: 0.8 + Math.random() * 0.7, life: 0.35 + Math.random() * 0.3 });
  }
}

/** A spent bullet tumbling to the floor. */
export function dropSlug(world: World, x: number, y: number, vx: number, vy: number): void {
  if (!particles()) return;
  spawnDebris(world, {
    x,
    y,
    vx,
    vy: Math.min(vy, 20),
    angle: Math.atan2(vy, vx),
    spin: (Math.random() - 0.5) * 30,
    shape: [-0.6, -0.3, 0.6, -0.3, 0.6, 0.3, -0.6, 0.3],
    color: FX.wad,
    life: 6,
  });
}

/**
 * Blood: a flat puff at the wound, a small splash back out of it, and a bigger spray (plus a
 * puff) out of the exit when the bullet goes through. `color` swaps the drops for something
 * else (bone chips off a skeleton).
 */
export function spawnBlood(world: World, x: number, y: number, angle: number, damage: number, through: boolean, color?: string): void {
  if (!particles()) return;
  const tint = (i: number) => color ?? FX.blood[i % 2]!;
  const puffSize = Math.min(2.4, 0.9 + damage * 0.04);
  fx(world, { kind: 'puff', x, y, vx: Math.cos(angle + Math.PI) * 25, vy: Math.sin(angle + Math.PI) * 25 - 10, angle: 0, size: puffSize, life: 0.16, color: tint(1) });
  if (through) fx(world, { kind: 'puff', x, y, vx: Math.cos(angle) * 70, vy: Math.sin(angle) * 70 - 10, angle: 0, size: puffSize * 1.2, life: 0.2, color: tint(0) });
  const drops = Math.min(14, Math.round(3 + damage * 0.35));
  for (let i = 0; i < drops; i++) {
    const exit = through && i % 3 !== 0;
    const a = (exit ? angle : angle + Math.PI) + (Math.random() - 0.5) * (exit ? 0.8 : 1.6);
    const speed = (exit ? 70 : 35) + Math.random() * (exit ? 110 : 50);
    const size = 0.35 + Math.random() * 0.45;
    spawnDebris(world, {
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 20,
      angle: 0,
      spin: 0,
      shape: [-size, -size, size, -size, size, size, -size, size],
      color: color ?? FX.blood[Math.random() < 0.5 ? 0 : 1]!,
      life: 7,
    });
  }
}

/**
 * Bullet hitting the level, by surface: a wall throws sparks and a chip of the block; a floor or
 * ceiling kicks up a dust cloud with fewer sparks. The hole is left either way (if the bullet
 * stops there).
 */
export function spawnImpact(world: World, x: number, y: number, angle: number, surface: 'x' | 'y', hole: boolean): void {
  if (particles()) {
    // Bounce direction off the surface.
    const rx = surface === 'x' ? -Math.cos(angle) : Math.cos(angle);
    const ry = surface === 'y' ? -Math.sin(angle) : Math.sin(angle);
    const out = Math.atan2(ry, rx);
    const wall = surface === 'x';
    for (let i = 0; i < (wall ? 6 : 3); i++) {
      const a = out + (Math.random() - 0.5) * 1.6;
      const speed = 80 + Math.random() * 140;
      fx(world, { kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, angle: a, size: 1, life: 0.08 + Math.random() * 0.1 });
    }
    for (let i = 0; i < (wall ? 1 : 3); i++) {
      const a = out + (Math.random() - 0.5) * 0.9;
      const speed = wall ? 15 : 20 + Math.random() * 25;
      fx(world, { kind: 'dust', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, angle: 0, size: wall ? 1.2 : 1 + Math.random() * 0.6, life: wall ? 0.5 : 0.6 + Math.random() * 0.3 });
    }
    // A chip of the block (the tile's edge colour), only off walls.
    if (wall) {
      const s = 0.35 + Math.random() * 0.3;
      const a = out + (Math.random() - 0.5) * 1.2;
      spawnDebris(world, {
        x,
        y,
        vx: Math.cos(a) * 60,
        vy: Math.sin(a) * 60 - 40,
        angle: Math.random() * Math.PI,
        spin: (Math.random() - 0.5) * 20,
        shape: [-s, -s, s, -s * 0.6, s * 0.7, s, -s * 0.8, s * 0.8],
        color: theme().tiles.solidEdge,
        life: 3,
      });
    }
  }
  if (!hole) return;
  const decal = world.create();
  world.add(decal, Decal, { x: x + Math.cos(angle) * 0.8, y: y + Math.sin(angle) * 0.8, r: 0.55 + Math.random() * 0.25 });
  const decals = [...world.query(Decal)];
  for (let i = 0; i < decals.length - MAX_DECALS; i++) world.destroy(decals[i]![0]);
}

/** Debris: gravity, bounces on floors/walls, comes to rest lying flat. Fx: drift, grow, fade. */
export const effectsSystem: RunSystem = {
  name: 'effects',
  update(world, ctx) {
    const dt = ctx.clock.dt;
    if (dt <= 0) return;
    const grid = ctx.grid;
    const solid = (x: number, y: number) => grid.isSolidAtPixel(x, y) || (grid.atPixel(x, y) === Tile.OneWay && y % TILE < 3);

    const debris = [...world.query(Debris)];
    debris.forEach(([e, d], i) => {
      d.prevX = d.x;
      d.prevY = d.y;
      d.prevAngle = d.angle;
      d.age += dt;
      if (d.age > d.life || i < debris.length - MAX_DEBRIS) {
        world.destroy(e);
        return;
      }
      if (d.resting) {
        // The floor may have been a one-way platform we dropped through, or nothing: re-check.
        if (!solid(d.x, d.y + 1)) d.resting = false;
        else return;
      }
      d.vy = Math.min(d.vy + PLAYER_TUNING.gravity * dt, PLAYER_TUNING.maxFallSpeed);
      const nx = d.x + d.vx * dt;
      if (solid(nx, d.y)) {
        d.vx = -d.vx * 0.4;
        d.spin *= -0.5;
      } else {
        d.x = nx;
      }
      const ny = d.y + d.vy * dt;
      if (d.vy > 0 && solid(d.x, ny)) {
        d.y = Math.floor(ny / TILE) * TILE - 0.6;
        // Bounce a little, then lie flat.
        if (d.vy > 70) {
          d.vy = -d.vy * 0.35;
          d.vx *= 0.6;
          d.spin *= 0.5;
        } else {
          d.vy = 0;
          d.vx = 0;
          d.spin = 0;
          d.angle = Math.round(d.angle / Math.PI) * Math.PI;
          d.resting = true;
        }
      } else if (d.vy < 0 && solid(d.x, ny)) {
        d.vy = 0;
      } else {
        d.y = ny;
      }
      d.angle += d.spin * dt;
    });

    const fx = [...world.query(Fx)];
    fx.forEach(([e, f], i) => {
      f.age += dt;
      if (f.age > f.life || i < fx.length - MAX_FX) {
        world.destroy(e);
        return;
      }
      if (f.kind === 'ring' || f.kind === 'flash') return;
      // Sparks fly and fall; blobs arc down; smoke and dust drift up.
      const drag = Math.exp((f.kind === 'spark' ? -2 : f.kind === 'puff' ? -5 : -4) * dt);
      f.vx *= drag;
      f.vy = f.vy * drag + (f.kind === 'spark' ? 400 : f.kind === 'puff' ? 160 : -10) * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    });
  },
};

/** Splinters of a decoration prop hit by a bullet, in the prop's own colour. */
export function spawnPropChip(world: World, x: number, y: number, angle: number, color: string): void {
  if (!particles()) return;
  for (let i = 0; i < 3; i++) {
    const a = angle + Math.PI + (Math.random() - 0.5) * 1.6;
    const sp = 40 + Math.random() * 70;
    spawnDebris(world, {
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp - 30,
      angle: a,
      spin: (Math.random() - 0.5) * 30,
      shape: [-0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5],
      color,
      life: 5,
    });
  }
}
