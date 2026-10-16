import { defineSprite } from '../sprites'

/** 12x8 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const bugSprite = defineSprite({
  fps: 6,
  palette: {
    k: '#0d1a0b',
    d: '#1f5a17',
    g: '#3c9a2a',
    G: '#7fdc4a',
    w: '#ffffff',
    r: '#ff3b30',
  },
  frames: [
    [
      '...kkkk...k.',
      '..kwGggk.k..',
      '.kGGgggdkkk.',
      '.kGggggdddrk',
      '.kgggggddddk',
      '..kdddddkkk.',
      '..k..k..k...',
      '.k..k..k....',
    ],
    [
      '...kkkk...k.',
      '..kwGggk.k..',
      '.kGGgggdkkk.',
      '.kGggggdddrk',
      '.kgggggddddk',
      '..kdddddkkk.',
      '...k..k..k..',
      '...k..k..k..',
    ],
  ],
})
