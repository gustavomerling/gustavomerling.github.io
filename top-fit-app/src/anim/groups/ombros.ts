import { add, mid, mul, sub, type AnimDef, type Joints, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

// ---------- Helpers locais ----------

const pulley = (a: V3, group: string): Prim => ({ kind: 'circle', a, w: 0.05, color: 'equip', group, bias: K.STRUCTURE });

const grip = (h: V3, group: string, axis: V3 = [0, 1, 0]): Prim => ({
  kind: 'seg',
  a: add(h, mul(axis, -0.055)),
  b: add(h, mul(axis, 0.055)),
  w: 0.04,
  color: 'equip',
  group,
  bias: 0.02,
});

/** Banco com encosto reto (90°). */
function uprightBench(j: Joints): Prim[] {
  const back = sub(j.pelvis, mul(j.fwd, 0.15));
  return [
    K.box([0, 0.45, j.pelvis[2] - 0.2], [0, 0.45, j.pelvis[2] + 0.25], 0.36, 0.08, 'bench-seat'),
    K.box([0, 0, j.pelvis[2]], [0, 0.41, j.pelvis[2]], 0.14, 0.08, 'bench-post', 0.6),
    K.box(add(back, mul(j.up, -0.05)), add(back, mul(j.up, 0.72)), 0.32, 0.08, 'bench-back'),
    K.box([0, 0, back[2] - 0.06], [0, 0.45, back[2] - 0.06], 0.14, 0.06, 'bench-back-post', 0.6),
  ];
}

// ---------- Poses ----------

const STAND: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.995, 0],
  pitch: 0,
  feet: [
    [0.15, 0.07, 0],
    [-0.15, 0.07, 0],
  ],
};

const SEAT_UP: Omit<Pose, 'hands'> = { ...K.SEATED, pitch: -0.05 };

// Inclinado à frente para o crucifixo invertido
const BENT_OVER: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.88, -0.2],
  pitch: 1.2,
  feet: [
    [0.15, 0.07, 0.04],
    [-0.15, 0.07, 0.04],
  ],
};

// Flexão pike: "V" invertido
const PIKE_FEET: [V3, V3] = [
  [0.12, 0.07, -0.75],
  [-0.12, 0.07, -0.75],
];
const PIKE_HANDS: [V3, V3] = [
  [0.3, 0.05, 0.38],
  [-0.3, 0.05, 0.38],
];

// Elevação lateral (referencial do tronco)
const LAT_DOWN = K.sym(0.25, -0.05, 0.08);
const LAT_MID = K.sym(0.55, 0.22, 0.07);
const LAT_UP = K.sym(0.76, 0.47, 0.07);

const lateralRaise = (extra: Partial<AnimDef> = {}): AnimDef => ({
  handsFrame: 'trunk',
  elbowPole: [0.2, 1, -0.5],
  frame: { front: [-1.1, 1.1] },
  keys: K.arc({ ...STAND, hands: LAT_DOWN }, { ...STAND, hands: LAT_MID }, { ...STAND, hands: LAT_UP }, 0.65),
  ...extra,
});

export const OMBROS: Record<string, AnimDef> = {
  'desenvolvimento-halteres': {
    handsFrame: 'trunk',
    elbowPole: [1, -0.6, 0],
    kneePole: [0.25, 1, 1],
    keys: K.cycle({ ...SEAT_UP, hands: K.sym(0.37, 0.66, 0.05) }, { ...SEAT_UP, hands: K.sym(0.17, 1.1, 0.05) }, 1.0),
    equipment: (j) => [...uprightBench(j), ...K.twoDumbbells(j, [1, 0, 0])],
  },

  'desenvolvimento-maquina': {
    handsFrame: 'trunk',
    elbowPole: [1, -0.6, -0.1],
    kneePole: [0.25, 1, 1],
    frame: { top: 2.15 },
    keys: K.cycle({ ...SEAT_UP, hands: K.sym(0.34, 0.62, 0.12) }, { ...SEAT_UP, hands: K.sym(0.24, 1.08, 0.12) }, 1.0),
    equipment: (j) => {
      const prims = K.machineSeat(j);
      j.hand.forEach((h, i) => {
        const s = i === 0 ? 1 : -1;
        prims.push(grip(h, `grip${i}`, [0, 0, 1]), K.thin(add(h, [0, 0, -0.055]), [s * 0.36, 1.25, j.pelvis[2] - 0.38], `lever${i}`, 0.5, 0.035));
      });
      return prims;
    },
  },

  'desenvolvimento-barra': {
    handsFrame: 'trunk',
    elbowPole: [0.4, -1, 0.7],
    frame: { top: 2.35 },
    keys: K.cycle({ ...STAND, hands: K.sym(0.25, 0.5, 0.15) }, { ...STAND, hands: K.sym(0.25, 1.08, 0.0) }, 1.0),
    equipment: (j) => K.barbell(mid(j.hand[0], j.hand[1])),
  },

  'elevacao-lateral': {
    ...lateralRaise(),
    equipment: (j) => K.twoDumbbells(j, [0, 0, 1]),
  },

  'elevacao-lateral-polia': {
    handsFrame: 'trunk',
    elbowPole: [0.2, 1, -0.5],
    frame: { front: [-1.1, 1.1] },
    // Braço direito trabalha; o esquerdo fica na cintura
    keys: K.arc(
      {
        ...STAND,
        hands: [
          [0.28, 0.1, 0.03],
          [0.06, 0.05, 0.15],
        ],
      },
      {
        ...STAND,
        hands: [
          [0.28, 0.1, 0.03],
          [-0.5, 0.18, 0.1],
        ],
      },
      {
        ...STAND,
        hands: [
          [0.28, 0.1, 0.03],
          [-0.76, 0.47, 0.07],
        ],
      },
      0.65,
    ),
    equipment: (j) => {
      const p: V3 = [0.72, 0.15, 0.08];
      return [
        K.box([0.85, 0, 0.08], [0.85, 2.0, 0.08], 0.14, 0.08, 'tower', 0.35, [0, 0, 1]),
        pulley(p, 'pulley'),
        K.thin(p, j.hand[1], 'cable', 0.7),
        grip(j.hand[1], 'grip1', [0, 0, 1]),
      ];
    },
  },

  'elevacao-frontal': {
    handsFrame: 'trunk',
    elbowPole: [0.5, -1, -0.4],
    keys: K.arc(
      { ...STAND, hands: K.sym(0.15, 0.0, 0.12) },
      { ...STAND, hands: K.sym(0.16, 0.3, 0.45) },
      { ...STAND, hands: K.sym(0.17, 0.72, 0.54) },
      0.65,
    ),
    equipment: (j) => K.twoDumbbells(j, [1, 0, 0]),
  },

  'crucifixo-invertido': {
    handsFrame: 'world',
    elbowPole: [0, 1, -0.4],
    kneePole: [0.25, 0, 1],
    frame: { front: [-1.1, 1.1] },
    keys: K.arc(
      { ...BENT_OVER, hands: K.sym(0.15, 0.5, 0.3) },
      { ...BENT_OVER, hands: K.sym(0.5, 0.66, 0.3) },
      { ...BENT_OVER, hands: K.sym(0.74, 0.98, 0.3) },
      0.65,
    ),
    equipment: (j) => K.twoDumbbells(j, [0, 0, 1]),
  },

  'face-pull': {
    handsFrame: 'world',
    elbowPole: [1, 0.2, -0.6],
    frame: { side: [-0.9, 1.4], top: 2.2 },
    keys: K.cycle(
      { ...STAND, pelvis: [0, 0.995, -0.1], pitch: -0.05, hands: K.sym(0.08, 1.62, 0.42) },
      { ...STAND, pelvis: [0, 0.995, -0.1], pitch: -0.05, hands: K.sym(0.3, 1.72, 0.02) },
      1.0,
    ),
    equipment: (j) => {
      const p: V3 = [0, 1.8, 1.15];
      const knot = add(mid(j.hand[0], j.hand[1]), [0, 0.02, 0.22]);
      return [
        K.box([0, 0, 1.28], [0, 2.1, 1.28], 0.16, 0.1, 'tower', 0.35),
        pulley(p, 'pulley'),
        K.thin(p, knot, 'cable', 0.7),
        K.thin(knot, j.hand[0], 'rope0', 0.9, 0.028),
        K.thin(knot, j.hand[1], 'rope1', 0.9, 0.028),
      ];
    },
  },

  'elevacao-lateral-elastico': {
    ...lateralRaise(),
    equipment: (j) => [
      K.thin([0.12, 0.08, 0.06], j.hand[0], 'band0', 0.75, 0.022),
      K.thin([-0.12, 0.08, 0.06], j.hand[1], 'band1', 0.75, 0.022),
      grip(j.hand[0], 'grip0', [0, 0, 1]),
      grip(j.hand[1], 'grip1', [0, 0, 1]),
    ],
  },

  'pike-pushup': {
    handsFrame: 'world',
    elbowPole: [0.6, 0.4, -1],
    kneePole: [0.1, -0.3, 1],
    toeDir: [0.05, -0.75, 0.66],
    frame: { side: [-1.1, 0.9], top: 1.4 },
    keys: K.cycle(
      { pelvis: [0, 0.85, -0.25], pitch: 2.3, hands: PIKE_HANDS, feet: PIKE_FEET },
      { pelvis: [0, 0.74, -0.17], pitch: 2.45, hands: PIKE_HANDS, feet: PIKE_FEET },
      1.0,
    ),
  },
};
