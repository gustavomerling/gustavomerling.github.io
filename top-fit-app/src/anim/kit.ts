/** Kit compartilhado: peças de equipamento, helpers de animação e poses de base. */
import { add, mul, sub, type AnimDef, type Joints, type Key, type Pose, type Prim, type V3 } from './rig';

// ---------- Peças de equipamento ----------

/** Halter: barra curta com anilhas nas pontas, ao longo de `axis`. */
export function dumbbell(center: V3, axis: V3, opts: { handle?: number; plate?: number; group?: string } = {}): Prim[] {
  const group = opts.group ?? 'dumbbell';
  const h = opts.handle ?? 0.13;
  const r = opts.plate ?? 0.14;
  const end1 = add(center, mul(axis, h));
  const end2 = add(center, mul(axis, -h));
  return [
    { kind: 'seg', a: end1, b: end2, w: 0.035, color: 'equip', bias: 0.02, group },
    { kind: 'seg', a: end1, b: add(end1, mul(axis, 0.05)), w: r, color: 'equip', bias: 0.02, group },
    { kind: 'seg', a: end2, b: add(end2, mul(axis, -0.05)), w: r, color: 'equip', bias: 0.02, group },
  ];
}

/** Barra olímpica ao longo de x, centrada em `center`. De lado, as anilhas viram discos. */
export function barbell(center: V3, group = 'barbell'): Prim[] {
  const at = (x: number): V3 => [center[0] + x, center[1], center[2]];
  return [
    { kind: 'seg', a: at(-1.0), b: at(1.0), w: 0.03, color: 'equip', bias: 0.03, group },
    // Anilhas semitransparentes e em grupos próprios: de lado, a anilha da frente não esconde o boneco
    { kind: 'seg', a: at(0.7), b: at(0.8), w: 0.42, color: 'equip', bias: 0.03, group: `${group}-p0`, opacity: 0.55 },
    { kind: 'seg', a: at(-0.7), b: at(-0.8), w: 0.42, color: 'equip', bias: 0.03, group: `${group}-p1`, opacity: 0.55 },
  ];
}

/** Halteres nas duas mãos. */
export const twoDumbbells = (j: Joints, axis: V3, handle = 0.07): Prim[] => [
  ...dumbbell(j.hand[0], axis, { handle, group: 'db0' }),
  ...dumbbell(j.hand[1], axis, { handle, group: 'db1' }),
];

/** Estrutura (banco, encosto, poste...): sempre atrás/embaixo do corpo. */
export const STRUCTURE = -2;

export const box = (a: V3, b: V3, w: number, t: number, group: string, opacity?: number, across?: V3): Prim => ({
  kind: 'box',
  a,
  b,
  w,
  t,
  color: 'equip',
  group,
  opacity,
  across,
  bias: STRUCTURE,
});

/** Cabo/elástico: linha fina, desenhada atrás do corpo. */
export const thin = (a: V3, b: V3, group: string, opacity = 0.6, w = 0.014): Prim => ({
  kind: 'seg',
  a,
  b,
  w,
  color: 'equip',
  group,
  opacity,
  bias: -0.5,
});

/** Banco reto embaixo de quem está deitado (cabeça para +z). */
export function flatBench(pelvisZ: number): Prim[] {
  return [
    box([0, 0.41, pelvisZ - 0.45], [0, 0.41, pelvisZ + 0.85], 0.3, 0.1, 'bench'),
    box([0, 0, pelvisZ - 0.3], [0, 0.36, pelvisZ - 0.3], 0.28, 0.06, 'bench-leg1', 0.6),
    box([0, 0, pelvisZ + 0.7], [0, 0.36, pelvisZ + 0.7], 0.28, 0.06, 'bench-leg2', 0.6),
  ];
}

/** Suportes do supino (atrás da cabeça). */
export function rack(z: number): Prim[] {
  return [0.55, -0.55].map((x, i) => ({
    kind: 'seg' as const,
    a: [x, 0, z] as V3,
    b: [x, 1.2, z] as V3,
    w: 0.05,
    color: 'equip' as const,
    group: `rack${i}`,
    opacity: 0.35,
    bias: STRUCTURE,
  }));
}

/** Banco inclinado: assento + encosto alinhado às costas. */
export function inclineBench(j: Joints): Prim[] {
  const back = sub(j.pelvis, mul(j.fwd, 0.15));
  const top = add(back, mul(j.up, 0.8));
  return [
    box(add(back, mul(j.up, -0.1)), top, 0.3, 0.08, 'bench-back'),
    box([0, 0.43, j.pelvis[2] + 0.05], [0, 0.43, j.pelvis[2] - 0.45], 0.3, 0.08, 'bench-seat'),
    box([0, 0, j.pelvis[2] - 0.15], [0, 0.39, j.pelvis[2] - 0.15], 0.24, 0.06, 'bench-leg1', 0.6),
    box([0, 0, top[2] - 0.05], [0, top[1] - 0.05, top[2] - 0.05], 0.24, 0.06, 'bench-leg2', 0.6),
  ];
}

/** Assento + encosto de máquina, com coluna atrás. */
export function machineSeat(j: Joints): Prim[] {
  const back = sub(j.pelvis, mul(j.fwd, 0.16));
  return [
    box([0, 0.45, j.pelvis[2] - 0.2], [0, 0.45, j.pelvis[2] + 0.25], 0.42, 0.08, 'seat'),
    box([0, 0, j.pelvis[2]], [0, 0.41, j.pelvis[2]], 0.14, 0.1, 'seat-post', 0.6),
    box(add(back, mul(j.up, -0.05)), add(back, mul(j.up, 0.7)), 0.4, 0.08, 'backrest'),
    box([0, 0, back[2] - 0.2], [0, 1.75, back[2] - 0.2], 0.16, 0.1, 'column', 0.35),
  ];
}

// ---------- Helpers de poses ----------

/** Vai de a até b e volta, com pausas. */
export const cycle = (a: Pose, b: Pose, down = 1.2, hold = 0.3, rest = 0.4): Key[] => [
  { t: 0, pose: a },
  { t: rest, pose: a },
  { t: rest + down, pose: b },
  { t: rest + down + hold, pose: b },
  { t: rest + down * 2 + hold, pose: a },
];

/** Movimento em arco a → m → b e volta, sem parar no meio. */
export const arc = (a: Pose, m: Pose, b: Pose, half = 0.7, hold = 0.3, rest = 0.4): Key[] => [
  { t: 0, pose: a },
  { t: rest, pose: a },
  { t: rest + half, pose: m, ease: 'in' },
  { t: rest + half * 2, pose: b, ease: 'out' },
  { t: rest + half * 2 + hold, pose: b },
  { t: rest + half * 3 + hold, pose: m, ease: 'in' },
  { t: rest + half * 4 + hold, pose: a, ease: 'out' },
];

/** Par simétrico: [esquerda, direita] */
export const sym = (x: number, a: number, f: number): [V3, V3] => [
  [x, a, f],
  [-x, a, f],
];

// ---------- Agachamento goblet ----------

export const FEET_SQUAT: [V3, V3] = [
  [0.17, 0.07, 0],
  [-0.17, 0.07, 0],
];
export const GOBLET_HANDS = sym(0.07, 0.5, 0.2);
export const gobletUp: Pose = { pelvis: [0, 0.995, 0], pitch: 0.06, hands: GOBLET_HANDS, feet: FEET_SQUAT };
export const gobletDown: Pose = { pelvis: [0, 0.5, -0.2], pitch: 0.5, hands: GOBLET_HANDS, feet: FEET_SQUAT };

// ---------- Deitado no banco reto (cabeça para +z, peito para cima) ----------

export const FLAT_Z = -0.3;
export const lying: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.56, FLAT_Z],
  pitch: Math.PI / 2,
  feet: [
    [0.3, 0.07, FLAT_Z - 0.48],
    [-0.3, 0.07, FLAT_Z - 0.48],
  ],
};
export const LYING: Pick<AnimDef, 'supine' | 'handsFrame' | 'kneePole' | 'toeDir' | 'frame'> = {
  supine: true,
  handsFrame: 'trunk',
  kneePole: [0.3, 1, -0.3],
  toeDir: [0.2, -0.2, -1],
  frame: { side: [-1.05, 1.05], top: 1.6 },
};

// ---------- Banco inclinado ----------

export const INCLINE: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.56, -0.15],
  pitch: 0.97,
  feet: [
    [0.3, 0.07, -0.68],
    [-0.3, 0.07, -0.68],
  ],
};

// ---------- Sentado em máquina ----------

export const SEATED: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.58, -0.05],
  pitch: -0.1,
  feet: [
    [0.18, 0.07, 0.38],
    [-0.18, 0.07, 0.38],
  ],
};

// ---------- Em pé, base alternada ----------

export const STAGGER: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.95, -0.04],
  pitch: 0.12,
  feet: [
    [0.17, 0.07, 0.2],
    [-0.17, 0.07, -0.26],
  ],
};

// ---------- Flexão (prancha, peito para baixo) ----------

export function plank(theta: number, ankleZ = -0.95): Omit<Pose, 'hands'> {
  const ankleY = 0.14;
  const legs = 0.93;
  return {
    pelvis: [0, ankleY + Math.sin(theta) * legs, ankleZ + Math.cos(theta) * legs],
    pitch: Math.PI / 2 - theta,
    feet: [
      [0.12, ankleY, ankleZ],
      [-0.12, ankleY, ankleZ],
    ],
  };
}
export const PUSH_HANDS: [V3, V3] = [
  [0.3, 0.05, 0.42],
  [-0.3, 0.05, 0.42],
];

// ---------- Paralelas ----------

export const DIP_HANDS: [V3, V3] = [
  [0.3, 1.15, 0.02],
  [-0.3, 1.15, 0.02],
];
export const dipTop: Pose = {
  pelvis: [0, 1.21, -0.08],
  pitch: 0.2,
  hands: DIP_HANDS,
  feet: [
    [0.08, 0.5, -0.36],
    [-0.08, 0.5, -0.36],
  ],
};
export const dipBottom: Pose = {
  pelvis: [0, 0.93, -0.13],
  pitch: 0.45,
  hands: DIP_HANDS,
  feet: [
    [0.08, 0.22, -0.42],
    [-0.08, 0.22, -0.42],
  ],
};

