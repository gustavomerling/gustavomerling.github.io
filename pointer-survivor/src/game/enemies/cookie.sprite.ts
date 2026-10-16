import { defineSprite } from '../sprites'

/** 11x11 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const cookieSprite = defineSprite({
  fps: 3,
  palette: {
    k: '#3a2008',
    c: '#d89a4a',
    d: '#4a2a10',
    w: '#ffffff',
    b: '#000000',
  },
  frames: [
    [
      '...kkkkk...',
      '..kccccck..',
      '.kcdccccc..',
      'kccccccdck.',
      'kccwccwccck',
      'kccbccbccck',
      'kcdcbbcccck',
      'kcccccccdck',
      '.kcccdccck.',
      '..kccccck..',
      '...kkkkk...',
    ],
    [
      '...kkkkk...',
      '..kccccck..',
      '.kcdccccc..',
      'kccccccdck.',
      'kcckcckccck',
      'kccbccbccck',
      'kcdcbbcccck',
      'kcccccccdck',
      '.kcccdccck.',
      '..kccccck..',
      '...kkkkk...',
    ],
  ],
})
