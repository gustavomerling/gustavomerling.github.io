import type { World } from '@engine/ecs/world';
import { lerp } from '@engine/math/math';
import { drawHumanoid } from '../character/draw';
import { drawRagdoll } from '../character/ragdoll';
import { ENEMY, FX, LINE, TEAM } from './palette';
import { drawScarf, drawScarfWrap } from './scarf';
import { Body, Health, PlayerControl, Position, Projectile, Ragdoll, Rig, Velocity } from '../world/components';

/**
 * Characters: the animated rig, interpolated between simulation steps. `debug` also outlines
 * the collider.
 */
export function drawCharacters(ctx: CanvasRenderingContext2D, world: World, alpha: number, time: number, debug = false): void {
  for (const [e, pos, body, rig] of world.query(Position, Body, Rig)) {
    const health = world.get(e, Health);
    const x = lerp(pos.prevX, pos.x, alpha);
    const y = lerp(pos.prevY, pos.y, alpha);
    const { w, h } = body;
    const pc = world.get(e, PlayerControl);

    // Blink while invulnerable after a hit (not during a dodge slide, which reads on its own).
    const blink = pc && health && health.invulnLeft > 0 && pc.state !== 'slide' && Math.floor(time * 16) % 2 === 0;
    ctx.globalAlpha = blink ? 0.35 : 1;
    // Rig origin = feet (collider bottom-centre).
    if (pc) drawScarf(ctx, e, rig.animator, x + w / 2, y + h, alpha, time);
    drawHumanoid(ctx, rig.animator, x + w / 2, y + h, alpha, rig.style);
    if (pc) drawScarfWrap(ctx, rig.animator, x + w / 2, y + h, alpha);
    ctx.globalAlpha = 1;

    // Enemy health bar once hurt.
    if (health && !pc && health.hp < health.max) {
      ctx.fillStyle = ENEMY.hpBack;
      ctx.fillRect(x, y - 5, w, 2);
      ctx.fillStyle = ENEMY.hpFill;
      ctx.fillRect(x, y - 5, (w * Math.max(0, health.hp)) / health.max, 2);
    }

    if (debug) {
      ctx.strokeStyle = 'rgba(255,0,255,0.7)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(x, y, w, h);
    }
  }
}

/** Dead bodies, fading out at the end of their life. */
export function drawRagdolls(ctx: CanvasRenderingContext2D, world: World): void {
  for (const [, rag] of world.query(Ragdoll)) {
    const fade = rag.age > 10 ? Math.max(0, 1 - (rag.age - 10) / 2) : 1;
    drawRagdoll(ctx, rag.body, rag.props, rag.style, fade);
  }
}

/** Bullets: a short streak along their velocity. */
export function drawProjectiles(ctx: CanvasRenderingContext2D, world: World, alpha: number): void {
  ctx.lineCap = 'round';
  for (const [, pos, vel, proj] of world.query(Position, Velocity, Projectile)) {
    const x = lerp(pos.prevX, pos.x, alpha);
    const y = lerp(pos.prevY, pos.y, alpha);
    const len = Math.hypot(vel.x, vel.y) || 1;
    const angle = Math.atan2(vel.y, vel.x);

    if (proj.kind === 'arrow') {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.strokeStyle = FX.arrowShaft;
      ctx.lineWidth = LINE.arrowShaft;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-1, 0);
      ctx.stroke();
      ctx.fillStyle = FX.arrowHead;
      ctx.beginPath();
      ctx.moveTo(2.6, 0);
      ctx.lineTo(-1.4, -1.6);
      ctx.lineTo(-1.4, 1.6);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = TEAM[proj.team === 'player' ? 'player' : 'enemy'].fletch;
      ctx.lineWidth = LINE.arrowFletch;
      ctx.beginPath();
      ctx.moveTo(-13, 0);
      ctx.lineTo(-10, -2.4);
      ctx.moveTo(-12, 0);
      ctx.lineTo(-9, 2.4);
      ctx.stroke();
      ctx.restore();
      continue;
    }

    ctx.strokeStyle = TEAM[proj.team === 'player' ? 'player' : 'enemy'].tracer;
    ctx.lineWidth = LINE.tracer;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - (vel.x / len) * 8, y - (vel.y / len) * 8);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
}
