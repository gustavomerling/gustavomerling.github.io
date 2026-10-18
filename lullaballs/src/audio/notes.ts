import { W, type SimEvent } from '../engine/types';

export interface Song {
  id: string;
  title: string;
  composer: string;
  /** Title and composer as the caption shows them: captions are always in English. */
  titleEn?: string;
  composerEn?: string;
  /** Hashtag for the caption; derived from the English title when missing. */
  tag?: string;
  /** Kind of song, to group the list (and later to match dates and themes). */
  category?: SongCategory;
  /** Tempo of the beats the note durations are counted in. Without it, every bounce just plays the next note. */
  bpm?: number;
  /** "C5", "A2+E4" (chord), with an optional duration in beats: "C5:0.5", "A2+E4:2" (default 1). */
  notes: string[];
}

export type SongCategory = 'ninar' | 'classica' | 'natal' | 'halloween';
export const CATEGORIES: Record<SongCategory, string> = {
  ninar: 'Canções de ninar',
  classica: 'Clássicas',
  natal: 'Natal',
  halloween: 'Halloween',
};

export interface NoteHit {
  t: number;
  midis: number[];
  vel: number;
  /** A dry percussive click instead of notes (ball-on-ball knocks). */
  click?: boolean;
  /** Stereo position, -1 (left) to 1 (right). */
  pan?: number;
  /** Seconds between the notes of the chord, played as a roll from the bottom up. */
  roll?: number;
  /** A soft sustained pad that holds the harmony under the melody until the next one. */
  pad?: number[];
}

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" -> 61. "C3+E5" -> [48, 76]. */
export function parseNote(n: string): number[] {
  return parseEntry(n).midis;
}

/** "C3+E5:0.5" -> notes [48, 76] lasting half a beat. */
export function parseEntry(entry: string): { midis: number[]; beats: number } {
  const [notes, dur] = entry.split(':');
  const beats = dur === undefined ? 1 : Number(dur);
  if (!(beats > 0)) throw new Error(`Duração inválida: ${entry}`);
  const midis = notes.split('+').map((part) => {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(part.trim());
    if (!m) throw new Error(`Nota inválida: ${part}`);
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return 12 * (Number(m[3]) + 1) + SEMITONES[m[1]] + acc;
  });
  return { midis, beats };
}

/** Seconds before the finish over which the song swells to its climax. */
const CLIMAX = 6;

/**
 * Each bounce plays the next note of the song, looping. Used by both live preview and export.
 * With a tempo, a note holds for its duration (squeezed down to half when the bounces come fast): a bounce that
 * comes earlier echoes the last note softly instead of rushing the melody. A bass note brings a pad with it, and the
 * last seconds before the finish grow louder and fuller.
 */
export class Sequencer {
  private i = 0;
  private lastT = -1;
  /** When the last note of the melody started, and how long it should hold. */
  private noteAt = -1;
  private hold = 0;
  private lastClick = -1;
  private parsed: { midis: number[]; beats: number }[];
  private beat: number;

  constructor(song: Song, private finishTime: number | null = null) {
    this.parsed = song.notes.map(parseEntry);
    this.beat = song.bpm ? 60 / song.bpm : 0;
  }

  next(ev: SimEvent): NoteHit | null {
    const pan = ev.x === undefined ? 0 : Math.max(-1, Math.min(1, (ev.x / W) * 2 - 1)) * 0.7;
    if (ev.kind === 'clack') {
      // Its own lane: doesn't take a note of the song, nor delay the next one.
      if (ev.t - this.lastClick < 0.03 || !ev.vel) return null;
      this.lastClick = ev.t;
      return { t: ev.t, midis: [], vel: ev.vel, click: true, pan };
    }
    if (ev.kind === 'finish') {
      const root = Math.min(...this.parsed[0].midis) % 12 + 48;
      const minor = this.parsed.some((e) => e.midis.some((m) => (m - root + 120) % 12 === 3));
      const third = minor ? 15 : 16;
      return { t: ev.t, midis: [root - 12, root, root + 7, root + 12, root + third, root + 19, root + 24], vel: 1, roll: 0.045, pad: [root - 12, root, root + 7] };
    }
    // Very fast bounce bursts would turn into noise; keep notes at least 60ms apart.
    if (ev.t - this.lastT < 0.06) return null;
    this.lastT = ev.t;
    // Climax: 0 until CLIMAX seconds before the finish, 1 at the finish.
    const k = this.finishTime === null ? 0 : Math.max(0, Math.min(1, 1 - (this.finishTime - ev.t) / CLIMAX));
    if (this.beat && ev.kind === 'hit' && ev.t - this.noteAt < this.hold * 0.5) {
      const last = this.parsed[(this.i - 1) % this.parsed.length].midis;
      return { t: ev.t, midis: [Math.max(...last) + 12], vel: 0.22 + 0.15 * k, pan };
    }
    const { midis, beats } = this.parsed[this.i % this.parsed.length];
    this.i++;
    this.noteAt = ev.t;
    this.hold = beats * this.beat;
    const top = Math.max(...midis);
    const bass = midis.filter((m) => m < 52);
    const out = ev.kind === 'break' || k > 0.5 ? [...midis, top + 12] : midis;
    const vel = (ev.kind === 'break' ? 0.95 : 0.75) * (1 + 0.3 * k);
    return { t: ev.t, midis: out, vel, pan, pad: bass.length ? [bass[0] + 12, bass[0] + 19] : undefined };
  }
}

export function eventsToHits(events: SimEvent[], song: Song, finishTime: number | null = null): NoteHit[] {
  const seq = new Sequencer(song, finishTime);
  return events.map((e) => seq.next(e)).filter((h): h is NoteHit => h !== null);
}
