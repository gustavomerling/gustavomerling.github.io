import { it } from 'vitest';
import { EventBus } from '@engine/core/events';
import { Input } from '@engine/input/input';
import type { Renderer } from '@engine/render/renderer';
import { DEFAULT_BINDINGS } from '../input/actions';
import type { GameEvents } from '../events';
import { RunScene } from '../scenes/RunScene';
import { spawnEnemy } from '../world/prefabs';
import { Health, PlayerControl, Position } from '../world/components';

function chase(seed: string, enemy: string, seconds: number): number | null {
  const scene = new RunScene({ renderer: { width: 480, height: 270 } as Renderer, input: new Input(DEFAULT_BINDINGS), bus: new EventBus<GameEvents>(), seed, biomeId: 'alleys', mode: 'zombie', frameStats: { fps: 0, steps: 0 }, debugOverlay: false, grid: false, onExit: () => undefined, onReplay: () => undefined });
  scene.enter();
  const w = scene.world; const { level } = scene;
  const player = w.first(Position, Health, PlayerControl)!;
  player[1].x = level.exit.x - 20; player[1].y = level.exit.y - 24; player[2].hp = 1e9;
  const z = spawnEnemy(w, enemy, { x: level.spawn.x, y: level.spawn.y }, 1);
  const zp = w.get(z, Position)!;
  for (let s = 0; s < seconds * 60; s++) {
    scene.update(1 / 60);
    if (Math.abs(zp.x - player[1].x) < 24 && Math.abs(zp.y - player[1].y) < 40) return s / 60;
  }
  return null;
}

it('measure', () => {
  const rows: string[] = [];
  for (const enemy of ['zombie', 'runner', 'bloater']) for (const seed of ['PATH-A', 'PATH-B', 'SEED-C', 'ZZ-9']) {
    rows.push(`${enemy} ${seed} -> ${chase(seed, enemy, 150)}`);
  }
  console.log(rows.join('\n'));
}, 600000);
