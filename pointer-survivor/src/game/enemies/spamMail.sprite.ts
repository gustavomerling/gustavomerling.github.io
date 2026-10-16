import { defineSprite } from '../sprites'

/** 12x8 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const spamMailSprite = defineSprite({
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
      'kkkkkkkkkkkk',
      'kwkwwwwwwkwk',
      'kwwkwwwwkwwk',
      'kwwwkRRkwwwk',
      'kwwwwRRwwwwk',
      'kwwwwwwwwwwk',
      'kssssssssssk',
      'kkkkkkkkkkkk',
    ],
    [
      'kkkkkkkkkkkk',
      'kwkwwwwwwkwk',
      'kwwkwwwwkwwk',
      'kwwwkyykwwwk',
      'kwwwwyywwwwk',
      'kwwwwwwwwwwk',
      'kssssssssssk',
      'kkkkkkkkkkkk',
    ],
  ],
})
