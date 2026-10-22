/**
 * Art direction: the single source of truth for colours and line widths (see docs/05-direcao-de-arte.md).
 *
 * Two layers:
 * - Shared tokens (`INK`, `LINE`, `PLAYER`, `ENEMY`, `TEAM`, `DANGER`, `ACCENT`, `FX`, `GUN`, `UI`, `GRID`):
 *   gameplay colours that must read the same in every mode (a telegraph is always `DANGER`).
 * - A per-mode `Theme` (background, tiles, buildings, sky): the mood. `THEMES.campaign` is the
 *   base; other themes are partial overrides merged over it (`defineTheme`).
 *
 * The run picks its theme once (`setTheme(themeFor(...))` in RunScene); renderers read `theme()`.
 * Rule: no hex/rgba literals in renderers — add a token here instead.
 */

/** Hex (#rgb / #rrggbb) to `rgba(...)` with the given alpha. For fades of a token colour. */
export function rgba(hex: string, alpha: number): string {
  let h = hex.slice(1);
  if (h.length === 3) h = h[0]! + h[0]! + h[1]! + h[1]! + h[2]! + h[2]!;
  const n = parseInt(h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

// ---------------------------------------------------------------- shared tokens

/** Outlines and the darkest darks. Everything with an outline uses `INK.outline`. */
export const INK = {
  /** Rim around characters, guns, debris. */
  outline: '#07080a',
  /** Bullet holes. */
  hole: '#050608',
  /** Plain black (icons, text shadows on the HUD). */
  black: '#000000',
} as const;

/** Line widths, world units (1 tile = 16). Hairlines that must stay 1 device px are computed at draw time. */
/** Line widths in world units = buffer pixels (pixel art: whole pixels only, nothing thinner than 1). */
export const LINE = {
  /** Rim around every rig part. */
  rig: 1,
  debris: 1,
  tracer: 2,
  arrowShaft: 1,
  arrowFletch: 1.2,
  spark: 1,
  /** Expanding effect rings (parry, headshot, bursts). */
  fxRing: 1,
  /** Enemy laser / aim telegraph. */
  telegraph: 1,
  laserSight: 1,
  windowFrame: 1,
  exitFrame: 2,
  /** One-way platform bar thickness. */
  oneWay: 3,
} as const;

/** The player: near-white, the brightest body on screen. */
export const PLAYER = {
  body: '#f2f2f2',
} as const;

/**
 * Enemy body colours by family. Saturated mid-to-light hues: they pop against the dark,
 * low-contrast backgrounds but stay below the player's white.
 */
export const ENEMY = {
  office: {
    intern: '#7fd1ff',
    security: '#ffb347',
    itGuy: '#9cff8a',
    janitor: '#c79bff',
    auditor: '#7ef0d6',
    manager: '#ff6b6b',
  },
  undead: {
    zombie: '#8fbf7a',
    runner: '#d9a56b',
    bloater: '#7f9a6e',
  },
  skeleton: {
    bone: '#ddd6c2',
    knight: '#cfc8b4',
    /** Far-side limbs of skeletons. */
    back: '#a9a28f',
    /** Bone chips instead of blood. */
    chips: '#d8d0bb',
  },
  /** Health bar over hurt enemies. */
  hpBack: '#440000',
  hpFill: '#ff4444',
} as const;

/** Friendly vs hostile projectiles and swings. Friendly = warm pale, hostile = red family. */
export const TEAM = {
  player: { tracer: '#fff6a0', fletch: '#f3f0d0', slash: '#eef4ff' },
  enemy: { tracer: '#ff7a7a', fletch: '#c46b6b', slash: '#ff9a8a' },
} as const;

/** The one danger colour: telegraphs, lasers, hurt vignette, kill marker, empty ammo. */
export const DANGER = {
  base: '#ff3c3c',
  /** Hot core of a telegraph (attack about to land). */
  hot: '#ff5a4a',
  kill: '#ff3030',
  empty: '#ff5050',
} as const;

/** The one accent colour: exits, pickups, objectives, ammo read-outs. */
export const ACCENT = {
  base: '#ffd23f',
  /** Headshot / secondary highlight. */
  warm: '#ffb347',
  /** Stun stars and similar status glyphs. */
  status: '#ffe27a',
} as const;

/** Effects. */
export const FX = {
  spark: '#ffd27a',
  parry: '#ffffff',
  flashRim: '#ffb347',
  flashCore: '#fff6c8',
  smoke: '#b8bec8',
  dust: '#8a7f6e',
  blood: ['#9e1b1b', '#c22a2a'] as readonly string[],
  /** Shotgun pellet wad / generic brass bits. */
  wad: '#c9a050',
  arrowShaft: '#d9b382',
  arrowHead: '#dfe6f0',
} as const;

/** Flat gun colours: mid greys and wood, light enough to read on the dark backdrop. */
export const GUN = {
  metal: '#8d95a1',
  dark: '#5c636e',
  light: '#b9c0ca',
  wood: '#a8703f',
  brass: '#d9a441',
  shell: '#c0392b',
  /** Face of the rig head (visor / eye dot). */
  eye: '#15161a',
} as const;

/** Screen-space HUD on the canvas (crosshair, markers). */
export const UI = {
  crosshair: '#ffffff',
  /** Slow-motion meter / tint (CSS --slowmo). */
  slowmo: '#78b4ff',
  /** Faint track behind progress rings. */
  track: 'rgba(255,255,255,0.18)',
} as const;

/** Measuring grid (F2) and the tile read-out next to the cursor. */
export const GRID = {
  line: '#a0c8ff',
  /** Alpha: plain tile, storey/5 tiles, chunk border. */
  alpha: { tile: 0.1, storey: 0.22, chunk: 0.4 },
  readout: 'rgba(160,200,255,0.9)',
} as const;

// ---------------------------------------------------------------- per-mode themes

export type ThemeId = 'campaign' | 'zombie' | 'castle';

/** Back-wall tone of a building chunk (procgen RoomStyle picks one). */
export type BuildingTone = 'plain' | 'a' | 'b' | 'c';

export interface CitySky {
  /** Gradient stops top → bottom. */
  gradient: readonly (readonly [number, string])[];
  star: string;
  moon: string;
  moonGlow: string;
  cloud: string;
  /** Far → near skyline silhouettes (3 parallax layers). */
  skylines: readonly [string, string, string];
  /** Horizon haze between skyline layers (faded to transparent upwards). */
  haze: string;
  litWindow: string;
  /** Chance a skyline window is lit (near layer). */
  litChance: number;
}

export interface CastleSky {
  gradient: readonly (readonly [number, string])[];
  star: string;
  sun: string;
  sunGlow: string;
  cloud: string;
  /** Far (hazier) and near mountain ranges. */
  mountainsFar: string;
  mountains: string;
  /** Far (smaller, hazier) and near castle silhouettes. */
  silhouetteFar: string;
  silhouette: string;
  banner: string;
  litWindow: string;
  /** Low warm haze along the horizon. */
  haze: string;
}

/** Cheap mood lighting (render/lighting.ts). Decoration only; all alphas stay low. */
export interface ThemeLight {
  /** Screen-edge darkening over sky and back walls (never over tiles, characters or the grid). */
  vignette: string;
  vignetteAlpha: number;
  /** Directional wash from the moon/sun side of the screen. */
  wash: string;
  washAlpha: number;
  /** 0..1 horizontal position of the wash source (matches the moon/sun). */
  washFrom: number;
  /** Light spilling from window holes onto the back wall. */
  windowSpill: string;
  spillAlpha: number;
  /** Ceiling lamp / torch glow pools on back walls. */
  lamp: string;
  lampAlpha: number;
  /** Chance a storey of a building has a lamp pool. */
  lampChance: number;
  /** Flicker amplitude 0..1 (0 = steady; torches flicker). */
  flicker: number;
}

export interface Theme {
  id: ThemeId;
  /** Which skybox painter to use. */
  skyKind: 'city' | 'castle';
  /** Clear colour behind everything. */
  void: string;
  city: CitySky;
  castle: CastleSky;
  tiles: {
    solid: string;
    solidEdge: string;
    /** Slightly lighter band just under an exposed top edge (gives blocks a lit top face). */
    solidFace: string;
    oneWay: string;
    /** Bright top line of a one-way bar. */
    oneWayEdge: string;
    /** Soft shadow under a one-way bar / hatch below it (rgba). */
    oneWayShadow: string;
    ladder: string;
    /** Ladder side rails (rungs use `ladder`). */
    ladderRail: string;
  };
  buildings: Record<BuildingTone, { wall: string; window: string }> & {
    /** Thin frame around window holes. */
    windowFrame: string;
    /** Sill under window holes (a touch brighter than the frame). */
    windowSill: string;
    /** Alpha of the glass tint over the sky. */
    glassAlpha: number;
    /** Interior depth: ceiling/floor/corner shadow on back walls (rgba). */
    shade: string;
    /** Faint storey band (dado line) along each floor (rgba). */
    band: string;
  };
  light: ThemeLight;
  /** Exit door + exit arrow. */
  exit: string;
}

type DeepPartial<T> = { [K in keyof T]?: T[K] extends readonly unknown[] ? T[K] : T[K] extends object ? DeepPartial<T[K]> : T[K] };

const CAMPAIGN: Theme = {
  id: 'campaign',
  skyKind: 'city',
  void: '#0b0d12',
  city: {
    gradient: [
      [0, '#070a14'],
      [0.65, '#121a30'],
      [1, '#2a2440'],
    ],
    star: '#cfd8ff',
    moon: '#dfe6ff',
    moonGlow: 'rgba(230,236,255,0.08)',
    cloud: 'rgba(120,130,170,0.10)',
    skylines: ['#131a2c', '#161c2e', '#1a2134'],
    haze: '#2a2848',
    litWindow: 'rgba(232,200,106,0.45)',
    litChance: 0.18,
  },
  castle: {
    gradient: [
      [0, '#121a2e'],
      [0.55, '#33405a'],
      [0.82, '#7a5866'],
      [1, '#c98a5c'],
    ],
    star: '#f4e7cf',
    sun: '#ffd9a0',
    sunGlow: 'rgba(255,206,140,0.16)',
    cloud: 'rgba(210,180,190,0.10)',
    mountainsFar: '#4a4a62',
    mountains: '#2c3448',
    silhouetteFar: '#2e3448',
    silhouette: '#1c2233',
    banner: '#a63d4f',
    litWindow: 'rgba(255,206,140,0.35)',
    haze: '#b07a68',
  },
  tiles: {
    solid: '#1b1f27',
    solidEdge: '#8a94a6',
    solidFace: '#232833',
    oneWay: '#c9b458',
    oneWayEdge: '#efe0a0',
    oneWayShadow: 'rgba(0,0,0,0.35)',
    ladder: '#9a8a52',
    ladderRail: '#c2ad6a',
  },
  buildings: {
    plain: { wall: '#1c1c22', window: '#0e0e12' },
    a: { wall: '#1c2029', window: '#0e1118' },
    b: { wall: '#221c20', window: '#100d10' },
    c: { wall: '#1a2420', window: '#0c1210' },
    windowFrame: 'rgba(160,170,200,0.35)',
    windowSill: 'rgba(180,190,220,0.45)',
    glassAlpha: 0.35,
    shade: 'rgba(4,5,10,0.55)',
    band: 'rgba(150,160,200,0.07)',
  },
  light: {
    vignette: '#020308',
    vignetteAlpha: 0.45,
    wash: '#9fb0ff',
    washAlpha: 0.05,
    washFrom: 0.78,
    windowSpill: '#a8b8ff',
    spillAlpha: 0.08,
    lamp: '#ffd890',
    lampAlpha: 0.07,
    lampChance: 0.5,
    flicker: 0,
  },
  exit: ACCENT.base,
};

/** Same city, more ominous: sickly green-grey night, dimmer moon, fewer lit windows. */
const ZOMBIE: DeepPartial<Theme> = {
  id: 'zombie',
  void: '#0a0d0b',
  city: {
    gradient: [
      [0, '#060908'],
      [0.6, '#121a18'],
      [1, '#2b2a22'],
    ],
    star: '#b9c8b8',
    moon: '#d6dcc0',
    moonGlow: 'rgba(200,214,170,0.07)',
    cloud: 'rgba(110,125,110,0.12)',
    skylines: ['#111714', '#141b17', '#171f1b'],
    haze: '#2a2c22',
    litWindow: 'rgba(214,180,96,0.35)',
    litChance: 0.06,
  },
  tiles: { solid: '#191d1c', solidEdge: '#7f8a86', solidFace: '#202523' },
  buildings: {
    plain: { wall: '#1a1c1b', window: '#0d0f0e' },
    a: { wall: '#1a1f1f', window: '#0d1110' },
    b: { wall: '#201c1c', window: '#0f0d0d' },
    c: { wall: '#18211d', window: '#0b110e' },
    windowFrame: 'rgba(150,165,155,0.3)',
    windowSill: 'rgba(170,185,170,0.38)',
    shade: 'rgba(2,4,3,0.65)',
    band: 'rgba(150,170,150,0.05)',
  },
  // Darker edges, pale moonlight washing in through the windows, almost no lamps (and they flicker).
  light: {
    vignette: '#010201',
    vignetteAlpha: 0.62,
    wash: '#cfdcb8',
    washAlpha: 0.06,
    windowSpill: '#d6e0c0',
    spillAlpha: 0.11,
    lamp: '#e8d8a0',
    lampAlpha: 0.06,
    lampChance: 0.15,
    flicker: 0.5,
  },
};

/** Medieval castle field at dusk: warm sky, lighter stone. */
const CASTLE: DeepPartial<Theme> = {
  id: 'castle',
  skyKind: 'castle',
  void: '#33405a',
  tiles: {
    solid: '#4a4f5a',
    solidEdge: '#a7b0be',
    solidFace: '#555b67',
    oneWay: '#b08d57',
    oneWayEdge: '#dcbb84',
    oneWayShadow: 'rgba(20,14,10,0.35)',
    ladder: '#8a7a5a',
    ladderRail: '#a8946a',
  },
  // Warm stone interiors lit by torches.
  buildings: {
    plain: { wall: '#2a2830', window: '#1a1820' },
    windowFrame: 'rgba(220,190,160,0.3)',
    windowSill: 'rgba(230,200,170,0.4)',
    shade: 'rgba(12,8,10,0.5)',
    band: 'rgba(230,200,170,0.06)',
  },
  light: {
    vignette: '#0c0608',
    vignetteAlpha: 0.38,
    wash: '#ffc890',
    washAlpha: 0.07,
    washFrom: 0.28,
    windowSpill: '#ffc890',
    spillAlpha: 0.09,
    lamp: '#ffa850',
    lampAlpha: 0.12,
    lampChance: 0.8,
    flicker: 0.35,
  },
};

function merge<T>(base: T, over: DeepPartial<T>): T {
  const out = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(over as Record<string, unknown>)) {
    if (v === undefined) continue;
    const b = out[k];
    out[k] = v && typeof v === 'object' && !Array.isArray(v) && b && typeof b === 'object' ? merge(b, v as DeepPartial<typeof b>) : v;
  }
  return out as T;
}

/** Merge a partial theme over the campaign base. */
export function defineTheme(over: DeepPartial<Theme>): Theme {
  return merge(CAMPAIGN, over);
}

export const THEMES: Record<ThemeId, Theme> = {
  campaign: CAMPAIGN,
  zombie: defineTheme(ZOMBIE),
  castle: defineTheme(CASTLE),
};

let active: Theme = CAMPAIGN;

/** Select the theme for the current run (RunScene does this once on enter). */
export function setTheme(t: Theme | ThemeId): void {
  active = typeof t === 'string' ? THEMES[t] : t;
}

/** The active theme. Renderers read colours from here, never hold them across runs. */
export function theme(): Theme {
  return active;
}

/** Decoration props (render/props.ts): non-interactive clutter, kept darker than characters. */
export const PROP = {
  outline: '#0b0c10',
  wood: '#5a3e2b',
  woodLight: '#7a5636',
  woodDark: '#3b2819',
  metal: '#4a5260',
  metalLight: '#6b7584',
  metalDark: '#2c3139',
  plastic: '#3d4a5c',
  screen: '#2b6f8f',
  screenLit: '#7fd4f0',
  paper: '#cfc8b4',
  paperDark: '#9d977f',
  cardboard: '#8a6a43',
  cardboardDark: '#64492b',
  leaf: '#3f7a3a',
  leafLight: '#5ea152',
  pot: '#8c4f36',
  fabric: '#5b3a5e',
  fabricLight: '#7a5280',
  trashBag: '#1d2026',
  trashBagLight: '#343943',
  dumpster: '#2f5a3e',
  dumpsterLight: '#3f7552',
  rust: '#7a3f22',
  red: '#a8302a',
  yellow: '#c9a227',
  orange: '#d0662b',
  white: '#d8dde3',
  glass: '#5f8f6a',
  can: '#b33a3a',
  water: '#6fb1d6',
  blood: '#5e1416',
  bloodLight: '#7d1d1f',
  bone: '#d9d2bc',
  boneDark: '#a39c86',
  hay: '#b89a45',
  hayDark: '#8c7330',
  stone: '#4b4852',
  banner: '#6e1f2a',
  bannerGold: '#c49a3a',
  candle: '#e8dfc4',
  flame: '#ffb347',
  flameHot: '#ffe08a',
  flameDark: '#c4561f',
  lamp: '#f2e6a0',
  led: '#5be37a',
  ledDim: '#24603a',
  cobweb: '#8d8a80',
  rug: '#6e2a2a',
  rugTrim: '#b08a3a',
  puddle: '#2a4250',
  puddleLight: '#4a6d80',
  cable: '#15171c',
  exitSign: '#3fd46b',
  exitSignDim: '#1d5a33',
  poster: ['#b0413e', '#2f6690', '#d9a441', '#4f8a5b', '#7d4e9e'],
  graffiti: ['#d6455d', '#3fb0a9', '#e0b33a', '#8f6bd6'],
} as const;

/** Ambient weather particles (render/weather.ts). */
export const WEATHER = {
  rain: '#8fa6b8',
  splash: '#b8cad8',
  ember: '#ffb347',
  emberHot: '#ffe08a',
  mote: '#c8c2b0',
} as const;

/** Character accessories (character/accessories.ts): small pixel details that give each enemy an identity. */
export const ACCESSORY = {
  badge: '#e8ecf0',
  lanyard: '#2f6fd0',
  tie: '#2a3550',
  tieManager: '#e0b83a',
  lapel: '#2b2730',
  shirt: '#e8ecf0',
  capSecurity: '#1f2a44',
  capBrim: '#121829',
  starBadge: '#ffd23f',
  beanie: '#3d6b8f',
  beanieFold: '#2b4f6b',
  glassesFrame: '#15161a',
  glassesLens: '#bfe6ff',
  visor: '#3fae6a',
  visorDark: '#2a7a4a',
  rag: '#46553f',
  wound: '#7a2226',
  rib: '#ebe4cf',
  eyeGlow: '#e8ff6a',
  pustule: '#c9d66a',
  pustuleDark: '#56683a',
  helmet: '#8d95a1',
  helmetDark: '#5c636e',
  helmetLight: '#b9c0ca',
  horn: '#efe4c6',
  hood: '#4a3b5c',
  hoodDark: '#33283f',
  quiver: '#7a5636',
  fletch: '#c46b6b',
} as const;
