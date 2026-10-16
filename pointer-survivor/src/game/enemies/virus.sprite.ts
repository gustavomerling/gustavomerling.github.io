import { defineSprite } from '../sprites'

/** 12x12 px, 2 frame(s). Each char is a palette key ('.' = transparent). */
export const virusSprite = defineSprite({
  fps: 4,
  palette: {
    k: '#3a0606',
    r: '#c4241c',
    R: '#ff6a50',
    d: '#7a0e0e',
    w: '#ffffff',
    b: '#000000',
    s: '#ff9f2e',
  },
  frames: [
    [
      '.s...ss...s.',
      '..s..kk..s..',
      '...skkkks...',
      '...kRRrrk...',
      '..kRwbrwbk..',
      'sskRrrrrrkss',
      'sskrrbbrdkss',
      '..krrrrrdk..',
      '...kddddk...',
      '...skkkks...',
      '..s..kk..s..',
      '.s...ss...s.',
    ],
    [
      '............',
      '..s..ss..s..',
      '...skkkks...',
      '...kRRrrk...',
      '..kRbwrbwk..',
      '.skRrrrrrks.',
      '.skrrbbrdks.',
      '..krrrrrdk..',
      '...kddddk...',
      '...skkkks...',
      '..s..ss..s..',
      '............',
    ],
  ],
})
