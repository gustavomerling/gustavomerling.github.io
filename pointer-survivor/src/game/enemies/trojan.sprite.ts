import { defineSprite } from '../sprites'

/** 14x12 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const trojanSprite = defineSprite({
  fps: 4,
  palette: {
    k: '#2a1408',
    b: '#a8703a',
    B: '#7a4a20',
    w: '#ffffff',
    o: '#606060',
  },
  frames: [
    [
      '..........k...',
      '.........kbk..',
      '........kbbbk.',
      '........kbwbbk',
      '........kbbbbk',
      '...kkkkkkbbkk.',
      '..kbbbbbbbbk..',
      '.kbBbbbbbbBk..',
      'kkbbbbbbbbbk..',
      '..kBkkkkkBk...',
      '.kkkkkkkkkkk..',
      '..kok...kok...',
    ],
    [
      '..........k...',
      '.........kbk..',
      '........kbbbk.',
      '........kbwbbk',
      '........kbbbbk',
      '...kkkkkkbbkk.',
      '..kbbbbbbbbk..',
      '.kbBbbbbbbBk..',
      'kkbbbbbbbbbk..',
      '..kBkkkkkBk...',
      '.kkkkkkkkkkk..',
      '..kko...kko...',
    ],
  ],
})
