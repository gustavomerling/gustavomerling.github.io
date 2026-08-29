export interface AlbumThemeColor {
  hex: string
  role: string
}

export interface FeaturedLyrics {
  title: string
  en: string[]
  pt: string[]
  note: string
}

export interface Album {
  id: string
  route: string
  theme: string
  name: string
  shortName: string
  year: number
  slogan: string
  aesthetic: string
  headingFont: string
  inkFont: string
  image: string
  colors: AlbumThemeColor[]
  spotify: string
  tracks: string[]
  featured: FeaturedLyrics
}

export const ALBUMS: Album[] = [
  {
    id: 'all-we-know-is-falling',
    route: 'all-we-know-is-falling',
    theme: 'theme-awkif',
    name: 'All We Know Is Falling',
    shortName: 'AWKIF',
    year: 2005,
    slogan: 'Grunge, emo alternativo e o sofá vermelho.',
    aesthetic: 'Emo Rock, textura de garagem, sombrio e visceral.',
    headingFont: 'Special Elite',
    inkFont: 'Special Elite',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/55/12/02/551202f6-2160-c8f8-180c-ac83560cec31/075679954985.jpg/600x600bb.jpg',
    colors: [
      { hex: '#9E1B1B', role: 'Vermelho Sofá Desgastado' },
      { hex: '#1C1C1C', role: 'Charcoal' },
      { hex: '#D1D5DB', role: 'Cinza Apagado' },
    ],
    spotify: 'https://open.spotify.com/album/67f6SSb8yKduNCK15DsafC',
    tracks: [
      'All We Know',
      'Pressure',
      'Emergency',
      'Brighter',
      'Here We Go Again',
      'Never Let This Go',
      'Whoa',
      'Conspiracy',
      'Franklin',
      'My Heart',
    ],
    featured: {
      title: 'Pressure',
      en: [
        'I can feel the pressure',
        "It's getting closer now",
        "We're better off without you",
        'I can feel the pressure',
        "It's getting closer now",
        "We're better off without you",
      ],
      pt: [
        'Eu sinto a pressão',
        'Chegando cada vez mais perto agora',
        'Somos melhores sem você',
        'Eu sinto a pressão',
        'Chegando cada vez mais perto agora',
        'Somos melhores sem você',
      ],
      note: 'Escrita na saída temporária do baixista Jeremy Davis durante a produção. No fim, o refrão vira "you\u2019re better off without me" — a separação como ato de deixar ir, não de rejeição.',
    },
  },
  {
    id: 'riot',
    route: 'riot',
    theme: 'theme-riot',
    name: 'RIOT!',
    shortName: 'RIOT!',
    year: 2007,
    slogan: 'Pop-punk explosivo, caos controlado.',
    aesthetic: 'Rabisco caligráfico, grafite urbano, alto contraste.',
    headingFont: 'Anton',
    inkFont: 'Permanent Marker',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/9a/3a/26/9a3a2608-29a7-5585-f990-cdfeb10b7394/075679955005.jpg/600x600bb.jpg',
    colors: [
      { hex: '#FF6600', role: 'Laranja Riot' },
      { hex: '#000000', role: 'Preto Absoluto' },
      { hex: '#FFFFFF', role: 'Branco Puro' },
    ],
    spotify: 'https://open.spotify.com/album/71rziY9eLo1tA2dBMxrwhc',
    tracks: [
      "For a Pessimist, I'm Pretty Optimistic",
      "That's What You Get",
      'Hallelujah',
      'Misery Business',
      'When It Rains',
      'Let the Flames Begin',
      'Miracle',
      'Fences',
      'Born for This',
    ],
    featured: {
      title: 'Misery Business',
      en: [
        "I'm in the business of misery",
        "Let's take it from the top",
        "She's got a body like an hourglass that's ticking like a clock",
        'And I can feel it crumbling',
        'And I can feel it crumbling',
      ],
      pt: [
        'Estou no negócio da miséria',
        'Vamos começar do zero',
        'Ela tem um corpo como uma ampulheta que tiquetaqueia como um relógio',
        'E eu sinto isso desmoronar',
        'E eu sinto isso desmoronar',
      ],
      note: '"Hourglass" (ampulheta) é o corpo que marca o tempo; mantivemos a imagem em português para preservar a dupla leitura de desejo e competição adolescente da faixa.',
    },
  },
  {
    id: 'brand-new-eyes',
    route: 'brand-new-eyes',
    theme: 'theme-bne',
    name: 'Brand New Eyes',
    shortName: 'BNE',
    year: 2009,
    slogan: 'Melancolia orgânica, entomologia e caderno de anotações.',
    aesthetic: 'Vintage, amarelo ocre, mariposa alfinetada no caderno.',
    headingFont: 'Inter',
    inkFont: 'Caveat',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/42/48/29/424829a6-42fe-77e7-770e-a760f54ec3de/dj.qnyuzqoy.jpg/600x600bb.jpg',
    colors: [
      { hex: '#E5A93C', role: 'Amarelo Ocre' },
      { hex: '#2B261F', role: 'Sepia Profundo' },
      { hex: '#ECE5D8', role: 'Parchment Cream' },
    ],
    spotify: 'https://open.spotify.com/album/27UqZoE1kV6sIV6uQcI28A',
    tracks: [
      'Careful',
      'Ignorance',
      'Playing God',
      'Brick by Boring Brick',
      'Turn It Off',
      'The Only Exception',
      'Feeling Sorry',
      'Looking Up',
      'Where the Lines Overlap',
      'Misguided Ghosts',
      'All I Wanted',
    ],
    featured: {
      title: 'The Only Exception',
      en: [
        'When I was younger I saw my daddy cry',
        'And curse at the wind',
        'He broke his own heart and I watched',
        'As he tried to reassemble it',
        'And my momma swore that she would never let herself forget',
        'And that was the day that I promised',
        "I'd never sing of love if it does not exist",
        'But darling, you are the only exception',
      ],
      pt: [
        'Quando eu era mais nova vi meu pai chorar',
        'E xingar o vento',
        'Ele partiu o próprio coração e eu assisti',
        'Enquanto tentava remontá-lo',
        'E minha mãe jurou que jamais se deixaria esquecer',
        'E foi naquele dia que prometi',
        'Que nunca cantaria sobre o amor se ele não existisse',
        'Mas, querido, você é a única exceção',
      ],
      note: 'Crônica da infância de Hayley: a promessa de nunca cantar o amor quebrada por um amor que se provou seguro — o coração de toda a era BNE.',
    },
  },
  {
    id: 'self-titled',
    route: 'self-titled',
    theme: 'theme-selftitled',
    name: 'Paramore (Self-Titled)',
    shortName: 'Self-Titled',
    year: 2013,
    slogan: 'Renascimento pop-rock e a fita adesiva.',
    aesthetic: 'Pop-Art, cores primárias, street art, as três barras.',
    headingFont: 'Montserrat',
    inkFont: 'Montserrat',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/32/cb/9d/32cb9d04-ef0f-93bb-fd2f-19b395785025/075679956187.jpg/600x600bb.jpg',
    colors: [
      { hex: '#00C4D6', role: 'Cyan Elétrico' },
      { hex: '#FF2E93', role: 'Magenta Neon' },
      { hex: '#FFE600', role: 'Amarelo Vibrante' },
    ],
    spotify: 'https://open.spotify.com/album/4sgYpkIASM1jVlNC8Wp9oF',
    tracks: [
      'Fast in My Car',
      'Now',
      'Grow Up',
      'Daydreaming',
      'Interlude: Moving On',
      "Ain't It Fun",
      'Part II',
      'Last Hope',
      'Still Into You',
      'Anklebiters',
      'Interlude: Holiday',
      'Proof',
      'Hate to See Your Heart Break',
      '(One of Those) Crazy Girls',
      "Interlude: I'm Not Angry Anymore",
      'Future',
    ],
    featured: {
      title: "Ain't It Fun",
      en: [
        "Ain't it fun living in the real world?",
        "Ain't it good being all alone?",
        "Where you're from",
        'You might be the one who\u2019s running things',
        'Well you can run',
        "But you can't hide anymore",
      ],
      pt: [
        'Não é divertido viver no mundo real?',
        'Não é bom estar completamente sozinho?',
        'De onde você vem',
        'Você pode ser quem comanda as coisas',
        'Bem, você pode correr',
        'Mas você não consegue mais se esconder',
      ],
      note: 'Primeiro Grammy (Best Rock Song). "Running things" = mandar na própria vida; a canção celebra a queda de braço com a maturidade.',
    },
  },
  {
    id: 'after-laughter',
    route: 'after-laughter',
    theme: 'theme-afterlaughter',
    name: 'After Laughter',
    shortName: 'After Laughter',
    year: 2017,
    slogan: 'New wave oitentista e a ironia do "Fake Happy".',
    aesthetic: 'Memphis Design, geometria lúdica, pastel neon.',
    headingFont: 'Righteous',
    inkFont: 'Righteous',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/e6/6f/17/e66f179c-599d-c7fd-fafe-bc792e2b5993/075679897121.jpg/600x600bb.jpg',
    colors: [
      { hex: '#00C2CB', role: 'Aqua Teal' },
      { hex: '#FF6F61', role: 'Coral Neon' },
      { hex: '#FFE800', role: 'Limão Retro' },
      { hex: '#6E77F0', role: 'Periwinkle Elétrico' },
    ],
    spotify: 'https://open.spotify.com/album/1c9Sx7XdXuMptGyfCB6hHs',
    tracks: [
      'Hard Times',
      'Rose-Colored Boy',
      'Told You So',
      'Forgiveness',
      'Fake Happy',
      '26',
      'Pool',
      'Grudges',
      'Caught in the Middle',
      'Idle Worship',
      'No Friend',
      'Tell Me How',
    ],
    featured: {
      title: 'Hard Times',
      en: [
        'All that I want',
        'Is to wake up fine',
        'Tell me that I\u2019m alright',
        "That I ain't gonna die",
        'These are the hard times',
        'And these are the hard times',
      ],
      pt: [
        'Tudo o que eu quero',
        'É acordar bem',
        'Me diga que estou bem',
        'Que eu não vou morrer',
        'Esses são tempos difíceis',
        'Esses são tempos difíceis',
      ],
      note: 'O som ensolarado de New Wave esconde a ansiedade da letra — a cara de "Fake Happy" de toda a era.',
    },
  },
  {
    id: 'this-is-why',
    route: 'this-is-why',
    theme: 'theme-thisiswhy',
    name: 'This Is Why',
    shortName: 'This Is Why',
    year: 2023,
    slogan: 'Post-punk analógico com textura de 35mm.',
    aesthetic: 'Cinematográfico, editorial terroso, fotografia anos 70.',
    headingFont: 'DM Serif Display',
    inkFont: 'DM Serif Display',
    image: 'https://is1-ssl.mzstatic.com/image/thumb/Music122/v4/21/de/99/21de99a3-6eb6-5372-6a96-40d992808d9c/075679716224.jpg/600x600bb.jpg',
    colors: [
      { hex: '#C04A26', role: 'Terracota Rust' },
      { hex: '#C99700', role: 'Mostarda Quente' },
      { hex: '#2D4B39', role: 'Verde Floresta Oliva' },
      { hex: '#F5F2EB', role: 'Parchment Bone' },
    ],
    spotify: 'https://open.spotify.com/album/1BDj5lr0KVcSQpSNdyqJct',
    tracks: [
      'You First',
      'The News',
      'Running Out of Time',
      "C'est Comme Ça",
      'Big Man, Little Dignity',
      'Figure 8',
      'Liar',
      'Crave',
      'Thick Skull',
    ],
    featured: {
      title: 'Crave',
      en: [
        'I can\u2019t wait to see what this turns into',
        "I already know you'll be on my mind",
        "I'm feeling through the phantom pain",
        'Crave, to swallow up time',
      ],
      pt: [
        'Mal posso esperar para ver no que isso vai dar',
        'Já sei que você não vai sair da minha cabeça',
        'Estou sentindo através da dor fantasma',
        'O desejo de devorar o tempo',
      ],
      note: '"Crave" simboliza a urgência visceral de Hayley: "swallow up time" é a vontade de suspender o momento — desejo, não fuga.',
    },
  },
]

export function getAlbumById(id: string): Album | undefined {
  return ALBUMS.find((album) => album.id === id)
}