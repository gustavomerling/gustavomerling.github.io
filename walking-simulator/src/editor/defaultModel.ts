import type { Model } from './model'

// Criatura inicial: um quadrúpede olhando para a direita (o sentido em que ele deve andar).
// Torso com diagonais (para não desmontar) e cabeça presa em triângulo ao peito.
// Duas pernas de 3 segmentos, espelhadas em frente e atrás, então são 4 patas no total:
// a dianteira dobra o cotovelo para trás e a traseira dobra o jarrete para trás, como num cachorro.
// Cada perna tem 4 músculos: dois que balançam a coxa (para a frente e para trás),
// um que dobra o joelho e um que dobra o tornozelo.
export const defaultModel: Model = {
  skin: { hue: 28, pattern: 'spots' },
  joints: [
    { id: 1, x: 190, y: 172 }, // garupa
    { id: 2, x: 300, y: 166 }, // cernelha
    { id: 3, x: 306, y: 208 }, // peito (ombro)
    { id: 4, x: 196, y: 210 }, // quadril
    { id: 5, x: 344, y: 150 }, // cabeça
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 1 },
    { a: 1, b: 3 },
    { a: 2, b: 4 },
    { a: 2, b: 5 },
    { a: 3, b: 5 },
  ],
  limbs: [
    // Perna dianteira: ombro -> cotovelo -> pulso -> dedos.
    {
      id: 1,
      anchor: 3,
      points: [
        { x: 300, y: 248 },
        { x: 308, y: 284 },
        { x: 320, y: 296 },
      ],
    },
    // Perna traseira: quadril -> joelho (para a frente) -> jarrete (para trás) -> dedos.
    {
      id: 2,
      anchor: 4,
      points: [
        { x: 212, y: 246 },
        { x: 192, y: 276 },
        { x: 204, y: 296 },
      ],
    },
  ],
  muscles: [
    // Dianteira
    { id: 1, a: { limb: null, i: 2 }, b: { limb: 1, i: 0 }, strength: 0.35, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 4 }, b: { limb: 1, i: 0 }, strength: 0.35, contraction: 0.2 },
    { id: 3, a: { limb: null, i: 3 }, b: { limb: 1, i: 1 }, strength: 0.4, contraction: 0.3 },
    { id: 4, a: { limb: 1, i: 0 }, b: { limb: 1, i: 2 }, strength: 0.3, contraction: 0.25 },
    // Traseira
    { id: 5, a: { limb: null, i: 1 }, b: { limb: 2, i: 0 }, strength: 0.35, contraction: 0.3 },
    { id: 6, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.35, contraction: 0.2 },
    { id: 7, a: { limb: null, i: 4 }, b: { limb: 2, i: 1 }, strength: 0.4, contraction: 0.3 },
    { id: 8, a: { limb: 2, i: 0 }, b: { limb: 2, i: 2 }, strength: 0.3, contraction: 0.25 },
  ],
}
