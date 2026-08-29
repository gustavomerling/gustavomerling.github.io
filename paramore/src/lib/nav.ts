export interface NavItem {
  label: string
  path?: string
  children?: { label: string; path: string }[]
}

export const HEADER_NAV: NavItem[] = [
  {
    label: 'Paramore',
    children: [
      { label: 'A Banda', path: '/a-banda' },
      { label: 'Hayley Williams', path: '/a-banda/hayley-williams' },
      { label: 'Taylor York', path: '/a-banda/taylor-york' },
      { label: 'Zac Farro', path: '/a-banda/zac-farro' },
    ],
  },
  { label: 'Notícias', path: '/noticias' },
  { label: 'Agenda', path: '/agenda' },
  {
    label: 'Mídia',
    children: [
      { label: 'Discografia', path: '/discografia' },
      { label: 'Videografia', path: '/videografia' },
      { label: 'Galeria', path: '/galeria' },
    ],
  },
  {
    label: 'Projetos',
    children: [
      { label: 'Visão geral', path: '/projetos' },
      { label: 'halfnoise (Zac)', path: '/halfnoise' },
      { label: 'Petals for Armor (Hayley)', path: '/petals-for-armor' },
    ],
  },
  {
    label: 'Site',
    children: [
      { label: 'Comunidade', path: '/comunidade' },
      { label: 'Sobre o Site', path: '/sobre-o-site' },
      { label: 'Parceiros', path: '/parceiros' },
      { label: 'Design System', path: '/design-system' },
      { label: 'Sitemap', path: '/sitemap' },
    ],
  },
]

export interface ThemeOption {
  id: string
  bodyClass: string
  label: string
  dot: string
}

export const THEMES: ThemeOption[] = [
  { id: 'default', bodyClass: 'theme-default', label: 'Paramore Brasil', dot: '#FF5500' },
  { id: 'awkif', bodyClass: 'theme-awkif', label: 'AWKIF (2005)', dot: '#9E1B1B' },
  { id: 'riot', bodyClass: 'theme-riot', label: 'RIOT! (2007)', dot: '#FF6600' },
  { id: 'bne', bodyClass: 'theme-bne', label: 'Brand New Eyes (2009)', dot: '#E5A93C' },
  { id: 'selftitled', bodyClass: 'theme-selftitled', label: 'Self-Titled (2013)', dot: '#00D8ED' },
  { id: 'afterlaughter', bodyClass: 'theme-afterlaughter', label: 'After Laughter (2017)', dot: '#FF6F61' },
  { id: 'thisiswhy', bodyClass: 'theme-thisiswhy', label: 'This Is Why (2023)', dot: '#C04A26' },
]