import { randomSeedString } from '@engine/math/rng';
import { defaultBackend, StoredDocument, type StorageBackend } from '@engine/storage/storage';
import type { RunModeId } from './content/modes/catalog';
import type { RunSummary } from './events';

/** Where the next run's seed comes from (picked on the main menu). */
export type SeedChoice = 'random' | 'daily' | 'last' | 'custom';
export const SEED_CHOICES: readonly SeedChoice[] = ['random', 'daily', 'last', 'custom'];

/** Best marks per mode. Each attempt = one scenario played until death or exit. */
export interface ModeRecord {
  attempts: number;
  /** Exits reached. */
  clears: number;
  /** Most kills in a single attempt. */
  bestKills: number;
  bestHeadshots: number;
  /** Fastest exit, seconds (null = never cleared). */
  fastestClear: number | null;
  /** Longest attempt that ended in death, seconds (the zombie mode's score). */
  longestLife: number;
}

export interface Prefs {
  lastMode: RunModeId;
  seedChoice: SeedChoice;
  /** Seed of the most recent run ("Repetir última"). */
  lastSeed: string | null;
  /** Seed typed by the player. */
  customSeed: string;
  /** Measuring grid (F2) remembered between runs. */
  grid: boolean;
  records: Partial<Record<RunModeId, ModeRecord>>;
  /** Player options (menu "Opções"). Systems read them as `prefs().get().settings.<key>`. */
  settings: Settings;
}

/** Options screen values. Every visual/sound effect checks its switch here. */
export interface Settings {
  /** Screen shake. */
  shake: boolean;
  /** Particles (sparks, smoke, debris, blood). */
  particles: boolean;
  /** Hit-stop (tiny freeze on impacts). */
  hitstop: boolean;
  /** Master volume, 0..1. */
  volume: number;
  /** Sound effects on/off. */
  sfx: boolean;
}

export function defaultSettings(): Settings {
  return { shake: true, particles: true, hitstop: true, volume: 0.7, sfx: true };
}

/** Field-by-field repair of stored settings (missing/older builds fall back to the defaults). */
export function sanitizeSettings(raw: unknown): Settings {
  const d = defaultSettings();
  const s = (raw && typeof raw === 'object' ? raw : {}) as Partial<Record<keyof Settings, unknown>>;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    shake: bool(s.shake, d.shake),
    particles: bool(s.particles, d.particles),
    hitstop: bool(s.hitstop, d.hitstop),
    volume: typeof s.volume === 'number' && Number.isFinite(s.volume) ? Math.min(1, Math.max(0, s.volume)) : d.volume,
    sfx: bool(s.sfx, d.sfx),
  };
}

const MODES: readonly RunModeId[] = ['campaign', 'zombie', 'medieval'];

export function defaultPrefs(): Prefs {
  return { lastMode: 'campaign', seedChoice: 'random', lastSeed: null, customSeed: '', grid: true, records: {}, settings: defaultSettings() };
}

export function emptyRecord(): ModeRecord {
  return { attempts: 0, clears: 0, bestKills: 0, bestHeadshots: 0, fastestClear: null, longestLife: 0 };
}

const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback);

/** Repairs anything malformed (hand-edited storage, older builds) field by field. */
export function sanitizePrefs(raw: Partial<Prefs>): Prefs {
  const d = defaultPrefs();
  const records: Prefs['records'] = {};
  const rawRecords = (raw.records ?? {}) as Record<string, Partial<ModeRecord> | undefined>;
  for (const mode of MODES) {
    const r = rawRecords[mode];
    if (!r || typeof r !== 'object') continue;
    records[mode] = {
      attempts: num(r.attempts, 0),
      clears: num(r.clears, 0),
      bestKills: num(r.bestKills, 0),
      bestHeadshots: num(r.bestHeadshots, 0),
      fastestClear: typeof r.fastestClear === 'number' && r.fastestClear > 0 ? r.fastestClear : null,
      longestLife: num(r.longestLife, 0),
    };
  }
  return {
    lastMode: MODES.includes(raw.lastMode as RunModeId) ? (raw.lastMode as RunModeId) : d.lastMode,
    seedChoice: SEED_CHOICES.includes(raw.seedChoice as SeedChoice) ? (raw.seedChoice as SeedChoice) : d.seedChoice,
    lastSeed: typeof raw.lastSeed === 'string' ? normalizeSeed(raw.lastSeed) : null,
    customSeed: typeof raw.customSeed === 'string' ? (normalizeSeed(raw.customSeed) ?? '') : '',
    grid: typeof raw.grid === 'boolean' ? raw.grid : d.grid,
    records,
    settings: sanitizeSettings(raw.settings),
  };
}

/** Seed of the day (local date): everyone playing today gets the same map. */
export function dailySeed(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `DIA-${y}${m}${d}`;
}

/** Cleans a typed seed: upper case, no spaces, at most 24 chars. Empty -> null. */
export function normalizeSeed(input: string): string | null {
  const s = input
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 24);
  return s.length > 0 ? s : null;
}

/** The seed the next run uses, given the menu choice. */
export function resolveSeed(p: Prefs, now: Date = new Date(), random: () => string = randomSeedString): string {
  switch (p.seedChoice) {
    case 'daily':
      return dailySeed(now);
    case 'last':
      return p.lastSeed ?? random();
    case 'custom':
      return normalizeSeed(p.customSeed) ?? random();
    case 'random':
      return random();
  }
}

/** Folds one finished attempt into the mode's record. Pure. */
export function recordAttempt(record: ModeRecord | undefined, outcome: 'death' | 'exit', s: RunSummary): ModeRecord {
  const r = { ...(record ?? emptyRecord()) };
  r.attempts++;
  r.bestKills = Math.max(r.bestKills, s.kills);
  r.bestHeadshots = Math.max(r.bestHeadshots, s.headshots);
  if (outcome === 'exit') {
    r.clears++;
    if (s.time > 0 && (r.fastestClear === null || s.time < r.fastestClear)) r.fastestClear = s.time;
  } else {
    r.longestLife = Math.max(r.longestLife, s.time);
  }
  return r;
}

/** Load/modify/save wrapper around the stored document. */
export class PrefsStore {
  private readonly doc: StoredDocument<Prefs>;
  private cache: Prefs | null = null;

  constructor(backend: StorageBackend) {
    this.doc = new StoredDocument<Prefs>(backend, 'shooter2d.prefs', 1, defaultPrefs);
  }

  get(): Prefs {
    this.cache ??= sanitizePrefs(this.doc.load());
    return this.cache;
  }

  update(change: (p: Prefs) => Partial<Prefs>): Prefs {
    const next = { ...this.get(), ...change(this.get()) };
    this.cache = next;
    try {
      this.doc.save(next);
    } catch {
      // Storage full or blocked: keep the in-memory copy for this session.
    }
    return next;
  }

  record(mode: RunModeId, outcome: 'death' | 'exit', summary: RunSummary): void {
    this.update((p) => ({ records: { ...p.records, [mode]: recordAttempt(p.records[mode], outcome, summary) } }));
  }
}

let shared: PrefsStore | null = null;

/** The app-wide store (localStorage; in-memory if storage is unavailable). */
export function prefs(): PrefsStore {
  shared ??= new PrefsStore(defaultBackend());
  return shared;
}

/** Current player options (Opções). Cheap: cached in memory, safe to call every frame. */
export function settings(): Settings {
  return prefs().get().settings;
}
