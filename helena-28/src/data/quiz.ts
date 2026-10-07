// Banco de perguntas: a cada partida, saem 5 aleatórias com as opções embaralhadas.
// `answer` é o texto da opção certa.
export type Pergunta = {
  question: string
  options: string[]
  answer: string
  reveal: string
}

export const PERGUNTAS: Pergunta[] = [
  {
    question: 'Quantos shows da Hayley ela vai ver em 2026?',
    options: ['Um', 'Dois', 'Três', 'Nenhum'],
    answer: 'Três',
    reveal: 'Rio no dia 10/11 e São Paulo nos dias 12 e 13/11.',
  },
  {
    question: 'Qual a tradição de outubro dela?',
    options: ['Maratona de Harry Potter', 'Spooky season no Letterboxd', 'Nenhuma'],
    answer: 'Spooky season no Letterboxd',
    reveal: 'Uma lista de terror nova todo ano, desde 2021.',
  },
  {
    question: 'Como se chama a gatinha dela?',
    options: ['Mocha', 'Salem', 'Bastet', 'Hello Kitty'],
    answer: 'Bastet',
    reveal: 'Bastet, a 01. A Mocha é a 02 (do Gustavo, por enquanto).',
  },
  {
    question: 'Qual desses carros é apenas para gays e mulheres?',
    options: ['Hilux', 'Fiat 500', 'Strada', 'Saveiro'],
    answer: 'Fiat 500',
    reveal: 'Fiat 500, claro.',
  },
  {
    question: 'Qual dessas ela NÃO faria?',
    options: ['Bloquear quem fala mal da Taylor', 'Dar 5★ pra um filme que a fez chorar', 'Odiar filme de bruxa'],
    answer: 'Odiar filme de bruxa',
    reveal: 'Nunca. Bruxa é a categoria favorita.',
  },
  {
    question: 'Qual a cantora favorita dela?',
    options: ['Taylor Swift', 'Hayley Williams', 'Avril Lavigne', 'Lady Gaga'],
    answer: 'Taylor Swift',
    reveal: 'Taylor. Quem discordar leva block.',
  },
  {
    question: 'E a segunda cantora favorita?',
    options: ['Olivia Rodrigo', 'Hayley Williams', 'Billie Eilish', 'Avril Lavigne'],
    answer: 'Hayley Williams',
    reveal: 'Hayley, com 3 shows marcados pra provar.',
  },
  {
    question: 'Qual o carro favorito dela?',
    options: ['Fiat 500', 'Mini Cooper', 'BYD Dolphin', 'New Beetle'],
    answer: 'BYD Dolphin',
    reveal: 'BYD Dolphin. Apenas para gays e mulheres.',
  },
  {
    question: 'Em qual dessas cidades ela moraria?',
    options: ['São Paulo', 'Florianópolis', 'Curitiba', 'Porto Alegre'],
    answer: 'Curitiba',
    reveal: 'Curitiba: tem mais coisa pra fazer.',
  },
  {
    question: 'Qual o filme favorito dela?',
    options: ['A Bruxa', 'Martyrs', 'O Iluminado', 'Hereditário'],
    answer: 'Martyrs',
    reveal: 'Martyrs (2008). Terror francês pesadíssimo. Diva.',
  },
  {
    question: 'Qual a comida favorita dela?',
    options: ['Pizza', 'Poke', 'Temaki empanado crispy', 'Açaí'],
    answer: 'Temaki empanado crispy',
    reveal: 'Com muito tarê, salmão e até camarão, se tiver!',
  },
  {
    question: 'Qual o país favorito dela?',
    options: ['Japão', 'Nova Zelândia', 'Irlanda', 'Canadá'],
    answer: 'Nova Zelândia',
    reveal: 'Nova Zelândia.',
  },
  {
    question: 'Qual destes NÃO é um hobby dela?',
    options: ['Gerar paleta de cores', 'Trabalhar de graça pra fandoms', 'Colecionar fotos da Hayley', 'Jogar Deadlock'],
    answer: 'Jogar Deadlock',
    reveal: 'Deadlock, não. Os outros três, todo dia.',
  },
]
