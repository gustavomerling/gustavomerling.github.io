import { add, mid, mul, norm, sub, type AnimDef, type Joints, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

// ---------- Helpers locais ----------

/** Ponto no tronco: a ao longo do eixo (a partir da pelve), f para onde o peito aponta. */
const onTrunk = (j: Joints, a: number, f: number): V3 => add(add(j.pelvis, mul(j.up, a)), mul(j.fwd, f));

/** Barra apoiada no trapézio, atrás do pescoço. */
const backBar = (j: Joints) => onTrunk(j, 0.53, -0.12);

/** Halteres pendurados ao lado do corpo (pegada neutra). */
const HANG = K.sym(0.25, -0.03, 0.02);

// Agachamento com barra nas costas
const BACK_HANDS = K.sym(0.5, 0.5, -0.1);
const backSquatUp: Pose = { pelvis: [0, 0.995, 0], pitch: 0.08, hands: BACK_HANDS, feet: K.FEET_SQUAT };
const backSquatDown: Pose = { pelvis: [0, 0.5, -0.25], pitch: 0.62, hands: BACK_HANDS, feet: K.FEET_SQUAT };

// Smith: barra num trilho vertical (z fixo), pés um pouco à frente
const SMITH_FEET: [V3, V3] = [
  [0.17, 0.07, 0.12],
  [-0.17, 0.07, 0.12],
];
const smithUp: Pose = { pelvis: [0, 0.99, -0.02], pitch: 0.05, hands: BACK_HANDS, feet: SMITH_FEET };
const smithDown: Pose = { pelvis: [0, 0.5, -0.22], pitch: 0.4, hands: BACK_HANDS, feet: SMITH_FEET };

const SMITH_Z = -0.12; // trilho do Smith

// Leg press 45°: corpo parado, recostado; a plataforma corre na direção LP_DIR
const LP_DIR = norm([0, 1, 1]);
const LP_UP: V3 = norm([0, 1, -1]); // "para cima" no plano da plataforma
const LP_BODY = { pelvis: [0, 0.45, -0.2] as V3, pitch: -0.9 };
const LP_HANDS: [V3, V3] = [
  [0.3, 0.5, -0.12],
  [-0.3, 0.5, -0.12],
];
const lpFeet = (y: number, z: number): [V3, V3] => [
  [0.17, y, z],
  [-0.17, y, z],
];
const lpOut: Pose = { ...LP_BODY, hands: LP_HANDS, feet: lpFeet(0.95, 0.48) };
const lpIn: Pose = { ...LP_BODY, hands: LP_HANDS, feet: lpFeet(0.95 - 0.42 * LP_DIR[1], 0.48 - 0.42 * LP_DIR[2]) };

/** Estrutura do leg press: encosto, assento, base e trilho do carrinho (fixos). */
export function legPressFrame(j: Joints): Prim[] {
  const back = sub(j.pelvis, mul(j.fwd, 0.15));
  return [
    K.box(add(back, mul(j.up, -0.12)), add(back, mul(j.up, 0.85)), 0.42, 0.08, 'lp-back'),
    K.box([0, 0.32, -0.42], [0, 0.4, 0.02], 0.42, 0.08, 'lp-seat'),
    K.box([0, 0, -0.25], [0, 0.3, -0.25], 0.14, 0.1, 'lp-post', 0.6),
    K.box([0, 0.03, -1.0], [0, 0.03, 1.05], 0.3, 0.06, 'lp-base', 0.5),
    K.box([0, 0.3, 0.16], [0, 1.35, 1.21], 0.12, 0.06, 'lp-rail', 0.45),
  ];
}

/** Plataforma do leg press, com a sola dos pés em `sole` (ponto no plano da plataforma). */
export function legPressPlate(sole: V3, below = 0.18, above = 0.42): Prim {
  const c = add(sole, mul(LP_DIR, 0.04));
  return K.box(add(c, mul(LP_UP, -below)), add(c, mul(LP_UP, above)), 0.75, 0.05, 'lp-plate');
}

// Hack: encosto inclinado, o corpo desliza ao longo dele
const HACK_PITCH = -0.35;
const HACK_S: V3 = [0, Math.cos(HACK_PITCH), Math.sin(HACK_PITCH)]; // direção do trilho (= eixo do tronco)
const HACK_FEET: [V3, V3] = [
  [0.17, 0.12, 0.32],
  [-0.17, 0.12, 0.32],
];
const HACK_HANDS = K.sym(0.28, 0.6, 0.1);
const hackDown: Pose = { pelvis: [0, 0.5, -0.12], pitch: HACK_PITCH, hands: HACK_HANDS, feet: HACK_FEET };
const hackUp: Pose = { ...hackDown, pelvis: add(hackDown.pelvis, mul(HACK_S, 0.36)) };

// Afundo: perna direita (1) dá o passo; a esquerda fica no lugar
const AF_Z = -0.3;
const afHands = HANG;
const afStand: Pose = {
  pelvis: [0, 0.995, AF_Z],
  pitch: 0.03,
  hands: afHands,
  feet: [
    [0.15, 0.07, AF_Z],
    [-0.15, 0.07, AF_Z],
  ],
};
const afStep: Pose = {
  pelvis: [0, 0.95, AF_Z + 0.16],
  pitch: 0.05,
  hands: afHands,
  feet: [
    [0.15, 0.08, AF_Z],
    [-0.15, 0.24, AF_Z + 0.42],
  ],
};
const afPlant: Pose = {
  pelvis: [0, 0.9, AF_Z + 0.3],
  pitch: 0.05,
  hands: afHands,
  feet: [
    [0.15, 0.12, AF_Z],
    [-0.15, 0.07, AF_Z + 0.72],
  ],
};
const afDown: Pose = {
  pelvis: [0, 0.58, AF_Z + 0.32],
  pitch: 0.06,
  hands: afHands,
  feet: [
    [0.15, 0.13, AF_Z],
    [-0.15, 0.07, AF_Z + 0.72],
  ],
};

// Búlgaro: pé de trás (esquerdo) em cima do banco
const BG_BENCH_TOP = 0.46;
const BG_FEET: [V3, V3] = [
  [0.15, BG_BENCH_TOP + 0.07, -0.62],
  [-0.15, 0.07, 0.25],
];
// Pé de trás apoiado pelo peito do pé no banco (ponta para trás); pé da frente normal
const BG_TOES: [V3, V3] = [
  [0.05, -0.3, -1],
  [-0.3, -0.12, 1],
];
const bgUp: Pose = { pelvis: [0, 0.92, -0.08], pitch: 0.12, hands: HANG, feet: BG_FEET, toes: BG_TOES };
const bgDown: Pose = { pelvis: [0, 0.53, -0.15], pitch: 0.3, hands: HANG, feet: BG_FEET, toes: BG_TOES };

// Agachamento livre (peso do corpo): braços estendidos à frente, na altura dos ombros
const bwUp: Pose = { ...K.gobletUp, hands: K.sym(0.17, 1.45, 0.58) };
const bwDown: Pose = { ...K.gobletDown, hands: K.sym(0.17, 0.95, 0.6) };

// Elástico: pontas seguras na altura dos ombros
const BAND_HANDS = K.sym(0.24, 0.5, 0.12);

export const QUADRICEPS: Record<string, AnimDef> = {
  'agachamento-goblet': {
    handsFrame: 'trunk',
    elbowPole: [-0.35, -1, 0.7], // cotovelos para baixo, à frente e para dentro
    kneePole: [0.35, 0, 1], // joelhos na direção dos pés
    keys: [
      { t: 0, pose: K.gobletUp },
      { t: 0.5, pose: K.gobletUp },
      { t: 1.8, pose: K.gobletDown },
      { t: 2.2, pose: K.gobletDown },
      { t: 3.3, pose: K.gobletUp },
    ],
    equipment: (j) => {
      // Halter em pé, colado ao peito, seguindo a inclinação do tronco
      const c = add(mid(j.hand[0], j.hand[1]), mul(j.up, -0.02));
      return K.dumbbell(c, j.up, { handle: 0.1, plate: 0.15 });
    },
  },

  'agachamento-livre': {
    handsFrame: 'trunk',
    elbowPole: [0.3, -1, -0.5],
    kneePole: [0.35, 0, 1],
    frame: { front: [-1.1, 1.1] },
    keys: K.cycle(backSquatUp, backSquatDown, 1.3, 0.3, 0.5),
    equipment: (j) => K.barbell(backBar(j)),
  },

  'leg-press': {
    handsFrame: 'world',
    elbowPole: [1, -0.6, -0.4],
    kneePole: [0.3, 1, -0.3],
    toeDir: [0.15, LP_UP[1], LP_UP[2]],
    frame: { side: [-1.15, 1.25], top: 1.75 },
    keys: K.cycle(lpOut, lpIn, 1.2, 0.3, 0.5),
    equipment: (j) => [...legPressFrame(j), legPressPlate(mid(j.ankle[0], j.ankle[1]))],
  },

  'cadeira-extensora': (() => {
    const pelvis: V3 = [0, 0.62, -0.12];
    const hands: [V3, V3] = [
      [0.3, 0.6, -0.05],
      [-0.3, 0.6, -0.05],
    ];
    const down: Pose = { pelvis, pitch: -0.15, hands, feet: [[0.15, 0.18, 0.34], [-0.15, 0.18, 0.34]] };
    const up: Pose = { pelvis, pitch: -0.15, hands, feet: [[0.15, 0.64, 0.8], [-0.15, 0.64, 0.8]] };
    return {
      handsFrame: 'world',
      elbowPole: [1, -0.4, -0.3],
      kneePole: [0.15, 0.3, 1],
      toeDir: [0.2, -0.1, 1],
      frame: { side: [-0.9, 1.1], top: 1.7 },
      keys: K.cycle(down, up, 1.0, 0.45, 0.5),
      equipment: (j) => {
        const back = sub(j.pelvis, mul(j.fwd, 0.15));
        const prims: Prim[] = [
          K.box([0, 0.52, -0.38], [0, 0.52, 0.33], 0.46, 0.08, 'seat'),
          K.box([0, 0, -0.1], [0, 0.48, -0.1], 0.14, 0.1, 'seat-post', 0.6),
          K.box(add(back, mul(j.up, -0.05)), add(back, mul(j.up, 0.72)), 0.42, 0.08, 'backrest'),
          K.box([0, 0.03, -0.6], [0, 0.03, 0.45], 0.3, 0.06, 'base', 0.5),
        ];
        // Rolo na frente da canela, logo acima do tornozelo, preso a uma alavanca que gira no joelho
        const ankle = mid(j.ankle[0], j.ankle[1]);
        const knee = mid(j.knee[0], j.knee[1]);
        const s = norm(sub(ankle, knee));
        const n: V3 = [0, s[2], -s[1]];
        const roll = add(add(ankle, mul(s, -0.11)), mul(n, 0.11));
        prims.push({ kind: 'seg', a: add(roll, [0.27, 0, 0]), b: add(roll, [-0.27, 0, 0]), w: 0.13, color: 'equip', group: 'roller', bias: 0.03 });
        [0.3, -0.3].forEach((x, i) =>
          prims.push(K.box([x, knee[1], knee[2]], [x, roll[1], roll[2]], 0.05, 0.05, `lever${i}`, 0.7, [0, 0, 1])),
        );
        return prims;
      },
    } satisfies AnimDef;
  })(),

  hack: {
    handsFrame: 'trunk',
    elbowPole: [0.6, -1, 0.2],
    kneePole: [0.35, 0, 1],
    toeDir: [0.3, -0.05, 1],
    keys: K.cycle(hackUp, hackDown, 1.2, 0.3, 0.5),
    equipment: (j) => {
      const back = sub(j.pelvis, mul(j.fwd, 0.15));
      const railBase: V3 = add(sub(hackDown.pelvis, [0, 0.075, 0.2]), mul(HACK_S, -0.42));
      const prims: Prim[] = [
        K.box(add(back, mul(j.up, -0.15)), add(back, mul(j.up, 0.72)), 0.42, 0.08, 'hack-back'),
        K.box(railBase, add(railBase, mul(HACK_S, 1.9)), 0.5, 0.06, 'hack-rail', 0.4),
        K.box([0, 0.06, 0.05], [0, 0.06, 0.6], 0.7, 0.07, 'hack-plate', undefined, [1, 0, 0]),
      ];
      // Apoios sobre os ombros
      j.shoulder.forEach((sh, i) => {
        const p = add(sh, mul(j.up, 0.11));
        prims.push({ kind: 'box', a: sub(p, mul(j.fwd, 0.1)), b: add(p, mul(j.fwd, 0.15)), w: 0.13, t: 0.08, color: 'equip', group: `pad${i}`, bias: -0.05 });
      });
      return prims;
    },
  },

  'agachamento-smith': {
    handsFrame: 'trunk',
    elbowPole: [0.3, -1, -0.5],
    kneePole: [0.35, 0, 1],
    frame: { front: [-1.1, 1.1], top: 2.15 },
    keys: K.cycle(smithUp, smithDown, 1.2, 0.3, 0.5),
    equipment: (j) => {
      const bar = backBar(j);
      return [
        ...K.barbell(bar),
        ...[0.6, -0.6].map((x, i) => K.box([x, 0, SMITH_Z], [x, 2.1, SMITH_Z], 0.06, 0.06, `smith-rail${i}`, 0.5, [0, 0, 1])),
        K.box([0.6, 2.08, SMITH_Z], [-0.6, 2.08, SMITH_Z], 0.06, 0.06, 'smith-top', 0.5, [0, 0, 1]),
      ];
    },
  },

  afundo: {
    handsFrame: 'trunk',
    elbowPole: [0.2, -0.3, -1],
    kneePole: [0.15, -0.4, 1],
    frame: { side: [-0.85, 1.15] },
    keys: [
      { t: 0, pose: afStand },
      { t: 0.4, pose: afStand },
      { t: 0.8, pose: afStep, ease: 'in' },
      { t: 1.15, pose: afPlant, ease: 'out' },
      { t: 2.0, pose: afDown },
      { t: 2.3, pose: afDown },
      { t: 3.1, pose: afPlant },
      { t: 3.45, pose: afStep, ease: 'in' },
      { t: 3.85, pose: afStand, ease: 'out' },
    ],
    equipment: (j) => K.twoDumbbells(j, [0, 0, 1]),
  },

  bulgaro: {
    handsFrame: 'trunk',
    elbowPole: [0.2, -0.3, -1],
    kneePole: [0.15, -0.5, 1],
    toeDir: [0.3, -0.12, 1],
    frame: { side: [-1.05, 0.95] },
    keys: K.cycle(bgUp, bgDown, 1.2, 0.3, 0.5),
    equipment: (j) => [
      K.box([0, BG_BENCH_TOP - 0.05, -0.95], [0, BG_BENCH_TOP - 0.05, -0.4], 0.32, 0.1, 'bench'),
      K.box([0, 0, -0.85], [0, BG_BENCH_TOP - 0.1, -0.85], 0.28, 0.06, 'bench-leg1', 0.6),
      K.box([0, 0, -0.5], [0, BG_BENCH_TOP - 0.1, -0.5], 0.28, 0.06, 'bench-leg2', 0.6),
      ...K.twoDumbbells(j, [0, 0, 1]),
    ],
  },

  'agachamento-corporal': {
    handsFrame: 'world',
    elbowPole: [0.3, -1, 0],
    kneePole: [0.35, 0, 1],
    keys: K.cycle(bwUp, bwDown, 1.2, 0.3, 0.5),
  },

  'agachamento-elastico': {
    handsFrame: 'trunk',
    elbowPole: [0.35, -1, 0.3],
    kneePole: [0.35, 0, 1],
    keys: K.cycle({ ...K.gobletUp, hands: BAND_HANDS }, { ...K.gobletDown, hands: BAND_HANDS }, 1.2, 0.3, 0.5),
    equipment: (j) => {
      const under = (i: 0 | 1): V3 => add(j.ankle[i], [0, -0.06, 0.06]);
      return [
        K.thin(under(0), under(1), 'band-floor', 0.75, 0.022),
        K.thin(under(0), j.hand[0], 'band0', 0.75, 0.022),
        K.thin(under(1), j.hand[1], 'band1', 0.75, 0.022),
      ];
    },
  },
};
