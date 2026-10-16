import type { Params } from './engine/types';

/** One day's video. Stored as simulacoes/<date>.json. */
export interface Post {
  date: string; // YYYY-MM-DD
  title: string;
  caption: string;
  song: string; // file name in musicas/ without .json
  template: string;
  params: Params;
  seed: number;
  overlay: string;
  background?: string; // see engine/backgrounds.ts (defaults to dusk)
  palette?: string; // see engine/palettes.ts (defaults to pastel)
  exported?: string; // file name in exports/
}
