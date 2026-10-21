import { FOCUS, SLOWMO } from '../config';
import { Focus, Position } from '../world/components';
import type { RunSystem } from './context';

/** Must run first: stores previous positions for render interpolation. */
export const snapshotSystem: RunSystem = {
  name: 'snapshot',
  update(world, ctx) {
    for (const [, pos] of world.query(Position)) {
      pos.prevX = pos.x;
      pos.prevY = pos.y;
    }
    ctx.camera.beginStep();
  },
};

/**
 * Bullet time ("E"), paid for with the focus meter: it drains while active (real time),
 * regenerates slowly, and kills/headshots refill it (see systems/damage.ts).
 * The world clock ramps to SLOWMO.worldScale; the player's clock is mapped linearly so
 * that at full slow-mo it runs at SLOWMO.playerScale.
 */
export const slowmoSystem: RunSystem = {
  name: 'slowmo',
  update(world, ctx) {
    const { clock, input } = ctx;
    const focus = world.first(Focus)?.[1];
    const active = clock.targetScale < 1;

    if (input.pressed('slowmo')) {
      if (active) {
        clock.targetScale = 1;
      } else if (!focus || focus.value >= FOCUS.minToActivate) {
        clock.targetScale = SLOWMO.worldScale;
      }
    }

    if (focus) {
      if (clock.targetScale < 1) {
        focus.value -= FOCUS.drainPerSecond * clock.realDt;
        if (focus.value <= 0) {
          focus.value = 0;
          clock.targetScale = 1;
          }
      } else {
        focus.value = Math.min(1, focus.value + FOCUS.regenPerSecond * clock.realDt);
      }
    }

    // The scene already stepped the clock this tick; a toggle takes effect from the next one.
    const t = (clock.scale - SLOWMO.worldScale) / (1 - SLOWMO.worldScale);
    ctx.playerDt = clock.realDt * (SLOWMO.playerScale + (1 - SLOWMO.playerScale) * t) * (clock.dt === 0 ? 0 : 1);
  },
};
