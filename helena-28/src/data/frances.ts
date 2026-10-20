import type { Pergunta } from './quiz'

export type FraseFrances = {
  fr: string
  pt: string
  pron: string
  highlight?: boolean
}

// Vocabulário de sobrevivência: o francês que ela já viu (ou vai ver) no Duolingo
export const FRASES_FRANCES: FraseFrances[] = [
  { fr: 'Bonjour', pt: 'oi, bom dia', pron: 'bon-jour' },
  { fr: 'Merci beaucoup', pt: 'muito obrigada', pron: 'mer-si bo-cu' },
  { fr: 'Je t’aime', pt: 'eu te amo', pron: 'je tème', highlight: true },
  { fr: 'Tu me manques', pt: 'sinto sua falta', pron: 'tu me mank' },
  { fr: 'Bon appétit', pt: 'bom apetite', pron: 'bon a-pe-ti' },
  { fr: 'Où sont les toilettes ?', pt: 'onde fica o banheiro?', pron: 'u son lé toua-let' },
]

// Banco do quiz temático: 5 perguntas sorteadas por partida
export const PERGUNTAS_FRANCES: Pergunta[] = [
  {
    question: 'Como se diz “oi” em francês?',
    options: ['Bonjour', 'Merci', 'Pardon', 'Au revoir'],
    answer: 'Bonjour',
    reveal: 'Bonjour! De noite, vira bonsoir.',
  },
  {
    question: 'Como se diz “eu te amo” em francês?',
    options: ['Je t’aime', 'Tu me manques', 'Je m’appelle…', 'S’il vous plaît'],
    answer: 'Je t’aime',
    reveal: 'Je t’aime. O Duo solta até fogos.',
  },
  {
    question: 'O que significa “Tu me manques”?',
    options: ['Sinto sua falta', 'Você me deve', 'Estou com sono', 'Vamos embora'],
    answer: 'Sinto sua falta',
    reveal: 'Literalmente “você me falta”. Romanticamente correto.',
  },
  {
    question: 'Qual desses filmes é francês?',
    options: ['Martyrs', 'Hereditário', 'O Iluminado', 'A Bruxa'],
    answer: 'Martyrs',
    reveal: 'Martyrs (2008). Terror francês, e o favorito dela.',
  },
  {
    question: 'Qual rio corta Paris?',
    options: ['Sena', 'Loire', 'Ródano', 'Garona'],
    answer: 'Sena',
    reveal: 'La Seine. A Torre Eiffel fica logo ali.',
  },
  {
    question: 'Qual é o museu mais visitado de Paris?',
    options: ['Louvre', 'Musée d’Orsay', 'Centre Pompidou', 'Musée Rodin'],
    answer: 'Louvre',
    reveal: 'O Louvre, casa da Mona Lisa.',
  },
  {
    question: 'O que é uma “baguette”?',
    options: ['Pão comprido', 'Sobremesa', 'Queijo', 'Chapéu'],
    answer: 'Pão comprido',
    reveal: 'E o jeito certo de carregar é debaixo do braço.',
  },
  {
    question: 'Qual desses pratos é francês?',
    options: ['Ratatouille', 'Paella', 'Risoto', 'Schnitzel'],
    answer: 'Ratatouille',
    reveal: 'Ratatouille. O filme também é aprovado.',
  },
  {
    question: 'Qual dessas sobremesas é francesa?',
    options: ['Crème brûlée', 'Tiramisù', 'Churros', 'Baklava'],
    answer: 'Crème brûlée',
    reveal: 'Crème brûlée: crocante por fora, cremosa por dentro.',
  },
  {
    question: 'Como se diz “muito obrigada” em francês?',
    options: ['Merci beaucoup', 'Bonjour', 'Bonne nuit', 'Pardon'],
    answer: 'Merci beaucoup',
    reveal: 'Merci beaucoup. Educação é tudo.',
  },
  {
    question: 'O que significa “bonne nuit”?',
    options: ['Boa noite', 'Bom dia', 'Boa sorte', 'Bom apetite'],
    answer: 'Boa noite',
    reveal: 'Bonne nuit: só quando vai dormir.',
  },
  {
    question: 'Quando se diz “bon appétit”?',
    options: ['Antes de comer', 'Ao acordar', 'Ao se despedir', 'Depois de espirrar'],
    answer: 'Antes de comer',
    reveal: 'Antes de comer. E vale até pra temaki.',
  },
  {
    question: 'Qual desses queijos é francês?',
    options: ['Brie', 'Gouda', 'Parmesão', 'Cheddar'],
    answer: 'Brie',
    reveal: 'Brie. Gouda é holandês, parmesão é italiano, cheddar é inglês.',
  },
  {
    question: 'Como se diz “desculpa” em francês?',
    options: ['Pardon', 'Merci', 'Bonjour', 'Bonne chance'],
    answer: 'Pardon',
    reveal: 'Pardon. Ou désolée, se for ela.',
  },
  {
    question: 'Qual é o feriado nacional da França?',
    options: ['14 de julho', '7 de setembro', '4 de julho', '12 de outubro'],
    answer: '14 de julho',
    reveal: 'La Fête nationale, dia da queda da Bastilha.',
  },
]
