import type { ParticleSystem } from '@engine/fx/particles';
import type { Vec2 } from '@engine/math/vec2';
import type { WeaponClass } from '../content/weapons/types';

/**
 * Named visual recipes on top of the particle system. Gameplay code says "muzzle flash
 * here", never how many sparks that is. Visual only (Math.random is fine).
 */
const rand = (a: number, b: number) => a + Math.random() * (b - a);

const FLASH_SIZE: Record<WeaponClass, number> = { pistol: 6, smg: 7, rifle: 10 };

export const fx = {
  muzzleFlash(ps: ParticleSystem, at: Vec2, angle: number, weaponClass: WeaponClass, silenced: boolean): void {
    if (!silenced) ps.emit({ x: at.x, y: at.y, life: 0.05, shape: 'flash', color: '#fff3b0', size: FLASH_SIZE[weaponClass], angle, fade: false });
    for (let i = 0; i < (silenced ? 1 : 4); i++) {
      const a = angle + rand(-0.5, 0.5);
      const v = rand(120, 260);
      ps.emit({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.05, 0.12), shape: 'streak', color: '#ffd166', drag: 4 });
    }
    for (let i = 0; i < 2; i++) {
      ps.emit({
        x: at.x + Math.cos(angle) * 2,
        y: at.y + Math.sin(angle) * 2,
        vx: Math.cos(angle) * rand(10, 30),
        vy: Math.sin(angle) * rand(10, 30) - rand(5, 15),
        life: rand(0.35, 0.6),
        shape: 'puff',
        color: '#9a9a9a',
        size: 1,
        grow: 6,
        drag: 2,
      });
    }
  },

  /** Brass ejected up and backwards, bouncing on the floor for a while. */
  casing(ps: ParticleSystem, at: Vec2, facing: 1 | -1): void {
    ps.emit({
      x: at.x,
      y: at.y,
      vx: -facing * rand(40, 90),
      vy: rand(-140, -90),
      life: rand(2.5, 3.5),
      shape: 'chip',
      color: '#d4a64a',
      size: 2,
      size2: 1,
      gravity: 700,
      bounce: 0.4,
      spin: rand(15, 30),
      fade: false,
    });
  },

  /** Bullet hitting a wall: sparks thrown back + dust. */
  wallImpact(ps: ParticleSystem, at: Vec2, incoming: number): void {
    for (let i = 0; i < 5; i++) {
      const a = incoming + Math.PI + rand(-0.9, 0.9);
      const v = rand(60, 180);
      ps.emit({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.1, 0.25), shape: 'streak', color: '#ffe08a', gravity: 300, drag: 3 });
    }
    ps.emit({ x: at.x, y: at.y, vy: -8, life: 0.4, shape: 'puff', color: '#6d6d6d', size: 1, grow: 5 });
  },

  ricochet(ps: ParticleSystem, at: Vec2): void {
    for (let i = 0; i < 3; i++) {
      const a = rand(0, Math.PI * 2);
      ps.emit({ x: at.x, y: at.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, life: 0.12, shape: 'streak', color: '#ffffff', drag: 5 });
    }
  },

  /** Stylised blood: dark red chips flying along the bullet. */
  bodyHit(ps: ParticleSystem, at: Vec2, angle: number, amount: number): void {
    const n = Math.min(10, 3 + Math.floor(amount / 6));
    for (let i = 0; i < n; i++) {
      const a = angle + rand(-0.6, 0.6);
      const v = rand(40, 160);
      ps.emit({
        x: at.x,
        y: at.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 30,
        life: rand(0.4, 0.9),
        shape: 'dot',
        color: Math.random() < 0.5 ? '#b3202a' : '#7a121a',
        size: Math.random() < 0.3 ? 2 : 1,
        gravity: 500,
        bounce: 0.1,
        drag: 1,
      });
    }
  },

  /** Wood/metal splinters when a prop breaks. */
  debris(ps: ParticleSystem, center: Vec2, w: number, h: number, color: string, count = 14): void {
    for (let i = 0; i < count; i++) {
      ps.emit({
        x: center.x + rand(-w / 2, w / 2),
        y: center.y + rand(-h / 2, h / 2),
        vx: rand(-120, 120),
        vy: rand(-220, -60),
        life: rand(0.8, 1.6),
        shape: 'chip',
        color,
        size: rand(1, 3),
        size2: rand(1, 2),
        gravity: 700,
        bounce: 0.3,
        spin: rand(-20, 20),
      });
    }
  },

  explosion(ps: ParticleSystem, at: Vec2, radius: number): void {
    for (let i = 0; i < 24; i++) {
      const a = rand(0, Math.PI * 2);
      const v = rand(80, radius * 5);
      ps.emit({ x: at.x, y: at.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(0.2, 0.5), shape: 'streak', color: i % 2 ? '#ffb347' : '#ff6a3d', gravity: 200, drag: 3 });
    }
    for (let i = 0; i < 10; i++) {
      ps.emit({
        x: at.x + rand(-radius / 3, radius / 3),
        y: at.y + rand(-radius / 3, radius / 3),
        vy: rand(-30, -10),
        life: rand(0.8, 1.6),
        shape: 'puff',
        color: '#4a4a4a',
        size: 3,
        grow: radius / 4,
        drag: 1,
      });
    }
  },

  smokePuff(ps: ParticleSystem, at: Vec2, radius: number): void {
    ps.emit({
      x: at.x + rand(-radius, radius) * 0.6,
      y: at.y + rand(-radius, radius) * 0.4,
      vx: rand(-8, 8),
      vy: rand(-12, -2),
      life: rand(1.2, 2),
      shape: 'puff',
      color: '#c9ced6',
      size: 4,
      grow: 8,
      drag: 1,
    });
  },

  dust(ps: ParticleSystem, at: Vec2, count = 4): void {
    for (let i = 0; i < count; i++) {
      ps.emit({ x: at.x + rand(-4, 4), y: at.y, vx: rand(-40, 40), vy: rand(-20, -5), life: rand(0.3, 0.6), shape: 'puff', color: '#5a5a5a', size: 1, grow: 4, drag: 3 });
    }
  },

  pickupSparkle(ps: ParticleSystem, at: Vec2, color: string): void {
    for (let i = 0; i < 6; i++) {
      const a = rand(0, Math.PI * 2);
      ps.emit({ x: at.x, y: at.y, vx: Math.cos(a) * 50, vy: Math.sin(a) * 50, life: 0.3, shape: 'dot', color, drag: 4 });
    }
  },
};
