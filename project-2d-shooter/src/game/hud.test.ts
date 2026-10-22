import { describe, expect, it } from 'vitest';
import { EventBus } from '@engine/core/events';
import { Input } from '@engine/input/input';
import type { Renderer } from '@engine/render/renderer';
import type { RunModeId } from './content/modes/catalog';
import type { GameEvents, HudState } from './events';
import { DEFAULT_BINDINGS } from './input/actions';
import { RunScene } from './scenes/RunScene';
import type { RunContext } from './systems/context';
import { applyDamage } from './systems/damage';
import { ammoHint, exitProgress, pickupPrompt } from './systems/hud';
import { MAX_SLOTS } from './systems/pickups';
import { PlayerControl, type ArsenalData } from './world/components';

function makeScene(mode: RunModeId) {
  const bus = new EventBus<GameEvents>();
  const huds: HudState[] = [];
  bus.on('hud', (h) => huds.push(h));
  const input = new Input(DEFAULT_BINDINGS);
  const scene = new RunScene({
    renderer: { width: 480, height: 270 } as Renderer,
    input,
    bus,
    seed: 'HUD-TEST',
    biomeId: 'alleys',
    mode,
    frameStats: { fps: 0, steps: 0 },
    debugOverlay: false,
    grid: false,
    onExit: () => undefined,
    onReplay: () => undefined,
  });
  scene.enter();
  const step = () => {
    input.beginTick();
    scene.update(1 / 60);
  };
  return { scene, huds, step, ctx: () => scene['ctx'] as RunContext };
}

const arsenal = (ids: string[], active = 0): ArsenalData =>
  ({ active, weapons: ids.map((id) => ({ weapon: { def: { id, name: id.toUpperCase() } } })) }) as unknown as ArsenalData;

describe('HUD cues', () => {
  it('ammo hint: R when the magazine runs low, SEM MUNIÇÃO when nothing is left', () => {
    expect(ammoHint(30, 30, 90, false, false)).toBe('');
    expect(ammoHint(7, 30, 90, false, false)).toBe('R');
    expect(ammoHint(0, 30, 0, false, false)).toBe('SEM MUNIÇÃO');
    expect(ammoHint(3, 30, 0, false, false)).toBe('');
    expect(ammoHint(1, 30, 90, false, true)).toBe('');
    expect(ammoHint(0, 1, 0, true, false)).toBe('');
  });

  it('pickup prompt says what F does: refill, add or swap', () => {
    expect(pickupPrompt(arsenal(['glock', 'uzi']), 'uzi', 'UZI')).toBe('[F] munição: UZI');
    expect(pickupPrompt(arsenal(['glock']), 'ak47', 'AK-47')).toBe('[F] pegar AK-47');
    const full = arsenal(Array.from({ length: MAX_SLOTS }, (_, i) => `gun${i}`), 1);
    expect(pickupPrompt(full, 'ak47', 'AK-47')).toBe('[F] trocar GUN1 por AK-47');
  });

  it('exit progress runs 0..1 from spawn to exit, clamped', () => {
    expect(exitProgress(100, 1100, 100)).toBe(0);
    expect(exitProgress(100, 1100, 600)).toBe(0.5);
    expect(exitProgress(100, 1100, 2000)).toBe(1);
    expect(exitProgress(100, 1100, 0)).toBe(0);
  });

  it('campaign HUD: progress near 0 at spawn, no horde, nothing to interact with', () => {
    const { huds, step } = makeScene('campaign');
    for (let i = 0; i < 5; i++) step();
    const hud = huds.at(-1)!;
    expect(hud.progress).toBeLessThan(0.2);
    expect(hud.horde).toBeNull();
    expect(hud.prompt).toBe('');
  });

  it('zombie HUD reports the horde pressure', () => {
    const { huds, step } = makeScene('zombie');
    for (let i = 0; i < 5; i++) step();
    const hud = huds.at(-1)!;
    expect(hud.horde).not.toBeNull();
    expect(hud.horde!.max).toBeGreaterThan(0);
    expect(hud.horde!.alive).toBeGreaterThanOrEqual(0);
  });

  it('taking a hit from the right points the hurt arc right; the cue fades', () => {
    const { scene, step, ctx } = makeScene('campaign');
    step();
    const [player] = scene.world.first(PlayerControl)!;
    applyDamage(scene.world, ctx(), player, { amount: 5, zone: 'torso', at: { x: 0, y: 0 }, angle: Math.PI, by: 'enemy' });
    step();
    const cues = ctx().feedback.cues!;
    expect(cues.hurt).toBeGreaterThan(0);
    expect(cues.hurtFrom).not.toBeNull();
    expect(Math.abs(cues.hurtFrom!)).toBeLessThan(0.2);
    for (let i = 0; i < 60; i++) step();
    expect(cues.hurt).toBe(0);
  });
});
