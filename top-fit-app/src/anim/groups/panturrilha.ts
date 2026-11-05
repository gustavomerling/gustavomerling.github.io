import { add, lerp3, mid, mul, norm, sub, type AnimDef, type Joints, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';
import { legPressFrame, legPressPlate } from './quadriceps';

/*
 * Na panturrilha o pé gira em torno da ponta, mas o rig desenha o pé numa direção fixa (toeDir).
 * Contorno: o pé do rig fica escondido dentro da canela (toeDir ao longo da canela) e cada
 * exercício desenha o próprio pé, do tornozelo até a ponta apoiada.
 */

/** Comprimento do pé, do tornozelo à ponta */
const FL = 0.18;

/** Pé desenhado à parte (mesma cor/espessura do pé do rig). */
const foot = (ankle: V3, toe: V3, i: 0 | 1): Prim => ({
  kind: 'seg',
  a: ankle,
  b: toe,
  w: 0.075,
  color: 'body',
  side: i,
  group: `foot${i}`,
  bias: -0.2,
});
const feetPrims = (j: Joints, toes: [V3, V3]): Prim[] => [foot(j.ankle[0], toes[0], 0), foot(j.ankle[1], toes[1], 1)];

/** Tornozelo com a ponta do pé em `toe` e o pé a `ang` rad da horizontal (positivo = calcanhar para cima). */
const ankleAt = (toe: V3, ang: number): V3 => [toe[0], toe[1] + FL * Math.sin(ang), toe[2] - FL * Math.cos(ang)];

// Ângulos do pé: embaixo (calcanhar abaixo da ponta, alongando) e em cima (na ponta dos pés)
const LOW = -0.3;
const HIGH = 0.9;

// ---------- Em pé (máquina e degrau) ----------

const STEP_TOP = 0.13;
const STAND_TOES: [V3, V3] = [
  [0.13, STEP_TOP + 0.035, 0.15],
  [-0.13, STEP_TOP + 0.035, 0.15],
];
function standing(ang: number, hands: [V3, V3]): Pose {
  const feet: [V3, V3] = [ankleAt(STAND_TOES[0], ang), ankleAt(STAND_TOES[1], ang)];
  return { pelvis: [0, feet[0][1] + 0.925, feet[0][2] - 0.03], pitch: 0.03, hands, feet };
}
/** Plataforma/degrau sob a ponta dos pés (o calcanhar fica para fora, atrás da borda). */
const step = (toeZ: number): Prim[] => [K.box([0, STEP_TOP / 2, toeZ - 0.08], [0, STEP_TOP / 2, toeZ + 0.3], 0.7, STEP_TOP, 'step', undefined, [1, 0, 0])];

const STAND_TOE_DIR: V3 = [0, 1, 0.04];

// ---------- Sentado ----------

const SIT_PELVIS: V3 = [0, 0.62, -0.38];
const SIT_TOES: [V3, V3] = [
  [0.13, STEP_TOP + 0.035, 0.27],
  [-0.13, STEP_TOP + 0.035, 0.27],
];
function seated(ang: number): Pose {
  const feet: [V3, V3] = [ankleAt(SIT_TOES[0], ang), ankleAt(SIT_TOES[1], ang)];
  return { pelvis: SIT_PELVIS, pitch: 0.12, hands: K.sym(0.2, 0, 0), feet };
}
/** Apoio acolchoado sobre as coxas, logo atrás dos joelhos. */
const kneePad = (j: Joints): V3 => lerp3(mid(j.hip[0], j.hip[1]), mid(j.knee[0], j.knee[1]), 0.8);

// ---------- Leg press ----------

const LP_DIR = norm([0, 1, 1]);
const LP_BODY = { pelvis: [0, 0.45, -0.2] as V3, pitch: -0.9 };
const LP_ANKLE_Y = 0.98;
const LP_ANKLE_Z = 0.56;
// Fase (0 = alongado, 1 = na ponta) guardada num deslocamento lateral invisível da pelve
const PHASE = 1e-3;
const lpPose = (phase: number): Pose => ({
  pelvis: [phase * PHASE, LP_BODY.pelvis[1], LP_BODY.pelvis[2]],
  pitch: LP_BODY.pitch,
  hands: [
    [0.3, 0.5, -0.12],
    [-0.3, 0.5, -0.12],
  ],
  feet: [
    [0.15, LP_ANKLE_Y, LP_ANKLE_Z],
    [-0.15, LP_ANKLE_Y, LP_ANKLE_Z],
  ],
});

export const PANTURRILHA: Record<string, AnimDef> = {
  'panturrilha-pe': {
    handsFrame: 'trunk',
    elbowPole: [0.6, -1, 0.2],
    kneePole: [0.2, 0, 1],
    toeDir: STAND_TOE_DIR,
    frame: { top: 2.3 },
    keys: K.cycle(standing(LOW, K.sym(0.28, 0.56, 0.1)), standing(HIGH, K.sym(0.28, 0.56, 0.1)), 0.9, 0.6, 0.5),
    equipment: (j) => {
      const prims: Prim[] = [...step(STAND_TOES[0][2]), ...feetPrims(j, STAND_TOES)];
      // Apoios sobre os ombros, presos a uma coluna atrás
      j.shoulder.forEach((sh, i) => {
        const p = add(sh, mul(j.up, 0.11));
        prims.push({ kind: 'box', a: sub(p, mul(j.fwd, 0.12)), b: add(p, mul(j.fwd, 0.15)), w: 0.13, t: 0.08, color: 'equip', group: `pad${i}`, bias: -0.05 });
      });
      const top = add(mid(j.shoulder[0], j.shoulder[1]), [0, 0.11, -0.12]);
      prims.push(
        K.box([0, 0, -0.42], [0, 2.05, -0.42], 0.16, 0.1, 'column', 0.35),
        K.box(top, [0, top[1] + 0.04, -0.42], 0.5, 0.05, 'arm', 0.6),
      );
      return prims;
    },
  },

  'panturrilha-sentado': {
    handsFrame: 'world',
    elbowPole: [1, -0.4, -0.3],
    kneePole: [0.15, 1, 0.3],
    toeDir: [0, 1, 0.05],
    frame: { side: [-1.0, 1.0], top: 1.7 },
    keys: K.cycle(
      { ...seated(LOW), hands: K.sym(0.22, 0.79, 0.0) },
      { ...seated(HIGH), hands: K.sym(0.22, 0.91, 0.02) },
      0.9,
      0.5,
      0.5,
    ),
    equipment: (j) => {
      const pad = add(kneePad(j), [0, 0.13, 0]);
      return [
        ...step(SIT_TOES[0][2]),
        ...feetPrims(j, SIT_TOES),
        K.box([0, 0.5, -0.62], [0, 0.5, -0.1], 0.42, 0.08, 'seat'),
        K.box([0, 0, -0.38], [0, 0.46, -0.38], 0.14, 0.1, 'seat-post', 0.6),
        K.box([0, 0.03, -0.8], [0, 0.03, 0.5], 0.3, 0.06, 'base', 0.5),
        // Apoio dos joelhos + braço da máquina
        { kind: 'seg', a: add(pad, [0.3, 0, 0]), b: add(pad, [-0.3, 0, 0]), w: 0.12, color: 'equip', group: 'knee-pad', bias: 0.3 },
        K.box([0.32, pad[1], pad[2]], [0.32, 0.05, pad[2] + 0.12], 0.05, 0.05, 'lever0', 0.6, [0, 0, 1]),
        K.box([-0.32, pad[1], pad[2]], [-0.32, 0.05, pad[2] + 0.12], 0.05, 0.05, 'lever1', 0.6, [0, 0, 1]),
      ];
    },
  },

  'panturrilha-leg': {
    handsFrame: 'world',
    elbowPole: [1, -0.6, -0.4],
    kneePole: [0.3, 1, -0.3],
    frame: { side: [-1.15, 1.25], top: 1.75 },
    // O pé do rig some dentro da canela (direção quadril → tornozelo, invertida)
    toeDir: norm(sub(LP_BODY.pelvis, [0, LP_ANKLE_Y, LP_ANKLE_Z])),
    keys: K.cycle(lpPose(0), lpPose(1), 0.9, 0.5, 0.5),
    equipment: (j) => {
      const phase = j.pelvis[0] / PHASE;
      const leg = norm(sub([0, LP_ANKLE_Y, LP_ANKLE_Z], LP_BODY.pelvis)); // quadril → tornozelo
      const up: V3 = norm([0, leg[2], -leg[1]]); // perpendicular à perna, para cima
      const ang = LOW + (HIGH - LOW) * phase; // > 0: ponta do pé empurra para longe
      const dir = norm(add(mul(up, Math.cos(ang)), mul(leg, Math.sin(ang))));
      const toes = j.ankle.map((a) => add(a, mul(dir, FL))) as [V3, V3];
      const sole = add(mid(toes[0], toes[1]), mul(LP_DIR, 0.01));
      return [...legPressFrame(j), legPressPlate(sole, 0.03, 0.55), ...feetPrims(j, toes)];
    },
  },

  'panturrilha-degrau': {
    handsFrame: 'world',
    elbowPole: [1, -0.6, -0.3],
    kneePole: [0.2, 0, 1],
    toeDir: STAND_TOE_DIR,
    frame: { side: [-0.9, 1.1], top: 2.3 },
    keys: K.cycle(
      standing(LOW, [
        [0.25, 1.05, 0.58],
        [-0.25, 1.05, 0.58],
      ]),
      standing(HIGH, [
        [0.25, 1.05, 0.58],
        [-0.25, 1.05, 0.58],
      ]),
      0.9,
      0.5,
      0.5,
    ),
    equipment: (j) => [
      ...step(STAND_TOES[0][2]),
      ...feetPrims(j, STAND_TOES),
      // Barra de apoio à frente
      K.box([0.45, 1.05, 0.62], [-0.45, 1.05, 0.62], 0.05, 0.05, 'rail', 0.8, [0, 0, 1]),
      K.box([0.45, 0, 0.62], [0.45, 1.05, 0.62], 0.05, 0.05, 'rail-post0', 0.5, [0, 0, 1]),
      K.box([-0.45, 0, 0.62], [-0.45, 1.05, 0.62], 0.05, 0.05, 'rail-post1', 0.5, [0, 0, 1]),
    ],
  },
};
