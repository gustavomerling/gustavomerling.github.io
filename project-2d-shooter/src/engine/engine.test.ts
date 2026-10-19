import { describe, expect, it } from 'vitest';
import { Clock } from './core/clock';
import { EventBus } from './core/events';
import { GameLoop } from './core/loop';
import { defineComponent, World } from './ecs/world';
import { Input, key, mouse, wheel } from './input/input';
import { Rng } from './math/rng';
import { boxFits, moveAndCollide } from './physics/collide';
import { Tile, TileGrid } from './physics/tilegrid';
import { ParticleSystem } from './fx/particles';
import { VerletBody } from './physics/verlet';
import { solveTwoBone } from './rig/ik';
import { PoseBuilder, Skeleton } from './rig/skeleton';
import { MemoryBackend, StoredDocument } from './storage/storage';

describe('Rng', () => {
  it('is deterministic per seed', () => {
    const a = Rng.fromString('lasanha');
    const b = Rng.fromString('lasanha');
    expect(Array.from({ length: 5 }, () => a.next())).toEqual(Array.from({ length: 5 }, () => b.next()));
  });

  it('forks independent streams', () => {
    const base1 = Rng.fromString('x');
    const base2 = Rng.fromString('x');
    const f1 = base1.fork('loot');
    base2.fork('loot');
    // Consuming the fork does not affect the parent stream.
    f1.next();
    f1.next();
    expect(base1.next()).toBe(base2.next());
  });

  it('int stays in range', () => {
    const r = new Rng(1);
    for (let i = 0; i < 1000; i++) {
      const v = r.int(3, 7);
      expect(v).toBeGreaterThanOrEqual(3);
      expect(v).toBeLessThanOrEqual(7);
    }
  });
});

describe('GameLoop', () => {
  const noFrames = { requestFrame: () => 0, cancelFrame: () => undefined };

  it('runs a fixed number of steps regardless of frame size', () => {
    let steps = 0;
    const loop = new GameLoop({ update: () => steps++, render: () => undefined }, noFrames);
    loop.advance(1 / 30);
    loop.advance(1 / 120);
    loop.advance(1 / 120);
    expect(steps).toBe(3);
  });

  it('clamps huge frames (no spiral of death)', () => {
    let steps = 0;
    const loop = new GameLoop({ update: () => steps++, render: () => undefined }, { ...noFrames, maxFrameSeconds: 0.1 });
    loop.advance(10);
    expect(steps).toBe(6);
  });
});

describe('Clock', () => {
  it('ramps the time scale and applies hit-stop', () => {
    const c = new Clock();
    c.targetScale = 0.5;
    c.rampPerSecond = 100;
    c.step(1 / 60);
    expect(c.scale).toBe(0.5);
    expect(c.dt).toBeCloseTo(0.5 / 60);
    c.hitStop(0.05);
    c.step(1 / 60);
    expect(c.dt).toBe(0);
  });
});

describe('EventBus', () => {
  it('delivers and unsubscribes', () => {
    const bus = new EventBus<{ hit: number }>();
    const got: number[] = [];
    const off = bus.on('hit', (n) => got.push(n));
    bus.emit('hit', 1);
    off();
    bus.emit('hit', 2);
    expect(got).toEqual([1]);
  });
});

describe('World', () => {
  const A = defineComponent<{ v: number }>('A');
  const B = defineComponent<{ s: string }>('B');

  it('queries entities with all components and defers destroy', () => {
    const w = new World();
    const e1 = w.create();
    const e2 = w.create();
    w.add(e1, A, { v: 1 });
    w.add(e1, B, { s: 'x' });
    w.add(e2, A, { v: 2 });
    expect([...w.query(A, B)].map(([e]) => e)).toEqual([e1]);
    w.destroy(e1);
    expect([...w.query(A)].map(([e]) => e)).toEqual([e2]);
    expect(w.entityCount).toBe(2);
    w.flush();
    expect(w.entityCount).toBe(1);
    expect(w.get(e1, A)).toBeUndefined();
  });
});

describe('Input', () => {
  it('latches presses per tick and never loses quick taps', () => {
    const input = new Input({ jump: [key('Space')], fire: [mouse(0)], next: [wheel('down')] });
    input.simulate('Space', true);
    input.simulate('Space', false); // tapped and released between ticks
    input.beginTick();
    expect(input.pressed('jump')).toBe(true);
    expect(input.isDown('jump')).toBe(true);
    input.beginTick();
    expect(input.pressed('jump')).toBe(false);
    expect(input.isDown('jump')).toBe(false);
  });

  it('reports held state across ticks', () => {
    const input = new Input({ fire: [mouse(0)] });
    input.simulate('Mouse0', true);
    input.beginTick();
    input.beginTick();
    expect(input.isDown('fire')).toBe(true);
    expect(input.pressed('fire')).toBe(false);
    input.releaseAll();
    input.beginTick();
    expect(input.released('fire')).toBe(true);
  });
});

describe('moveAndCollide', () => {
  // 10x6 room: floor on row 5, a one-way platform on row 3 (cols 2-4).
  const makeGrid = () => {
    const g = new TileGrid(10, 6, 16);
    g.fill(0, 5, 10, 1, Tile.Solid);
    g.fill(2, 3, 3, 1, Tile.OneWay);
    return g;
  };

  it('lands on solid floor', () => {
    const g = makeGrid();
    const box = { x: 100, y: 40, w: 10, h: 20 };
    const hit = moveAndCollide(box, 0, 100, g);
    expect(hit.onGround).toBe(true);
    expect(box.y + box.h).toBe(80);
  });

  it('does not tunnel through walls at high speed', () => {
    const g = makeGrid();
    g.fill(6, 0, 1, 5, Tile.Solid);
    const box = { x: 20, y: 50, w: 10, h: 20 };
    const hit = moveAndCollide(box, 500, 0, g);
    expect(hit.hitRight).toBe(true);
    expect(box.x + box.w).toBe(96);
  });

  it('one-way: passes from below, lands from above, drops through on request', () => {
    const g = makeGrid();
    const below = { x: 40, y: 60, w: 10, h: 18 };
    moveAndCollide(below, 0, -40, g);
    expect(below.y).toBe(20); // went up through it

    const above = { x: 40, y: 20, w: 10, h: 20 };
    expect(moveAndCollide(above, 0, 20, g).onOneWay).toBe(true);
    expect(above.y + above.h).toBe(48);

    const dropping = { x: 40, y: 28, w: 10, h: 20 };
    moveAndCollide(dropping, 0, 10, g, { dropThrough: true });
    expect(dropping.y).toBe(38);
  });

  it('boxFits detects ceilings', () => {
    const g = makeGrid();
    expect(boxFits({ x: 20, y: 60, w: 10, h: 20 }, g)).toBe(true);
    expect(boxFits({ x: 20, y: 70, w: 10, h: 20 }, g)).toBe(false);
  });
});

describe('rig', () => {
  it('two-bone IK reaches a reachable target with the requested bend', () => {
    const { upper, lower } = solveTwoBone(0, 0, 6, 6, 5, 5, 1);
    const jx = Math.cos(upper) * 5;
    const jy = Math.sin(upper) * 5;
    expect(jx + Math.cos(lower) * 5).toBeCloseTo(6, 3);
    expect(jy + Math.sin(lower) * 5).toBeCloseTo(6, 3);
    // bend +1 puts the joint on the "decreasing angle" side of the chain (here: above/right).
    const flipped = solveTwoBone(0, 0, 6, 6, 5, 5, -1);
    expect(upper).toBeLessThan(flipped.upper);
  });

  it('two-bone IK stretches towards out-of-reach targets', () => {
    const { upper, lower } = solveTwoBone(0, 0, 100, 0, 5, 5, 1);
    expect(upper).toBeCloseTo(0, 1);
    expect(lower).toBeCloseTo(0, 1);
  });

  it('skeleton FK chains children to parents', () => {
    const sk = new Skeleton([
      { name: 'a', parent: null, length: 10 },
      { name: 'b', parent: 'a', length: 5 },
      { name: 'c', parent: 'a', length: 2, attach: 0.5 },
    ]);
    const pose = sk.createPose();
    pose.local[1] = Math.PI / 2;
    const t = sk.solve(pose, sk.createTransforms());
    expect(t[1]!.x0).toBeCloseTo(10);
    expect(t[1]!.y1).toBeCloseTo(5);
    expect(t[2]!.x0).toBeCloseTo(5);
    expect(() => new Skeleton([{ name: 'x', parent: 'y', length: 1 }])).toThrow();
  });

  it('PoseBuilder world angles round-trip through FK', () => {
    const sk = new Skeleton([
      { name: 'a', parent: null, length: 4 },
      { name: 'b', parent: 'a', length: 4 },
    ]);
    const pose = sk.createPose();
    const b = new PoseBuilder(sk, pose);
    b.root(1, 2);
    b.setWorld(0, 0.3);
    const built = b.setWorld(1, -1.2);
    const fk = sk.solve(pose, sk.createTransforms())[1]!;
    expect(fk.x1).toBeCloseTo(built.x1);
    expect(fk.y1).toBeCloseTo(built.y1);
  });
});

describe('verlet', () => {
  it('falls, lands on the floor and keeps stick lengths', () => {
    const body = new VerletBody(
      [
        { x: 10, y: 10 },
        { x: 20, y: 10 },
      ],
      [[0, 1]],
    );
    const floorY = 50;
    for (let i = 0; i < 240; i++) body.step(1 / 60, 980, (_x, y) => y >= floorY);
    expect(body.y[0]).toBeLessThan(floorY);
    expect(body.y[0]).toBeGreaterThan(floorY - 2);
    expect(Math.hypot(body.x[1]! - body.x[0]!, body.y[1]! - body.y[0]!)).toBeCloseTo(10, 0);
  });
});

describe('particles', () => {
  it('expire and respect the pool limit', () => {
    const ps = new ParticleSystem(3);
    for (let i = 0; i < 10; i++) ps.emit({ x: 0, y: 0, life: 0.1, color: '#fff' });
    expect(ps.active).toBe(3);
    ps.update(0.2);
    expect(ps.active).toBe(0);
  });

  it('bouncing particles stay out of solids', () => {
    const ps = new ParticleSystem(10, (_x, y) => y >= 100);
    ps.emit({ x: 0, y: 90, vy: 300, life: 2, color: '#fff', gravity: 500, bounce: 0.5 });
    for (let i = 0; i < 60; i++) ps.update(1 / 60);
    expect(ps.active).toBe(1);
  });
});

describe('input recording', () => {
  it('capture -> inject reproduces the same tick state', () => {
    const a = new Input({ jump: [key('Space')], fire: [mouse(0)] });
    a.simulate('Space', true);
    a.simulate('Mouse0', true);
    a.beginTick();
    a.pointer.x = 12;
    const frame = a.capture();
    const b = new Input({ jump: [key('Space')], fire: [mouse(0)] });
    b.beginTick();
    b.inject(frame);
    expect(b.pressed('jump')).toBe(true);
    expect(b.isDown('fire')).toBe(true);
    expect(b.pointer.x).toBe(12);
  });
});

describe('breakable tiles', () => {
  it('block like solid until cleared', () => {
    const g = new TileGrid(10, 6, 16);
    g.fill(0, 5, 10, 1, Tile.Solid);
    g.set(5, 4, Tile.Breakable);
    const box = { x: 20, y: 60, w: 10, h: 20 };
    expect(moveAndCollide(box, 200, 0, g).hitRight).toBe(true);
    expect(g.isSolidAtPixel(85, 70)).toBe(true);
    g.set(5, 4, Tile.Empty);
    expect(g.isSolidAtPixel(85, 70)).toBe(false);
  });
});

describe('StoredDocument', () => {
  it('falls back to defaults on corrupt data and round-trips', () => {
    const backend = new MemoryBackend();
    backend.setItem('k', '{not json');
    const doc = new StoredDocument(backend, 'k', 1, () => ({ volume: 0.5 }));
    expect(doc.load()).toEqual({ volume: 0.5 });
    doc.save({ volume: 0.9 });
    expect(doc.load()).toEqual({ volume: 0.9 });
  });
});
