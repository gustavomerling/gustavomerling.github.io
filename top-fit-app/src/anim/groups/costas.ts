import { add, mid, mul, norm, sub, type AnimDef, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

// ---------- Helpers locais ----------

/** Barra reta de pegada (puxador), passando pelas mãos e um pouco além. */
function handleBar(a: V3, b: V3, group: string, extra = 0.12): Prim {
  const d = norm(sub(b, a));
  return { kind: 'seg', a: add(a, mul(d, -extra)), b: add(b, mul(d, extra)), w: 0.035, color: 'equip', group, bias: 0.02 };
}

/** Pegada vertical curta (manopla) na mão. */
const grip = (h: V3, group: string, axis: V3 = [0, 1, 0]): Prim => ({
  kind: 'seg',
  a: add(h, mul(axis, -0.055)),
  b: add(h, mul(axis, 0.055)),
  w: 0.04,
  color: 'equip',
  group,
  bias: 0.02,
});

const pulley = (a: V3, group: string): Prim => ({ kind: 'circle', a, w: 0.05, color: 'equip', group, bias: K.STRUCTURE });

// ---------- Poses ----------

// Puxada: sentado, tronco um pouco para trás
const PULLDOWN_SEAT: Omit<Pose, 'hands'> = { ...K.SEATED, pitch: -0.2 };

// Remada baixa: sentado no banco, pés na plataforma
const LOW_ROW: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.5, -0.3],
  pitch: 0,
  feet: [
    [0.15, 0.3, 0.42],
    [-0.15, 0.3, 0.42],
  ],
};

// Inclinado à frente (~45°), joelhos levemente flexionados
const BENT: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.9, -0.14],
  pitch: 0.9,
  feet: [
    [0.15, 0.07, 0.04],
    [-0.15, 0.07, 0.04],
  ],
};

// Serrote: joelho e mão esquerdos no banco, tronco quase horizontal
const SAW: Omit<Pose, 'hands'> = {
  pelvis: [0.03, 0.95, -0.35],
  pitch: 1.45,
  feet: [
    [0.15, 0.5, -0.8],
    [-0.25, 0.07, -0.25],
  ],
};
const SAW_BENCH_X = 0.15;

// Cavalinho: barra presa no chão atrás; mãos percorrem um arco em torno do pivô
const TBAR_PIVOT: V3 = [0, 0.05, -0.95];
const TBAR: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.88, -0.14],
  pitch: 0.85,
  feet: [
    [0.22, 0.07, 0.04],
    [-0.22, 0.07, 0.04],
  ],
};

// Remada invertida: corpo reto apoiado nos calcanhares, peito para cima
const INV_ANKLE: V3 = [0, 0.08, -0.95];
function invRow(theta: number, hands: [V3, V3]): Pose {
  const up: V3 = [0, Math.sin(theta), Math.cos(theta)];
  return {
    pelvis: add(INV_ANKLE, mul(up, 0.93)),
    pitch: Math.PI / 2 - theta,
    hands,
    feet: [
      [0.12, INV_ANKLE[1], INV_ANKLE[2]],
      [-0.12, INV_ANKLE[1], INV_ANKLE[2]],
    ],
  };
}
const INV_BAR: [V3, V3] = [
  [0.33, 0.95, 0.42],
  [-0.33, 0.95, 0.42],
];

// Barra fixa
const PULLUP_BAR_Y = 2.1;
const PULLUP_HANDS: [V3, V3] = [
  [0.4, PULLUP_BAR_Y, 0.03],
  [-0.4, PULLUP_BAR_Y, 0.03],
];

export const COSTAS: Record<string, AnimDef> = {
  'puxada-frontal': {
    handsFrame: 'world',
    elbowPole: [1, -0.6, -0.4],
    kneePole: [0.25, 1, 1],
    frame: { top: 2.3 },
    keys: K.cycle(
      { ...PULLDOWN_SEAT, hands: K.sym(0.5, 1.58, -0.04) },
      { ...PULLDOWN_SEAT, hands: K.sym(0.36, 1.05, 0.13) },
      1.0,
    ),
    equipment: (j) => {
      const top: V3 = [0, 2.18, -0.05];
      const z = j.pelvis[2];
      return [
        K.box([0, 0.45, z - 0.2], [0, 0.45, z + 0.25], 0.42, 0.08, 'seat'),
        K.box([0, 0, z], [0, 0.41, z], 0.14, 0.1, 'seat-post', 0.6),
        // Apoio das coxas
        K.box([0.22, 0.71, z + 0.3], [-0.22, 0.71, z + 0.3], 0.1, 0.1, 'thigh-pad', undefined, [0, 0, 1]),
        K.box([0, 0.45, z + 0.3], [0, 0.68, z + 0.3], 0.05, 0.05, 'thigh-pad-post', 0.6),
        K.box([0, 0, 0.6], [0, 2.25, 0.6], 0.16, 0.1, 'column', 0.35),
        K.box([0, 2.22, 0.6], [0, 2.22, -0.1], 0.12, 0.08, 'beam', 0.35),
        pulley(top, 'pulley'),
        K.thin(top, mid(j.hand[0], j.hand[1]), 'cable', 0.7),
        handleBar(j.hand[0], j.hand[1], 'lat-bar', 0.15),
      ];
    },
  },

  'remada-baixa': {
    handsFrame: 'world',
    elbowPole: [0.3, -0.4, -1],
    kneePole: [0.2, 1, 0.4],
    toeDir: [0.2, 0.5, 1],
    frame: { side: [-1.1, 1.0] },
    keys: K.cycle(
      { ...LOW_ROW, pitch: 0.18, hands: K.sym(0.05, 0.82, 0.3) },
      { ...LOW_ROW, pitch: -0.05, hands: K.sym(0.06, 0.74, -0.08) },
      1.0,
    ),
    equipment: (j) => {
      const p: V3 = [0, 0.42, 0.62];
      const h = mid(j.hand[0], j.hand[1]);
      return [
        K.box([0, 0.36, -0.75], [0, 0.36, 0.25], 0.3, 0.08, 'bench'),
        K.box([0, 0, -0.3], [0, 0.32, -0.3], 0.24, 0.06, 'bench-leg', 0.6),
        // Plataforma dos pés
        K.box([0, 0.12, 0.5], [0, 0.48, 0.55], 0.5, 0.06, 'footplate'),
        K.box([0, 0, 0.7], [0, 0.7, 0.7], 0.14, 0.1, 'tower', 0.35),
        pulley(p, 'pulley'),
        K.thin(p, h, 'cable', 0.7),
        // Triângulo
        { kind: 'seg', a: j.hand[0], b: j.hand[1], w: 0.035, color: 'equip', group: 'triangle', bias: 0.02 },
        { kind: 'seg', a: j.hand[0], b: add(h, [0, 0, 0.1]), w: 0.025, color: 'equip', group: 'triangle', bias: 0.02 },
        { kind: 'seg', a: j.hand[1], b: add(h, [0, 0, 0.1]), w: 0.025, color: 'equip', group: 'triangle', bias: 0.02 },
      ];
    },
  },

  'remada-curvada': {
    handsFrame: 'world',
    elbowPole: [0.35, 1, -0.6],
    kneePole: [0.25, 0, 1],
    keys: K.cycle({ ...BENT, hands: K.sym(0.25, 0.66, 0.32) }, { ...BENT, hands: K.sym(0.25, 0.88, 0.07) }, 1.0),
    equipment: (j) => K.barbell(mid(j.hand[0], j.hand[1])),
  },

  serrote: {
    handsFrame: 'world',
    elbowPole: [0.2, 1, -0.4],
    kneePole: [0.1, -0.4, 1],
    toeDir: [0.1, -0.3, 1],
    frame: { side: [-1.15, 0.85], top: 1.7 },
    keys: K.cycle(
      {
        ...SAW,
        hands: [
          [SAW_BENCH_X + 0.04, 0.5, 0.2],
          [-0.22, 0.5, 0.2],
        ],
      },
      {
        ...SAW,
        hands: [
          [SAW_BENCH_X + 0.04, 0.5, 0.2],
          [-0.22, 0.86, -0.18],
        ],
      },
      1.0,
    ),
    equipment: (j) => [
      K.box([SAW_BENCH_X, 0.41, -0.95], [SAW_BENCH_X, 0.41, 0.35], 0.32, 0.08, 'bench'),
      K.box([SAW_BENCH_X, 0, -0.75], [SAW_BENCH_X, 0.37, -0.75], 0.26, 0.06, 'bench-leg1', 0.6),
      K.box([SAW_BENCH_X, 0, 0.2], [SAW_BENCH_X, 0.37, 0.2], 0.26, 0.06, 'bench-leg2', 0.6),
      ...K.dumbbell(j.hand[1], [0, 0, 1], { handle: 0.07, group: 'db1' }),
    ],
  },

  'remada-maquina': {
    handsFrame: 'world',
    elbowPole: [0.4, -0.3, -1],
    kneePole: [0.25, 1, 1],
    frame: { side: [-1, 1.1] },
    keys: K.cycle(
      { ...K.SEATED, pitch: 0.15, hands: K.sym(0.2, 1.05, 0.56) },
      { ...K.SEATED, pitch: 0.15, hands: K.sym(0.25, 1.0, 0.08) },
      1.0,
    ),
    equipment: (j) => {
      const z = j.pelvis[2];
      const prims: Prim[] = [
        K.box([0, 0.45, z - 0.2], [0, 0.45, z + 0.25], 0.42, 0.08, 'seat'),
        K.box([0, 0, z], [0, 0.41, z], 0.14, 0.1, 'seat-post', 0.6),
        // Apoio do peito
        K.box([0, 0.86, 0.27], [0, 1.28, 0.24], 0.32, 0.09, 'chest-pad'),
        K.box([0, 0, 0.36], [0, 1.0, 0.36], 0.12, 0.08, 'pad-post', 0.6),
        K.box([0, 0, 0.95], [0, 1.6, 0.95], 0.16, 0.1, 'column', 0.35),
      ];
      j.hand.forEach((h, i) => {
        const s = i === 0 ? 1 : -1;
        prims.push(grip(h, `grip${i}`), K.thin(add(h, [0, 0.055, 0]), [s * 0.3, 1.55, 0.85], `lever${i}`, 0.5, 0.035));
      });
      return prims;
    },
  },

  'barra-fixa': {
    handsFrame: 'world',
    elbowPole: [1, -0.8, -0.2],
    kneePole: [0.1, 0, 1],
    toeDir: [0.1, -0.7, 0.3],
    frame: { top: 2.55 },
    keys: K.cycle(
      {
        pelvis: [0, 1.0, -0.04],
        pitch: -0.05,
        hands: PULLUP_HANDS,
        feet: [
          [0.07, 0.25, -0.22],
          [-0.07, 0.25, -0.22],
        ],
      },
      {
        pelvis: [0, 1.47, -0.08],
        pitch: -0.12,
        hands: PULLUP_HANDS,
        feet: [
          [0.07, 0.7, -0.3],
          [-0.07, 0.7, -0.3],
        ],
      },
      1.1,
    ),
    equipment: () => [
      { kind: 'seg', a: [-0.75, PULLUP_BAR_Y, 0.03], b: [0.75, PULLUP_BAR_Y, 0.03], w: 0.04, color: 'equip', group: 'bar', bias: 0.05 },
      K.box([0.75, 0, 0.03], [0.75, PULLUP_BAR_Y + 0.05, 0.03], 0.07, 0.07, 'post0', 0.5),
      K.box([-0.75, 0, 0.03], [-0.75, PULLUP_BAR_Y + 0.05, 0.03], 0.07, 0.07, 'post1', 0.5),
    ],
  },

  'remada-invertida': {
    handsFrame: 'world',
    supine: true,
    elbowPole: [0.6, -1, -0.2],
    kneePole: [0, 1, 0],
    toeDir: [0.1, 1, 0.25],
    frame: { side: [-1.25, 1.0], top: 1.6 },
    keys: K.cycle(invRow(0.2, INV_BAR), invRow(0.45, INV_BAR), 1.0),
    equipment: () => [
      { kind: 'seg', a: [-0.7, 0.95, 0.42], b: [0.7, 0.95, 0.42], w: 0.035, color: 'equip', group: 'bar', bias: 0.05 },
      K.box([0.7, 0, 0.42], [0.7, 1.5, 0.42], 0.07, 0.07, 'post0', 0.5),
      K.box([-0.7, 0, 0.42], [-0.7, 1.5, 0.42], 0.07, 0.07, 'post1', 0.5),
    ],
  },

  'pulldown-bracos-estendidos': {
    handsFrame: 'world',
    elbowPole: [1, -0.3, -1],
    frame: { side: [-0.9, 1.3], top: 2.4 },
    keys: K.arc(
      { ...BENT, pelvis: [0, 0.97, -0.15], pitch: 0.3, hands: K.sym(0.2, 1.85, 0.42) },
      { ...BENT, pelvis: [0, 0.97, -0.15], pitch: 0.3, hands: K.sym(0.2, 1.42, 0.57) },
      { ...BENT, pelvis: [0, 0.97, -0.15], pitch: 0.3, hands: K.sym(0.2, 0.93, 0.19) },
      0.65,
    ),
    equipment: (j) => {
      const p: V3 = [0, 2.25, 0.95];
      return [
        K.box([0, 0, 1.08], [0, 2.35, 1.08], 0.16, 0.1, 'tower', 0.35),
        pulley(p, 'pulley'),
        K.thin(p, mid(j.hand[0], j.hand[1]), 'cable', 0.7),
        handleBar(j.hand[0], j.hand[1], 'bar', 0.12),
      ];
    },
  },

  'remada-cavalinho': {
    handsFrame: 'world',
    elbowPole: [0.5, 1, -0.6],
    kneePole: [0.35, 0, 1],
    frame: { side: [-1.15, 1.0] },
    keys: K.cycle({ ...TBAR, hands: K.sym(0.07, 0.6, 0.27) }, { ...TBAR, hands: K.sym(0.07, 0.9, 0.08) }, 1.0),
    equipment: (j) => {
      const h = mid(j.hand[0], j.hand[1]);
      const d = norm(sub(h, TBAR_PIVOT));
      const end = add(h, mul(d, 0.2));
      const plate = add(h, mul(d, 0.12));
      return [
        { kind: 'seg', a: TBAR_PIVOT, b: end, w: 0.035, color: 'equip', group: 'tbar', bias: -0.05 },
        { kind: 'seg', a: add(plate, mul(d, -0.03)), b: add(plate, mul(d, 0.03)), w: 0.32, color: 'equip', group: 'tbar-plate', bias: 0.02 },
        { kind: 'seg', a: j.hand[0], b: j.hand[1], w: 0.035, color: 'equip', group: 'tbar-grip', bias: 0.02 },
        { kind: 'circle', a: TBAR_PIVOT, w: 0.04, color: 'equip', group: 'tbar-pivot', bias: K.STRUCTURE },
      ];
    },
  },

  'remada-elastico': {
    handsFrame: 'trunk',
    elbowPole: [0.4, -0.3, -1],
    frame: { side: [-0.9, 1.3] },
    keys: K.cycle(
      { ...K.STAGGER, pitch: 0.05, hands: K.sym(0.14, 0.45, 0.56) },
      { ...K.STAGGER, pitch: 0.05, hands: K.sym(0.23, 0.4, 0.06) },
      1.0,
    ),
    equipment: (j) => {
      const anchor: V3 = [0, 1.38, 1.05];
      return [
        K.box([0, 0, 1.1], [0, 1.7, 1.1], 0.12, 0.08, 'anchor-post', 0.3),
        K.thin(anchor, j.hand[0], 'band0', 0.75, 0.022),
        K.thin(anchor, j.hand[1], 'band1', 0.75, 0.022),
        grip(j.hand[0], 'grip0'),
        grip(j.hand[1], 'grip1'),
      ];
    },
  },
};
