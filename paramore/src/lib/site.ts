export type PageStatus = 'pronto' | 'mock' | 'vazio' | 'externo'

export interface SitePage {
  label: string
  path: string
  description: string
  status: PageStatus
}

export interface SiteGroup {
  title: string
  icon: string
  pages: SitePage[]
}

export const SITE_GROUPS: SiteGroup[] = [
  {
    title: 'Página Inicial',
    icon: 'home',
    pages: [
      {
        label: 'Início',
        path: '/',
        description:
          'Home interativa com destaques, última hora e acesso rápido ao acervo.',
        status: 'pronto',
      },
    ],
  },
  {
    title: 'Paramore',
    icon: 'banda',
    pages: [
      {
        label: 'A Banda',
        path: '/a-banda',
        description: 'História oficial da Paramore desde 2004, em Franklin, Tennessee.',
        status: 'pronto',
      },
      {
        label: 'Hayley Williams',
        path: '/a-banda/hayley-williams',
        description: 'Vocal, compositora e leader da banda; carreira solo e ativismo.',
        status: 'pronto',
      },
      {
        label: 'Taylor York',
        path: '/a-banda/taylor-york',
        description: 'Guitarrista e produtor, peça-chave do som moderno da banda.',
        status: 'pronto',
      },
      {
        label: 'Zac Farro',
        path: '/a-banda/zac-farro',
        description: 'Baterista, percussionista, fotógrafo e fundador da Congrats Records.',
        status: 'pronto',
      },
    ],
  },
  {
    title: 'Notícias',
    icon: 'noticias',
    pages: [
      {
        label: 'Notícias & Artigos',
        path: '/noticias',
        description:
          'Cobertura editorial: shows, lançamentos, Hayley, Taylor e Zac. (Mockup com placeholders por enquanto.)',
        status: 'mock',
      },
    ],
  },
  {
    title: 'Agenda & Turnê',
    icon: 'turnê',
    pages: [
      {
        label: 'Shows & Turnê',
        path: '/agenda',
        description:
          'Datas, contagem regressiva, compra de ingressos e histórico de passagens do Paramore pelo Brasil.',
        status: 'pronto',
      },
    ],
  },
  {
    title: 'Mídia',
    icon: 'midia',
    pages: [
      {
        label: 'Discografia',
        path: '/discografia',
        description: 'Todos os álbuns e a porta de entrada das páginas temáticas.',
        status: 'pronto',
      },
      {
        label: 'Álbum: All We Know Is Falling (2005)',
        path: '/discos/all-we-know-is-falling',
        description:
          'Página temática da era com letra, tradução lado a lado e link para o Spotify.',
        status: 'pronto',
      },
      {
        label: 'Álbum: RIOT! (2007)',
        path: '/discos/riot',
        description: 'Página temática da era com letra, tradução e Spotify.',
        status: 'pronto',
      },
      {
        label: 'Álbum: Brand New Eyes (2009)',
        path: '/discos/brand-new-eyes',
        description: 'Página temática da era com letra, tradução e Spotify.',
        status: 'pronto',
      },
      {
        label: 'Álbum: Paramore Self-Titled (2013)',
        path: '/discos/self-titled',
        description: 'Página temática da era com letra, tradução e Spotify.',
        status: 'pronto',
      },
      {
        label: 'Álbum: After Laughter (2017)',
        path: '/discos/after-laughter',
        description: 'Página temática da era com letra, tradução e Spotify.',
        status: 'pronto',
      },
      {
        label: 'Álbum: This Is Why (2023)',
        path: '/discos/this-is-why',
        description: 'Página temática da era com letra, tradução e Spotify.',
        status: 'pronto',
      },
      {
        label: 'Videografia',
        path: '/videografia',
        description: 'Catálogo em carrossel com os videoclipes oficiais de todas as eras, com player embutido.',
        status: 'pronto',
      },
      {
        label: 'Galeria',
        path: '/galeria',
        description: 'Acervo de fotos com filtro por era, fotógrafo e shows no Brasil.',
        status: 'pronto',
      },
    ],
  },
  {
    title: 'Projetos Paralelos',
    icon: 'projetos',
    pages: [
      {
        label: 'Hub de Projetos',
        path: '/projetos',
        description: 'Visão geral dos projetos paralelos de Hayley, Taylor e Zac.',
        status: 'pronto',
      },
      {
        label: 'halfnoise (Zac Farro)',
        path: '/halfnoise',
        description: 'Projeto musical e cinematográfico de Zac Farro, com discografia e vínculos.',
        status: 'pronto',
      },
      {
        label: 'Petals for Armor (Hayley)',
        path: '/petals-for-armor',
        description: 'Álbuns solo de Hayley Williams (Petals for Armor e FLOWERS for VASES) e a Good Dye Young.',
        status: 'pronto',
      },
    ],
  },
  {
    title: 'Comunidade & Institucional',
    icon: 'comunidade',
    pages: [
      {
        label: 'Comunidade',
        path: '/comunidade',
        description: 'Fórum, Discord e projetos da maior fã-base brasileira.',
        status: 'pronto',
      },
      {
        label: 'Sobre o Site',
        path: '/sobre-o-site',
        description: 'História do portal Paramore Brasil, do acervo e da equipe.',
        status: 'pronto',
      },
      {
        label: 'Parceiros',
        path: '/parceiros',
        description: 'Parcerias, selos, assessorias e quem apoia o fã-clube.',
        status: 'pronto',
      },
      {
        label: 'Design System',
        path: '/design-system',
        description: 'DS-PB: tokens, temas das eras, tipografia e componentes.',
        status: 'pronto',
      },
      {
        label: 'Sitemap',
        path: '/sitemap',
        description: 'Mapa completo de navegação do novo portal.',
        status: 'pronto',
      },
    ],
  },
]

export const SITEMAP_FLATTENED: SitePage[] = SITE_GROUPS.flatMap((g) => g.pages)

export const STATUS_LABEL: Record<PageStatus, string> = {
  pronto: 'Pronto no novo site',
  mock: 'Mockup',
  vazio: 'A construir',
  externo: 'Link externo',
}