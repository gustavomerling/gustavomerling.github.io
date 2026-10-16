import { defineSprite } from '../sprites'

/** 8x6 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const spamSprite = defineSprite({
  fps: 4,
  palette: {
    k: '#303030',
    w: '#f4f4f4',
    s: '#c8c8c8',
    R: '#d02020',
    y: '#ffd000',
  },
  frames: [
    [
      'kkkkkkkk',
      'kwkwwkwk',
      'kwwkkwwk',
      'kwwRRwwk',
      'kwwwwwwk',
      'kkkkkkkk',
    ],
    [
      'kkkkkkkk',
      'kwkwwkwk',
      'kwwkkwwk',
      'kwwyywwk',
      'kwwwwwwk',
      'kkkkkkkk',
    ],
  ],
})
