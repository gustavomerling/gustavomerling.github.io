import allWeKnowIsFallingCover from '@/assets/albums/all-we-know-is-falling.jpg'
import afterLaughterCover from '@/assets/albums/after-laughter.jpg'
import brandNewEyesCover from '@/assets/albums/brand-new-eyes.jpg'
import egoDeathCover from '@/assets/albums/ego-death.jpg'
import flowersForVasesCover from '@/assets/albums/flowers-for-vases.jpg'
import petalsForArmorCover from '@/assets/albums/petals-for-armor.jpg'
import riotCover from '@/assets/albums/riot.jpg'
import selfTitledCover from '@/assets/albums/self-titled.jpg'
import thisIsWhyCover from '@/assets/albums/this-is-why.jpg'

export type Artist = 'paramore' | 'hayley'

export type AlbumId =
  | 'all-we-know-is-falling'
  | 'riot'
  | 'brand-new-eyes'
  | 'self-titled'
  | 'after-laughter'
  | 'this-is-why'
  | 'petals-for-armor'
  | 'flowers-for-vases'
  | 'ego-death'

export interface AlbumPalette {
  primary: string
  accent: string
  highlight: string
  panel: string
  ink: string
  muted: string
}

export interface Album {
  id: AlbumId
  title: string
  shortTitle: string
  year: number
  artist: Artist
  tagline: string
  cover: string
  palette: AlbumPalette
}

export const ALBUMS: Album[] = [
  {
    id: 'all-we-know-is-falling',
    title: 'All We Know Is Falling',
    shortTitle: 'All We Know Is Falling',
    year: 2005,
    artist: 'paramore',
    tagline: 'O começo de tudo, em vermelho e sombra.',
    cover: allWeKnowIsFallingCover,
    palette: {
      primary: '#8e1a20',
      accent: '#ff6b5e',
      highlight: '#f4d4c6',
      panel: '#15090a',
      ink: '#fbeee6',
      muted: '#c4998d',
    },
  },
  {
    id: 'riot',
    title: 'RIOT!',
    shortTitle: 'RIOT!',
    year: 2007,
    artist: 'paramore',
    tagline: 'Caos controlado, pop-punk e energia pura.',
    cover: riotCover,
    palette: {
      primary: '#1657b8',
      accent: '#ff7a1a',
      highlight: '#ffffff',
      panel: '#071327',
      ink: '#ffffff',
      muted: '#a9c4ee',
    },
  },
  {
    id: 'brand-new-eyes',
    title: 'Brand New Eyes',
    shortTitle: 'Brand New Eyes',
    year: 2009,
    artist: 'paramore',
    tagline: 'Asas abertas, melancolia e recomeço.',
    cover: brandNewEyesCover,
    palette: {
      primary: '#d9a441',
      accent: '#b86c58',
      highlight: '#f6ecd8',
      panel: '#211a12',
      ink: '#f6ecd8',
      muted: '#c9b48f',
    },
  },
  {
    id: 'self-titled',
    title: 'Paramore',
    shortTitle: 'Paramore (2013)',
    year: 2013,
    artist: 'paramore',
    tagline: 'Três barras, cores primárias e renascimento.',
    cover: selfTitledCover,
    palette: {
      primary: '#00d8ed',
      accent: '#ff2e93',
      highlight: '#ffe600',
      panel: '#07070b',
      ink: '#ffffff',
      muted: '#a0a0ac',
    },
  },
  {
    id: 'after-laughter',
    title: 'After Laughter',
    shortTitle: 'After Laughter',
    year: 2017,
    artist: 'paramore',
    tagline: 'Teal, coral e um sorriso que esconde tudo.',
    cover: afterLaughterCover,
    palette: {
      primary: '#00c2cb',
      accent: '#ff6f61',
      highlight: '#ffe14d',
      panel: '#072426',
      ink: '#fbf7e9',
      muted: '#8fd8d3',
    },
  },
  {
    id: 'this-is-why',
    title: 'This Is Why',
    shortTitle: 'This Is Why',
    year: 2023,
    artist: 'paramore',
    tagline: 'Terracota, tensão e olhar analógico.',
    cover: thisIsWhyCover,
    palette: {
      primary: '#c04a26',
      accent: '#c99700',
      highlight: '#f5f2eb',
      panel: '#151a14',
      ink: '#f5f2eb',
      muted: '#b89c82',
    },
  },
  {
    id: 'petals-for-armor',
    title: 'Petals for Armor',
    shortTitle: 'Petals for Armor',
    year: 2020,
    artist: 'hayley',
    tagline: 'Pétalas, armadura e renascimento delicado.',
    cover: petalsForArmorCover,
    palette: {
      primary: '#e985a2',
      accent: '#b58ac9',
      highlight: '#fff0e5',
      panel: '#28111f',
      ink: '#fff4f2',
      muted: '#d9a8bd',
    },
  },
  {
    id: 'flowers-for-vases',
    title: 'FLOWERS for VASES / descansos',
    shortTitle: 'FLOWERS for VASES',
    year: 2021,
    artist: 'hayley',
    tagline: 'Flores secas, silêncio e canções de casa.',
    cover: flowersForVasesCover,
    palette: {
      primary: '#1b6b52',
      accent: '#ff4d8d',
      highlight: '#d7ff68',
      panel: '#06120e',
      ink: '#f4f1e8',
      muted: '#83b3a4',
    },
  },
  {
    id: 'ego-death',
    title: 'Ego Death at a Bachelorette Party',
    shortTitle: 'Ego Death',
    year: 2025,
    artist: 'hayley',
    tagline: 'Brilho, caos e um fim de festa inesquecível.',
    cover: egoDeathCover,
    palette: {
      primary: '#c96d3f',
      accent: '#d9a441',
      highlight: '#f2e5cf',
      panel: '#1e1811',
      ink: '#f4e9d5',
      muted: '#c9b28c',
    },
  },
]

export const PARAMORE_ALBUMS = ALBUMS.filter((album) => album.artist === 'paramore')
export const HAYLEY_ALBUMS = ALBUMS.filter((album) => album.artist === 'hayley')

export const DEFAULT_ALBUM_ID: AlbumId = 'after-laughter'

export function getAlbum(id: AlbumId): Album {
  return ALBUMS.find((album) => album.id === id) ?? ALBUMS[4]
}

export const ARTIST_LABEL: Record<Artist, string> = {
  paramore: 'Paramore',
  hayley: 'Hayley Williams',
}
