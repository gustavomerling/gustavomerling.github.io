import { Registry } from '@engine/content/registry';

/**
 * Gun art and how it is held. Everything is in "gun space": pixels at the reference
 * height (24 px, scaled per character), origin at the grip (where the trigger hand
 * closes), +x along the barrel, +y towards the bottom of the gun.
 */
export type GunTone = 'metal' | 'dark' | 'light' | 'wood' | 'brass' | 'shell';

export interface GunPart {
  tone: GunTone;
  /** Closed polygon, flat list of x,y pairs. */
  points: readonly number[];
  /** Slides back along the barrel while the action cycles (shotgun pump). */
  pump?: boolean;
}

export interface GunModel {
  readonly id: string;
  /**
   * Grip position relative to the near shoulder, along the aim (x) and below it (y).
   * Short = tucked against the chest / stock on the shoulder; long = arms extended.
   */
  readonly grip: { readonly x: number; readonly y: number };
  /** Support (far) hand, relative to the grip. */
  readonly support: { readonly x: number; readonly y: number };
  readonly muzzle: { readonly x: number; readonly y: number };
  /** The free hand can let go (wall slides): pistols. */
  readonly oneHanded?: boolean;
  /** Pump travel in px: the support hand and `pump` parts slide back after each shot. */
  readonly pump?: number;
  readonly parts: readonly GunPart[];
  /** Detachable magazine, drawn behind the parts (dropped and replaced on reload). None = loaded shell by shell. */
  readonly mag?: GunPart;
  /** Ejection port: spent casings fly out of here. */
  readonly eject: { readonly x: number; readonly y: number };
  readonly casing: 'brass' | 'shell';
  /** Visual recoil: how hard each shot kicks the arms and how fast they recover (per second). */
  readonly kick: { readonly strength: number; readonly recover: number };
  /** Muzzle flash / smoke size. */
  readonly flash: number;
}

const box = (tone: GunTone, x0: number, y0: number, x1: number, y1: number, pump?: boolean): GunPart => ({
  tone,
  points: [x0, y0, x1, y0, x1, y1, x0, y1],
  pump,
});
const poly = (tone: GunTone, ...points: number[]): GunPart => ({ tone, points });

/** Average of a part's corners (where a hand grabs it, where it hangs from). */
export function partCenter(part: GunPart): { x: number; y: number } {
  let x = 0;
  let y = 0;
  const n = part.points.length / 2;
  for (let i = 0; i < part.points.length; i += 2) {
    x += part.points[i]!;
    y += part.points[i + 1]!;
  }
  return { x: x / n, y: y / n };
}

export const GUN_MODELS = new Registry<GunModel>('gun model', [
  {
    id: 'glock',
    // Arms out; the far arm bends to cup the grip (the two arms read separately).
    grip: { x: 7.6, y: 0.3 },
    support: { x: -0.4, y: 0.8 },
    muzzle: { x: 3.7, y: -1.5 },
    oneHanded: true,
    eject: { x: 0.8, y: -1.9 },
    casing: 'brass',
    kick: { strength: 1.3, recover: 10 },
    flash: 0.8,
    mag: poly('dark', -1.0, 0.4, 0.05, 0.4, -0.15, 2.6, -1.2, 2.6),
    parts: [
      poly('dark', -1.1, -0.9, 0.4, -0.9, 0.1, 2.3, -1.3, 2.3),
      box('metal', -1.0, -1.1, 3.2, -0.5),
      box('dark', -1.3, -2.1, 3.7, -1.0),
      box('light', 0.2, -2.1, 1.6, -1.6),
    ],
  },
  {
    id: 'uzi',
    grip: { x: 4.6, y: 0.8 },
    support: { x: 2.0, y: 0.4 },
    muzzle: { x: 4.4, y: -1.4 },
    eject: { x: 0.6, y: -2.3 },
    casing: 'brass',
    kick: { strength: 2.6, recover: 20 },
    flash: 0.9,
    mag: box('dark', -0.35, 0.2, 0.65, 3.9),
    parts: [
      box('light', -2.7, -2.7, 1.2, -2.3),
      box('dark', -0.5, -0.6, 0.8, 2.4),
      box('metal', -2.3, -2.3, 3.2, -0.6),
      box('dark', 3.2, -1.7, 4.4, -1.1),
    ],
  },
  {
    id: 'bizon',
    grip: { x: 4.2, y: 1.1 },
    support: { x: 2.8, y: 1.0 },
    muzzle: { x: 5.4, y: -1.5 },
    eject: { x: 0.5, y: -2.3 },
    casing: 'brass',
    kick: { strength: 1.8, recover: 16 },
    flash: 0.9,
    mag: box('dark', 0.9, -0.8, 4.6, 0.7),
    parts: [
      box('dark', -4.2, -2.1, -3.5, 0.8),
      box('light', -3.6, -1.9, -1.2, -1.3),
      poly('dark', -0.5, -0.8, 0.5, -0.8, 0.2, 2.0, -0.8, 2.0),
      box('metal', -1.4, -2.3, 3.8, -0.8),
      box('dark', 3.8, -1.8, 5.4, -1.2),
    ],
  },
  {
    id: 'ak47',
    // Stock on the shoulder, trigger hand tucked, far hand out on the handguard.
    grip: { x: 4.3, y: 1.0 },
    support: { x: 3.4, y: 0.1 },
    muzzle: { x: 8.6, y: -1.35 },
    eject: { x: 0.8, y: -2.3 },
    casing: 'brass',
    kick: { strength: 1.3, recover: 11 },
    flash: 1.2,
    mag: poly('dark', 1.1, -0.5, 2.5, -0.5, 2.9, 1.2, 3.4, 2.7, 2.2, 3.1, 1.7, 1.4),
    parts: [
      poly('wood', -1.0, -1.9, -4.6, -1.1, -4.6, 1.3, -1.0, -0.4),
      poly('dark', -0.4, -0.5, 0.6, -0.5, 0.2, 2.0, -0.9, 2.0),
      box('metal', -1.2, -2.3, 2.8, -0.5),
      box('metal', 2.8, -2.8, 5.2, -2.2),
      box('wood', 2.8, -2.2, 5.6, -0.6),
      box('dark', 5.6, -1.65, 8.6, -1.05),
      poly('dark', 7.7, -1.65, 7.9, -2.6, 8.2, -2.6, 8.2, -1.65),
    ],
  },
  {
    id: 'sniper',
    grip: { x: 4.3, y: 1.0 },
    support: { x: 4.6, y: 0.1 },
    muzzle: { x: 12.5, y: -1.5 },
    eject: { x: 0.9, y: -2.2 },
    casing: 'brass',
    kick: { strength: 1.4, recover: 5 },
    flash: 1.4,
    mag: box('dark', 1.0, -0.5, 2.4, 1.6),
    parts: [
      poly('dark', -1.0, -1.9, -5.0, -1.4, -5.0, 1.4, -3.4, 1.4, -1.0, -0.4),
      poly('dark', -0.4, -0.5, 0.6, -0.5, 0.2, 2.0, -0.9, 2.0),
      box('metal', -1.2, -2.3, 3.0, -0.5),
      box('metal', 3.0, -2.1, 7.0, -0.7),
      box('dark', 7.0, -1.75, 12.5, -1.25),
      box('dark', -0.2, -3.6, 3.6, -2.6),
      box('light', 3.6, -3.8, 4.2, -2.4),
      box('dark', 0.6, -2.6, 1.0, -2.3),
      box('dark', 2.6, -2.6, 3.0, -2.3),
    ],
  },
  {
    id: 'shotgun',
    grip: { x: 4.4, y: 1.0 },
    support: { x: 4.2, y: 0.2 },
    muzzle: { x: 10.2, y: -1.85 },
    pump: 1.8,
    eject: { x: 1.2, y: -2.0 },
    casing: 'shell',
    kick: { strength: 1.0, recover: 6 },
    flash: 1.6,
    parts: [
      poly('wood', -0.6, -1.9, -4.8, -1.0, -4.8, 1.5, -1.4, 0.1, -0.2, 1.6, 0.6, 1.4, 0.4, -0.4),
      box('metal', -0.8, -2.3, 2.3, -0.4),
      box('dark', 2.3, -2.3, 10.2, -1.4),
      box('dark', 2.3, -1.4, 8.8, -0.7),
      box('wood', 3.9, -1.7, 6.9, -0.3, true),
    ],
  },
]);

const derived = new Map<string, GunModel>();

/**
 * The model with its attachments on: suppressor / compensator on the muzzle (which moves
 * forward), laser under the barrel, longer or drum magazine. Cached, so the same loadout
 * always gives the same object (the animator compares guns by reference).
 */
export function withAttachments(gun: GunModel, attachments: readonly string[]): GunModel {
  if (attachments.length === 0) return gun;
  const key = `${gun.id}|${attachments.join(',')}`;
  const cached = derived.get(key);
  if (cached) return cached;
  const m = gun.muzzle;
  const parts = [...gun.parts];
  let muzzle = m;
  let mag = gun.mag;
  let flash = gun.flash;
  for (const id of attachments) {
    if (id === 'suppressor') {
      parts.push(box('dark', m.x, m.y - 0.6, m.x + 3.4, m.y + 0.6));
      muzzle = { x: m.x + 3.4, y: m.y };
      flash *= 0.3;
    } else if (id === 'compensator') {
      parts.push(box('metal', m.x, m.y - 0.5, m.x + 1.2, m.y + 0.5));
      muzzle = { x: m.x + 1.2, y: m.y };
    } else if (id === 'laser') {
      parts.push(box('dark', m.x - 2.8, m.y + 0.9, m.x - 1.0, m.y + 1.7), box('light', m.x - 1.0, m.y + 1.1, m.x - 0.7, m.y + 1.5));
    } else if (id === 'extended-mag' && mag) {
      // Same magazine, 45% longer downwards.
      const ys = mag.points.filter((_, i) => i % 2 === 1);
      const top = Math.min(...ys);
      mag = { ...mag, points: mag.points.map((v, i) => (i % 2 === 1 ? top + (v - top) * 1.45 : v)) };
    } else if (id === 'drum-mag' && mag) {
      const c = partCenter(mag);
      const r = 1.8;
      const pts: number[] = [];
      for (let k = 0; k < 8; k++) pts.push(c.x + Math.cos((k * Math.PI) / 4) * r, c.y + 0.8 + Math.sin((k * Math.PI) / 4) * r);
      mag = { tone: 'dark', points: pts };
    }
  }
  const model: GunModel = { ...gun, parts, muzzle, mag, flash };
  derived.set(key, model);
  return model;
}
