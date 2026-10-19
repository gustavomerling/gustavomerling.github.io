import { pixelLine } from '@engine/render/pixel';
import type { BoneTransform } from '@engine/rig/skeleton';
import type { HumanoidAnimator } from './animator';
import { HB, HOLD_STYLES } from './humanoid';

export interface RigStyle {
  color: string;
  /** Limbs on the far side. */
  backColor: string;
  /** Box interior (keeps overlapping parts readable). */
  fill: string;
  gunColor: string;
}

export function rigStyle(color: string): RigStyle {
  return { color, backColor: mix(color, '#000000', 0.5), fill: '#07080a', gunColor: '#d0d0d0' };
}

type Pt = { x: number; y: number };

/**
 * Wireframe rig: every bone is a rotated box. Drawn back-to-front:
 * back arm, back leg, torso, head, front leg, gun, front arm.
 */
export function drawHumanoid(
  ctx: CanvasRenderingContext2D,
  animator: HumanoidAnimator,
  originX: number,
  originY: number,
  alpha: number,
  style: RigStyle,
): void {
  const bones = animator.sample(alpha);
  const p = animator.props;
  const f = animator.facing;
  const ox = Math.round(originX);
  const oy = Math.round(originY);
  const toWorld = (x: number, y: number): Pt => ({ x: ox + f * x, y: oy + y });

  const limb = (i: number, width: number, color: string, startInset = 0) => {
    const t = bones[i]!;
    const a = boneAt(t, startInset);
    const b = boneAt(t, boneLength(t));
    const wa = toWorld(a.x, a.y);
    const wb = toWorld(b.x, b.y);
    drawBox(ctx, wa.x, wa.y, wb.x, wb.y, width, color, style.fill);
  };

  limb(HB.armBackUpper, p.upperArmWidth, style.backColor);
  limb(HB.armBackLower, p.lowerArmWidth, style.backColor);
  limb(HB.legBackUpper, p.upperLegWidth, style.backColor);
  limb(HB.legBackLower, p.lowerLegWidth, style.backColor);
  limb(HB.torso, p.torsoWidth, style.color);
  // Head: a square on the far end of the head bone (the neck is the gap below it).
  limb(HB.head, p.head, style.color, p.neck);
  limb(HB.legFrontUpper, p.upperLegWidth, style.color);
  limb(HB.legFrontLower, p.lowerLegWidth, style.color);

  if (animator.weaponClass) {
    const hand = bones[HB.armFrontLower]!;
    const hold = HOLD_STYLES[animator.weaponClass];
    const s = p.height / 24;
    const aim = animator.sampleAim(alpha);
    const dx = Math.cos(aim);
    const dy = Math.sin(aim);
    const a = toWorld(hand.x1 - dx * hold.stock * s, hand.y1 - dy * hold.stock * s);
    const b = toWorld(hand.x1 + dx * hold.length * s, hand.y1 + dy * hold.length * s);
    ctx.fillStyle = style.gunColor;
    pixelLine(ctx, a.x, a.y, b.x, b.y, 2);
  }

  limb(HB.armFrontUpper, p.upperArmWidth, style.color);
  limb(HB.armFrontLower, p.lowerArmWidth, style.color);
}

const boneLength = (t: BoneTransform) => Math.hypot(t.x1 - t.x0, t.y1 - t.y0);
const boneAt = (t: BoneTransform, d: number): Pt => ({ x: t.x0 + Math.cos(t.angle) * d, y: t.y0 + Math.sin(t.angle) * d });

/**
 * Rotated rectangle from (x0,y0) to (x1,y1), `width` thick, in world pixels.
 * Thin parts (< 3 px) are drawn as solid bars, which read better at this size.
 */
export function drawBox(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, width: number, stroke: string, fill: string): void {
  const len = Math.hypot(x1 - x0, y1 - y0) || 1e-6;
  const dx = (x1 - x0) / len;
  const dy = (y1 - y0) / len;
  if (width < 3) {
    ctx.fillStyle = stroke;
    pixelLine(ctx, x0, y0, x1, y1, Math.max(1, Math.round(width)));
    return;
  }
  const hw = width / 2;
  const nx = -dy * hw;
  const ny = dx * hw;
  const corners: Pt[] = [
    { x: x0 + nx, y: y0 + ny },
    { x: x1 + nx, y: y1 + ny },
    { x: x1 - nx, y: y1 - ny },
    { x: x0 - nx, y: y0 - ny },
  ];
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(corners[0]!.x, corners[0]!.y);
  for (const c of corners.slice(1)) ctx.lineTo(c.x, c.y);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = stroke;
  for (let i = 0; i < 4; i++) {
    const c0 = corners[i]!;
    const c1 = corners[(i + 1) % 4]!;
    pixelLine(ctx, c0.x, c0.y, c1.x, c1.y);
  }
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
