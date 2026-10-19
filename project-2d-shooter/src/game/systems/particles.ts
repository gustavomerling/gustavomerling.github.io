import type { RunSystem } from './context';

/** Advances visual particles with world time (bullet time slows sparks and smoke too). */
export const particleSystem: RunSystem = {
  name: 'particles',
  update(_world, ctx) {
    ctx.particles.update(ctx.clock.dt);
  },
};
