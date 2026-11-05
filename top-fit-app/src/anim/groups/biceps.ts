import { add, BODY, cross, dot, len, mid, mul, norm, sub, type AnimDef, type Joints, type Key, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';

// ---------- Helpers locais ----------

export const deg = (d: number) => (d * Math.PI) / 180;
const ez = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x);

/**
 * Mão a um antebraço de distância do cotovelo `e`, no plano sagital do referencial usado:
 * φ = 0 aponta para cima, 90° para a frente, 180° para baixo. `dx` desvia para o lado.
 */
export const fore = (e: V3, phi: number, dx = 0): V3 => add(e, mul(norm([dx, Math.cos(phi), Math.sin(phi)]), BODY.forearm));

/**
 * Vai de f(0) a f(1) e volta, amostrando a curva (para o cotovelo ficar parado enquanto a mão
 * descreve um arco). Os trechos são lineares entre amostras, com aceleração embutida.
 */
export function sweep(f: (u: number) => Pose, up = 1.0, hold = 0.3, down = 1.2, rest = 0.4, n = 8): Key[] {
  const keys: Key[] = [
    { t: 0, pose: f(0) },
    { t: rest, pose: f(0) },
  ];
  for (let i = 1; i <= n; i++) keys.push({ t: rest + (up * i) / n, pose: f(ez(i / n)), ease: 'linear' });
  keys.push({ t: rest + up + hold, pose: f(1) });
  for (let i = 1; i <= n; i++) keys.push({ t: rest + up + hold + (down * i) / n, pose: f(ez(1 - i / n)), ease: 'linear' });
  return keys;
}

/** Encadeia sequências de keys (cada uma começando em t = 0). */
export function chain(...lists: Key[][]): Key[] {
  const out: Key[] = [...lists[0]];
  for (const l of lists.slice(1)) {
    const t0 = out.at(-1)!.t;
    out.push(...l.slice(1).map((k) => ({ ...k, t: k.t + t0 })));
  }
  return out;
}

/** Flexão do cotovelo de 0 (estendido) a 1 (~140°). */
function flexion(j: Joints, i: 0 | 1) {
  const a = norm(sub(j.elbow[i], j.shoulder[i]));
  const b = norm(sub(j.hand[i], j.elbow[i]));
  return Math.min(1, Math.max(0, Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / deg(140)));
}

/** Eixo do halter com pegada neutra (martelo): perpendicular ao antebraço, no plano sagital. */
function neutralAxis(j: Joints, i: 0 | 1): V3 {
  const f = sub(j.hand[i], j.elbow[i]);
  const ax = cross(j.lat, f);
  return len(ax) > 1e-6 ? norm(ax) : [0, 0, 1];
}

/** Supinação: de neutra (embaixo) a palma para cima (em cima), acompanhando a flexão. */
function supAxis(j: Joints, i: 0 | 1): V3 {
  const u = Math.min(1, flexion(j, i) * 1.6);
  return norm(add(mul(neutralAxis(j, i), 1 - u), mul(j.lat, u)));
}

/** Barra curta de rosca (W/reta), com anilhas pequenas. */
export function curlBar(center: V3, group = 'curlbar'): Prim[] {
  const at = (x: number): V3 => [center[0] + x, center[1], center[2]];
  return [
    { kind: 'seg', a: at(-0.55), b: at(0.55), w: 0.03, color: 'equip', bias: 0.03, group },
    { kind: 'seg', a: at(0.4), b: at(0.47), w: 0.24, color: 'equip', bias: 0.03, group },
    { kind: 'seg', a: at(-0.4), b: at(-0.47), w: 0.24, color: 'equip', bias: 0.03, group },
  ];
}

// ---------- Poses ----------

const STAND: Omit<Pose, 'hands'> = { pelvis: [0, 0.99, 0], pitch: 0.02, feet: K.sym(0.13, 0.07, 0.02) };

// Rosca em pé: cotovelo parado ao lado do tronco (referencial do tronco), só o antebraço gira.
const CURL_ELBOW = (s: number, x = 0.2): V3 => [s * x, 0.215, 0.03];
const CURL_DOWN = deg(170);
const CURL_UP = deg(38);
const curlPhi = (u: number) => CURL_DOWN + (CURL_UP - CURL_DOWN) * u;
const curlHands = (u0: number, u1: number, x = 0.2): [V3, V3] => [fore(CURL_ELBOW(1, x), curlPhi(u0)), fore(CURL_ELBOW(-1, x), curlPhi(u1))];
const standCurl = (base: Omit<Pose, 'hands'>, x = 0.2) => (u: number): Pose => ({ ...base, hands: curlHands(u, u, x) });

const CURL_OPTS: Pick<AnimDef, 'handsFrame' | 'elbowPole'> = { handsFrame: 'trunk', elbowPole: [0.05, -0.7, -0.7] };

// Scott: sentado, braços apoiados no banco inclinado (referencial do mundo)
const SCOTT_BASE: Omit<Pose, 'hands'> = { ...K.SEATED, pitch: 0.2 };
const SCOTT_SH_Y = SCOTT_BASE.pelvis[1] + (BODY.trunk - BODY.shoulderDrop) * Math.cos(0.2);
const SCOTT_SH_Z = SCOTT_BASE.pelvis[2] + (BODY.trunk - BODY.shoulderDrop) * Math.sin(0.2);
const SCOTT_ARM = deg(130); // direção do braço (para baixo e para a frente)
const scottElbow = (s: number): V3 => [s * 0.2, SCOTT_SH_Y + Math.cos(SCOTT_ARM) * 0.305, SCOTT_SH_Z + Math.sin(SCOTT_ARM) * 0.305];
const scottPhi = (u: number) => deg(118) + (deg(18) - deg(118)) * u;
/** Lado do apoio (para baixo e para trás do braço) */
const SCOTT_PAD_N: V3 = [0, -Math.sin(SCOTT_ARM), Math.cos(SCOTT_ARM)];

// Concentrada: sentado, pernas afastadas, tronco inclinado; cotovelo direito na parte interna da coxa
const CONC_BASE: Omit<Pose, 'hands'> = {
  pelvis: [0, 0.52, -0.05],
  pitch: 0.72,
  feet: [
    [0.36, 0.07, 0.42],
    [-0.36, 0.07, 0.42],
  ],
};
const CONC_SH: V3 = [
  -0.19,
  CONC_BASE.pelvis[1] + (BODY.trunk - BODY.shoulderDrop) * Math.cos(0.72),
  CONC_BASE.pelvis[2] + (BODY.trunk - BODY.shoulderDrop) * Math.sin(0.72),
];
const CONC_ELBOW: V3 = [-0.2, CONC_SH[1] - 0.3, CONC_SH[2] + 0.07];
const concPhi = (u: number) => deg(172) + (deg(22) - deg(172)) * u;
const CONC_LEFT_HAND: V3 = [0.3, 0.6, 0.38];

export const BICEPS: Record<string, AnimDef> = {
  'rosca-direta': {
    ...CURL_OPTS,
    keys: sweep(standCurl(STAND, 0.2)),
    equipment: (j) => curlBar(mid(j.hand[0], j.hand[1])),
  },

  'rosca-alternada': {
    ...CURL_OPTS,
    keys: chain(
      sweep((u) => ({ ...STAND, hands: curlHands(u, 0) }), 0.9, 0.2, 1.0, 0.3),
      sweep((u) => ({ ...STAND, hands: curlHands(0, u) }), 0.9, 0.2, 1.0, 0.3),
    ),
    equipment: (j) => [
      ...K.dumbbell(j.hand[0], supAxis(j, 0), { handle: 0.07, group: 'db0' }),
      ...K.dumbbell(j.hand[1], supAxis(j, 1), { handle: 0.07, group: 'db1' }),
    ],
  },

  'rosca-martelo': {
    ...CURL_OPTS,
    keys: sweep(standCurl(STAND, 0.2)),
    equipment: (j) => [
      ...K.dumbbell(j.hand[0], neutralAxis(j, 0), { handle: 0.07, group: 'db0' }),
      ...K.dumbbell(j.hand[1], neutralAxis(j, 1), { handle: 0.07, group: 'db1' }),
    ],
  },

  'rosca-polia': {
    ...CURL_OPTS,
    frame: { top: 2.1 },
    keys: sweep(standCurl(STAND, 0.19)),
    equipment: (j) => {
      const c = mid(j.hand[0], j.hand[1]);
      const pul: V3 = [0, 0.14, 0.62];
      return [
        K.box([0, 0, 0.72], [0, 1.9, 0.72], 0.3, 0.12, 'tower', 0.35),
        { kind: 'circle', a: pul, w: 0.05, color: 'equip', group: 'pulley', bias: K.STRUCTURE },
        K.thin(pul, add(c, [0, -0.02, 0]), 'cable', 0.7),
        { kind: 'seg', a: add(c, [0.27, 0, 0]), b: add(c, [-0.27, 0, 0]), w: 0.035, color: 'equip', group: 'handle', bias: 0.02 },
      ];
    },
  },

  'rosca-scott': {
    handsFrame: 'world',
    elbowPole: [0, -Math.sin(SCOTT_ARM), Math.cos(SCOTT_ARM)],
    kneePole: [0.25, 1, 1],
    frame: { side: [-0.85, 1.15] },
    keys: sweep((u) => ({ ...SCOTT_BASE, hands: [fore(scottElbow(1), scottPhi(u)), fore(scottElbow(-1), scottPhi(u))] }), 1.1, 0.3, 1.3),
    equipment: (j) => {
      const d: V3 = [0, Math.cos(SCOTT_ARM), Math.sin(SCOTT_ARM)];
      const off = mul(SCOTT_PAD_N, 0.145);
      const top: V3 = add([0, SCOTT_SH_Y, SCOTT_SH_Z], add(mul(d, 0.06), off));
      const bot: V3 = add(scottElbow(0), add(mul(d, 0.1), off));
      const pad: Prim = { kind: 'box', a: top, b: bot, w: 0.6, t: 0.2, color: 'equip', group: 'scott-pad', bias: -0.02 };
      const under = add(mid(top, bot), mul(SCOTT_PAD_N, 0.08));
      return [
        pad,
        K.box([0, 0, under[2] + 0.05], [0, under[1], under[2] + 0.05], 0.12, 0.08, 'scott-post', 0.6),
        K.box([0, 0.45, j.pelvis[2] - 0.2], [0, 0.45, j.pelvis[2] + 0.22], 0.36, 0.08, 'seat'),
        K.box([0, 0, j.pelvis[2] - 0.02], [0, 0.41, j.pelvis[2] - 0.02], 0.12, 0.08, 'seat-post', 0.6),
        ...curlBar(mid(j.hand[0], j.hand[1])),
      ];
    },
  },

  'rosca-concentrada': {
    handsFrame: 'world',
    elbowPole: [0, -1, 0.15],
    kneePole: [0.6, 0.3, 1],
    toeDir: [0.4, -0.25, 1],
    keys: sweep((u) => ({ ...CONC_BASE, hands: [CONC_LEFT_HAND, fore(CONC_ELBOW, concPhi(u))] }), 1.2, 0.3, 1.4),
    equipment: (j) => [
      K.box([0, 0.43, j.pelvis[2] - 0.25], [0, 0.43, j.pelvis[2] + 0.2], 0.4, 0.08, 'seat'),
      K.box([0, 0, j.pelvis[2] - 0.2], [0, 0.39, j.pelvis[2] - 0.2], 0.3, 0.06, 'seat-leg1', 0.6),
      K.box([0, 0, j.pelvis[2] + 0.15], [0, 0.39, j.pelvis[2] + 0.15], 0.3, 0.06, 'seat-leg2', 0.6),
      ...K.dumbbell(j.hand[1], supAxis(j, 1), { handle: 0.07, group: 'db1' }),
    ],
  },

  'rosca-elastico': {
    ...CURL_OPTS,
    keys: sweep(standCurl(STAND, 0.2)),
    equipment: (j) =>
      j.hand.flatMap((h, i): Prim[] => [
        K.thin(add(j.ankle[i], [0, -0.06, 0.06]), h, `band${i}`, 0.75, 0.022),
        { kind: 'seg', a: add(h, [0.05, 0, 0]), b: add(h, [-0.05, 0, 0]), w: 0.04, color: 'equip', group: `grip${i}`, bias: 0.02 },
      ]),
  },
};
