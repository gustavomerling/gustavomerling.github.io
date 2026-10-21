import type { World } from '@engine/ecs/world';
import { Tile } from '@engine/physics/tilegrid';
import { PLAYER_TUNING, TILE } from '../config';
import { Debris, Decal, Fx, type DebrisData } from '../world/components';
import type { RunSystem } from './context';

const MAX_DEBRIS = 400;
const MAX_FX = 200;
const MAX_DECALS = 300;

export type DebrisSpec = Pick<DebrisData, 'x' | 'y' | 'vx' | 'vy' | 'angle' | 'spin' | 'shape' | 'color' | 'life'>;

export function spawnDebris(world: World, d: DebrisSpec): void {
  const e = world.create();
  world.add(e, Debris, { ...d, prevX: d.x, prevY: d.y, prevAngle: d.angle, age: 0, resting: false });
}

/** Muzzle flash pointing along `angle`, plus a few smoke puffs drifting out of the barrel. */
export function spawnShotFx(world: World, x: number, y: number, angle: number, size: number, rand: () => number): void {
  const flash = world.create();
  world.add(flash, Fx, { kind: 'flash', x, y, vx: 0, vy: 0, angle, size, age: 0, life: 0.05 });
  const puffs = Math.round(2 + size * 1.5);
  for (let i = 0; i < puffs; i++) {
    const speed = (12 + rand() * 30) * size;
    const a = angle + (rand() - 0.5) * 0.9;
    const e = world.create();
    world.add(e, Fx, {
      kind: 'smoke',
      x: x + Math.cos(angle) * i * 0.8,
      y: y + Math.sin(angle) * i * 0.8,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 6,
      angle: 0,
      size: (0.9 + rand() * 0.8) * size,
      age: 0,
      life: 0.5 + rand() * 0.5,
    });
  }
}

/** Sparks when a shield (or the magic bubble) eats a hit. */
export function spawnShieldFx(world: World, x: number, y: number, angle: number, magic: boolean): void {
  const color = magic ? '#8ef3ff' : '#ffd27a';
  for (let i = 0; i < 7; i++) {
    const a = angle + Math.PI + (Math.random() - 0.5) * 1.8;
    const speed = 45 + Math.random() * 90;
    const e = world.create();
    world.add(e, Fx, {
      kind: 'spark',
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      angle: a,
      size: 1,
      age: 0,
      life: 0.1 + Math.random() * 0.12,
      color,
    });
  }
  if (!magic) return;
  const e = world.create();
  world.add(e, Fx, { kind: 'smoke', x, y, vx: 0, vy: -8, angle: 0, size: 1.4, age: 0, life: 0.3, color: '#65d8ef' });
}

/** Dust kicked up by the feet (landings, slides, wall slides). Visual only. */
export function spawnDust(world: World, x: number, y: number, count: number, spreadX: number): void {
  for (let i = 0; i < count; i++) {
    const e = world.create();
    const vx = (Math.random() - 0.5) * 2 * spreadX;
    world.add(e, Fx, { kind: 'dust', x: x + vx * 0.03, y: y - 1, vx, vy: -8 - Math.random() * 12, angle: 0, size: 0.8 + Math.random() * 0.7, age: 0, life: 0.35 + Math.random() * 0.3 });
  }
}

/** A spent bullet tumbling to the floor. */
export function dropSlug(world: World, x: number, y: number, vx: number, vy: number): void {
  spawnDebris(world, {
    x,
    y,
    vx,
    vy: Math.min(vy, 20),
    angle: Math.atan2(vy, vx),
    spin: (Math.random() - 0.5) * 30,
    shape: [-0.6, -0.3, 0.6, -0.3, 0.6, 0.3, -0.6, 0.3],
    color: '#c9a050',
    life: 6,
  });
}

/** Blood: a small splash back out of the wound, a bigger spray out of the exit when the bullet goes through. */
export function spawnBlood(world: World, x: number, y: number, angle: number, damage: number, through: boolean): void {
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
      color: Math.random() < 0.5 ? '#9e1b1b' : '#c22a2a',
      life: 7,
    });
  }
}

/** Bullet hitting a wall: sparks off the surface, a dust puff, and a hole left behind (if it stops there). */
export function spawnImpact(world: World, x: number, y: number, angle: number, surface: 'x' | 'y', hole: boolean): void {
  // Bounce direction off the surface.
  const rx = surface === 'x' ? -Math.cos(angle) : Math.cos(angle);
  const ry = surface === 'y' ? -Math.sin(angle) : Math.sin(angle);
  const out = Math.atan2(ry, rx);
  for (let i = 0; i < 5; i++) {
    const a = out + (Math.random() - 0.5) * 1.6;
    const speed = 80 + Math.random() * 140;
    const e = world.create();
    world.add(e, Fx, { kind: 'spark', x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, angle: a, size: 1, age: 0, life: 0.08 + Math.random() * 0.1 });
  }
  const dust = world.create();
  world.add(dust, Fx, { kind: 'dust', x, y, vx: Math.cos(out) * 15, vy: Math.sin(out) * 15, angle: 0, size: 1.2, age: 0, life: 0.5 });
  if (!hole) return;
  const decal = world.create();
  world.add(decal, Decal, { x: x + Math.cos(angle) * 0.8, y: y + Math.sin(angle) * 0.8, r: 0.55 + Math.random() * 0.25 });
  const decals = [...world.query(Decal)];
  for (let i = 0; i < decals.length - MAX_DECALS; i++) world.destroy(decals[i]![0]);
}

/** Fireball blast: a quick ball of fire, embers flying out and a puff of smoke. */
export function spawnExplosion(world: World, x: number, y: number, radius: number): void {
  const fire = world.create();
  world.add(fire, Fx, {
    kind: 'fire',
    x,
    y,
    vx: 0,
    vy: 0,
    angle: 0,
    size: radius / 12,
    age: 0,
    life: 0.22,
  });
  for (let i = 0; i < 12; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = 90 + Math.random() * 200;
    const e = world.create();
    world.add(e, Fx, {
      kind: 'spark',
      x,
      y,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - 30,
      angle: a,
      size: 1,
      age: 0,
      life: 0.12 + Math.random() * 0.2,
      color: Math.random() < 0.5 ? '#ffb347' : '#ff7a2f',
    });
  }
  for (let i = 0; i < 3; i++) {
    const e = world.create();
    world.add(e, Fx, {
      kind: 'smoke',
      x: x + (Math.random() - 0.5) * radius * 0.5,
      y: y + (Math.random() - 0.5) * radius * 0.5,
      vx: (Math.random() - 0.5) * 20,
      vy: -20 - Math.random() * 20,
      angle: 0,
      size: 1.4 + Math.random() * 0.8,
      age: 0,
      life: 0.4 + Math.random() * 0.3,
    });
  }
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
      // Sparks fly and fall; smoke and dust drift up.
      const drag = Math.exp((f.kind === 'spark' ? -2 : -4) * dt);
      f.vx *= drag;
      f.vy = f.vy * drag + (f.kind === 'spark' ? 400 : -10) * dt;
      f.x += f.vx * dt;
      f.y += f.vy * dt;
    });
  },
};
