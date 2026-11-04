export type PaletteId =
  | 'carmim'
  | 'azul-laranja'
  | 'ocre'
  | 'ciano-magenta'
  | 'turquesa-coral'
  | 'terracota'
  | 'rosa-lilas'
  | 'verde-pink'
  | 'cobre'
  | 'pb-positivo'
  | 'pb-negativo'

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
  /** Foto em escala de cinza */
  mono: boolean
}

// As paletas coloridas vêm das cores dos álbuns, mas o crachá não cita nem mostra os álbuns.
export const COLOR_PALETTES: Palette[] = [
  // All We Know Is Falling
  { id: 'carmim', name: 'Carmim', bg: '#15090a', ink: '#fbeee6', block: '#8e1a20', blockInk: '#f4d4c6', accent: '#ff6b5e', accentInk: '#15090a', mono: false },
  // RIOT!
  { id: 'azul-laranja', name: 'Azul e laranja', bg: '#071327', ink: '#ffffff', block: '#1657b8', blockInk: '#ffffff', accent: '#ff7a1a', accentInk: '#071327', mono: false },
  // Brand New Eyes
  { id: 'ocre', name: 'Ocre', bg: '#211a12', ink: '#f6ecd8', block: '#d9a441', blockInk: '#211a12', accent: '#b86c58', accentInk: '#211a12', mono: false },
  // Paramore (2013)
  { id: 'ciano-magenta', name: 'Ciano e magenta', bg: '#07070b', ink: '#ffffff', block: '#00d8ed', blockInk: '#07070b', accent: '#ff2e93', accentInk: '#07070b', mono: false },
  // After Laughter
  { id: 'turquesa-coral', name: 'Turquesa e coral', bg: '#072426', ink: '#fbf7e9', block: '#00c2cb', blockInk: '#072426', accent: '#ff6f61', accentInk: '#072426', mono: false },
  // This Is Why
  { id: 'terracota', name: 'Terracota', bg: '#151a14', ink: '#f5f2eb', block: '#c04a26', blockInk: '#f5f2eb', accent: '#c99700', accentInk: '#151a14', mono: false },
  // Petals for Armor
  { id: 'rosa-lilas', name: 'Rosa e lilás', bg: '#28111f', ink: '#fff4f2', block: '#e985a2', blockInk: '#28111f', accent: '#b58ac9', accentInk: '#28111f', mono: false },
  // FLOWERS for VASES
  { id: 'verde-pink', name: 'Verde e pink', bg: '#06120e', ink: '#f4f1e8', block: '#1b6b52', blockInk: '#f4f1e8', accent: '#ff4d8d', accentInk: '#06120e', mono: false },
  // Ego Death
  { id: 'cobre', name: 'Cobre', bg: '#1e1811', ink: '#f4e9d5', block: '#c96d3f', blockInk: '#f4e9d5', accent: '#d9a441', accentInk: '#1e1811', mono: false },
]

export const MONO_PALETTES: Palette[] = [
  { id: 'pb-positivo', name: 'P&B positivo', bg: '#ffffff', ink: '#000000', block: '#000000', blockInk: '#ffffff', accent: '#000000', accentInk: '#ffffff', mono: true },
  { id: 'pb-negativo', name: 'P&B negativo', bg: '#000000', ink: '#ffffff', block: '#ffffff', blockInk: '#000000', accent: '#ffffff', accentInk: '#000000', mono: true },
]

export const PALETTES: Palette[] = [...COLOR_PALETTES, ...MONO_PALETTES]

export const DEFAULT_PALETTE_ID: PaletteId = 'turquesa-coral'

export function getPalette(id: PaletteId): Palette {
  return PALETTES.find((palette) => palette.id === id) ?? COLOR_PALETTES[4]!
}
