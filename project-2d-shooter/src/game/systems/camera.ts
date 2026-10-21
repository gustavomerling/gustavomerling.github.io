import { Aim, Body, CameraTarget, Position } from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunSystem } from './context';

/** Follows the target, leaning towards where it aims. Uses real time: stays snappy in slow-mo. */
export const cameraSystem: RunSystem = {
  name: 'camera',
  update(world, ctx) {
    const row = world.first(Position, Body, CameraTarget);
    if (row) {
      const [e, pos, body, target] = row;
      const c = bodyCenter(pos, body);
      const aim = world.get(e, Aim);
      const lean = aim ? { x: (aim.x - c.x) * target.lookahead, y: (aim.y - c.y) * target.lookahead } : { x: 0, y: 0 };
      ctx.camera.follow({ x: c.x + lean.x, y: c.y + lean.y }, ctx.clock.realDt, 8);
    }
  },
};
