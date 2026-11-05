import { add, mid, mul, trunkAxes, type AnimDef, type Key, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

/** Colchonete no chão (abdominais deitados). */
const mat = (z0 = -1.0, z1 = 1.0): Prim => K.box([0, 0.01, z0], [0, 0.01, z1], 0.62, 0.02, 'mat', 0.35);

const ease = (s: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, s)));

/** Amostra uma função periódica de fase (0..1) em keys lineares. */
function loop(period: number, n: number, f: (ph: number) => Pose): Key[] {
  const keys: Key[] = [];
  for (let i = 0; i <= n; i++) keys.push({ t: (period * i) / n, pose: f(i === n ? 0 : i / n), ease: 'linear' });
  return keys;
}

// ---------- Deitado de costas no chão (cabeça para +z) ----------
const FLOOR_Y = 0.12;
const SUPINE: Pick<AnimDef, 'supine' | 'handsFrame'> = { supine: true, handsFrame: 'trunk' };

// ---------- Prancha (antebraços) ----------
const forearmPlank = (theta: number, sag = 0): Pose => {
  const p = K.plank(theta);
  return {
    ...p,
    pelvis: add(p.pelvis, [0, -sag, 0]),
    hands: [
      [0.1, 0.05, 0.76],
      [-0.1, 0.05, 0.76],
    ],
  };
};

// ---------- Prancha lateral (apoiado no antebraço direito, roll = π/2) ----------
const SIDE_PITCH = 1.265;
const sideAx = trunkAxes(SIDE_PITCH, false, Math.PI / 2);
const sideA: V3 = [0, 0.07 + 0.1 * sideAx.lat[1], -0.95 + 0.1 * sideAx.lat[2]];
const sidePlank = (drop: number): Pose => {
  const pelvis = add(add(sideA, mul(sideAx.up, 0.928)), [0, -drop, 0]);
  const lsh = add(add(pelvis, mul(sideAx.up, 0.52)), mul(sideAx.lat, 0.19));
  return {
    pelvis,
    pitch: SIDE_PITCH,
    roll: Math.PI / 2,
    feet: [add(sideA, mul(sideAx.lat, 0.1)), add(sideA, mul(sideAx.lat, -0.1))],
    hands: [add(lsh, mul(sideAx.lat, 0.595)), [0.1, 0.05, 0.74]],
  };
};

// ---------- Ajoelhado (joelhos no chão em z = 0, tornozelos atrás) ----------
const KNEEL_FEET: [V3, V3] = [
  [0.12, 0.07, -0.46],
  [-0.12, 0.07, -0.46],
];
/** Pelve sobre os joelhos, com a coxa inclinada `deg` graus para a frente. */
const kneelPelvis = (deg: number): V3 => {
  const a = (deg * Math.PI) / 180;
  return [0, 0.07 + 0.47 * Math.cos(a), 0.47 * Math.sin(a)];
};
const KNEEL: Pick<AnimDef, 'kneePole' | 'toeDir'> = { kneePole: [0.1, -1, 0.6], toeDir: [0.1, -0.35, -1] };

// ---------- Escalador ----------
const climber = (ph: number): Pose => {
  const base = K.plank(0.39);
  const feet = [0, 1].map((i) => {
    const s = i === 0 ? 1 : -1;
    const tuck = 0.5 - 0.5 * Math.cos(2 * Math.PI * (ph + i * 0.5));
    const back: V3 = [s * 0.12, 0.14, -0.95];
    const front: V3 = [s * 0.13, 0.2, -0.28];
    return add(back, [
      (front[0] - back[0]) * tuck,
      (front[1] - back[1]) * tuck + 0.08 * Math.sin(Math.PI * tuck),
      (front[2] - back[2]) * tuck,
    ]);
  }) as [V3, V3];
  return { ...base, pelvis: add(base.pelvis, [0, 0.015 * Math.sin(4 * Math.PI * ph) ** 2, 0]), hands: K.PUSH_HANDS, feet };
};

// ---------- Roda abdominal ----------
const wheelStart: Pose = { pelvis: kneelPelvis(-10), pitch: 1.3, hands: K.sym(0.12, 0.1, 0.5), feet: KNEEL_FEET };
const wheelMid: Pose = { pelvis: kneelPelvis(25), pitch: 1.42, hands: K.sym(0.12, 0.1, 0.98), feet: KNEEL_FEET };
const wheelEnd: Pose = { pelvis: kneelPelvis(58), pitch: 1.52, hands: K.sym(0.12, 0.1, 1.42), feet: KNEEL_FEET };

// ---------- Pallof (polia à esquerda da pessoa) ----------
const PALLOF_FEET: [V3, V3] = [
  [0.21, 0.07, 0],
  [-0.21, 0.07, 0],
];
const PALLOF_PULLEY: V3 = [1.05, 1.27, 0.78];

export const CORE: Record<string, AnimDef> = {
  prancha: {
    handsFrame: 'world',
    elbowPole: [0.15, -1, -0.5],
    kneePole: [0, -1, 0],
    toeDir: [0.05, -0.75, 0.66],
    frame: { side: [-1.2, 0.95], top: 1.2 },
    keys: [
      { t: 0, pose: forearmPlank(0.17) },
      { t: 1.4, pose: forearmPlank(0.17, 0.025) },
      { t: 2.8, pose: forearmPlank(0.17) },
    ],
    equipment: () => [mat(-1.15, 0.95)],
  },

  'prancha-lateral': {
    handsFrame: 'world',
    elbowPole: [0.5, -1, 0],
    kneePole: [0, 0, -1],
    toeDir: [0, 0.15, -1],
    frame: { side: [-1.2, 0.95], top: 1.5 },
    keys: [
      { t: 0, pose: sidePlank(0) },
      { t: 1.4, pose: sidePlank(0.03) },
      { t: 2.8, pose: sidePlank(0) },
    ],
    equipment: () => [mat(-1.15, 0.95)],
  },

  'abdominal-supra': {
    ...SUPINE,
    kneePole: [0.2, 1, 0],
    toeDir: [0.1, -0.15, -1],
    elbowPole: [0.3, 1, -0.5],
    frame: { side: [-0.95, 1.05], top: 1.2 },
    keys: K.cycle(
      { pelvis: [0, FLOOR_Y, 0], pitch: Math.PI / 2, hands: K.sym(0.22, 0.0, 0.12), feet: K.sym(0.15, 0.07, -0.55) },
      { pelvis: [0, FLOOR_Y, 0], pitch: 1.05, hands: K.sym(0.2, -0.14, 0.16), feet: K.sym(0.15, 0.07, -0.55) },
      0.9,
      0.4,
      0.5,
    ),
    equipment: () => [mat(-0.8, 1.0)],
  },

  'elevacao-pernas': (() => {
    // Ângulo das pernas (rad) ao longo do ciclo: sobe, segura, desce devagar
    const pose = (ph: number): Pose => {
      const t = ph * 4.2;
      const k = t < 0.5 ? 0 : t < 1.9 ? ease((t - 0.5) / 1.4) : t < 2.2 ? 1 : ease(1 - (t - 2.2) / 2.0);
      const a = 0.08 + (Math.PI / 2 - 0.12) * k;
      return {
        pelvis: [0, FLOOR_Y, 0],
        pitch: Math.PI / 2,
        hands: K.sym(0.25, -0.05, 0.0),
        feet: K.sym(0.1, FLOOR_Y + 0.928 * Math.sin(a), -0.928 * Math.cos(a)),
      };
    };
    return {
      ...SUPINE,
      kneePole: [0, 1, 1],
      toeDir: [0.1, 0.8, 0.5],
      elbowPole: [0.3, 1, 0],
      frame: { side: [-1.15, 1.0], top: 1.45 },
      keys: loop(4.2, 42, pose),
      equipment: () => [mat(-1.1, 1.0)],
    };
  })(),

  'dead-bug': (() => {
    const p = (lh: V3, rh: V3, lf: V3, rf: V3): Pose => ({ pelvis: [0, FLOOR_Y, 0], pitch: Math.PI / 2, hands: [lh, rh], feet: [lf, rf] });
    const UP_L: V3 = [0.19, 0.5, 0.58];
    const UP_R: V3 = [-0.19, 0.5, 0.58];
    const OVER_L: V3 = [0.2, 1.08, 0.12];
    const OVER_R: V3 = [-0.2, 1.08, 0.12];
    const KNEE_L: V3 = [0.12, 0.59, -0.44];
    const KNEE_R: V3 = [-0.12, 0.59, -0.44];
    const OUT_L: V3 = [0.12, 0.17, -0.9];
    const OUT_R: V3 = [-0.12, 0.17, -0.9];
    const n = p(UP_L, UP_R, KNEE_L, KNEE_R);
    const a = p(OVER_L, UP_R, KNEE_L, OUT_R); // braço esquerdo + perna direita
    const b = p(UP_L, OVER_R, OUT_L, KNEE_R); // braço direito + perna esquerda
    return {
      ...SUPINE,
      kneePole: [0.1, 1, 0.6],
      toeDir: [0.1, 0.6, -0.8],
      elbowPole: [0.3, 0, -1],
      frame: { side: [-1.1, 1.3], top: 1.3 },
      keys: [
        { t: 0, pose: n },
        { t: 0.3, pose: n },
        { t: 1.2, pose: a },
        { t: 1.5, pose: a },
        { t: 2.4, pose: n },
        { t: 2.7, pose: n },
        { t: 3.6, pose: b },
        { t: 3.9, pose: b },
        { t: 4.8, pose: n },
      ],
      equipment: () => [mat(-1.05, 1.25)],
    };
  })(),

  'abdominal-polia': {
    ...KNEEL,
    handsFrame: 'trunk',
    elbowPole: [0.3, -0.7, 1],
    frame: { side: [-0.85, 1.25], top: 2.25 },
    keys: K.cycle(
      { pelvis: kneelPelvis(-3), pitch: 0.3, hands: K.sym(0.1, 0.71, 0.1), feet: KNEEL_FEET },
      { pelvis: kneelPelvis(-12), pitch: 1.25, hands: K.sym(0.1, 0.71, 0.1), feet: KNEEL_FEET },
      1.0,
      0.35,
      0.45,
    ),
    equipment: (j) => {
      const pulley: V3 = [0, 2.05, 0.93];
      const knot = add(mid(j.hand[0], j.hand[1]), mul(j.up, 0.12));
      return [
        K.box([0, 0, 1.05], [0, 2.2, 1.05], 0.2, 0.1, 'column', 0.4),
        { kind: 'circle', a: pulley, w: 0.05, color: 'equip', group: 'pulley', bias: K.STRUCTURE },
        K.thin(pulley, knot, 'cable', 0.7),
        { kind: 'seg', a: knot, b: j.hand[0], w: 0.03, color: 'equip', group: 'rope0', bias: 0.02 },
        { kind: 'seg', a: knot, b: j.hand[1], w: 0.03, color: 'equip', group: 'rope1', bias: 0.02 },
      ];
    },
  },

  'giro-russo': (() => {
    const base = (twist: number): Pose => ({
      pelvis: [0, FLOOR_Y + 0.01, 0],
      pitch: -0.7,
      twist,
      hands: [
        [0.05, 0.3, 0.38],
        [-0.05, 0.3, 0.38],
      ],
      feet: K.sym(0.12, 0.3, 0.62),
    });
    return {
      handsFrame: 'trunk',
      elbowPole: [1, -0.4, 0.2],
      kneePole: [0.2, 1, 0.3],
      toeDir: [0.15, 0.1, 1],
      frame: { side: [-0.9, 1.1], top: 1.3 },
      keys: [
        { t: 0, pose: base(0) },
        { t: 0.6, pose: base(0.75), ease: 'out' },
        { t: 0.85, pose: base(0.75) },
        { t: 1.45, pose: base(0), ease: 'in' },
        { t: 2.05, pose: base(-0.75), ease: 'out' },
        { t: 2.3, pose: base(-0.75) },
        { t: 2.9, pose: base(0), ease: 'in' },
      ],
      equipment: () => [mat(-0.6, 1.0)],
    };
  })(),

  escalador: {
    handsFrame: 'world',
    elbowPole: [0.7, 0.3, -1],
    kneePole: [0.1, -0.6, 1],
    toeDir: [0.05, -0.75, 0.66],
    frame: { side: [-1.2, 0.9], top: 1.3 },
    keys: loop(1.1, 12, climber),
  },

  pallof: {
    handsFrame: 'trunk',
    elbowPole: [0.6, -1, -0.4],
    kneePole: [0.35, 0, 1],
    frame: { front: [-0.85, 1.35], side: [-0.9, 1.1], top: 2.1 },
    keys: K.cycle(
      { pelvis: [0, 0.93, -0.03], pitch: 0.08, hands: K.sym(0.04, 0.4, 0.13), feet: PALLOF_FEET },
      { pelvis: [0, 0.93, -0.03], pitch: 0.08, hands: K.sym(0.03, 0.4, 0.58), feet: PALLOF_FEET },
      0.9,
      0.6,
      0.4,
    ),
    equipment: (j) => {
      const grip = mid(j.hand[0], j.hand[1]);
      return [
        K.box([1.15, 0, 0.85], [1.15, 2.0, 0.85], 0.16, 0.1, 'column', 0.4, [0, 0, 1]),
        { kind: 'circle', a: PALLOF_PULLEY, w: 0.05, color: 'equip', group: 'pulley', bias: K.STRUCTURE },
        K.thin(PALLOF_PULLEY, grip, 'cable', 0.7),
        { kind: 'seg', a: add(grip, [0, -0.06, 0]), b: add(grip, [0, 0.06, 0]), w: 0.045, color: 'equip', group: 'grip', bias: 0.02 },
      ];
    },
  },

  'roda-abdominal': {
    ...KNEEL,
    handsFrame: 'world',
    elbowPole: [0.3, -0.2, -1],
    frame: { side: [-0.65, 1.7], top: 1.4 },
    keys: K.arc(wheelStart, wheelMid, wheelEnd, 0.8, 0.3, 0.5),
    equipment: (j) => {
      const c = mid(j.hand[0], j.hand[1]);
      return [
        mat(-0.65, 1.65),
        { kind: 'seg', a: j.hand[0], b: j.hand[1], w: 0.035, color: 'equip', group: 'wheel-axle', bias: 0.02 },
        { kind: 'seg', a: add(c, [0.04, 0, 0]), b: add(c, [-0.04, 0, 0]), w: 0.19, color: 'equip', group: 'wheel', bias: 0.01 },
      ];
    },
  },
};
