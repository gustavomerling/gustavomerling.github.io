import type { World } from '@engine/ecs/world';
import { lerp } from '@engine/math/math';
import { pixelLine } from '@engine/render/pixel';
import { drawRagdoll } from '../character/ragdoll';
import { PROPS } from '../config';
import { Body, Breakable, Hazard, Health, Pickup, Position, Ragdoll } from '../world/components';
import type { Feedback } from '../systems/context';

const PICKUP_STYLE = {
  health: { color: '#5dff8a', glyph: '+' },
  money: { color: '#ffd23f', glyph: '$' },
  ammo: { color: '#7fb8ff', glyph: 'A' },
  weapon: { color: '#d0d0d0', glyph: '' },
} as const;

/** Crates, doors, barrels (tile-aligned) and hazards (lamps, extinguishers). Wireframe. */
export function drawProps(ctx: CanvasRenderingContext2D, world: World, time: number): void {
  for (const [, pos, brk, health] of world.query(Position, Breakable, Health)) {
    const { x, y } = pos;
    const { w, h } = brk;
    const color = PROPS[brk.kind].color;
    const damaged = health.hp < health.max;
    ctx.fillStyle = '#0d0b09';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
    ctx.fillStyle = color;
    switch (brk.kind) {
      case 'crate':
        pixelLine(ctx, x + 2, y + 2, x + w - 3, y + h - 3);
        pixelLine(ctx, x + w - 3, y + 2, x + 2, y + h - 3);
        break;
      case 'door':
        ctx.strokeRect(x + 3.5, y + 4.5, w - 7, h / 2 - 8);
        ctx.fillRect(x + w - 5, y + h / 2 + 2, 2, 2);
        break;
      case 'barrel':
        ctx.fillRect(x + 1, y + 4, w - 2, 2);
        ctx.fillRect(x + 1, y + h - 6, w - 2, 2);
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(x + w / 2 - 1, y + h / 2 - 2, 2, 3);
        break;
    }
    if (damaged) {
      // Cracks grow as it takes damage.
      ctx.fillStyle = '#000';
      const cracks = Math.ceil((1 - health.hp / health.max) * 4);
      for (let i = 0; i < cracks; i++) pixelLine(ctx, x + 3 + i * 3, y + 1, x + 1 + i * 3, y + h / 2);
    }
  }

  for (const [, pos, body, hazard] of world.query(Position, Body, Hazard)) {
    const x = Math.round(pos.x);
    const y = Math.round(pos.y);
    if (hazard.kind === 'lamp') {
      if (!hazard.triggered) {
        ctx.fillStyle = '#6a6a6a';
        pixelLine(ctx, x + body.w / 2, y - 12, x + body.w / 2, y);
      }
      ctx.fillStyle = '#cfcfcf';
      ctx.fillRect(x, y, body.w, 2);
      ctx.fillRect(x + 2, y + 2, body.w - 4, body.h - 2);
      // Light cone.
      if (!hazard.triggered) {
        ctx.globalAlpha = 0.06 + 0.02 * Math.sin(time * 9);
        ctx.fillStyle = '#fff3c4';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + body.h);
        ctx.lineTo(x + body.w - 2, y + body.h);
        ctx.lineTo(x + body.w + 22, y + body.h + 70);
        ctx.lineTo(x - 22, y + body.h + 70);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    } else {
      ctx.fillStyle = '#e03c31';
      ctx.fillRect(x, y + 1, body.w, body.h - 1);
      ctx.fillStyle = '#222';
      ctx.fillRect(x + 1, y, 2, 1);
    }
  }
}

export function drawPickups(ctx: CanvasRenderingContext2D, world: World, alpha: number, time: number): void {
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const [, pos, body, pickup] of world.query(Position, Body, Pickup)) {
    const x = Math.round(lerp(pos.prevX, pos.x, alpha));
    const y = Math.round(lerp(pos.prevY, pos.y, alpha));
    const style = PICKUP_STYLE[pickup.kind];
    // Blink before despawning.
    if (pickup.age > 26 && Math.sin(time * 20) > 0) continue;
    if (pickup.kind === 'weapon') {
      ctx.fillStyle = style.color;
      pixelLine(ctx, x, y + 1, x + body.w - 1, y + 1, 2);
      ctx.fillRect(x + 2, y + 2, 2, 2);
      continue;
    }
    const bob = Math.round(Math.sin(time * 5 + pos.x) * 0.8);
    ctx.fillStyle = '#000';
    ctx.fillRect(x, y + bob, body.w, body.h);
    ctx.strokeStyle = style.color;
    ctx.strokeRect(x + 0.5, y + bob + 0.5, body.w - 1, body.h - 1);
    ctx.fillStyle = style.color;
    ctx.fillText(style.glyph, x + body.w / 2, y + bob + body.h / 2 + 0.5);
  }
}

export function drawRagdolls(ctx: CanvasRenderingContext2D, world: World): void {
  for (const [, rag] of world.query(Ragdoll)) {
    const fade = rag.age > 10 ? Math.max(0, 1 - (rag.age - 10) / 2) : 1;
    drawRagdoll(ctx, rag.body, rag.props, rag.style, fade);
  }
}

export function drawPrompt(ctx: CanvasRenderingContext2D, feedback: Feedback): void {
  const p = feedback.prompt;
  if (!p) return;
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = '#000';
  ctx.fillText(p.text, Math.round(p.x) + 1, Math.round(p.y) + 1);
  ctx.fillStyle = '#ffd23f';
  ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
}
