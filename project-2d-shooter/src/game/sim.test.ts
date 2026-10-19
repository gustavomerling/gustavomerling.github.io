import { describe, expect, it } from 'vitest';
import { AudioMixer } from '@engine/audio/audio';
import { EventBus } from '@engine/core/events';
import { Input, type InputFrame } from '@engine/input/input';
import type { Renderer } from '@engine/render/renderer';
import type { GameEvents } from './events';
import { DEFAULT_BINDINGS } from './input/actions';
import { RunScene } from './scenes/RunScene';
import { Arsenal, Breakable, Health, Npc, PlayerControl, Position } from './world/components';

/** Headless scene: the simulation never touches the renderer outside `render()`. */
function makeScene(seed: string) {
  const input = new Input(DEFAULT_BINDINGS);
  const scene = new RunScene({
    renderer: { width: 480, height: 270 } as Renderer,
    input,
    audio: new AudioMixer(),
    bus: new EventBus<GameEvents>(),
    seed,
    biomeId: 'alleys',
    frameStats: { fps: 0, steps: 0 },
    debugOverlay: false,
    onExit: () => undefined,
    onReplay: () => undefined,
  });
  scene.enter();
  return { scene, input };
}

/** Scripted play: run right, shoot in bursts, jump now and then, slide, bullet time once. */
function scriptedFrame(i: number): InputFrame {
  const down = ['KeyD'];
  const pressed: string[] = [];
  if (i % 40 < 20) down.push('Mouse0');
  if (i % 40 === 0) pressed.push('Mouse0');
  if (i % 90 === 0) pressed.push('Space');
  if (i % 150 === 75) pressed.push('KeyS');
  if (i === 300) pressed.push('KeyE');
  return { down: [...down, ...pressed], pressed, released: [], wheel: 0, px: 420, py: 160, inside: true };
}

function run(seed: string, steps: number) {
  const { scene, input } = makeScene(seed);
  for (let i = 0; i < steps; i++) {
    input.beginTick();
    input.inject(scriptedFrame(i));
    scene.update(1 / 60);
  }
  const w = scene.world;
  const player = w.first(Position, Health, PlayerControl, Arsenal)!;
  return {
    player: { x: player[1].x, y: player[1].y, hp: player[2].hp, ammo: player[4].weapons.map((ws) => [ws.ammo, ws.reserve]) },
    enemies: [...w.query(Npc, Health, Position)].map(([, npc, h, p]) => [npc.defId, h.hp, Math.round(p.x), Math.round(p.y)]),
    breakables: [...w.query(Breakable, Health)].map(([, b, h]) => [b.kind, h.hp]),
    entities: w.entityCount,
  };
}

describe('simulation', () => {
  it('is deterministic: same seed + same input -> identical world (what makes F10 replays work)', () => {
    const a = run('DET-0001', 900);
    const b = run('DET-0001', 900);
    expect(a).toEqual(b);
  });

  it('actually plays: the player moved and fired', () => {
    const r = run('DET-0002', 600);
    const start = makeScene('DET-0002').scene.world.first(Position, PlayerControl)!;
    expect(r.player.x).toBeGreaterThan(start[1].x);
    const fired = r.player.ammo.some(([ammo, reserve]) => ammo! + reserve! < 17 * 4);
    expect(fired).toBe(true);
  });

  it('spawns props from the templates', () => {
    const { scene } = makeScene('DET-0003');
    expect([...scene.world.query(Breakable)].length).toBeGreaterThan(0);
  });
});
