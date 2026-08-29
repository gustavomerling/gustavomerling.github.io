import hayleyPhoto from '@/assets/a-banda/hayley.jpg'
import taylorPhoto from '@/assets/a-banda/taylor.jpg'
import zacPhoto from '@/assets/a-banda/zac.jpg'
import { ALBUMS } from '@/lib/albums'

export type MemberId = 'hayley' | 'taylor' | 'zac'
export type SocialIcon = 'instagram' | 'x' | 'youtube' | 'globe'

export type PostKind = 'texto' | 'música' | 'foto'

export interface MemberPost {
  kind: PostKind
  time: string
  text: string
  albumId?: string
  image?: string
  tag?: string
  likes: string
  replies: string
  reposts: string
}

export interface MemberProfile {
  id: MemberId
  name: string
  handle: string
  role: string
  since: string
  location: string
  bio: string
  coverClass: string
  avatar: string
  stats: { label: string; value: string }[]
  socials: { label: string; href: string; icon: SocialIcon }[]
  summary: { label: string; value: string }[]
  albumsIds: string[]
  spotlight: string
  posts: MemberPost[]
}

const bandImages = Object.fromEntries(ALBUMS.map((a) => [a.id, a.image]))

export const MEMBERS: Record<MemberId, MemberProfile> = {
  hayley: {
    id: 'hayley',
    name: 'Hayley Williams',
    handle: '@yelyahwilliams',
    role: 'Vocal, compositora & líder criativa',
    since: '14 de dezembro de 1988 · Meridian, Mississippi',
    location: 'Franklin, Tennessee',
    bio: 'Cantora, compositora e a força criativa por trás da Paramore há mais de 20 anos. Carreira solo em Petals for Armor e Flowers for Vases, fundadora da Good Dye Young e ativista da saúde mental. O vermelho não é só uma cor de cabelo: é atitude.',
    coverClass: 'bg-gradient-to-br from-amber-300 via-orange-500 to-rose-600',
    avatar: hayleyPhoto,
    stats: [
      { label: 'Posts', value: '1.204' },
      { label: 'Seguidores', value: '6,8 mi' },
      { label: 'Seguindo', value: '312' },
      { label: 'Curtidas', value: '42 mi' },
    ],
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/yelyahwilliams', icon: 'instagram' },
      { label: 'X', href: 'https://x.com/yelyahwilliams', icon: 'x' },
      { label: 'Site', href: 'https://www.hayleywilliams.com', icon: 'globe' },
    ],
    summary: [
      { label: 'Na banda desde', value: '2004' },
      { label: 'Álbuns com a banda', value: '6' },
      { label: 'Projetos', value: 'Solo · Good Dye Young' },
      { label: 'Cidade', value: 'Franklin, TN' },
    ],
    albumsIds: [
      'all-we-know-is-falling',
      'riot',
      'brand-new-eyes',
      'self-titled',
      'after-laughter',
      'this-is-why',
    ],
    spotlight:
      'Petals for Armor (2020) estreou em primeiro lugar na lista de álbuns alternativos da Billboard — marcando a primeira vez que uma vitória solo dela dominou as semanas de pandemia.',
    posts: [
      {
        kind: 'música',
        time: '2 horas atrás',
        text: 'Escrevi essa música num voo de Nashville pra São Paulo. Dia 29 tem show por aí e eu tô louca pra ver a plateia brasileira gritando de volta. Essa era é surreal de boa. Obrigada por 20+ anos de paciência comigo.',
        albumId: 'this-is-why',
        tag: '#ParamoreBrasil',
        likes: '12,4 mil',
        replies: '1.087',
        reposts: '4.231',
      },
      {
        kind: 'foto',
        time: '3 dias atrás',
        text: 'Nos bastidores, entre um show e outro, com o roteiro da próxima música na mão. Nunca fui boa em parecer misteriosa — mas gosto do caos criativo.',
        image: hayleyPhoto,
        likes: '8.912',
        replies: '654',
        reposts: '1.203',
      },
      {
        kind: 'texto',
        time: '1 semana atrás',
        text: 'Lembrando da primeira vez que tocamos em Franklin, num porão com 30 pessoas. Hoje vejo lotando estádios e ainda sinto o mesmo frio na barriga antes de subir o palco. A música continua sendo o que me salva.',
        likes: '45,2 mil',
        replies: '3.401',
        reposts: '9.877',
      },
    ],
  },
  taylor: {
    id: 'taylor',
    name: 'Taylor York',
    handle: '@tayloryorkyall',
    role: 'Guitarra, sintetizadores & produção',
    since: '17 de dezembro de 1989 · Nashville, Tennessee',
    location: 'Nashville, Tennessee',
    bio: 'Guitarrista e produtor da Paramore desde 2007. Co-escreveu e coproduziu os grandes discos da banda e é um dos maiores responsáveis pelo som moderno deles. Reservado no Instagram, gigante no estúdio.',
    coverClass: 'bg-gradient-to-br from-emerald-300 via-teal-500 to-slate-800',
    avatar: taylorPhoto,
    stats: [
      { label: 'Posts', value: '87' },
      { label: 'Seguidores', value: '234 mil' },
      { label: 'Seguindo', value: '152' },
      { label: 'Curtidas', value: '3,2 mi' },
    ],
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/tayloryorkyall', icon: 'instagram' },
      { label: 'X', href: 'https://x.com/tayloryorkyall', icon: 'x' },
    ],
    summary: [
      { label: 'Na banda desde', value: '2007' },
      { label: 'Álbuns com a banda', value: '6' },
      { label: 'Projetos', value: 'Produção & coautoria' },
      { label: 'Cidade', value: 'Nashville, TN' },
    ],
    albumsIds: [
      'riot',
      'brand-new-eyes',
      'self-titled',
      'after-laughter',
      'this-is-why',
    ],
    spotlight:
      'Acompanha a banda desde os bastidores de Brand New Eyes e é creditado como coautor do hit Decode, da trilha de Crepúsculo.',
    posts: [
      {
        kind: 'texto',
        time: '5 horas atrás',
        text: 'A parte mais difícil de montar uma faixa não é a guitarra: é escolher o café certo no estúdio. A banda ainda não decidiu a próxima era, mas eu já decidi o fone de ouvido.',
        likes: '3.209',
        replies: '188',
        reposts: '402',
      },
      {
        kind: 'música',
        time: '2 dias atrás',
        text: 'Deixando essa aqui de novo: a guitarra de Still Into You foi gravada com praticamente tudo errado que a gente planejou — e é exatamente por isso que soa única. Produção também é saber quando não acertar.',
        albumId: 'self-titled',
        tag: '#Paramore',
        likes: '6.740',
        replies: '295',
        reposts: '903',
      },
      {
        kind: 'foto',
        time: '2 semanas atrás',
        text: 'Pré-produção pesada: pedalboard novo, iluminação nova, e o mesmo sorriso de quem se perdeu achando que sabia tocar.',
        image: taylorPhoto,
        likes: '4.517',
        replies: '231',
        reposts: '510',
      },
    ],
  },
  zac: {
    id: 'zac',
    name: 'Zac Farro',
    handle: '@zacfarro',
    role: 'Bateria, percussão, fotografia & halfnoise',
    since: '4 de junho de 1990 · Voorhees, Nova Jersey',
    location: 'Nashville, Tennessee',
    bio: 'Baterista da Paramore e o cérebro por trás do halfnoise, seu projeto solo de indie/psych-pop. Fundador da Congrats Records, fotógrafo entusiasta de câmera de filme e produtor musical. A ideia de "mais de um estúdio para chamar de lar" nunca fez tanto sentido.',
    coverClass: 'bg-gradient-to-br from-sky-300 via-indigo-400 to-fuchsia-600',
    avatar: zacPhoto,
    stats: [
      { label: 'Posts', value: '1.141' },
      { label: 'Seguidores', value: '279 mil' },
      { label: 'Seguindo', value: '1,5 mil' },
      { label: 'Curtidas', value: '8,4 mi' },
    ],
    socials: [
      { label: 'Instagram', href: 'https://www.instagram.com/zacfarro', icon: 'instagram' },
      { label: 'X', href: 'https://x.com/zacfarro', icon: 'x' },
      { label: 'Site', href: 'http://zacfarro.co', icon: 'globe' },
    ],
    summary: [
      { label: 'Na banda desde', value: '2004 · hoje' },
      { label: 'Álbuns com a banda', value: '5' },
      { label: 'Projetos', value: 'halfnoise · Congrats Records' },
      { label: 'Cidade', value: 'Nashville, TN' },
    ],
    albumsIds: [
      'all-we-know-is-falling',
      'riot',
      'brand-new-eyes',
      'after-laughter',
      'this-is-why',
    ],
    spotlight:
      'Fora da Paramore, Zac lançou o álbum solo Operator (2025) em sua própria Congrats Records; o halfnoise segue como um dos projetos mais criativos do pop experimental.',
    posts: [
      {
        kind: 'foto',
        time: '1 hora atrás',
        text: 'Filme carregado, câmera nova (e antiga ao mesmo tempo). Se você me ver carregando três câmeras de uma vez: é normal. A fotografia é meu outro escape criativo.',
        image: zacPhoto,
        tag: '#filternas',
        likes: '2.905',
        replies: '187',
        reposts: '464',
      },
      {
        kind: 'texto',
        time: '4 dias atrás',
        text: 'Estúdio livre hoje. Tocar bateria até o dedo cansar, compor pelo meio do caminho e gravar tudo no celular. Metade vira música, a outra metade vira retrospectiva.',
        likes: '5.218',
        replies: '344',
        reposts: '902',
      },
      {
        kind: 'música',
        time: '1 semana atrás',
        text: 'Operator, o disco solo que lancei pela Congrats, ganhou um registro ao vivo. As músicas aqui são sobre a conversa que a gente tem com a gente mesmo — escuta sem pressa.',
        tag: '#Operator',
        likes: '7.140',
        replies: '389',
        reposts: '1.204',
      },
    ],
  },
}

export function getMember(id: string): MemberProfile | undefined {
  return MEMBERS[id as MemberId]
}

export function albumImage(id: string): string {
  return bandImages[id] ?? ''
}