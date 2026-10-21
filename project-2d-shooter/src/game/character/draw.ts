import type { BoneTransform } from '@engine/rig/skeleton';
import type { HumanoidAnimator } from './animator';
import { HB, HOLD_STYLES } from './humanoid';

export interface RigStyle {
  color: string;
  /** Limbs on the far side. */
  backColor: string;
  /** Thin dark rim around every part (keeps overlapping limbs readable). */
  outline: string;
  gunColor: string;
}

export function rigStyle(color: string): RigStyle {
  return { color, backColor: mix(color, '#000000', 0.45), outline: '#07080a', gunColor: '#d0d0d0' };
}

type Pt = { x: number; y: number };

/** Rim thickness around each part, world units. */
const OUTLINE = 0.9;

/**
 * Flat vector rig: every bone is a rounded capsule with a dark rim, the head a circle.
 * Drawn back-to-front: back arm, back leg, torso, head, front leg, gun, front arm.
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
  const toWorld = (x: number, y: number): Pt => ({ x: originX + f * x, y: originY + y });

  const limb = (i: number, width: number, color: string) => {
    const t = bones[i]!;
    const a = toWorld(t.x0, t.y0);
    const b = toWorld(t.x1, t.y1);
    drawCapsule(ctx, a.x, a.y, b.x, b.y, width, color, style.outline);
  };

  limb(HB.armBackUpper, p.upperArmWidth, style.backColor);
  limb(HB.armBackLower, p.lowerArmWidth, style.backColor);
  limb(HB.legBackUpper, p.upperLegWidth, style.backColor);
  limb(HB.legBackLower, p.lowerLegWidth, style.backColor);
  limb(HB.torso, p.torsoWidth, style.color);
  // Head: a circle on the far end of the head bone (the neck is the gap below it).
  const head = bones[HB.head]!;
  const c = boneAt(head, p.neck + p.head / 2);
  const hc = toWorld(c.x, c.y);
  drawDisc(ctx, hc.x, hc.y, p.head / 2 + 0.4, style.color, style.outline);
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
    drawCapsule(ctx, a.x, a.y, b.x, b.y, 1.8, style.gunColor, style.outline);
  }

  limb(HB.armFrontUpper, p.upperArmWidth, style.color);
  limb(HB.armFrontLower, p.lowerArmWidth, style.color);
}

const boneAt = (t: BoneTransform, d: number): Pt => ({ x: t.x0 + Math.cos(t.angle) * d, y: t.y0 + Math.sin(t.angle) * d });

/** Rounded segment from (x0,y0) to (x1,y1), `width` thick, with a dark rim. */
export function drawCapsule(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number, width: number, color: string, outline: string): void {
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.strokeStyle = outline;
  ctx.lineWidth = width + OUTLINE * 2;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.lineCap = 'butt';
}

export function drawDisc(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, outline: string): void {
  ctx.beginPath();
  ctx.arc(x, y, r + OUTLINE, 0, Math.PI * 2);
  ctx.fillStyle = outline;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

export function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `#${((ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).padStart(6, '0')}`;
}
