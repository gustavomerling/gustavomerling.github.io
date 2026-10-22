import { describe, expect, it } from 'vitest';
import { MemoryBackend } from '@engine/storage/storage';
import { dailySeed, defaultPrefs, normalizeSeed, PrefsStore, recordAttempt, resolveSeed, sanitizePrefs } from './prefs';
import type { RunSummary } from './events';

const run = (s: Partial<RunSummary>): RunSummary => ({ kills: 0, headshots: 0, shots: 0, hits: 0, time: 0, ...s });

describe('prefs', () => {
  it('daily seed is stable within a day and changes the next day', () => {
    expect(dailySeed(new Date(2026, 9, 22, 1))).toBe('DIA-20261022');
    expect(dailySeed(new Date(2026, 9, 22, 23))).toBe('DIA-20261022');
    expect(dailySeed(new Date(2026, 9, 23))).not.toBe('DIA-20261022');
  });

  it('normalizes typed seeds', () => {
    expect(normalizeSeed(' k7q2-m9xa ')).toBe('K7Q2-M9XA');
    expect(normalizeSeed('a b/c!')).toBe('ABC');
    expect(normalizeSeed('   ')).toBeNull();
    expect(normalizeSeed('x'.repeat(40))).toHaveLength(24);
  });

  it('resolves the seed from the menu choice', () => {
    const p = { ...defaultPrefs(), lastSeed: 'LAST-0001', customSeed: 'MINE' };
    const random = () => 'RAND-0000';
    const day = new Date(2026, 0, 2);
    expect(resolveSeed({ ...p, seedChoice: 'random' }, day, random)).toBe('RAND-0000');
    expect(resolveSeed({ ...p, seedChoice: 'daily' }, day, random)).toBe('DIA-20260102');
    expect(resolveSeed({ ...p, seedChoice: 'last' }, day, random)).toBe('LAST-0001');
    expect(resolveSeed({ ...p, seedChoice: 'custom' }, day, random)).toBe('MINE');
    // Nothing to repeat / nothing typed: fall back to random.
    expect(resolveSeed({ ...p, seedChoice: 'last', lastSeed: null }, day, random)).toBe('RAND-0000');
    expect(resolveSeed({ ...p, seedChoice: 'custom', customSeed: '' }, day, random)).toBe('RAND-0000');
  });

  it('records keep the best marks', () => {
    let r = recordAttempt(undefined, 'death', run({ kills: 5, time: 40 }));
    r = recordAttempt(r, 'exit', run({ kills: 3, headshots: 2, time: 90 }));
    r = recordAttempt(r, 'exit', run({ kills: 1, time: 70 }));
    r = recordAttempt(r, 'death', run({ kills: 0, time: 20 }));
    expect(r).toEqual({ attempts: 4, clears: 2, bestKills: 5, bestHeadshots: 2, fastestClear: 70, longestLife: 40 });
  });

  it('repairs malformed stored data', () => {
    const p = sanitizePrefs({
      lastMode: 'nope' as never,
      seedChoice: 'weird' as never,
      lastSeed: 42 as never,
      grid: 'yes' as never,
      records: { zombie: { attempts: -3, bestKills: 7 } as never, bogus: {} } as never,
    });
    expect(p.lastMode).toBe('campaign');
    expect(p.seedChoice).toBe('random');
    expect(p.lastSeed).toBeNull();
    expect(p.grid).toBe(true);
    expect(p.records.zombie).toEqual({ attempts: 0, clears: 0, bestKills: 7, bestHeadshots: 0, fastestClear: null, longestLife: 0 });
    expect(Object.keys(p.records)).toEqual(['zombie']);
  });

  it('persists through the store', () => {
    const backend = new MemoryBackend();
    const a = new PrefsStore(backend);
    a.update(() => ({ lastMode: 'zombie', seedChoice: 'daily', grid: false }));
    a.record('zombie', 'death', run({ kills: 9, time: 61 }));
    const b = new PrefsStore(backend).get();
    expect(b.lastMode).toBe('zombie');
    expect(b.seedChoice).toBe('daily');
    expect(b.grid).toBe(false);
    expect(b.records.zombie?.bestKills).toBe(9);
    expect(b.records.zombie?.longestLife).toBe(61);
  });

  it('survives corrupt storage', () => {
    const backend = new MemoryBackend();
    backend.setItem('shooter2d.prefs', '{not json');
    expect(new PrefsStore(backend).get()).toEqual(defaultPrefs());
  });
});

describe('settings (Opções)', () => {
  it('defaults and repairs field by field', () => {
    expect(defaultPrefs().settings).toEqual({ shake: true, particles: true, hitstop: true, volume: 0.7, sfx: true });
    const s = sanitizePrefs({ settings: { shake: false, volume: 3, sfx: 'no' } as never }).settings;
    expect(s).toEqual({ shake: false, particles: true, hitstop: true, volume: 1, sfx: true });
    expect(sanitizePrefs({}).settings).toEqual(defaultPrefs().settings);
  });
});
