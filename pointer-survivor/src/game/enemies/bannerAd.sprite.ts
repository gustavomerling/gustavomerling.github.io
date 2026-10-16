import { defineSprite } from '../sprites'

/** 27x9 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const bannerAdSprite = defineSprite({
  fps: 3,
  flip: false,
  palette: {
    k: '#000000',
    y: '#ffe000',
    R: '#e00000',
    w: '#ffffff',
    b: '#0000cc',
  },
  frames: [
    [
      'kkkkkkkkkkkkkkkkkkkkkkkkkkk',
      'kbbbbbbbbbbbbbbbbbbbbbbbbbk',
      'kyRRRyRyyyRRRyRRRyRyRyyRyyk',
      'kyRyyyRyyyyRyyRyyyRRyyyRyyk',
      'kyRyyyRyyyyRyyRyyyRyyyyRyyk',
      'kyRyyyRyyyyRyyRyyyRRyyyyyyk',
      'kyRRRyRRRyRRRyRRRyRyRyyRyyk',
      'kbbbbbbbbbbbbbbbbbbbbbbbbbk',
      'kkkkkkkkkkkkkkkkkkkkkkkkkkk',
    ],
    [
      'kkkkkkkkkkkkkkkkkkkkkkkkkkk',
      'kbbbbbbbbbbbbbbbbbbbbbbbbbk',
      'kRwwwRwRRRwwwRwwwRwRwRRwRRk',
      'kRwRRRwRRRRwRRwRRRwwRRRwRRk',
      'kRwRRRwRRRRwRRwRRRwRRRRwRRk',
      'kRwRRRwRRRRwRRwRRRwwRRRRRRk',
      'kRwwwRwwwRwwwRwwwRwRwRRwRRk',
      'kbbbbbbbbbbbbbbbbbbbbbbbbbk',
      'kkkkkkkkkkkkkkkkkkkkkkkkkkk',
    ],
  ],
})
