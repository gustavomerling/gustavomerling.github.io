import { add, sub, type AnimDef, type Joints, type Key, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

const TAU = Math.PI * 2;
const ease = (s: number) => 0.5 - 0.5 * Math.cos(Math.PI * s);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** Amostra uma função periódica de fase (0..1) em keys lineares (o loop fecha exatamente). */
function loop(period: number, n: number, f: (ph: number) => Pose): Key[] {
  const keys: Key[] = [];
  for (let i = 0; i <= n; i++) keys.push({ t: (period * i) / n, pose: f(i === n ? 0 : i / n), ease: 'linear' });
  return keys;
}

// ---------- Passada (caminhada / corrida) ----------
interface GaitOpts {
  stance: number; // fração do ciclo com o pé no chão
  L: number; // meia passada (z)
  lift: number;
  pelvisY: number;
  bob: number;
  pitch: number;
  ground: (z: number) => number; // altura do piso em z
  run: boolean;
}

function gait(o: GaitOpts) {
  return (ph: number): Pose => {
    const feet = [0, 1].map((i) => {
      const s = i === 0 ? 1 : -1;
      const p = (ph + i * 0.5) % 1;
      let z: number;
      let y: number;
      if (p < o.stance) {
        z = o.L - 2 * o.L * (p / o.stance);
        y = 0;
      } else {
        const u = (p - o.stance) / (1 - o.stance);
        z = -o.L + 2 * o.L * ease(u);
        // Corrida: o calcanhar sobe cedo (chute para trás); caminhada: arco simples
        y = o.lift * Math.sin(Math.PI * (o.run ? Math.pow(u, 0.75) : u));
      }
      return [s * 0.11, o.ground(z) + 0.07 + y, z] as V3;
    }) as [V3, V3];
    // Braço oposto à perna: mão esquerda acompanha o pé direito
    const sw = [feet[1][2] / o.L, feet[0][2] / o.L];
    const hands = sw.map((w, i) => {
      const s = i === 0 ? 1 : -1;
      return o.run
        ? ([s * 0.17, 0.25 + 0.04 * w, 0.1 + 0.17 * w] as V3)
        : ([s * 0.21, -0.03 + 0.08 * Math.abs(w), 0.02 + 0.18 * w] as V3);
    }) as [V3, V3];
    const pelvisY = o.ground(0) + o.pelvisY + o.bob * Math.cos(2 * TAU * (ph - o.stance / 2));
    return { pelvis: [0, pelvisY, 0], pitch: o.pitch, hands, feet };
  };
}

const GAIT_RIG: Pick<AnimDef, 'handsFrame' | 'elbowPole' | 'kneePole'> = {
  handsFrame: 'trunk',
  elbowPole: [0.2, -0.3, -1],
  kneePole: [0.15, 0, 1],
};

// ---------- Esteira ----------
const deckY = (slope: number) => (z: number) => 0.18 + slope * z;

function treadmill(slope: number): Prim[] {
  const g = deckY(slope);
  const z0 = -0.9;
  const z1 = 0.7;
  const prims: Prim[] = [
    // Lona (superfície) e base
    K.box([0, g(z0) - 0.04, z0], [0, g(z1) - 0.04, z1], 0.62, 0.08, 'deck'),
    K.box([0, 0.02, z0 + 0.05], [0, 0.02, z1 + 0.15], 0.66, 0.04, 'deck-base', 0.6),
    K.box([0, 0.02, z1 + 0.05], [0, g(z1) + 0.04, z1 + 0.05], 0.66, 0.2, 'motor', 0.7),
    K.box([0, 1.25, 0.66], [0, 1.4, 0.74], 0.72, 0.08, 'console'),
  ];
  for (const s of [1, -1]) {
    prims.push(
      K.box([s * 0.36, g(z1), z1 + 0.05], [s * 0.36, 1.27, 0.68], 0.06, 0.06, `upright${s}`, 0.6, [0, 0, 1]),
      K.box([s * 0.36, 1.08, 0.66], [s * 0.36, 1.08, 0.18], 0.04, 0.04, `rail${s}`, 0.6),
    );
  }
  return prims;
}

const TREAD_FRAME = { side: [-1.05, 1.05] as [number, number], top: 2.3 };

// ---------- Bicicleta ----------
const CRANK: V3 = [0, 0.33, 0.17];
const CRANK_R = 0.17;
const bikePose = (ph: number): Pose => {
  const feet = [0, 1].map((i) => {
    const a = TAU * ph + i * Math.PI;
    return [(i === 0 ? 1 : -1) * 0.12, CRANK[1] + CRANK_R * Math.cos(a), CRANK[2] + CRANK_R * Math.sin(a)] as V3;
  }) as [V3, V3];
  return {
    pelvis: [0, 0.97, -0.27],
    pitch: 0.45,
    hands: K.sym(0.22, 1.1, 0.33),
    feet,
  };
};

// ---------- Elíptico ----------
const elliptPose = (ph: number): Pose => {
  const feet = [0, 1].map((i) => {
    const a = TAU * ph + i * Math.PI;
    return [(i === 0 ? 1 : -1) * 0.13, 0.34 + 0.08 * Math.sin(a), 0.22 * Math.cos(a)] as V3;
  }) as [V3, V3];
  const hands = [0, 1].map((i) => {
    const a = TAU * ph + i * Math.PI;
    return [(i === 0 ? 1 : -1) * 0.28, 1.24 + 0.03 * Math.cos(a), 0.19 - 0.13 * Math.cos(a)] as V3;
  }) as [V3, V3];
  return { pelvis: [0, 1.15 + 0.015 * Math.cos(2 * TAU * ph), -0.08], pitch: 0.06, hands, feet };
};

const ELL_PIVOT_Z = 0.55;
const ELL_PIVOT_Y = 0.42;

// ---------- Simulador de escada (degraus descem) ----------
const STEP_H = 0.2;
const STEP_D = 0.22;
const Y_LO = 0.36;
const Z_FRONT = 0.12;
const stairFoot = (p: number, s: number): V3 => {
  // Apoio: desce e recua com o degrau. Balanço: sobe e avança para o próximo degrau.
  if (p < 0.5) {
    const u = p / 0.5;
    return [s * 0.12, Y_LO + STEP_H * (1 - u), Z_FRONT - STEP_D * u];
  }
  const u = ease((p - 0.5) / 0.5);
  return [s * 0.12, Y_LO + STEP_H * u + 0.16 * Math.sin(Math.PI * u), Z_FRONT - STEP_D * (1 - u)];
};
const stairPose = (ph: number): Pose => ({
  pelvis: [0, 1.21 + 0.015 * Math.cos(2 * TAU * ph), -0.06],
  pitch: 0.2,
  hands: K.sym(0.3, 1.22, 0.22),
  feet: [stairFoot(ph, 1), stairFoot((ph + 0.5) % 1, -1)],
});
/** Residual do pé em relação à reta de apoio (0 = pé apoiado no degrau). */
const offLine = (f: V3) => f[1] - (Y_LO + STEP_H * (1 - (Z_FRONT - f[2]) / STEP_D));

function stairs(j: Joints): Prim[] {
  const f = offLine(j.ankle[0]) <= offLine(j.ankle[1]) ? j.ankle[0] : j.ankle[1];
  const y0 = f[1] - 0.09;
  const z0 = f[2] + 0.05;
  const prims: Prim[] = [];
  for (let k = -3; k <= 3; k++) {
    const y = y0 + k * STEP_H;
    const z = z0 + k * STEP_D;
    if (y < 0.02 || y > 0.95) continue;
    const fade = clamp(Math.min((y - 0.02) / 0.12, (0.95 - y) / 0.12), 0, 1);
    prims.push(
      K.box([0, y, z - STEP_D / 2], [0, y, z + STEP_D / 2], 0.56, 0.04, `tread${k}`, fade),
      K.box([0, Math.max(0.02, y - STEP_H), z + STEP_D / 2], [0, y, z + STEP_D / 2], 0.56, 0.025, `riser${k}`, 0.5 * fade),
    );
  }
  for (const s of [1, -1]) {
    prims.push(
      // Longarina paralela à escada, por baixo dos degraus
      K.box([s * 0.33, 0, -0.32], [s * 0.33, 0.9, 0.7], 0.06, 0.06, `frame${s}`, 0.45, [0, 0, 1]),
      K.box([s * 0.33, 0.9, 0.7], [s * 0.33, 1.22, 0.55], 0.04, 0.04, `rpost${s}`, 0.6, [0, 0, 1]),
      K.box([s * 0.33, 1.22, -0.05], [s * 0.33, 1.22, 0.55], 0.04, 0.04, `hrail${s}`, 0.6),
    );
  }
  prims.push(K.box([0, 0, 0.8], [0, 1.45, 0.62], 0.4, 0.08, 'console-post', 0.4), K.box([0, 1.42, 0.55], [0, 1.52, 0.66], 0.6, 0.08, 'console'));
  return prims;
}

// ---------- Remo ----------
const ROW_FEET: [V3, V3] = [
  [0.12, 0.25, 0.6],
  [-0.12, 0.25, 0.6],
];
const rowCatch: Pose = { pelvis: [0, 0.42, 0.1], pitch: 0.42, hands: K.sym(0.13, 0.58, 0.72), feet: ROW_FEET };
const rowLegs: Pose = { pelvis: [0, 0.42, -0.3], pitch: 0.32, hands: K.sym(0.13, 0.6, 0.36), feet: ROW_FEET };
const rowLean: Pose = { pelvis: [0, 0.42, -0.31], pitch: -0.22, hands: K.sym(0.13, 0.7, 0.18), feet: ROW_FEET };
const rowFinish: Pose = { pelvis: [0, 0.42, -0.31], pitch: -0.25, hands: K.sym(0.16, 0.8, -0.16), feet: ROW_FEET };
const FLYWHEEL: V3 = [0, 0.5, 1.02];

// ---------- Pular corda ----------
const ROPE_T = 0.55;
const ROPE_HAND: [V3, V3] = [
  [0.31, 0.98, 0.12],
  [-0.31, 0.98, 0.12],
];
const ROPE_R = 1.0;
/** Direção da corda: θ = 0 embaixo (passa sob os pés no alto do salto). */
const ropeDir = (th: number): V3 => [0, -Math.cos(th), Math.sin(th)];
const jumpPose = (ph: number): Pose => {
  const th = TAU * ph;
  const air = 0.5 + 0.5 * Math.cos(th); // 1 no alto do salto
  const h = 0.09 * air * air;
  // Corda gira para a frente: sobe por trás, passa por cima e desce na frente (θ decrescente)
  const d = ropeDir(-th);
  const hands = ROPE_HAND.map((c) => add(c, [0, d[1] * 0.04, d[2] * 0.04])) as [V3, V3];
  return {
    pelvis: [0, 0.95 + h, 0],
    pitch: 0.04,
    hands,
    feet: [
      [0.1, 0.11 + h, -0.02],
      [-0.1, 0.11 + h, -0.02],
    ],
  };
};
function rope(j: Joints): Prim[] {
  // Fase da corda recuperada do círculo que o punho descreve
  const d = sub(j.hand[0], ROPE_HAND[0]);
  const th = Math.atan2(d[2], -d[1]);
  const dir = ropeDir(th);
  const n = 14;
  const pts: V3[] = [];
  for (let k = 0; k <= n; k++) {
    const u = k / n;
    const bulge = Math.sin(Math.PI * u);
    const x = j.hand[0][0] + (j.hand[1][0] - j.hand[0][0]) * u + 0.12 * Math.cos(Math.PI * u) * bulge;
    const base: V3 = [x, (j.hand[0][1] + j.hand[1][1]) / 2, (j.hand[0][2] + j.hand[1][2]) / 2];
    const r = ROPE_R * Math.pow(bulge, 0.6);
    const p = add(base, [0, dir[1] * r, dir[2] * r]);
    p[1] = Math.max(0.015, p[1]);
    pts.push(p);
  }
  return pts.slice(1).map((p, k) => ({ kind: 'seg', a: pts[k], b: p, w: 0.016, color: 'equip', group: k < n / 2 ? 'rope0' : 'rope1' }) as Prim);
}

// ---------- Polichinelo ----------
const jackPose = (ph: number): Pose => {
  const open = ease(ph < 0.5 ? ph * 2 : 2 - ph * 2);
  const hop = 0.07 * Math.abs(Math.sin(TAU * ph));
  const py = 0.96 - 0.03 * open + hop;
  const a = 0.2 + 2.75 * open;
  const hands = [1, -1].map((s) => [s * (0.19 + 0.57 * Math.sin(a)), py + 0.52 - 0.57 * Math.cos(a), 0.05] as V3) as [V3, V3];
  const fx = 0.11 + 0.27 * open;
  return {
    pelvis: [0, py, 0],
    pitch: 0.03,
    hands,
    feet: [
      [fx, 0.07 + hop, 0],
      [-fx, 0.07 + hop, 0],
    ],
  };
};

export const CARDIO: Record<string, AnimDef> = {
  'esteira-inclinada': {
    ...GAIT_RIG,
    frame: TREAD_FRAME,
    keys: loop(
      1.2,
      16,
      gait({ stance: 0.6, L: 0.27, lift: 0.07, pelvisY: 0.92, bob: 0.015, pitch: 0.16, ground: deckY(0.1), run: false }),
    ),
    equipment: () => treadmill(0.1),
  },

  'esteira-corrida': {
    ...GAIT_RIG,
    frame: TREAD_FRAME,
    keys: loop(
      0.8,
      16,
      gait({ stance: 0.4, L: 0.3, lift: 0.3, pelvisY: 0.9, bob: 0.025, pitch: 0.15, ground: deckY(0), run: true }),
    ),
    equipment: () => treadmill(0),
  },

  bike: {
    handsFrame: 'world',
    elbowPole: [0.3, -0.4, -1],
    kneePole: [0.12, 0.3, 1],
    frame: { side: [-0.95, 1.05] },
    keys: loop(0.75, 16, bikePose),
    equipment: (j) => {
      const prims: Prim[] = [
        K.box([0, 0.03, -0.6], [0, 0.03, 0.65], 0.5, 0.05, 'base', 0.6),
        K.box([0, 0.05, -0.32], [0, j.pelvis[1] - 0.13, -0.3], 0.07, 0.07, 'seat-post', 0.6, [0, 0, 1]),
        K.box([0, j.pelvis[1] - 0.11, j.pelvis[2] - 0.13], [0, j.pelvis[1] - 0.11, j.pelvis[2] + 0.12], 0.22, 0.05, 'saddle'),
        { kind: 'circle', a: [0, 0.4, 0.48], w: 0.22, color: 'equip', group: 'flywheel', opacity: 0.45, bias: K.STRUCTURE },
        K.box([0, 0.05, 0.55], [0, 1.08, 0.36], 0.07, 0.07, 'front-post', 0.6, [0, 0, 1]),
        K.box([0.25, 1.1, 0.33], [-0.25, 1.1, 0.33], 0.04, 0.04, 'handlebar', 0.8, [0, 0, 1]),
      ];
      j.ankle.forEach((f, i) => {
        const s = i === 0 ? 1 : -1;
        const c: V3 = [s * 0.1, CRANK[1], CRANK[2]];
        prims.push(
          { kind: 'seg', a: c, b: add(f, [-s * 0.02, -0.05, 0.04]), w: 0.03, color: 'equip', group: `crank${i}`, bias: -0.05 },
          { kind: 'seg', a: add(f, [0, -0.06, -0.02]), b: add(f, [0, -0.06, 0.12]), w: 0.03, color: 'equip', group: `pedal${i}`, bias: -0.05 },
        );
      });
      return prims;
    },
  },

  eliptico: {
    handsFrame: 'world',
    elbowPole: [0.3, -0.4, -1],
    kneePole: [0.15, 0, 1],
    frame: { side: [-1.05, 1.05], top: 2.3 },
    keys: loop(1.3, 16, elliptPose),
    equipment: (j) => {
      const prims: Prim[] = [
        K.box([0, 0.03, -0.95], [0, 0.03, 0.7], 0.5, 0.05, 'base', 0.6),
        { kind: 'circle', a: [0, 0.36, -0.72], w: 0.24, color: 'equip', group: 'drive', opacity: 0.45, bias: K.STRUCTURE },
        K.box([0, 0.05, 0.7], [0, 1.38, 0.58], 0.08, 0.08, 'front-post', 0.5, [0, 0, 1]),
        K.box([0, 1.36, 0.52], [0, 1.46, 0.64], 0.44, 0.08, 'console'),
      ];
      j.ankle.forEach((f, i) => {
        const s = i === 0 ? 1 : -1;
        const pedalY = f[1] - 0.085;
        const rear: V3 = [s * 0.13, pedalY, f[2] - 0.15];
        const front: V3 = [s * 0.13, pedalY, f[2] + 0.22];
        const pivot: V3 = [s * 0.28, ELL_PIVOT_Y, ELL_PIVOT_Z];
        const h = j.hand[i];
        const top = add(h, [0, 0.12 * ((h[1] - pivot[1]) / 0.85), 0.12 * ((h[2] - pivot[2]) / 0.85)]);
        prims.push(
          { kind: 'box', a: rear, b: front, w: 0.13, t: 0.035, color: 'equip', group: `pedal${i}`, bias: -0.05 },
          K.thin(rear, [s * 0.12, 0.36, -0.72], `rail${i}`, 0.5, 0.03),
          K.thin(front, pivot, `link${i}`, 0.5, 0.025),
          { kind: 'seg', a: pivot, b: top, w: 0.035, color: 'equip', group: `lever${i}`, opacity: 0.7, bias: -0.3 },
        );
      });
      return prims;
    },
  },

  escada: {
    handsFrame: 'world',
    elbowPole: [0.3, -0.4, -1],
    kneePole: [0.12, 0, 1],
    frame: { side: [-0.95, 1.05], top: 2.3 },
    keys: loop(1.3, 16, stairPose),
    equipment: stairs,
  },

  remo: {
    handsFrame: 'world',
    elbowPole: [0.5, -0.2, -1],
    kneePole: [0.2, 1, 0.2],
    toeDir: [0.1, 0.75, 0.65],
    frame: { side: [-1.05, 1.3] },
    keys: [
      { t: 0, pose: rowCatch },
      { t: 0.15, pose: rowCatch },
      { t: 0.55, pose: rowLegs },
      { t: 0.8, pose: rowLean, ease: 'linear' },
      { t: 1.05, pose: rowFinish, ease: 'out' },
      { t: 1.25, pose: rowFinish },
      { t: 1.65, pose: rowLegs },
      { t: 2.3, pose: rowCatch },
    ],
    equipment: (j) => {
      const handle: V3 = [0, (j.hand[0][1] + j.hand[1][1]) / 2, (j.hand[0][2] + j.hand[1][2]) / 2];
      return [
        K.box([0, 0.26, -1.0], [0, 0.26, 0.85], 0.12, 0.05, 'rail', 0.7),
        K.box([0, 0, -0.95], [0, 0.24, -0.95], 0.3, 0.05, 'rail-leg', 0.6),
        K.box([0, j.pelvis[1] - 0.12, j.pelvis[2] - 0.14], [0, j.pelvis[1] - 0.12, j.pelvis[2] + 0.14], 0.3, 0.06, 'seat'),
        { kind: 'circle', a: FLYWHEEL, w: 0.24, color: 'equip', group: 'flywheel', opacity: 0.5, bias: K.STRUCTURE },
        K.box([0, 0, 1.0], [0, 0.3, 1.0], 0.4, 0.06, 'front-leg', 0.6),
        K.box([0, 0.18, 0.56], [0, 0.42, 0.72], 0.34, 0.03, 'footplate'),
        K.thin(add(FLYWHEEL, [0, 0.08, -0.05]), handle, 'chain', 0.7, 0.018),
        { kind: 'seg', a: j.hand[0], b: j.hand[1], w: 0.04, color: 'equip', group: 'handle', bias: 0.02 },
      ];
    },
  },

  'corrida-rua': {
    ...GAIT_RIG,
    keys: loop(
      0.8,
      16,
      gait({ stance: 0.4, L: 0.32, lift: 0.3, pelvisY: 0.9, bob: 0.025, pitch: 0.15, ground: () => 0, run: true }),
    ),
  },

  'pular-corda': {
    handsFrame: 'world',
    elbowPole: [0.3, -0.3, -1],
    kneePole: [0.15, 0, 1],
    toeDir: [0.25, -0.6, 1],
    frame: { front: [-1.0, 1.0], side: [-1.0, 1.0], top: 2.1 },
    keys: loop(ROPE_T, 16, jumpPose),
    equipment: rope,
  },

  'circuito-aerobico': {
    handsFrame: 'world',
    elbowPole: [0.2, 0, -1],
    kneePole: [0.3, 0, 1],
    frame: { front: [-1.1, 1.1], top: 2.3 },
    keys: loop(1.2, 16, jackPose),
  },
};
