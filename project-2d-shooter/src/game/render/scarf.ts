import { HB } from '../character/humanoid';
import type { HumanoidAnimator } from '../character/animator';
import { PROP } from './palette';

/**
 * The player's scarf: a short Verlet rope pinned at the neck. Render-only (real time, its own
 * state), so it never touches the simulation, replays or determinism.
 */
export const SCARF = {
  segments: 7,
  segmentLength: 2.4,
  gravity: 160,
  /** Velocity kept per step (0..1): lower = heavier cloth. */
  damping: 0.94,
  /** Sideways flutter while moving. */
  flutter: 18,
  width: 2.5,
  colors: [PROP.red, PROP.banner] as const,
};

interface Rope {
  x: Float32Array;
  y: Float32Array;
  px: Float32Array;
  py: Float32Array;
  last: number;
}

const ropes = new Map<number, Rope>();

export function drawScarf(
  ctx: CanvasRenderingContext2D,
  id: number,
  animator: HumanoidAnimator,
  originX: number,
  originY: number,
  alpha: number,
  time: number,
): void {
  const bones = animator.sample(alpha);
  const torso = bones[HB.torso]!;
  const f = animator.facing;
  const nx = originX + f * torso.x1;
  const ny = originY + torso.y1 + 0.5;
  const n = SCARF.segments + 1;

  let rope = ropes.get(id);
  if (!rope) {
    rope = { x: new Float32Array(n), y: new Float32Array(n), px: new Float32Array(n), py: new Float32Array(n), last: time };
    for (let i = 0; i < n; i++) {
      rope.x[i] = rope.px[i] = nx - f * i * SCARF.segmentLength;
      rope.y[i] = rope.py[i] = ny;
    }
    ropes.set(id, rope);
  }
  const dt = Math.min(1 / 30, Math.max(0, time - rope.last));
  rope.last = time;
  // Teleports (respawn, level change): snap instead of whipping across the map.
  if (Math.hypot(rope.x[0]! - nx, rope.y[0]! - ny) > 40) {
    ropes.delete(id);
    return drawScarf(ctx, id, animator, originX, originY, alpha, time);
  }

  if (dt > 0) {
    const speed = (nx - rope.x[0]!) / dt;
    for (let i = 1; i < n; i++) {
      const vx = (rope.x[i]! - rope.px[i]!) * SCARF.damping;
      const vy = (rope.y[i]! - rope.py[i]!) * SCARF.damping;
      rope.px[i] = rope.x[i]!;
      rope.py[i] = rope.y[i]!;
      const wave = Math.sin(time * 14 - i * 0.9) * SCARF.flutter * Math.min(1, Math.abs(speed) / 80) * (i / n);
      rope.x[i] = rope.x[i]! + vx;
      rope.y[i] = rope.y[i]! + vy + (SCARF.gravity + wave) * dt * dt;
    }
    rope.x[0] = rope.px[0] = nx;
    rope.y[0] = rope.py[0] = ny;
    for (let k = 0; k < 4; k++) {
      for (let i = 0; i < n - 1; i++) {
        const dx = rope.x[i + 1]! - rope.x[i]!;
        const dy = rope.y[i + 1]! - rope.y[i]!;
        const d = Math.hypot(dx, dy) || 1e-4;
        const diff = (d - SCARF.segmentLength) / d;
        if (i === 0) {
          rope.x[1] = rope.x[1]! - dx * diff;
          rope.y[1] = rope.y[1]! - dy * diff;
        } else {
          rope.x[i] = rope.x[i]! + dx * diff * 0.5;
          rope.y[i] = rope.y[i]! + dy * diff * 0.5;
          rope.x[i + 1] = rope.x[i + 1]! - dx * diff * 0.5;
          rope.y[i + 1] = rope.y[i + 1]! - dy * diff * 0.5;
        }
      }
    }
  }

  ctx.lineCap = 'round';
  ctx.lineWidth = SCARF.width + 1;
  ctx.strokeStyle = PROP.outline;
  ctx.beginPath();
  ctx.moveTo(rope.x[0]!, rope.y[0]!);
  for (let i = 1; i < n; i++) ctx.lineTo(rope.x[i]!, rope.y[i]!);
  ctx.stroke();
  ctx.lineWidth = SCARF.width;
  for (let i = 0; i < n - 1; i++) {
    ctx.strokeStyle = SCARF.colors[i % 2]!;
    ctx.beginPath();
    ctx.moveTo(rope.x[i]!, rope.y[i]!);
    ctx.lineTo(rope.x[i + 1]!, rope.y[i + 1]!);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}

/** The wrap around the neck, drawn over the body. */
export function drawScarfWrap(ctx: CanvasRenderingContext2D, animator: HumanoidAnimator, originX: number, originY: number, alpha: number): void {
  const torso = animator.sample(alpha)[HB.torso]!;
  const x = Math.round(originX + animator.facing * torso.x1);
  const y = Math.round(originY + torso.y1);
  ctx.fillStyle = PROP.outline;
  ctx.fillRect(x - 3, y - 1, 6, 3);
  ctx.fillStyle = SCARF.colors[0];
  ctx.fillRect(x - 2, y - 1, 4, 2);
}
