import { add, mid, mul, norm, sub, trunkPoint, type AnimDef, type Joints, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

/** Mãos penduradas (braços quase retos) abaixo dos ombros, em coordenadas do mundo. */
function hang(pelvis: V3, pitch: number, x = 0.22, drop = 0.57, dz = 0): [V3, V3] {
  const s = trunkPoint(pelvis, pitch, [0, 0.52, 0]);
  return [
    [x, s[1] - drop, s[2] + dz],
    [-x, s[1] - drop, s[2] + dz],
  ];
}

/** Rolo de máquina atrás do tornozelo (lado posterior da canela), com braço de alavanca até o joelho. */
function legRoller(j: Joints, i: 0 | 1, tag: string): Prim[] {
  const d = norm(sub(j.ankle[i], j.knee[i]));
  // Lado posterior da canela, no plano y-z
  const back: V3 = [0, -d[2], d[1]];
  const c = add(j.ankle[i], add(mul(back, 0.1), mul(d, -0.04)));
  return [{ kind: 'seg', a: add(c, [0.2, 0, 0]), b: add(c, [-0.2, 0, 0]), w: 0.1, color: 'equip', group: `${tag}-roller`, bias: 0.02 }];
}

/** Braço de alavanca da máquina: do eixo (perto do joelho) ao rolo, por fora da perna. */
function legLever(j: Joints, pivot: V3, tag: string): Prim[] {
  const d = norm(sub(j.ankle[1], j.knee[1]));
  const back: V3 = [0, -d[2], d[1]];
  const c = add(j.ankle[1], add(mul(back, 0.1), mul(d, -0.04)));
  return [
    K.thin([-0.26, pivot[1], pivot[2]], [-0.26, c[1], c[2]], `${tag}-lever`, 0.6, 0.035),
    { kind: 'circle', a: [-0.26, pivot[1], pivot[2]], w: 0.045, color: 'equip', group: `${tag}-pivot`, bias: K.STRUCTURE },
  ];
}

// ---------- Stiff ----------
const STIFF_FEET = K.sym(0.13, 0.07, 0);
const stiffTop = (pelvisZ = 0): Pose => {
  const pelvis: V3 = [0, 0.99, pelvisZ];
  return { pelvis, pitch: 0.04, hands: hang(pelvis, 0.04, 0.2, 0.57, 0.07), feet: STIFF_FEET };
};
const stiffBottom = (): Pose => {
  const pelvis: V3 = [0, 0.9, -0.3];
  return { pelvis, pitch: 1.12, hands: hang(pelvis, 1.12, 0.2, 0.58, -0.04), feet: STIFF_FEET };
};

// ---------- Levantamento terra ----------
const DL_FEET = K.sym(0.13, 0.07, 0);
const BAR_FLOOR = 0.215;
const dlBottom: Pose = { pelvis: [0, 0.62, -0.36], pitch: 1.12, hands: K.sym(0.23, BAR_FLOOR, 0.07), feet: DL_FEET };
const dlMid: Pose = { pelvis: [0, 0.8, -0.27], pitch: 0.95, hands: K.sym(0.23, 0.5, 0.07), feet: DL_FEET };
const dlTop: Pose = { pelvis: [0, 0.99, -0.02], pitch: 0.03, hands: K.sym(0.23, 0.93, 0.07), feet: DL_FEET };

// ---------- Kettlebell swing ----------
const KB_FEET = K.sym(0.21, 0.07, 0);
const swingBack: Pose = { pelvis: [0, 0.88, -0.28], pitch: 1.05, hands: K.sym(0.04, 0.58, -0.08), feet: KB_FEET };
const swingMid: Pose = { pelvis: [0, 0.97, -0.08], pitch: 0.35, hands: K.sym(0.04, 0.85, 0.42), feet: KB_FEET };
const swingTop: Pose = { pelvis: [0, 0.99, 0], pitch: -0.04, hands: K.sym(0.04, 1.38, 0.56), feet: KB_FEET };

/** Kettlebell: alça entre as mãos e o corpo pendurado na direção do braço. */
export function kettlebell(j: Joints, group = 'kb'): Prim[] {
  const h = mid(j.hand[0], j.hand[1]);
  const sh = mid(j.shoulder[0], j.shoulder[1]);
  const d = norm(sub(h, sh));
  const body = add(h, mul(d, 0.15));
  return [
    { kind: 'seg', a: add(h, [0.07, 0, 0]), b: add(h, [-0.07, 0, 0]), w: 0.03, color: 'equip', group, bias: 0.03 },
    { kind: 'seg', a: add(h, [0.07, 0, 0]), b: add(body, [0.06, 0, 0]), w: 0.03, color: 'equip', group, bias: 0.03 },
    { kind: 'seg', a: add(h, [-0.07, 0, 0]), b: add(body, [-0.06, 0, 0]), w: 0.03, color: 'equip', group, bias: 0.03 },
    { kind: 'circle', a: body, w: 0.1, color: 'equip', group, bias: 0.03 },
  ];
}

// ---------- Flexão nórdica ----------
const KNEE_N: V3 = [0, 0.11, 0];
const ANKLE_N_Y = 0.1;
const nordic = (theta: number, hands: [V3, V3]): Pose => ({
  pelvis: [0, KNEE_N[1] + 0.46 * Math.cos(theta), KNEE_N[2] + 0.46 * Math.sin(theta)],
  pitch: theta,
  hands,
  feet: K.sym(0.1, ANKLE_N_Y, -0.45),
});

// ---------- Flexão de joelho: o tornozelo gira em volta do joelho parado ----------
/** Deitado de bruços: phi = 0 perna esticada para trás, phi = π/2 canela vertical. */
const proneAnkle = (x: number, knee: [number, number], phi: number): V3 => [x, knee[0] + 0.46 * Math.sin(phi), knee[1] - 0.46 * Math.cos(phi)];
/** Sentado: phi = 0 perna esticada à frente, phi > π/2 calcanhar embaixo do assento. */
const seatedAnkle = (x: number, knee: [number, number], phi: number): V3 => [x, knee[0] - 0.46 * Math.sin(phi), knee[1] + 0.46 * Math.cos(phi)];

// ---------- Deitado de bruços ----------
const PRONE_PITCH = Math.PI / 2;
const MESA_Z = 0.05;
const MESA_Y = 0.74;
const MESA_KNEE: [number, number] = [MESA_Y - 0.02, MESA_Z - 0.465];
const mesa = (phi: number): Pose => ({
  pelvis: [0, MESA_Y, MESA_Z],
  pitch: PRONE_PITCH,
  hands: K.sym(0.24, 0.72, 0.16),
  feet: [proneAnkle(0.1, MESA_KNEE, phi), proneAnkle(-0.1, MESA_KNEE, phi)],
});

const FLOOR_Z = 0.15;
const FLOOR_KNEE: [number, number] = [0.08, FLOOR_Z - 0.465];
const floorProne = (phi: number): Pose => ({
  pelvis: [0, 0.12, FLOOR_Z],
  pitch: PRONE_PITCH,
  // Antebraços no chão, testa apoiada nas mãos
  hands: K.sym(0.1, 0.06, FLOOR_Z + 0.74),
  feet: [proneAnkle(0.1, FLOOR_KNEE, 0.02), proneAnkle(-0.1, FLOOR_KNEE, phi)],
});

// ---------- Cadeira flexora ----------
const CF: Omit<Pose, 'feet'> = { pelvis: [0, 0.6, -0.1], pitch: -0.12, hands: K.sym(0.32, 0.58, 0.05) };
const CF_KNEE: [number, number] = [0.58, 0.365];
const cf = (phi: number): Pose => ({ ...CF, feet: [seatedAnkle(0.12, CF_KNEE, phi), seatedAnkle(-0.12, CF_KNEE, phi)] });

export const POSTERIOR: Record<string, AnimDef> = {
  'stiff-halteres': {
    handsFrame: 'world',
    elbowPole: [0.3, 0, -1],
    kneePole: [0.2, 0, 1],
    keys: K.cycle(stiffTop(), stiffBottom(), 1.3, 0.3, 0.4),
    equipment: (j) => K.twoDumbbells(j, [1, 0, 0]),
  },

  'stiff-barra': {
    handsFrame: 'world',
    elbowPole: [0.3, 0, -1],
    kneePole: [0.2, 0, 1],
    keys: K.cycle(stiffTop(), stiffBottom(), 1.3, 0.3, 0.4),
    equipment: (j) => K.barbell(mid(j.hand[0], j.hand[1])),
  },

  'mesa-flexora': {
    handsFrame: 'world',
    elbowPole: [1, -0.3, 0],
    kneePole: [0, -1, 0],
    toeDir: [0.05, -0.3, -1],
    frame: { side: [-1.15, 1.15], top: 1.75 },
    keys: K.arc(mesa(0.03), mesa(0.9), mesa(1.95), 0.55, 0.3, 0.4),
    equipment: (j) => {
      const pivot: V3 = [0, MESA_Y, MESA_Z - 0.47];
      return [
        K.box([0, MESA_Y - 0.17, MESA_Z - 0.5], [0, MESA_Y - 0.17, MESA_Z + 0.8], 0.34, 0.1, 'mesa-pad'),
        K.box([0, 0, MESA_Z + 0.55], [0, MESA_Y - 0.22, MESA_Z + 0.55], 0.24, 0.08, 'mesa-leg1', 0.6),
        K.box([0, 0, MESA_Z - 0.35], [0, MESA_Y - 0.22, MESA_Z - 0.35], 0.24, 0.08, 'mesa-leg2', 0.6),
        ...j.hand.map((h, i) => ({ kind: 'seg' as const, a: add(h, [0, -0.06, 0]), b: add(h, [0, 0.06, 0]), w: 0.04, color: 'equip' as const, group: `grip${i}`, bias: 0.02 })),
        ...legLever(j, pivot, 'mesa'),
        ...legRoller(j, 1, 'mesa'),
      ];
    },
  },

  'cadeira-flexora': {
    handsFrame: 'world',
    elbowPole: [1, -0.5, -0.5],
    kneePole: [0.1, 0.6, 1],
    toeDir: [0.1, 0.5, 1],
    frame: { side: [-1.0, 1.25] },
    keys: K.arc(cf(0.12), cf(0.9), cf(1.75), 0.55, 0.3, 0.4),
    equipment: (j) => {
      const back = sub(j.pelvis, mul(j.fwd, 0.16));
      const kneeZ = j.pelvis[2] + 0.46;
      return [
        K.box([0, 0.47, j.pelvis[2] - 0.2], [0, 0.47, kneeZ - 0.02], 0.42, 0.08, 'seat'),
        K.box([0, 0, j.pelvis[2]], [0, 0.43, j.pelvis[2]], 0.14, 0.1, 'seat-post', 0.6),
        K.box(add(back, mul(j.up, -0.05)), add(back, mul(j.up, 0.72)), 0.4, 0.08, 'backrest'),
        // Apoio sobre as coxas
        { kind: 'seg', a: [0.22, 0.79, kneeZ - 0.12], b: [-0.22, 0.79, kneeZ - 0.12], w: 0.09, color: 'equip', group: 'thigh-pad', bias: 0.02 },
        K.thin([0.26, 0.79, kneeZ - 0.12], [0.26, 0.47, kneeZ - 0.25], 'thigh-pad-arm', 0.5, 0.03),
        ...j.hand.map((h, i) => ({ kind: 'seg' as const, a: add(h, [0, -0.05, 0]), b: add(h, [0, 0.05, 0]), w: 0.04, color: 'equip' as const, group: `grip${i}`, bias: 0.02 })),
        ...legLever(j, [0, 0.6, kneeZ], 'cf'),
        ...legRoller(j, 1, 'cf'),
      ];
    },
  },

  'levantamento-terra': {
    handsFrame: 'world',
    elbowPole: [0.3, 0, -1],
    kneePole: [0.5, 0.1, 1],
    keys: [
      { t: 0, pose: dlBottom },
      { t: 0.4, pose: dlBottom },
      { t: 1.0, pose: dlMid, ease: 'in' },
      { t: 1.6, pose: dlTop, ease: 'out' },
      { t: 1.9, pose: dlTop },
      { t: 2.6, pose: dlMid, ease: 'in' },
      { t: 3.2, pose: dlBottom, ease: 'out' },
    ],
    equipment: (j) => K.barbell(mid(j.hand[0], j.hand[1])),
  },

  'kettlebell-swing': {
    handsFrame: 'world',
    elbowPole: [0.2, -1, 0],
    kneePole: [0.3, 0, 1],
    frame: { side: [-1.0, 1.1] },
    keys: K.arc(swingBack, swingMid, swingTop, 0.45, 0.1, 0.15),
    equipment: (j) => kettlebell(j),
  },

  'flexao-nordica': {
    handsFrame: 'trunk',
    elbowPole: [0.6, -1, -0.6],
    kneePole: [0, -1, 1],
    toeDir: [0.05, -0.4, -1],
    frame: { side: [-0.95, 1.25], top: 1.5 },
    keys: [
      { t: 0, pose: nordic(0.05, K.sym(0.2, 0.28, 0.14)) },
      { t: 0.4, pose: nordic(0.05, K.sym(0.2, 0.28, 0.14)) },
      { t: 2.4, pose: nordic(1.15, K.sym(0.25, 0.45, 0.3)), ease: 'linear' },
      { t: 2.6, pose: nordic(1.2, K.sym(0.25, 0.5, 0.36)), ease: 'out' },
      { t: 3.6, pose: nordic(0.05, K.sym(0.2, 0.28, 0.14)) },
    ],
    equipment: () => [
      // Apoio dos joelhos e rolo prendendo os tornozelos
      K.box([0, 0.02, -0.6], [0, 0.02, 0.15], 0.5, 0.04, 'mat'),
      { kind: 'seg', a: [0.25, ANKLE_N_Y + 0.1, -0.47], b: [-0.25, ANKLE_N_Y + 0.1, -0.47], w: 0.09, color: 'equip', group: 'ankle-roller', bias: 0.02 },
      K.box([0, 0, -0.62], [0, ANKLE_N_Y + 0.1, -0.62], 0.12, 0.06, 'ankle-post', 0.6),
    ],
  },

  'flexora-elastico': {
    handsFrame: 'world',
    elbowPole: [1, -0.2, 0],
    kneePole: [0, -1, 0],
    toeDir: [0.05, -0.3, -1],
    frame: { side: [-1.25, 1.25], top: 1.3 },
    keys: K.arc(floorProne(0.02), floorProne(0.9), floorProne(1.95), 0.55, 0.3, 0.4),
    equipment: (j) => {
      const anchor: V3 = [-0.1, 0.12, FLOOR_Z - 1.5];
      return [
        K.box([0, 0, anchor[2] - 0.04], [0, 0.3, anchor[2] - 0.04], 0.12, 0.08, 'band-anchor', 0.5),
        K.thin(anchor, add(j.ankle[1], [0, 0.02, 0]), 'band', 0.75, 0.022),
      ];
    },
  },
};
