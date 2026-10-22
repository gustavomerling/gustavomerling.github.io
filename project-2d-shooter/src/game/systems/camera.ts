import { clamp } from '@engine/math/math';
import type { Camera } from '@engine/render/camera';
import { CAMERA } from '../config';
import { Aim, Body, CameraTarget, Position, Velocity } from '../world/components';
import { bodyCenter } from '../world/geometry';
import type { RunSystem } from './context';
import { shakeOffset } from './juice';

/**
 * Follows the target, leaning towards where it aims and a little ahead of where it runs.
 * Uses real time: stays snappy in slow-mo. Adds the shake offset (render only).
 */
export const cameraSystem: RunSystem = {
  name: 'camera',
  update(world, ctx) {
    const row = world.first(Position, Body, CameraTarget);
    if (row) {
      const [e, pos, body, target] = row;
      const c = bodyCenter(pos, body);
      const aim = world.get(e, Aim);
      const lean = aim ? { x: (aim.x - c.x) * target.lookahead, y: (aim.y - c.y) * target.lookahead } : { x: 0, y: 0 };
      const vx = world.get(e, Velocity)?.x ?? 0;
      const lead = clamp(vx * CAMERA.velocityLead, -CAMERA.maxVelocityLead, CAMERA.maxVelocityLead);
      ctx.camera.follow({ x: c.x + lean.x + lead, y: c.y + lean.y }, ctx.clock.realDt, CAMERA.followRate);
    }
    // Screen shake (systems/juice.ts): a render-only offset, so aim and fair-play checks ignore it.
    const shake = shakeOffset(world);
    ctx.camera.offsetX = shake.x;
    ctx.camera.offsetY = shake.y;
  },
};

/** True when (x, y) is inside the camera's simulated view, grown by `margin` px (fair-play checks). */
export function inCameraView(camera: Camera, x: number, y: number, margin = 0): boolean {
  return Math.abs(x - camera.x) <= camera.viewWidth / 2 + margin && Math.abs(y - camera.y) <= camera.viewHeight / 2 + margin;
}
