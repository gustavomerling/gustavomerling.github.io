import { ACCESSORY as A, ENEMY, INK } from '../render/palette';

/**
 * Pixel-art accessories drawn over the procedural rig: render-only identity per enemy.
 * Every detail is whole-pixel `fillRect`s placed relative to the head centre and the torso
 * bone (already in world space), mirrored with the facing. No hitbox, timing or gameplay reads this.
 */
export type AccessoryKit =
  | 'intern'
  | 'security'
  | 'it-guy'
  | 'janitor'
  | 'auditor'
  | 'manager'
  | 'zombie'
  | 'runner'
  | 'bloater'
  | 'skeleton'
  | 'knight';

/** Kit by body colour (each enemy has its own token; the two bone skeletons split on their weapon at draw time). */
const BY_COLOR: Record<string, AccessoryKit> = {
  [ENEMY.office.intern]: 'intern',
  [ENEMY.office.security]: 'security',
  [ENEMY.office.itGuy]: 'it-guy',
  [ENEMY.office.janitor]: 'janitor',
  [ENEMY.office.auditor]: 'auditor',
  [ENEMY.office.manager]: 'manager',
  [ENEMY.undead.zombie]: 'zombie',
  [ENEMY.undead.runner]: 'runner',
  [ENEMY.undead.bloater]: 'bloater',
  [ENEMY.skeleton.bone]: 'skeleton',
  [ENEMY.skeleton.knight]: 'knight',
};

export function accessoryFor(color: string): AccessoryKit | undefined {
  return BY_COLOR[color];
}

type Pt = { x: number; y: number };

export interface AccessoryFrame {
  /** Torso bone ends, world space. */
  hip: Pt;
  neck: Pt;
  /** Head centre and radius, world space. */
  head: Pt;
  r: number;
  f: 1 | -1;
  /** Seen from behind (ladders): no faces, ties or badges. */
  back: boolean;
  /** Holding a bow (skeleton archer gets a hood and quiver instead of a horned helm). */
  archer: boolean;
}

export type AccessoryLayer = 'behind' | 'torso' | 'head';

/** Shared per-call drawing state (one object, reused: no per-frame allocation). */
const s = { ctx: null as unknown as CanvasRenderingContext2D, cx: 0, f: 1 as 1 | -1 };

/** Rect `dx` px forward of `cx` (mirrored with the facing), whole pixels. */
function rect(color: string, dx: number, y: number, w: number, h: number): void {
  const x = s.f > 0 ? s.cx + dx : s.cx - dx - w;
  s.ctx.fillStyle = color;
  s.ctx.fillRect(x, Math.round(y), w, h);
}

/** Rect with a 1 px outline. */
function boxed(color: string, dx: number, y: number, w: number, h: number): void {
  rect(INK.outline, dx - 1, y - 1, w + 2, h + 2);
  rect(color, dx, y, w, h);
}

export function drawAccessories(ctx: CanvasRenderingContext2D, kit: AccessoryKit, layer: AccessoryLayer, fr: AccessoryFrame): void {
  s.ctx = ctx;
  s.f = fr.f;
  if (layer === 'head') head(kit, fr);
  else torso(kit, layer, fr);
}

function head(kit: AccessoryKit, fr: AccessoryFrame): void {
  s.cx = Math.round(fr.head.x);
  const cy = Math.round(fr.head.y);
  const R = Math.max(2, Math.round(fr.r));
  const top = cy - R;
  const face = !fr.back;
  switch (kit) {
    case 'security':
      // Peaked cap with a gold badge.
      boxed(A.capSecurity, -R, top - 1, 2 * R, 2);
      if (face) {
        rect(INK.outline, R - 1, top, 4, 2);
        rect(A.capBrim, R - 1, top + 1, 3, 1);
        rect(A.starBadge, R - 2, top - 1, 1, 1);
      }
      break;
    case 'janitor':
      // Knit beanie with a turned-up band and a bobble.
      boxed(A.beanie, -R, top - 1, 2 * R, 3);
      rect(A.beanieFold, -R, top + 1, 2 * R, 1);
      boxed(A.beanie, -1, top - 3, 1, 1);
      break;
    case 'it-guy':
      if (face) glasses(R, cy);
      break;
    case 'auditor':
      // Green accountant's eyeshade.
      rect(INK.outline, -R, top, 2 * R + 3, 2);
      rect(A.visor, -R, top, 2 * R, 1);
      if (face) rect(A.visorDark, R - 1, top + 1, 3, 1);
      if (face) glasses(R, cy);
      break;
    case 'zombie':
    case 'runner':
    case 'bloater':
      // One glowing eye.
      if (face) rect(A.eyeGlow, R - 2, cy - 1, 1, 1);
      break;
    case 'skeleton':
      if (fr.archer) {
        // Hood: over the crown and down the back of the skull, face left bare.
        boxed(A.hood, -R - 1, top - 1, 2 * R + 1, 2);
        boxed(A.hood, -R - 1, top, R, 2 * R + 1);
        rect(A.hoodDark, -R - 1, top + 1, 1, 2 * R);
      } else {
        // Battered horned cap.
        boxed(A.helmetDark, -R, top - 1, 2 * R, 2);
        rect(A.helmet, -R + 1, top - 1, 2 * R - 2, 1);
        boxed(A.horn, -R - 1, top - 3, 1, 2);
        boxed(A.horn, R, top - 3, 1, 2);
      }
      break;
    case 'knight':
      // Great helm with an eye slit and a bright crest.
      boxed(A.helmet, -R, top - 1, 2 * R, 2 * R + 1);
      rect(A.helmetLight, -R, top - 1, 2 * R, 1);
      rect(A.helmetDark, -R, cy + R - 1, 2 * R, 1);
      if (face) rect(INK.outline, 0, cy - 1, R, 1);
      break;
    default:
      break;
  }
}

function glasses(R: number, cy: number): void {
  rect(A.glassesFrame, -1, cy - 1, R, 1);
  boxed(A.glassesLens, R - 2, cy - 1, 2, 1);
}

function torso(kit: AccessoryKit, layer: AccessoryLayer, fr: AccessoryFrame): void {
  // Torso axis point at fraction t (0 = hip, 1 = neck); x snapped once per call.
  const at = (t: number) => fr.hip.y + (fr.neck.y - fr.hip.y) * t;
  s.cx = Math.round((fr.hip.x + fr.neck.x) / 2);
  if (kit === 'skeleton' && fr.archer) {
    // Quiver: behind the body in profile, in plain view from behind.
    if (layer !== (fr.back ? 'torso' : 'behind')) return;
    const dx = fr.back ? -1 : -4;
    boxed(A.quiver, dx, at(0.95), 2, 6);
    rect(A.fletch, dx, at(0.95) - 2, 1, 2);
    rect(A.fletch, dx + 1, at(0.95) - 3, 1, 3);
    return;
  }
  if (layer !== 'torso' || fr.back) {
    // Bloater spots show from behind too.
    if (kit === 'bloater' && layer === 'torso') spots(at);
    return;
  }
  switch (kit) {
    case 'intern':
      // Lanyard and ID badge.
      rect(A.lanyard, 0, at(0.95), 1, 2);
      rect(A.lanyard, 1, at(0.8), 1, 2);
      boxed(A.badge, 1, at(0.6), 2, 2);
      rect(A.lanyard, 1, at(0.6), 2, 1);
      break;
    case 'security':
      rect(A.starBadge, 1, at(0.8), 1, 1);
      break;
    case 'it-guy':
      // Pocket pen.
      rect(A.lanyard, 1, at(0.8), 1, 2);
      break;
    case 'auditor':
      tie(at, A.tie);
      break;
    case 'manager':
      // Shirt V, dark lapels and a gold tie.
      rect(A.shirt, 0, at(0.95), 3, 2);
      rect(A.lapel, -1, at(0.95), 1, 4);
      tie(at, A.tieManager);
      rect(A.lapel, 0, at(0.8), 1, 3);
      break;
    case 'zombie':
      // Torn shirt: rag patch and an open wound.
      rect(A.rag, -2, at(0.5), 2, 2);
      rect(A.rag, -1, at(0.35), 1, 1);
      rect(A.wound, 1, at(0.72), 1, 1);
      break;
    case 'runner':
      // Ribs through a torn shirt.
      rect(INK.outline, -1, at(0.82) - 1, 4, 6);
      rect(A.rib, 0, at(0.82), 3, 1);
      rect(A.rib, 0, at(0.82) + 2, 3, 1);
      rect(A.rib, 0, at(0.82) + 4, 2, 1);
      break;
    case 'bloater':
      spots(at);
      break;
    default:
      break;
  }
}

function tie(at: (t: number) => number, color: string): void {
  rect(INK.outline, 1, at(0.95) - 1, 1, 1);
  rect(color, 1, at(0.95), 1, 4);
  rect(color, 2, at(0.95) + 3, 1, 1);
}

function spots(at: (t: number) => number): void {
  boxed(A.pustule, 1, at(0.4), 1, 1);
  boxed(A.pustule, -1, at(0.25), 1, 1);
  rect(A.pustuleDark, 0, at(0.6), 1, 1);
}
