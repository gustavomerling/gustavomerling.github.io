import type { World } from '@engine/ecs/world';
import { lerp } from '@engine/math/math';
import { pixelLine } from '@engine/render/pixel';
import { drawHumanoid } from '../character/draw';
import { Body, Effect, Health, PlayerControl, Position, Rig, Velocity, Visual } from '../world/components';

/**
 * Draws every entity with a Visual (wireframe), interpolated between simulation steps.
 * Rigged characters draw their skeleton; `debug` also shows their collider.
 */
export function drawEntities(ctx: CanvasRenderingContext2D, world: World, alpha: number, debug = false): void {
  ctx.lineWidth = 1;

  for (const [e, pos, visual] of world.query(Position, Visual)) {
    const x = Math.round(lerp(pos.prevX, pos.x, alpha));
    const y = Math.round(lerp(pos.prevY, pos.y, alpha));

    switch (visual.kind) {
      case 'box': {
        const body = world.get(e, Body);
        const w = body?.w ?? 4;
        const h = body?.h ?? 4;
        const rig = world.get(e, Rig);
        const pc = world.get(e, PlayerControl);

        if (rig) {
          // Blink while invulnerable after a hit (not during a dodge slide, which reads on its own).
          const hp = world.get(e, Health);
          const blink = pc && hp && hp.invulnLeft > 0 && pc.state !== 'slide' && Math.floor(performance.now() / 60) % 2 === 0;
          if (blink) ctx.globalAlpha = 0.35;
          // Rig origin = feet (collider bottom-centre), unrounded for smooth interpolation.
          drawHumanoid(ctx, rig.animator, lerp(pos.prevX, pos.x, alpha) + w / 2, lerp(pos.prevY, pos.y, alpha) + h, alpha, rig.style);
          ctx.globalAlpha = 1;
        }
        if (!rig || debug) {
          if (visual.fill && !rig) {
            ctx.fillStyle = visual.fill;
            ctx.fillRect(x, y, w, h);
          }
          ctx.strokeStyle = rig ? 'rgba(255,0,255,0.6)' : visual.color;
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        }
        const health = world.get(e, Health);
        if (health && !pc && health.hp < health.max) {
          ctx.fillStyle = '#400';
          ctx.fillRect(x, y - 4, w, 2);
          ctx.fillStyle = '#f44';
          ctx.fillRect(x, y - 4, Math.max(0, Math.round((w * health.hp) / health.max)), 2);
        }
        if (health && health.stunLeft > 0) {
          ctx.fillStyle = '#fff';
          ctx.fillText('*', x + w / 2, y - 6);
        }
        break;
      }
      case 'dot':
        ctx.fillStyle = visual.color;
        ctx.fillRect(x - (visual.size >> 1), y - (visual.size >> 1), visual.size, visual.size);
        break;
      case 'trail': {
        // Tracer: dim tail, bright 3-px head.
        const vel = world.get(e, Velocity);
        const len = vel ? Math.hypot(vel.x, vel.y) : 0;
        const dx = vel && len > 0 ? vel.x / len : 1;
        const dy = vel && len > 0 ? vel.y / len : 0;
        ctx.fillStyle = visual.color;
        ctx.globalAlpha = 0.35;
        pixelLine(ctx, x, y, x - dx * visual.length, y - dy * visual.length);
        ctx.globalAlpha = 1;
        pixelLine(ctx, x, y, x - dx * 3, y - dy * 3);
        break;
      }
    }
  }

  for (const [, pos, fx] of world.query(Position, Effect)) {
    if (fx.kind !== 'ring') continue;
    const t = 1 - fx.life / fx.maxLife;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = fx.color;
    ctx.beginPath();
    ctx.arc(Math.round(pos.x), Math.round(pos.y), Math.max(1, fx.radius * (0.3 + 0.7 * t)), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

/** Floating damage numbers: rise and fade. Drawn last so they sit on top of the world. */
export function drawDamageNumbers(ctx: CanvasRenderingContext2D, world: World): void {
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  for (const [, pos, fx] of world.query(Position, Effect)) {
    if (fx.kind !== 'text' || !fx.text) continue;
    const t = 1 - fx.life / fx.maxLife;
    const x = Math.round(pos.x);
    const y = Math.round(pos.y - t * 14);
    ctx.globalAlpha = t < 0.5 ? 1 : 1 - (t - 0.5) * 2;
    ctx.fillStyle = '#000';
    for (const [ox, oy] of [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1],
    ] as const) {
      ctx.fillText(fx.text, x + ox, y + oy);
    }
    ctx.fillStyle = fx.color;
    ctx.fillText(fx.text, x, y);
  }
  ctx.globalAlpha = 1;
}
