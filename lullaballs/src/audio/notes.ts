import type { SimEvent } from '../engine/types';

export interface Song {
  id: string;
  title: string;
  composer: string;
  /** Hashtag for the caption; derived from the title when missing. */
  tag?: string;
  notes: string[];
}

export interface NoteHit {
  t: number;
  midis: number[];
  vel: number;
  /** A dry percussive click instead of notes (ball-on-ball knocks). */
  click?: boolean;
}

const SEMITONES: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C#4" -> 61. "C3+E5" -> [48, 76]. */
export function parseNote(n: string): number[] {
  return n.split('+').map((part) => {
    const m = /^([A-G])([#b]?)(-?\d)$/.exec(part.trim());
    if (!m) throw new Error(`Nota inválida: ${part}`);
    const acc = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
    return 12 * (Number(m[3]) + 1) + SEMITONES[m[1]] + acc;
  });
}

/** Each bounce plays the next note of the song, looping. Used by both live preview and export. */
export class Sequencer {
  private i = 0;
  private lastT = -1;
  private lastClick = -1;
  private parsed: number[][];

  constructor(song: Song) {
    this.parsed = song.notes.map(parseNote);
  }

  next(ev: SimEvent): NoteHit | null {
    if (ev.kind === 'clack') {
      // Its own lane: doesn't take a note of the song, nor delay the next one.
      if (ev.t - this.lastClick < 0.03 || !ev.vel) return null;
      this.lastClick = ev.t;
      return { t: ev.t, midis: [], vel: ev.vel, click: true };
    }
    if (ev.kind === 'finish') {
      const root = Math.min(...this.parsed[0]);
      return { t: ev.t, midis: [root - 12, root, root + 7, root + 12, root + 16], vel: 1 };
    }
    // Very fast bounce bursts would turn into noise; keep notes at least 60ms apart.
    if (ev.t - this.lastT < 0.06) return null;
    this.lastT = ev.t;
    const midis = this.parsed[this.i % this.parsed.length];
    this.i++;
    return { t: ev.t, midis: ev.kind === 'break' ? [...midis, Math.max(...midis) + 12] : midis, vel: ev.kind === 'break' ? 0.95 : 0.75 };
  }
}

export function eventsToHits(events: SimEvent[], song: Song): NoteHit[] {
  const seq = new Sequencer(song);
  return events.map((e) => seq.next(e)).filter((h): h is NoteHit => h !== null);
}
