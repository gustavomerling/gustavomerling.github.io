/**
 * Songs are written in scale degrees so they're easy to edit by ear.
 *
 * Melody, one string of 16 steps (16th notes) per bar:
 *   1-7   scale degrees in the base octave
 *   q-u   degrees 1-7 one octave up (the keyboard row above the digits)
 *   -     hold the previous note
 *   .     rest
 *
 * Patterns (16 steps, repeated every bar):
 *   bass: x = chord root, o = root an octave up, f = fifth, . = rest
 *   arp:  0/1/2 = chord tone (root/third/fifth, an octave up), . = rest
 *   drums: x = hit, . = rest
 */
export type SongId = 'desktop' | 'web' | 'system32' | 'boss'

export interface SongDef {
  title: string
  bpm: number
  /** MIDI note of scale degree 1 for the melody (bass plays two octaves lower) */
  root: number
  /** semitone offsets of the 7 scale degrees */
  scale: number[]
  /** chord root as a scale degree, one per bar */
  chords: number[]
  melody: string[]
  bass: string
  arp: string
  drums: { kick: string; snare: string; hat: string }
  lead: OscillatorType
}

const MINOR = [0, 2, 3, 5, 7, 8, 10]
const MAJOR = [0, 2, 4, 5, 7, 9, 11]
const PHRYGIAN = [0, 1, 3, 5, 7, 8, 10]
const HARMONIC_MINOR = [0, 2, 3, 5, 7, 8, 11]

export const SONGS: Record<SongId, SongDef> = {
  desktop: {
    title: 'Teal Wallpaper',
    bpm: 132,
    root: 69, // A4
    scale: MINOR,
    chords: [1, 6, 3, 7, 1, 6, 4, 5],
    melody: [
      '5--3--1-5-6-5-3-',
      '4--6--q-6-4-3-1-',
      '3--5--e-w-q-7-5-',
      '7--5--2--------.',
      'q-q-7-q-5---3---',
      '6-6-5-6-4---1---',
      '4-6-q-6-4-6-w-q-',
      '7---5---7-w-q---',
    ],
    bass: 'x.x.o.x.x.x.o.x.',
    arp: '0120012001200120',
    drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    lead: 'square',
  },
  web: {
    title: 'Under Construction',
    bpm: 150,
    root: 62, // D4
    scale: MAJOR,
    chords: [1, 5, 6, 4, 1, 5, 4, 4],
    melody: [
      '1-3-5-3-q-5-3-5-',
      '5-7-w-7-5-7-2-5-',
      '6-q-e-q-6-5-3-5-',
      '4-6-q-6-4-3-2---',
      'q---e-r-e-q-e---',
      'w---7-w-7-5-7---',
      '6-6-q-6-4-4-6-4-',
      '3-4-5-6-7-q-w-e-',
    ],
    bass: 'x..xo.x.x..xo.x.',
    arp: '0.1.2.1.0.1.2.1.',
    drums: { kick: 'x..x..x.x..x..x.', snare: '....x.......x..x', hat: 'x.x.x.x.x.x.x.x.' },
    lead: 'square',
  },
  system32: {
    title: 'Kernel Panic',
    bpm: 112,
    root: 64, // E4
    scale: PHRYGIAN,
    chords: [1, 2, 1, 7, 6, 2, 1, 1],
    melody: [
      '1---.---5---3-2-',
      '2---.---4---3---',
      '1---.---5-6-5-3-',
      '7---.---2---1---',
      '6---5---3---1---',
      '2---3---4---6---',
      '5-------3-2-1---',
      '1---------------',
    ],
    bass: 'x.xx.xx.x.xx.xx.',
    arp: '0.2.1.2.0.2.1.2.',
    drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    lead: 'sawtooth',
  },
  boss: {
    title: 'Fatal Exception',
    bpm: 168,
    root: 60, // C4
    scale: HARMONIC_MINOR,
    chords: [1, 6, 4, 5, 1, 6, 7, 5],
    melody: [
      'q-7-q-5-q-7-q-3-',
      '6-5-6-4-6-5-6-q-',
      '4-3-4-6-q-6-4-6-',
      '5-7-w-7-5-7-w-e-',
      'e-w-q-7-q-w-e-r-',
      'e-w-q-6-5-6-q-w-',
      'q-7-6-5-4-3-2-1-',
      '7-5-7-w-7---7---',
    ],
    bass: 'xoxoxoxoxoxoxoxo',
    arp: '0120012001200120',
    drums: { kick: 'x.x.x.x.x.x.x.x.', snare: '....x.......x.x.', hat: 'xxxxxxxxxxxxxxxx' },
    lead: 'square',
  },
}
