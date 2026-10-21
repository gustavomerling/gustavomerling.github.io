import type { BoneTransform } from '@engine/rig/skeleton';
import { partCenter, type GunModel, type GunPart, type GunTone } from '../content/weapons/models';
import type { HumanoidAnimator } from './animator';
import { HB } from './humanoid';

export interface RigStyle {
  color: string;
  /** Limbs on the far side. */
  backColor: string;
  /** Thin dark rim around every part (keeps overlapping limbs readable). */
  outline: string;
}

export function rigStyle(color: string): RigStyle {
  return { color, backColor: mix(color, '#000000', 0.45), outline: '#07080a' };
}

/** Flat gun colours: mid greys and wood, light enough to read on the dark backdrop. */
const GUN_TONES: Record<GunTone, string> = {
  metal: '#8d95a1',
  dark: '#5c636e',
  light: '#b9c0ca',
  wood: '#a8703f',
  brass: '#d9a441',
  shell: '#c0392b',
};

/** A shotgun shell carried in the hand while loading (gun space, centred). */
const SHELL_PART: GunPart = { tone: 'shell', points: [-0.9, -0.45, 0.9, -0.45, 0.9, 0.45, -0.9, 0.45] };

type Pt = { x: number; y: number };

/** Rim thickness around each part, world units. */
const OUTLINE = 0.9;

/**
 * Flat vector rig: every bone is a rounded capsule with a dark rim, the head a circle.
 * Side view, back-to-front: back arm, back leg, torso, head, front leg, gun, front arm.
 * While reloading, the back arm works in front of the chest (fetching and seating the magazine).
 * Seen from behind (ladders): legs, arms, torso, slung gun, head.
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
  const arm = (upper: number, lower: number, color: string) => {
    limb(upper, p.upperArmWidth, color);
    limb(lower, p.lowerArmWidth, color);
    // Hand: a small knob at the wrist, so grips read.
    const hand = bones[lower]!;
    const at = toWorld(hand.x1, hand.y1);
    drawDisc(ctx, at.x, at.y, p.lowerArmWidth * 0.62, color, style.outline);
  };
  const head = () => {
    // A circle on the far end of the head bone (the neck is the gap below it).
    const c = boneAt(bones[HB.head]!, p.neck + p.head / 2);
    const hc = toWorld(c.x, c.y);
    drawDisc(ctx, hc.x, hc.y, p.head / 2 + 0.4, style.color, style.outline);
  };

  if (animator.backView > 0.5) {
    const side = mix(style.color, '#000000', 0.15);
    // From behind the knees bend towards/away from us: draw the legs nearly straight,
    // hip to foot, the raised one (shorter) behind the other.
    const legs = [
      { upper: HB.legBackUpper, lower: HB.legBackLower, color: side, dir: -1 },
      { upper: HB.legFrontUpper, lower: HB.legFrontLower, color: style.color, dir: 1 },
    ].sort((a, b) => bones[a.lower]!.y1 - bones[b.lower]!.y1);
    for (const leg of legs) {
      const hip = bones[leg.upper]!;
      const foot = bones[leg.lower]!;
      const knee = { x: (hip.x0 + foot.x1) / 2 + leg.dir * 0.4 * animator.s, y: (hip.y0 + foot.y1) / 2 };
      const a = toWorld(hip.x0, hip.y0);
      const k = toWorld(knee.x, knee.y);
      const b = toWorld(foot.x1, foot.y1);
      drawCapsule(ctx, a.x, a.y, k.x, k.y, p.upperLegWidth, leg.color, style.outline);
      drawCapsule(ctx, k.x, k.y, b.x, b.y, p.lowerLegWidth, leg.color, style.outline);
    }
    arm(HB.armBackUpper, HB.armBackLower, side);
    arm(HB.armFrontUpper, HB.armFrontLower, style.color);
    limb(HB.torso, p.torsoWidth, style.color);
    if (animator.gun) {
      // Slung diagonally across the back, barrel up.
      const torso = bones[HB.torso]!;
      const mid = toWorld((torso.x0 + torso.x1) / 2, (torso.y0 + torso.y1) / 2);
      drawGun(ctx, animator.gun, mid.x, mid.y, f, -Math.PI / 2 - 0.7, animator.s, 0, style.outline, true);
    }
    head();
    return;
  }

  const gunAngle = animator.sampleGunAngle(alpha);
  const backArm = () => {
    arm(HB.armBackUpper, HB.armBackLower, style.backColor);
    if (!animator.gun || !animator.magInHand) return;
    // Fresh magazine (or shell) in the far hand, held the way it goes into the gun.
    const hand = bones[HB.armBackLower]!;
    const at = toWorld(hand.x1, hand.y1);
    const part = animator.gun.mag ?? SHELL_PART;
    const c = partCenter(part);
    ctx.save();
    ctx.translate(at.x, at.y);
    ctx.scale(f * animator.s, animator.s);
    ctx.rotate(gunAngle);
    ctx.translate(-c.x, -c.y + (animator.gun.mag ? 0.6 : 0));
    drawParts(ctx, [part], animator.s, 0, style.outline);
    ctx.restore();
  };
  if (!animator.reloading) backArm();
  limb(HB.legBackUpper, p.upperLegWidth, style.backColor);
  limb(HB.legBackLower, p.lowerLegWidth, style.backColor);
  limb(HB.torso, p.torsoWidth, style.color);
  head();
  if (animator.reloading) backArm();
  limb(HB.legFrontUpper, p.upperLegWidth, style.color);
  limb(HB.legFrontLower, p.lowerLegWidth, style.color);

  if (animator.gun) {
    const hand = bones[HB.armFrontLower]!;
    const at = toWorld(hand.x1, hand.y1);
    drawGun(ctx, animator.gun, at.x, at.y, f, gunAngle, animator.s, animator.pumpOffset, style.outline, animator.magAttached);
  }

  arm(HB.armFrontUpper, HB.armFrontLower, style.color);
}

/**
 * Draws a gun model with its grip at (x, y), pointing along `angle` (local, facing-right
 * space; `facing` mirrors it). Rims first, then flat fills, then thin seams between parts.
 */
export function drawGun(
  ctx: CanvasRenderingContext2D,
  gun: GunModel,
  x: number,
  y: number,
  facing: 1 | -1,
  angle: number,
  scale: number,
  pump: number,
  outline: string,
  withMag: boolean,
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(facing * scale, scale);
  ctx.rotate(angle);
  drawParts(ctx, withMag && gun.mag ? [gun.mag, ...gun.parts] : gun.parts, scale, pump, outline);
  ctx.restore();
}

/** Gun parts in the current (gun-space) transform. */
function drawParts(ctx: CanvasRenderingContext2D, parts: readonly GunPart[], scale: number, pump: number, outline: string): void {
  ctx.lineJoin = 'round';
  const path = (points: readonly number[], dx: number) => {
    ctx.beginPath();
    for (let i = 0; i < points.length; i += 2) ctx.lineTo(points[i]! + dx, points[i + 1]!);
    ctx.closePath();
  };
  const shift = (pumpPart: boolean | undefined) => (pumpPart ? -pump : 0);

  ctx.strokeStyle = outline;
  ctx.lineWidth = (OUTLINE * 1.6) / scale;
  for (const part of parts) {
    path(part.points, shift(part.pump));
    ctx.stroke();
  }
  ctx.lineWidth = 0.3 / scale;
  for (const part of parts) {
    path(part.points, shift(part.pump));
    ctx.fillStyle = GUN_TONES[part.tone];
    ctx.fill();
    ctx.stroke();
  }
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
