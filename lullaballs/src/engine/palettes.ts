import type { HS } from './util';

export interface Palette {
  id: string;
  name: string;
  /** Hashtags added to the caption when this palette is used. */
  tags: string[];
  colors: HS[];
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
    id: 'ballpit',
    name: 'Piscina de bolinhas',
    tags: ['#ballpit', '#colorful'],
    colors: [[355, 88], [42, 95], [205, 88], [145, 62], [25, 95], [268, 78], [320, 85]],
  },
  {
    id: 'halloween',
    name: 'Halloween',
    tags: ['#halloween', '#spooky'],
    colors: [[26, 95], [275, 62], [95, 65], [42, 95], [300, 50], [15, 88]],
  },
];

export function getPalette(id: string | undefined): Palette {
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0];
}
