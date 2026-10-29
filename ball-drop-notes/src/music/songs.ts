// Músicas de domínio público (folclóricas ou de compositores mortos há mais de 100 anos).
// A música define a ordem das notas: os blocos desenhados recebem as notas em sequência,
// na ordem em que foram criados (e a sequência se repete).
// midi: alturas MIDI (60 = dó4); beats: duração de cada nota, em batidas (semínima = 1),
// usada pelo gerador de pista. Pausas são somadas à nota anterior; nenhuma nota tem menos
// de meia batida, para a bolinha ter tempo de ir de um bloco a outro.
export type Song = { title: string; bpm: number; midi: number[]; beats: number[] }

// Repete um trecho n vezes (para refrões e frases repetidas).
const times = <T>(part: T[], n: number): T[] => Array.from({ length: n }, () => part).flat()

export const SONGS: Song[] = [
  {
    // Duas frases completas do tema da 9ª Sinfonia (Beethoven, 1824).
    title: 'Hino à Alegria (Beethoven)',
    bpm: 108,
    midi: [
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62,
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 62, 60, 60,
    ],
    beats: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2,
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 0.5, 2,
    ],
  },
  {
    // Melodia completa (A B A), compasso 4/4.
    title: 'Brilha, brilha, estrelinha',
    bpm: 100,
    midi: [
      60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60,
      67, 67, 65, 65, 64, 64, 62, 67, 67, 65, 65, 64, 64, 62,
      60, 60, 67, 67, 69, 69, 67, 65, 65, 64, 64, 62, 62, 60,
    ],
    beats: times([1, 1, 1, 1, 1, 1, 2], 6),
  },
  {
    title: 'Frère Jacques',
    bpm: 110,
    midi: [
      60, 62, 64, 60, 60, 62, 64, 60, 64, 65, 67, 64, 65, 67, 67, 69, 67, 65, 64, 60, 67, 69, 67,
      65, 64, 60, 60, 55, 60, 60, 55, 60,
    ],
    beats: [
      1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 0.5, 0.5, 0.5, 0.5, 1, 1, 0.5, 0.5, 0.5, 0.5, 1, 1,
      1, 1, 2, 1, 1, 2,
    ],
  },
  {
    title: 'Mary Had a Little Lamb',
    bpm: 112,
    midi: [64, 62, 60, 62, 64, 64, 64, 62, 62, 62, 64, 67, 67, 64, 62, 60, 62, 64, 64, 64, 64, 62, 62, 64, 62, 60],
    beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 4],
  },
  {
    // Refrão (James Lord Pierpont, 1857), em dó maior.
    title: 'Jingle Bells (refrão)',
    bpm: 120,
    midi: [
      64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64,
      65, 65, 65, 65, 65, 64, 64, 64, 64, 64, 62, 62, 64, 62, 67,
      64, 64, 64, 64, 64, 64, 64, 67, 60, 62, 64,
      65, 65, 65, 65, 65, 64, 64, 64, 64, 67, 67, 65, 62, 60,
    ],
    beats: [
      1, 1, 2, 1, 1, 2, 1, 1, 1.5, 0.5, 4,
      1, 1, 1.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 2, 2,
      1, 1, 2, 1, 1, 2, 1, 1, 1.5, 0.5, 4,
      1, 1, 1.5, 0.5, 1, 1, 1, 0.5, 0.5, 1, 1, 1, 1, 4,
    ],
  },
  {
    // Tema de abertura (Beethoven, 1810), mão direita. Semicolcheia = meia batida;
    // as pausas foram somadas à nota anterior.
    title: 'Für Elise (Beethoven)',
    bpm: 80,
    midi: [
      76, 75,
      76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 68, 71, 72, 64, 76, 75,
      76, 75, 76, 71, 74, 72, 69, 60, 64, 69, 71, 64, 72, 71, 69,
    ],
    beats: [
      0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5,
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 1.5, 0.5, 0.5, 0.5, 3,
    ],
  },
  {
    // Canção folclórica francesa, em dó maior (A A B A).
    title: 'Au clair de la lune',
    bpm: 100,
    midi: [
      ...times([60, 60, 60, 62, 64, 62, 60, 64, 62, 62, 60], 2),
      62, 62, 62, 62, 57, 57, 62, 60, 59, 57, 55,
      60, 60, 60, 62, 64, 62, 60, 64, 62, 62, 60,
    ],
    beats: times([1, 1, 1, 1, 2, 2, 1, 1, 1, 1, 4], 4),
  },
  {
    // Canção folclórica inglesa, em dó maior.
    title: 'London Bridge',
    bpm: 112,
    midi: [67, 69, 67, 65, 64, 65, 67, 62, 64, 65, 64, 65, 67, 67, 69, 67, 65, 64, 65, 67, 62, 67, 64, 60],
    beats: [1.5, 0.5, 1, 1, 1, 1, 2, 1, 1, 2, 1, 1, 2, 1.5, 0.5, 1, 1, 1, 1, 2, 2, 2, 1, 3],
  },
  {
    // Cânone folclórico em 6/8 (colcheia = meia batida), em dó maior.
    title: 'Row, Row, Row Your Boat',
    bpm: 96,
    midi: [60, 60, 60, 62, 64, 64, 62, 64, 65, 67, 72, 72, 72, 67, 67, 67, 64, 64, 64, 60, 60, 60, 67, 65, 64, 62, 60],
    beats: [
      1.5, 1.5, 1, 0.5, 1.5, 1, 0.5, 1, 0.5, 3,
      0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5,
      1, 0.5, 1, 0.5, 3,
    ],
  },
  {
    // Canção folclórica americana, em dó maior (com a anacruse "And on his farm").
    title: 'Old MacDonald',
    bpm: 116,
    midi: [60, 60, 60, 55, 57, 57, 55, 64, 64, 62, 62, 60, 55, 60, 60, 60, 55, 57, 57, 55, 64, 64, 62, 62, 60],
    beats: [1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 3, 1, 1, 1, 1, 1, 1, 1, 2, 1, 1, 1, 1, 4],
  },
]
