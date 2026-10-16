import { defineSprite } from '../sprites'

/** 18x8 px, 4 frame(s). Each char is a palette key ('.' = transparent). */
export const wormSprite = defineSprite({
  fps: 8,
  palette: {
    k: '#401028',
    p: '#ff7ab0',
    P: '#e0508a',
    w: '#ffffff',
  },
  frames: [
    [
      '..............k...',
      '..k.........kkkkk.',
      'kkpkk.k...k.kkpppk',
      'kpppkkPkkkpkkkppwk',
      'kpppkPPPkpppkkpppk',
      'kkpkkPPPkpppkkpppk',
      '..k.kkPkkkpkk.kkk.',
      '......k...k.......',
    ],
    [
      '..........k...k...',
      '......k.kkpkkkkkk.',
      '..k.kkPkkpppkkpppk',
      'kkpkkPPPkpppkkppwk',
      'kpppkPPPkkpkkkpppk',
      'kpppkkPkk.k..kpppk',
      'kkpkk.k.......kkk.',
      '..k...............',
    ],
    [
      '......k...k.......',
      '..k.kkPkkkpkk.kkk.',
      'kkpkkPPPkpppkkpppk',
      'kpppkPPPkpppkkppwk',
      'kpppkkPkkkpkkkpppk',
      'kkpkk.k...k.kkpppk',
      '..k.........kkkkk.',
      '..............k...',
    ],
    [
      '..k...............',
      'kkpkk.k.......kkk.',
      'kpppkkPkk.k..kpppk',
      'kpppkPPPkkpkkkppwk',
      'kkpkkPPPkpppkkpppk',
      '..k.kkPkkpppkkpppk',
      '......k.kkpkkkkkk.',
      '..........k...k...',
    ],
  ],
})
