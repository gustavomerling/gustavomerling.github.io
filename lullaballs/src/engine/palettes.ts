import type { HS } from './util';

export interface Palette {
  id: string;
  name: string;
  /** Hashtags added to the caption when this palette is used. */
  tags: string[];
  colors: HS[];
  /** Not offered in the editor nor in random picks (used by special pages). */
  hidden?: boolean;
}

export const PALETTES: Palette[] = [
  {
    id: 'pastel',
    name: 'Pastel',
    tags: ['#pastel'],
    colors: [[262, 75], [200, 75], [330, 75], [25, 75], [170, 75], [285, 75], [215, 75], [350, 75]],
  },
  {
    id: 'rainbow',
    name: 'Arco-íris suave',
    tags: ['#rainbow'],
    colors: [[0, 80], [30, 85], [52, 85], [100, 60], [165, 65], [200, 75], [240, 70], [280, 70], [320, 75]],
  },
  {
    id: 'ocean',
    name: 'Oceano',
    tags: ['#blue', '#ocean'],
    colors: [[170, 65], [182, 70], [194, 75], [205, 75], [216, 70], [228, 65]],
  },
  {
    id: 'sunset',
    name: 'Pôr do sol',
    tags: ['#sunset'],
    colors: [[345, 80], [358, 85], [10, 90], [22, 92], [34, 95], [45, 95]],
  },
  {
    id: 'lavender',
    name: 'Lavanda',
    tags: ['#lavender', '#purple'],
    colors: [[248, 55], [258, 60], [268, 65], [278, 60], [288, 55], [298, 50]],
  },
  {
    id: 'mint',
    name: 'Menta',
    tags: ['#mint', '#green'],
    colors: [[140, 50], [152, 58], [164, 60], [176, 55], [128, 45], [188, 55]],
  },
  {
    id: 'cottoncandy',
    name: 'Algodão-doce',
    tags: ['#cottoncandy', '#pink'],
    colors: [[330, 85], [200, 80], [310, 75], [190, 75], [345, 80], [215, 75]],
  },
  {
    id: 'christmas',
    name: 'Natal',
    tags: ['#christmasvibes'],
    colors: [[355, 78], [140, 55], [45, 92], [0, 0], [355, 78], [140, 55], [45, 92]],
  },
  {
    // Hidden: one color per era, for the Taylor Swift gift page.
    id: 'eras',
    name: 'Eras',
    tags: [],
    hidden: true,
    colors: [
      [140, 45], // Debut — green
      [45, 90], // Fearless — gold
      [280, 65], // Speak Now — purple
      [355, 80], // Red
      [200, 80], // 1989 — light blue
      [0, 0], // Reputation — silver/black
      [330, 85], // Lover — pink
      [220, 15], // folklore — grey
      [25, 55], // evermore — amber
      [235, 60], // Midnights — navy
      [35, 25], // The Tortured Poets Department — sepia
      [20, 90], // The Life of a Showgirl — orange glitter
      [300, 70], // and one more, for luck
    ],
  },
];

/** What the editor offers and what "Regerar" draws from. */
export const VISIBLE_PALETTES = PALETTES.filter((p) => !p.hidden);

export function getPalette(id: string | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
