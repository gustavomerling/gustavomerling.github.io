import { add, mid, mul, trunkPoint, type AnimDef, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';
import { curlBar, deg, fore, sweep } from './biceps';

// ---------- Helpers locais ----------

/** Pegada curta (manopla) na mão, ao longo de `axis`. */
const grip = (h: V3, group: string, axis: V3 = [0, 1, 0]): Prim => ({
  kind: 'seg',
  a: add(h, mul(axis, -0.055)),
  b: add(h, mul(axis, 0.055)),
  w: 0.04,
  color: 'equip',
  group,
  bias: 0.02,
});

const lerp = (a: number, b: number, u: number) => a + (b - a) * u;

// ---------- Poses ----------

const STAND: Omit<Pose, 'hands'> = { pelvis: [0, 0.99, 0], pitch: 0.02, feet: K.sym(0.13, 0.07, 0.02) };
const LEAN: Omit<Pose, 'hands'> = { pelvis: [0, 0.97, -0.06], pitch: 0.16, feet: K.sym(0.14, 0.07, 0.04) };

// Extensão para baixo (polia/elástico/máquina): cotovelo parado ao lado do tronco (referencial do tronco)
const PUSH_ELBOW = (s: number, x = 0.2): V3 => [s * x, 0.215, 0.02];
/** u = 0: antebraço à frente (~90°); u = 1: braço estendido para baixo. dx0/dx1: desvio lateral da mão. */
const pushdown =
  (base: Omit<Pose, 'hands'>, x = 0.2, dx0 = 0, dx1 = 0, top = 78) =>
  (u: number): Pose => ({
    ...base,
    hands: [1, -1].map((s) => fore(PUSH_ELBOW(s, x), lerp(deg(top), deg(176), u), s * lerp(dx0, dx1, u))) as [V3, V3],
  });
const PUSH_OPTS: Pick<AnimDef, 'handsFrame' | 'elbowPole'> = { handsFrame: 'trunk', elbowPole: [0.05, -0.7, -0.7] };

// Testa: deitado, braço apontando para cima (levemente para a cabeça); só o antebraço gira
const TESTA_ELBOW = (s: number): V3 => [s * 0.15, 0.58, 0.3];
const testaPhi = (u: number) => lerp(deg(80), deg(-42), u);

// Francês: em pé, braços para cima ao lado da cabeça; halter desce atrás da nuca
const FR_ELBOW = (s: number): V3 => [s * 0.13, 0.81, 0.08];
const frPhi = (u: number) => lerp(deg(-4), deg(-148), u);

// Mergulho no banco: mãos na borda atrás, pernas à frente
const BENCH_EDGE = -0.22;
const DIP_HANDS: [V3, V3] = [
  [0.2, 0.47, BENCH_EDGE],
  [-0.2, 0.47, BENCH_EDGE],
];
const DIP_FEET: [V3, V3] = [
  [0.14, 0.07, 0.62],
  [-0.14, 0.07, 0.62],
];
const benchDipTop: Pose = { pelvis: [0, 0.5, -0.11], pitch: 0.08, hands: DIP_HANDS, feet: DIP_FEET };
const benchDipBottom: Pose = { pelvis: [0, 0.26, -0.09], pitch: 0.12, hands: DIP_HANDS, feet: DIP_FEET };

// Coice: base afastada, tronco quase horizontal, mão esquerda apoiada no banco
const KICK: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.84, -0.12],
  pitch: 1.2,
  feet: [
    [0.17, 0.07, 0.22],
    [-0.17, 0.07, -0.34],
  ],
};
const KICK_SUPPORT: V3 = [0.22, 0.5, 0.48];
const KICK_ELBOW: V3 = [-0.21, 0.22, -0.03];
// φ no referencial do tronco: 114° = antebraço pendurado na vertical; 180° = estendido para trás
const kickPhi = (u: number) => lerp(deg(112), deg(178), u);
const kickPose = (u: number): Pose => ({
  ...KICK,
  hands: [KICK_SUPPORT, trunkPoint(KICK.pelvis, KICK.pitch, fore(KICK_ELBOW, kickPhi(u)))],
});

export const TRICEPS: Record<string, AnimDef> = {
  'triceps-corda': {
    ...PUSH_OPTS,
    frame: { top: 2.35 },
    keys: sweep(pushdown(LEAN, 0.2, -0.3, 0.12), 1.0, 0.3, 1.2),
    equipment: (j) => {
      const knot = add(mid(j.hand[0], j.hand[1]), [0, 0.14, 0]);
      const pul: V3 = [0, 2.15, 0.5];
      return [
        K.box([0, 0, 0.62], [0, 2.3, 0.62], 0.3, 0.12, 'tower', 0.35),
        { kind: 'circle', a: pul, w: 0.05, color: 'equip', group: 'pulley', bias: K.STRUCTURE },
        K.thin(pul, knot, 'cable', 0.7),
        ...j.hand.map((h, i): Prim => ({ kind: 'seg', a: knot, b: add(h, [0, -0.05, 0]), w: 0.03, color: 'equip', group: `rope${i}`, bias: 0.02 })),
      ];
    },
  },

  'triceps-testa': {
    ...K.LYING,
    elbowPole: [0.1, 1, -0.4],
    keys: sweep((u) => ({ ...K.lying, hands: [fore(TESTA_ELBOW(1), testaPhi(u)), fore(TESTA_ELBOW(-1), testaPhi(u))] }), 1.2, 0.3, 1.1),
    equipment: (j) => [...K.flatBench(K.FLAT_Z), ...curlBar(mid(j.hand[0], j.hand[1]))],
  },

  'triceps-frances': {
    handsFrame: 'trunk',
    elbowPole: [0.15, 1, 0.3],
    frame: { top: 2.25 },
    keys: sweep(
      (u) => ({ ...STAND, hands: [fore(FR_ELBOW(1), frPhi(u), -0.3), fore(FR_ELBOW(-1), frPhi(u), 0.3)] }),
      1.2,
      0.3,
      1.1,
    ),
    equipment: (j) => K.dumbbell(add(mid(j.hand[0], j.hand[1]), [0, -0.1, 0]), [0, 1, 0], { handle: 0.08, plate: 0.15 }),
  },

  'mergulho-banco': {
    handsFrame: 'world',
    elbowPole: [0.15, 0, -1],
    kneePole: [0.2, 1, 0.3],
    toeDir: [0.1, 0.55, 0.85],
    keys: K.cycle(benchDipTop, benchDipBottom, 1.1),
    equipment: () => [
      K.box([0, 0.42, BENCH_EDGE - 0.02], [0, 0.42, BENCH_EDGE - 0.75], 0.5, 0.08, 'bench'),
      K.box([0, 0, BENCH_EDGE - 0.12], [0, 0.38, BENCH_EDGE - 0.12], 0.4, 0.06, 'bench-leg1', 0.6),
      K.box([0, 0, BENCH_EDGE - 0.65], [0, 0.38, BENCH_EDGE - 0.65], 0.4, 0.06, 'bench-leg2', 0.6),
    ],
  },

  'triceps-coice': {
    handsFrame: 'world',
    elbowPole: [0.1, 1, -0.5],
    kneePole: [0.3, 0, 1],
    keys: sweep(kickPose, 0.9, 0.35, 1.1),
    equipment: (j) => [
      K.box([0, 0.42, 0.3], [0, 0.42, 1.0], 0.34, 0.08, 'bench'),
      K.box([0, 0, 0.4], [0, 0.38, 0.4], 0.3, 0.06, 'bench-leg1', 0.6),
      K.box([0, 0, 0.9], [0, 0.38, 0.9], 0.3, 0.06, 'bench-leg2', 0.6),
      ...K.dumbbell(j.hand[1], j.lat, { handle: 0.07, group: 'db1' }),
    ],
  },

  'triceps-maquina': {
    ...PUSH_OPTS,
    kneePole: [0.25, 1, 1],
    keys: sweep(pushdown({ ...K.SEATED, pitch: -0.04 }, 0.23, 0.15, 0.15, 85), 1.0, 0.3, 1.2),
    equipment: (j) => {
      const prims = K.machineSeat(j);
      j.hand.forEach((h, i) => {
        const s = i === 0 ? 1 : -1;
        const pivot: V3 = [s * 0.36, 1.25, j.pelvis[2] - 0.12];
        prims.push(grip(h, `handle${i}`), K.thin(add(h, [s * 0.05, 0, 0]), pivot, `lever${i}`, 0.5, 0.035));
      });
      return prims;
    },
  },

  'supino-fechado': {
    ...K.LYING,
    elbowPole: [0.3, -0.6, -1],
    keys: K.cycle({ ...K.lying, hands: K.sym(0.2, 0.42, 0.6) }, { ...K.lying, hands: K.sym(0.2, 0.34, 0.15) }),
    equipment: (j) => [...K.flatBench(K.FLAT_Z), ...K.rack(K.FLAT_Z + 0.8), ...K.barbell(mid(j.hand[0], j.hand[1]))],
  },

  'triceps-elastico': {
    ...PUSH_OPTS,
    frame: { top: 2.25 },
    keys: sweep(pushdown(LEAN, 0.2, -0.1, 0.05), 1.0, 0.3, 1.2),
    equipment: (j) => {
      const anchor: V3 = [0, 1.95, 0.5];
      return [
        K.box([0, 0, 0.56], [0, 2.15, 0.56], 0.12, 0.08, 'anchor-post', 0.3),
        ...j.hand.flatMap((h, i): Prim[] => [K.thin(anchor, h, `band${i}`, 0.75, 0.022), grip(h, `grip${i}`, [1, 0, 0])]),
      ];
    },
  },
};
