import { defaultModel } from './defaultModel'
import type { Model } from './model'

// Criaturas prontas para abrir no editor. Todas olham para a direita (o sentido em que devem andar).
// Membros são espelhados (frente e trás), então "uma perna" no modelo vira duas patas na simulação.
export type Example = { id: string; name: string; description: string; model: Model }

// Mesa simples: torso retangular e duas pernas retas de 2 segmentos. A mais fácil de treinar.
const table: Model = {
  skin: { hue: 205, pattern: 'plain' },
  joints: [
    { id: 1, x: 200, y: 160 },
    { id: 2, x: 290, y: 160 },
    { id: 3, x: 290, y: 205 },
    { id: 4, x: 200, y: 205 },
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 1 },
    { a: 1, b: 3 },
    { a: 2, b: 4 },
  ],
  limbs: [
    { id: 1, anchor: 3, points: [{ x: 296, y: 255 }, { x: 288, y: 305 }] },
    { id: 2, anchor: 4, points: [{ x: 206, y: 255 }, { x: 198, y: 305 }] },
  ],
  muscles: [
    { id: 1, a: { limb: null, i: 4 }, b: { limb: 1, i: 0 }, strength: 0.5, contraction: 0.25 },
    { id: 2, a: { limb: null, i: 1 }, b: { limb: 1, i: 1 }, strength: 0.5, contraction: 0.25 },
    { id: 3, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.5, contraction: 0.25 },
    { id: 4, a: { limb: null, i: 2 }, b: { limb: 2, i: 1 }, strength: 0.5, contraction: 0.25 },
  ],
}

// Dinossauro bípede: a cauda encosta no chão e forma um tripé com as pernas (espelhadas = 2 pernas).
const dino: Model = {
  skin: { hue: 110, pattern: 'scales' },
  feet: [{ limb: null, i: 1 }, { limb: 1, i: 2 }], // cauda e dedos
  joints: [
    { id: 1, x: 118, y: 292 }, // ponta da cauda (apoiada no chão, como um tripé)
    { id: 2, x: 195, y: 160 }, // quadril (em cima)
    { id: 3, x: 275, y: 158 }, // ombro
    { id: 4, x: 280, y: 196 }, // peito
    { id: 5, x: 200, y: 200 }, // base da cauda
    { id: 6, x: 325, y: 128 }, // cabeça
    { id: 7, x: 240, y: 204 }, // barriga (encaixe das pernas)
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 1, b: 5 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 2, b: 5 },
    { a: 5, b: 7 },
    { a: 7, b: 4 },
    { a: 2, b: 7 },
    { a: 3, b: 7 },
    { a: 3, b: 6 },
    { a: 4, b: 6 },
  ],
  limbs: [
    // Coxa para a frente, canela para trás, pé para a frente.
    { id: 1, anchor: 7, points: [{ x: 262, y: 242 }, { x: 238, y: 280 }, { x: 262, y: 296 }] },
  ],
  muscles: [
    { id: 1, a: { limb: null, i: 3 }, b: { limb: 1, i: 0 }, strength: 0.4, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 5 }, b: { limb: 1, i: 0 }, strength: 0.4, contraction: 0.25 },
    { id: 3, a: { limb: null, i: 2 }, b: { limb: 1, i: 1 }, strength: 0.7, contraction: 0.3 },
    { id: 4, a: { limb: 1, i: 0 }, b: { limb: 1, i: 2 }, strength: 0.6, contraction: 0.3 },
  ],
}

// Sapo: corpo inclinado, patas traseiras longas dobradas em Z (para saltar) e patas dianteiras curtas.
const frog: Model = {
  skin: { hue: 135, pattern: 'spots' },
  feet: [{ limb: 1, i: 1 }, { limb: 1, i: 2 }, { limb: 2, i: 1 }], // pé comprido traseiro e mão
  joints: [
    { id: 1, x: 168, y: 250 }, // traseiro
    { id: 2, x: 192, y: 214 }, // costas
    { id: 3, x: 272, y: 196 }, // topo da cabeça
    { id: 4, x: 296, y: 230 }, // boca
    { id: 5, x: 240, y: 252 }, // barriga
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 5 },
    { a: 5, b: 1 },
    { a: 2, b: 5 },
    { a: 3, b: 5 },
  ],
  limbs: [
    // Pata traseira: joelho para a frente, tornozelo para trás, pé comprido para a frente.
    { id: 1, anchor: 1, points: [{ x: 214, y: 274 }, { x: 166, y: 288 }, { x: 204, y: 297 }] },
    // Pata dianteira: cotovelo e mão.
    { id: 2, anchor: 4, points: [{ x: 282, y: 266 }, { x: 296, y: 297 }] },
  ],
  muscles: [
    { id: 1, a: { limb: null, i: 2 }, b: { limb: 1, i: 0 }, strength: 0.45, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 2 }, b: { limb: 1, i: 1 }, strength: 0.5, contraction: 0.35 },
    { id: 3, a: { limb: 1, i: 0 }, b: { limb: 1, i: 2 }, strength: 0.4, contraction: 0.3 },
    { id: 4, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.35, contraction: 0.3 },
    { id: 5, a: { limb: null, i: 5 }, b: { limb: 2, i: 1 }, strength: 0.35, contraction: 0.3 },
  ],
}

// Lagarta: torso em 4 gomos sem diagonais; os músculos nas diagonais fazem o corpo ondular.
// Não tem membros: anda só deformando o corpo.
const caterpillar: Model = (() => {
  const xs = [150, 192, 234, 276, 318]
  const top = 252
  const bottom = 284
  const joints = [
    ...xs.map((x, i) => ({ id: i + 1, x, y: top })),
    ...xs.map((x, i) => ({ id: i + 6, x, y: bottom })),
    { id: 11, x: 350, y: 262 }, // cabeça
  ]
  const bones = [
    ...xs.slice(1).map((_, i) => ({ a: i + 1, b: i + 2 })),
    ...xs.slice(1).map((_, i) => ({ a: i + 6, b: i + 7 })),
    ...xs.map((_, i) => ({ a: i + 1, b: i + 6 })),
    { a: 5, b: 11 },
    { a: 10, b: 11 },
  ]
  const muscles = xs.slice(1).flatMap((_, i) => [
    { id: 2 * i + 1, a: { limb: null, i: i + 1 }, b: { limb: null, i: i + 7 }, strength: 0.9, contraction: 0.25 },
    { id: 2 * i + 2, a: { limb: null, i: i + 2 }, b: { limb: null, i: i + 6 }, strength: 0.9, contraction: 0.25 },
  ])
  return {
    skin: { hue: 75, pattern: 'stripes' },
    feet: [6, 7, 8, 9, 10].map((i) => ({ limb: null, i })), // a barriga inteira
    joints,
    bones,
    limbs: [],
    muscles,
  }
})()

// Aranha-pernalta: corpo pequeno e pernas longas que sobem até o joelho e descem até o chão.
const spider: Model = {
  skin: { hue: 280, pattern: 'stripes' },
  joints: [
    { id: 1, x: 205, y: 190 },
    { id: 2, x: 275, y: 190 },
    { id: 3, x: 275, y: 215 },
    { id: 4, x: 205, y: 215 },
    { id: 5, x: 300, y: 202 }, // cabeça
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
    { id: 1, anchor: 3, points: [{ x: 320, y: 172 }, { x: 352, y: 296 }] },
    { id: 2, anchor: 4, points: [{ x: 160, y: 172 }, { x: 128, y: 296 }] },
  ],
  muscles: [
    { id: 1, a: { limb: null, i: 2 }, b: { limb: 1, i: 0 }, strength: 0.4, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 4 }, b: { limb: 1, i: 0 }, strength: 0.4, contraction: 0.2 },
    { id: 3, a: { limb: null, i: 3 }, b: { limb: 1, i: 1 }, strength: 0.4, contraction: 0.25 },
    { id: 4, a: { limb: null, i: 1 }, b: { limb: 2, i: 0 }, strength: 0.4, contraction: 0.3 },
    { id: 5, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.4, contraction: 0.2 },
    { id: 6, a: { limb: null, i: 4 }, b: { limb: 2, i: 1 }, strength: 0.4, contraction: 0.25 },
  ],
}

// Cavalo: quadrúpede grande, de pernas longas, pescoço alto e rabo.
// Os músculos que balançam as coxas saem de juntas bem à frente e bem atrás da âncora,
// para que cada um forme um triângulo de verdade com o osso que move.
const horse: Model = {
  skin: { hue: 45, pattern: 'plain' },
  joints: [
    { id: 1, x: 180, y: 150 }, // garupa
    { id: 2, x: 290, y: 146 }, // cernelha
    { id: 3, x: 296, y: 186 }, // peito (ombro)
    { id: 4, x: 186, y: 190 }, // quadril
    { id: 5, x: 335, y: 112 }, // nuca
    { id: 6, x: 362, y: 132 }, // focinho
    { id: 7, x: 150, y: 172 }, // rabo
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
    { a: 5, b: 6 },
    { a: 2, b: 6 },
    { a: 1, b: 7 },
    { a: 4, b: 7 },
  ],
  limbs: [
    // Dianteira: ombro -> cotovelo -> boleto -> casco.
    { id: 1, anchor: 3, points: [{ x: 292, y: 232 }, { x: 298, y: 272 }, { x: 308, y: 296 }] },
    // Traseira: quadril -> joelho (para a frente) -> jarrete (para trás) -> casco.
    { id: 2, anchor: 4, points: [{ x: 204, y: 230 }, { x: 186, y: 268 }, { x: 198, y: 296 }] },
  ],
  muscles: [
    // Dianteira
    { id: 1, a: { limb: null, i: 5 }, b: { limb: 1, i: 0 }, strength: 0.4, contraction: 0.25 },
    { id: 2, a: { limb: null, i: 4 }, b: { limb: 1, i: 0 }, strength: 0.4, contraction: 0.2 },
    { id: 3, a: { limb: null, i: 3 }, b: { limb: 1, i: 1 }, strength: 0.45, contraction: 0.3 },
    { id: 4, a: { limb: 1, i: 0 }, b: { limb: 1, i: 2 }, strength: 0.35, contraction: 0.25 },
    // Traseira
    { id: 5, a: { limb: null, i: 7 }, b: { limb: 2, i: 0 }, strength: 0.4, contraction: 0.25 },
    { id: 6, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.4, contraction: 0.2 },
    { id: 7, a: { limb: null, i: 4 }, b: { limb: 2, i: 1 }, strength: 0.45, contraction: 0.3 },
    { id: 8, a: { limb: 2, i: 0 }, b: { limb: 2, i: 2 }, strength: 0.35, contraction: 0.25 },
  ],
}

// Canguru: corpo em pé, pernas traseiras grandes em Z e cauda apoiada no chão (tripé).
// Os braços são curtos e quase não tocam o chão.
const kangaroo: Model = {
  skin: { hue: 10, pattern: 'plain' },
  feet: [{ limb: null, i: 1 }, { limb: 1, i: 1 }, { limb: 1, i: 2 }, { limb: 2, i: 1 }], // cauda, pé comprido e mão
  joints: [
    { id: 1, x: 122, y: 292 }, // ponta da cauda (no chão)
    { id: 2, x: 195, y: 205 }, // lombar
    { id: 3, x: 240, y: 148 }, // ombro
    { id: 4, x: 268, y: 180 }, // peito
    { id: 5, x: 225, y: 222 }, // barriga (encaixe das pernas)
    { id: 6, x: 270, y: 120 }, // cabeça
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 1, b: 5 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 5 },
    { a: 5, b: 2 },
    { a: 2, b: 4 },
    { a: 3, b: 5 },
    { a: 3, b: 6 },
    { a: 4, b: 6 },
  ],
  limbs: [
    // Perna: joelho para a frente, tornozelo para trás, pé comprido para a frente.
    { id: 1, anchor: 5, points: [{ x: 258, y: 250 }, { x: 212, y: 280 }, { x: 262, y: 296 }] },
    // Braço curto: cotovelo e mão.
    { id: 2, anchor: 4, points: [{ x: 284, y: 204 }, { x: 296, y: 226 }] },
  ],
  muscles: [
    { id: 1, a: { limb: null, i: 4 }, b: { limb: 1, i: 0 }, strength: 0.45, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 1 }, b: { limb: 1, i: 0 }, strength: 0.45, contraction: 0.25 },
    { id: 3, a: { limb: null, i: 2 }, b: { limb: 1, i: 1 }, strength: 0.6, contraction: 0.3 },
    { id: 4, a: { limb: 1, i: 0 }, b: { limb: 1, i: 2 }, strength: 0.5, contraction: 0.3 },
    { id: 5, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.3, contraction: 0.3 },
    { id: 6, a: { limb: null, i: 5 }, b: { limb: 2, i: 1 }, strength: 0.3, contraction: 0.3 },
  ],
}

// Centopeia: torso comprido e baixo, em gomos com diagonais, e três pernas curtas (seis patas).
// Cada perna tem um músculo que a puxa para a frente e outro para trás, presos no topo dos gomos vizinhos.
const centipede: Model = (() => {
  const xs = [140, 190, 240, 290, 340]
  const top = 248
  const bottom = 270
  const joints = [
    ...xs.map((x, i) => ({ id: i + 1, x, y: top })),
    ...xs.map((x, i) => ({ id: i + 6, x, y: bottom })),
    { id: 11, x: 364, y: 256 }, // cabeça
  ]
  const bones = [
    ...xs.slice(1).map((_, i) => ({ a: i + 1, b: i + 2 })),
    ...xs.slice(1).map((_, i) => ({ a: i + 6, b: i + 7 })),
    ...xs.map((_, i) => ({ a: i + 1, b: i + 6 })),
    ...xs.slice(1).map((_, i) => ({ a: i + 1, b: i + 7 })),
    { a: 5, b: 11 },
    { a: 10, b: 11 },
  ]
  // Pernas presas embaixo do 1º, 3º e 5º gomo: joelho para a frente, pé embaixo.
  const legAt = [0, 2, 4]
  const limbs = legAt.map((k, n) => ({
    id: n + 1,
    anchor: k + 6,
    points: [
      { x: xs[k] + 16, y: 286 },
      { x: xs[k] + 6, y: 298 },
    ],
  }))
  const muscles = legAt.flatMap((k, n) => {
    const ahead = Math.min(k + 1, xs.length - 1) + 1
    const behind = Math.max(k - 1, 0) + 1
    return [
      { id: 3 * n + 1, a: { limb: null, i: ahead }, b: { limb: n + 1, i: 0 }, strength: 0.4, contraction: 0.25 },
      { id: 3 * n + 2, a: { limb: null, i: behind }, b: { limb: n + 1, i: 0 }, strength: 0.4, contraction: 0.25 },
      { id: 3 * n + 3, a: { limb: null, i: k + 1 }, b: { limb: n + 1, i: 1 }, strength: 0.35, contraction: 0.25 },
    ]
  })
  return {
    skin: { hue: 320, pattern: 'stripes' },
    joints,
    bones,
    limbs,
    muscles,
  }
})()

// Caranguejo: carapaça larga e baixa, pernas que sobem até o joelho e uma pinça erguida na frente.
const crab: Model = {
  skin: { hue: 175, pattern: 'scales' },
  feet: [{ limb: 1, i: 1 }, { limb: 2, i: 1 }], // só as pernas (a pinça não é pé)
  joints: [
    { id: 1, x: 200, y: 218 },
    { id: 2, x: 290, y: 218 },
    { id: 3, x: 302, y: 244 },
    { id: 4, x: 188, y: 244 },
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 2, b: 3 },
    { a: 3, b: 4 },
    { a: 4, b: 1 },
    { a: 1, b: 3 },
    { a: 2, b: 4 },
  ],
  limbs: [
    { id: 1, anchor: 3, points: [{ x: 336, y: 226 }, { x: 352, y: 296 }] },
    { id: 2, anchor: 4, points: [{ x: 154, y: 226 }, { x: 138, y: 296 }] },
    // Pinça: braço erguido para a frente.
    { id: 3, anchor: 2, points: [{ x: 318, y: 192 }, { x: 344, y: 200 }] },
  ],
  muscles: [
    { id: 1, a: { limb: null, i: 2 }, b: { limb: 1, i: 0 }, strength: 0.45, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 4 }, b: { limb: 1, i: 0 }, strength: 0.45, contraction: 0.2 },
    { id: 3, a: { limb: null, i: 3 }, b: { limb: 1, i: 1 }, strength: 0.45, contraction: 0.25 },
    { id: 4, a: { limb: null, i: 1 }, b: { limb: 2, i: 0 }, strength: 0.45, contraction: 0.3 },
    { id: 5, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.45, contraction: 0.2 },
    { id: 6, a: { limb: null, i: 4 }, b: { limb: 2, i: 1 }, strength: 0.45, contraction: 0.25 },
    { id: 7, a: { limb: null, i: 1 }, b: { limb: 3, i: 0 }, strength: 0.3, contraction: 0.25 },
    { id: 8, a: { limb: null, i: 3 }, b: { limb: 3, i: 1 }, strength: 0.3, contraction: 0.25 },
  ],
}

// Humano: torso alto e estreito em triângulos, pelve embaixo e cabeça um pouco à frente do pescoço.
// Uma perna (coxa, canela e pé para a frente) e um braço; espelhados viram duas pernas e dois braços.
// Postura levemente agachada, com o centro de massa sobre o pé.
const human: Model = {
  skin: { hue: 340, pattern: 'plain' },
  feet: [{ limb: 1, i: 1 }, { limb: 1, i: 2 }], // calcanhar e ponta do pé
  joints: [
    { id: 1, x: 205, y: 200 }, // quadril (atrás)
    { id: 2, x: 225, y: 200 }, // quadril (frente)
    { id: 3, x: 208, y: 140 }, // ombro (atrás)
    { id: 4, x: 228, y: 140 }, // ombro (frente)
    { id: 5, x: 244, y: 118 }, // cabeça
    { id: 6, x: 215, y: 214 }, // pelve (encaixe das pernas)
  ],
  bones: [
    { a: 1, b: 2 },
    { a: 2, b: 4 },
    { a: 4, b: 3 },
    { a: 3, b: 1 },
    { a: 1, b: 4 },
    { a: 2, b: 3 },
    { a: 3, b: 5 },
    { a: 4, b: 5 },
    { a: 1, b: 6 },
    { a: 2, b: 6 },
  ],
  limbs: [
    // Perna: joelho para a frente, tornozelo, ponta do pé para a frente.
    { id: 1, anchor: 6, points: [{ x: 232, y: 248 }, { x: 212, y: 298 }, { x: 242, y: 298 }] },
    // Braço: cotovelo e mão.
    { id: 2, anchor: 4, points: [{ x: 222, y: 180 }, { x: 232, y: 212 }] },
  ],
  muscles: [
    // Coxa: flexor (puxa para a frente) e extensor (puxa para trás), de lados opostos da pelve.
    { id: 1, a: { limb: null, i: 2 }, b: { limb: 1, i: 0 }, strength: 0.6, contraction: 0.3 },
    { id: 2, a: { limb: null, i: 1 }, b: { limb: 1, i: 0 }, strength: 0.6, contraction: 0.3 },
    // Joelho e tornozelo.
    { id: 3, a: { limb: null, i: 6 }, b: { limb: 1, i: 1 }, strength: 0.7, contraction: 0.3 },
    { id: 4, a: { limb: 1, i: 0 }, b: { limb: 1, i: 2 }, strength: 0.7, contraction: 0.3 },
    // Braço: balanço do ombro e cotovelo.
    { id: 5, a: { limb: null, i: 3 }, b: { limb: 2, i: 0 }, strength: 0.3, contraction: 0.3 },
    { id: 6, a: { limb: null, i: 2 }, b: { limb: 2, i: 1 }, strength: 0.3, contraction: 0.3 },
  ],
}

export const EXAMPLES: Example[] = [
  { id: 'dog', name: 'Cachorro', description: 'Quadrúpede com cabeça e pernas de 3 segmentos.', model: defaultModel },
  { id: 'table', name: 'Mesinha', description: 'Caixa com duas pernas retas. Aprende rápido.', model: table },
  { id: 'dino', name: 'Dino', description: 'Bípede equilibrado pela cauda.', model: dino },
  { id: 'frog', name: 'Sapo', description: 'Patas traseiras em Z, feitas para saltar.', model: frog },
  { id: 'caterpillar', name: 'Lagarta', description: 'Corpo em gomos que ondula com músculos no torso.', model: caterpillar },
  { id: 'spider', name: 'Aranha', description: 'Pernas longas que sobem até o joelho.', model: spider },
  { id: 'horse', name: 'Cavalo', description: 'Quadrúpede grande, de pernas longas e pescoço alto.', model: horse },
  { id: 'kangaroo', name: 'Canguru', description: 'Pernas traseiras em Z e cauda de apoio, como um tripé.', model: kangaroo },
  { id: 'centipede', name: 'Centopeia', description: 'Corpo comprido e baixo com seis patinhas curtas.', model: centipede },
  { id: 'crab', name: 'Caranguejo', description: 'Carapaça larga, pernas altas e uma pinça erguida.', model: crab },
  { id: 'human', name: 'Humano', description: 'Bípede em pé com braços para se equilibrar. O mais difícil.', model: human },
]
