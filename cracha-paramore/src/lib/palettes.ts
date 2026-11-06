import allWeKnowIsFallingCover from '@/assets/albums/all-we-know-is-falling.jpg'
import riotCover from '@/assets/albums/riot.jpg'
import brandNewEyesCover from '@/assets/albums/brand-new-eyes.jpg'
import selfTitledCover from '@/assets/albums/self-titled.jpg'
import afterLaughterCover from '@/assets/albums/after-laughter.jpg'
import thisIsWhyCover from '@/assets/albums/this-is-why.jpg'
import petalsForArmorCover from '@/assets/albums/petals-for-armor.jpg'
import flowersForVasesCover from '@/assets/albums/flowers-for-vases.jpg'
import egoDeathCover from '@/assets/albums/ego-death.jpg'

/** Id da paleta: `<álbum>` ou `<álbum>-<variação>`, mais as duas P&B. */
export type PaletteId = string

/** Cores chapadas usadas no desenho do crachá (sem degradê). */
export interface Palette {
  id: PaletteId
  name: string
  /** Fundo principal */
  bg: string
  /** Texto principal sobre o fundo */
  ink: string
  /** Bloco de cor da marca (coluna/faixa com PARAMORE) */
  block: string
  /** Texto sobre o bloco */
  blockInk: string
  /** Cor de destaque (BRASIL, faixa de categoria) */
  accent: string
  /** Texto sobre o destaque */
  accentInk: string
  /** Versão preto e branco: textos secundários 100% preto/branco (a foto continua colorida) */
  mono: boolean
  /** Álbum de onde vieram as cores — aparece só na seleção, nunca no crachá */
  album?: AlbumInfo
  /** Nome da variação de cores do álbum (quando ele tem mais de uma) */
  variation?: string
}

export interface AlbumInfo {
  title: string
  year: number
  artist: 'paramore' | 'hayley'
  cover: string
}

export const ARTIST_LABEL: Record<AlbumInfo['artist'], string> = {
  paramore: 'Paramore',
  hayley: 'Hayley Williams',
}

const AWKIF: AlbumInfo = { title: 'All We Know Is Falling', year: 2005, artist: 'paramore', cover: allWeKnowIsFallingCover }
const RIOT: AlbumInfo = { title: 'RIOT!', year: 2007, artist: 'paramore', cover: riotCover }
const BNE: AlbumInfo = { title: 'Brand New Eyes', year: 2009, artist: 'paramore', cover: brandNewEyesCover }
const SELF_TITLED: AlbumInfo = { title: 'Paramore', year: 2013, artist: 'paramore', cover: selfTitledCover }
const AFTER_LAUGHTER: AlbumInfo = { title: 'After Laughter', year: 2017, artist: 'paramore', cover: afterLaughterCover }
const THIS_IS_WHY: AlbumInfo = { title: 'This Is Why', year: 2023, artist: 'paramore', cover: thisIsWhyCover }
const PETALS: AlbumInfo = { title: 'Petals for Armor', year: 2020, artist: 'hayley', cover: petalsForArmorCover }
const FFV: AlbumInfo = { title: 'FLOWERS for VASES / descansos', year: 2021, artist: 'hayley', cover: flowersForVasesCover }
const EGO_DEATH: AlbumInfo = { title: 'Ego Death at a Bachelorette Party', year: 2025, artist: 'hayley', cover: egoDeathCover }

// Cada paleta colorida vem de um álbum. A seleção mostra o álbum; o crachá usa só as cores.
// Paramore: uma paleta por álbum. Hayley: três variações por álbum.
export const COLOR_PALETTES: Palette[] = [
  // All We Know Is Falling — #287F5F · #A92523 · #6BC2BD
  { id: 'awkif', name: 'Verde e vermelho', bg: '#287f5f', ink: '#ffffff', block: '#a92523', blockInk: '#ffffff', accent: '#6bc2bd', accentInk: '#0f2b22', mono: false, album: AWKIF },
  // RIOT! — #000000 · #DE5622 · #FFFFFF
  { id: 'riot', name: 'Branco e laranja', bg: '#ffffff', ink: '#000000', block: '#de5622', blockInk: '#000000', accent: '#000000', accentInk: '#ffffff', mono: false, album: RIOT },
  // Brand New Eyes — #030304 · #FFCD26 · #E3DCD1
  { id: 'bne', name: 'Creme e amarelo', bg: '#e3dcd1', ink: '#030304', block: '#030304', blockInk: '#ffcd26', accent: '#ffcd26', accentInk: '#030304', mono: false, album: BNE },
  // Paramore (2013) — #020201 · #E9723B · #CAD976
  { id: 'self-titled', name: 'Laranja e lima', bg: '#020201', ink: '#ffffff', block: '#e9723b', blockInk: '#020201', accent: '#cad976', accentInk: '#020201', mono: false, album: SELF_TITLED },
  // After Laughter — #83CCF3 · #FFD35D · #DBA9CE
  { id: 'after-laughter', name: 'Lilás, azul e amarelo', bg: '#dba9ce', ink: '#241a33', block: '#83ccf3', blockInk: '#241a33', accent: '#ffd35d', accentInk: '#241a33', mono: false, album: AFTER_LAUGHTER },
  // This Is Why — #2E2528 · #A9823D · #777768
  { id: 'this-is-why', name: 'Bronze e cinza', bg: '#2e2528', ink: '#f2eee6', block: '#a9823d', blockInk: '#2e2528', accent: '#777768', accentInk: '#f2eee6', mono: false, album: THIS_IS_WHY },

  // Petals for Armor — #412e2a · #cc5769 · #e28497 · #ffd6da · #9aa486 · #f6efde
  { id: 'petals-marrom', name: 'Petals for Armor', variation: 'Marrom', bg: '#412e2a', ink: '#f6efde', block: '#cc5769', blockInk: '#f6efde', accent: '#e28497', accentInk: '#412e2a', mono: false, album: PETALS },
  { id: 'petals-rosa', name: 'Petals for Armor', variation: 'Rosa', bg: '#ffd6da', ink: '#412e2a', block: '#cc5769', blockInk: '#ffd6da', accent: '#9aa486', accentInk: '#412e2a', mono: false, album: PETALS },
  { id: 'petals-verde', name: 'Petals for Armor', variation: 'Verde', bg: '#f6efde', ink: '#412e2a', block: '#9aa486', blockInk: '#412e2a', accent: '#e28497', accentInk: '#412e2a', mono: false, album: PETALS },
  // FLOWERS for VASES — #40031d · #f3f3f3 · #ab0040 · #ac4f65 · #d595a6
  { id: 'ffv-vinho', name: 'FLOWERS for VASES', variation: 'Vinho', bg: '#40031d', ink: '#f3f3f3', block: '#ab0040', blockInk: '#f3f3f3', accent: '#d595a6', accentInk: '#40031d', mono: false, album: FFV },
  { id: 'ffv-claro', name: 'FLOWERS for VASES', variation: 'Claro', bg: '#f3f3f3', ink: '#40031d', block: '#ab0040', blockInk: '#f3f3f3', accent: '#ac4f65', accentInk: '#f3f3f3', mono: false, album: FFV },
  { id: 'ffv-rosa', name: 'FLOWERS for VASES', variation: 'Rosa', bg: '#d595a6', ink: '#40031d', block: '#40031d', blockInk: '#d595a6', accent: '#ab0040', accentInk: '#f3f3f3', mono: false, album: FFV },
  // Ego Death at a Bachelorette Party — #272822 · #5b5c57 · #feb615 · #e9be5f · #f5e7b6
  { id: 'ego-escuro', name: 'Ego Death', variation: 'Escuro', bg: '#272822', ink: '#f5e7b6', block: '#feb615', blockInk: '#272822', accent: '#e9be5f', accentInk: '#272822', mono: false, album: EGO_DEATH },
  { id: 'ego-amarelo', name: 'Ego Death', variation: 'Amarelo', bg: '#feb615', ink: '#272822', block: '#272822', blockInk: '#feb615', accent: '#f5e7b6', accentInk: '#272822', mono: false, album: EGO_DEATH },
  { id: 'ego-creme', name: 'Ego Death', variation: 'Creme', bg: '#f5e7b6', ink: '#272822', block: '#5b5c57', blockInk: '#f5e7b6', accent: '#feb615', accentInk: '#272822', mono: false, album: EGO_DEATH },
]

export const MONO_PALETTES: Palette[] = [
  { id: 'pb-positivo', name: 'P&B positivo', bg: '#ffffff', ink: '#000000', block: '#000000', blockInk: '#ffffff', accent: '#000000', accentInk: '#ffffff', mono: true },
  { id: 'pb-negativo', name: 'P&B negativo', bg: '#000000', ink: '#ffffff', block: '#ffffff', blockInk: '#000000', accent: '#ffffff', accentInk: '#000000', mono: true },
]

export const PALETTES: Palette[] = [...COLOR_PALETTES, ...MONO_PALETTES]

export const DEFAULT_PALETTE_ID: PaletteId = 'after-laughter'

export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? getPalette(DEFAULT_PALETTE_ID)
}

/** Nome mostrado na interface: o álbum de origem ou o nome da versão P&B. */
export function paletteLabel(palette: Palette): string {
  if (!palette.album) return palette.name
  return palette.variation ? `${palette.album.title} · ${palette.variation}` : palette.album.title
}

/** Todas as variações de cor do mesmo álbum. */
export function albumVariations(palette: Palette): Palette[] {
  if (!palette.album) return [palette]
  return COLOR_PALETTES.filter((p) => p.album === palette.album)
}
