import { add, mid, mul, sub, trunkAxes, type AnimDef, type Pose, type Prim, type V3 } from '../rig';
import * as K from '../kit';
import { kettlebell } from './posterior';

/**
 * Deitado de costas com a parte alta das costas apoiada em S (ponto de contato, nas costas),
 * girando o tronco em torno dele: devolve a pelve para a inclinação `pitch`.
 */
function pivotPelvis(S: V3, pitch: number, along = 0.45): V3 {
  const { up, fwd } = trunkAxes(pitch, true);
  // fwd = peito; as costas ficam em -fwd, a 0,1 m do eixo do tronco
  return sub(add(S, mul(fwd, 0.1)), mul(up, along));
}

// ---------- Elevação pélvica (costas no banco) ----------
const HT_S: V3 = [0, 0.47, 0.5];
const HT_FEET = K.sym(0.17, 0.07, -0.42);
const thrust = (pitch: number): Pose => ({
  pelvis: pivotPelvis(HT_S, pitch),
  pitch,
  // Mãos segurando a barra sobre o quadril
  hands: K.sym(0.32, 0.04, 0.2),
  feet: HT_FEET,
});
const HT_RIG = {
  supine: true,
  handsFrame: 'trunk' as const,
  elbowPole: [1, 0.6, 0] as V3,
  kneePole: [0.25, 1, -0.2] as V3,
  toeDir: [0.25, -0.2, 1] as V3,
  frame: { side: [-1.1, 1.1] as [number, number], top: 1.6 },
};
/** Banco atravessado, embaixo das escápulas */
const thrustBench = (): Prim[] => [
  K.box([0.55, 0.42, HT_S[2] + 0.15], [-0.55, 0.42, HT_S[2] + 0.15], 0.32, 0.08, 'ht-bench'),
  K.box([0, 0, HT_S[2] + 0.15], [0, 0.38, HT_S[2] + 0.15], 0.24, 0.06, 'ht-bench-leg', 0.6, [0, 0, 1]),
];

// ---------- Ponte de glúteo (no chão) ----------
const MAT = 0.035;
const BR_S: V3 = [0, MAT + 0.005, 0.47];
const BR_FEET = K.sym(0.15, MAT + 0.07, -0.4);
const bridge = (pitch: number): Pose => {
  const pelvis = pivotPelvis(BR_S, pitch);
  return {
    pelvis,
    pitch,
    // Braços estendidos no chão, ao lado do corpo
    hands: [
      [0.26, MAT + 0.04, pelvis[2] - 0.02],
      [-0.26, MAT + 0.04, pelvis[2] - 0.02],
    ],
    feet: BR_FEET,
    // Cabeça continua deitada no colchonete enquanto o quadril sobe
    headDir: [0, 0.05, 1],
  };
};

// ---------- Cadeira abdutora ----------
const abd = (open: number): Pose => ({
  pelvis: [0, 0.6, -0.08],
  pitch: -0.1,
  hands: K.sym(0.33, 0.58, 0.02),
  feet: K.sym(0.13 + open, 0.13, 0.43 - open * 0.2),
});

// ---------- Coice na polia ----------
const KICK: Omit<Pose, 'feet'> = {
  pelvis: [0, 0.98, -0.05],
  pitch: 0.38,
  hands: K.sym(0.2, 1.22, 0.45),
};
const kick = (right: V3): Pose => ({ ...KICK, feet: [[0.11, 0.07, 0.02], right] });
const PULLEY: V3 = [-0.11, 0.12, 0.62];

// ---------- Passada ----------
const LUNGE_UP: Omit<Pose, 'feet'> = { pelvis: [0, 0.99, 0], pitch: 0.04, hands: K.sym(0.25, -0.05, 0.02) };
const lungeStand: Pose = { ...LUNGE_UP, feet: K.sym(0.12, 0.07, 0) };
/** i = perna que vai à frente */
function lungeDown(i: 0 | 1): Pose {
  const front: V3 = [i === 0 ? 0.12 : -0.12, 0.07, 0.88];
  const back: V3 = [i === 0 ? -0.12 : 0.12, 0.13, 0.02];
  return {
    pelvis: [0, 0.56, 0.45],
    pitch: 0.1,
    hands: K.sym(0.25, -0.05, 0.02),
    feet: (i === 0 ? [front, back] : [back, front]) as [V3, V3],
  };
}
/** Passo no ar: pé da frente levantado no meio do caminho */
function lungeStep(i: 0 | 1): Pose {
  const d = lungeDown(i);
  const f = d.feet[i];
  const feet: [V3, V3] = [...d.feet];
  feet[i] = [f[0], 0.22, 0.45];
  feet[1 - i] = lungeStand.feet[1 - i];
  return { ...LUNGE_UP, pelvis: [0, 0.94, 0.15], pitch: 0.08, feet };
}

// ---------- Caminhada lateral ----------
const SIDE_Y = 0.83;
const sideStep = (px: number, left: V3, right: V3): Pose => ({
  pelvis: [px, SIDE_Y, -0.1],
  pitch: 0.32,
  hands: K.sym(0.12, 0.32, 0.22),
  feet: [left, right],
});
const FY = 0.07;
const ss0 = sideStep(0, [0.2, FY, 0], [-0.2, FY, 0]);
const ss1 = sideStep(-0.06, [0.2, FY, 0], [-0.33, 0.16, 0]); // pé direito no ar
const ss2 = sideStep(-0.14, [0.2, FY, 0], [-0.46, FY, 0]);
const ss3 = sideStep(-0.2, [0.06, 0.16, 0], [-0.46, FY, 0]); // esquerdo acompanha
const ss4 = sideStep(-0.26, [-0.06, FY, 0], [-0.46, FY, 0]);
const ss5 = sideStep(-0.2, [-0.06, FY, 0], [-0.33, 0.16, 0]);
const ss6 = sideStep(-0.12, [-0.06, FY, 0], [-0.2, FY, 0]);

// ---------- Sumô com kettlebell ----------
const SUMO_FEET = K.sym(0.36, 0.07, 0);
const sumoUp: Pose = { pelvis: [0, 0.94, 0], pitch: 0.08, hands: K.sym(0.04, 0.88, 0.07), feet: SUMO_FEET };
const sumoDown: Pose = { pelvis: [0, 0.55, -0.1], pitch: 0.32, hands: K.sym(0.04, 0.47, 0.06), feet: SUMO_FEET };

export const GLUTEOS: Record<string, AnimDef> = {
  'elevacao-pelvica': {
    ...HT_RIG,
    keys: K.cycle(thrust(0.9), thrust(Math.PI / 2), 1.0, 0.4, 0.4),
    equipment: (j) => [...thrustBench(), ...K.barbell(add(mid(j.hand[0], j.hand[1]), mul(j.fwd, 0.02)))],
  },

  'elevacao-pelvica-maquina': {
    ...HT_RIG,
    keys: K.cycle(
      { ...thrust(0.9), hands: K.sym(0.3, 0.42, -0.02) },
      { ...thrust(Math.PI / 2), hands: K.sym(0.3, 0.42, -0.02) },
      1.0,
      0.4,
      0.4,
    ),
    equipment: (j) => {
      const pad = add(j.pelvis, mul(j.fwd, 0.17));
      const pivot: V3 = [0, 0.3, -0.75];
      return [
        // Encosto fixo e base
        K.box([0, 0.44, HT_S[2] + 0.02], [0, 0.44, HT_S[2] + 0.45], 0.4, 0.08, 'ht-back'),
        K.box([0, 0, HT_S[2] + 0.3], [0, 0.4, HT_S[2] + 0.3], 0.16, 0.08, 'ht-back-post', 0.6),
        K.box([0, 0.03, -0.85], [0, 0.03, HT_S[2] + 0.45], 0.5, 0.05, 'ht-base', 0.6),
        K.box([0, 0, pivot[2]], [0, pivot[1], pivot[2]], 0.14, 0.08, 'ht-pivot-post', 0.6),
        // Apoio acolchoado no quadril, preso ao braço da alavanca
        { kind: 'seg', a: add(pad, [0.24, 0, 0]), b: add(pad, [-0.24, 0, 0]), w: 0.11, color: 'equip', group: 'hip-pad', bias: 0.04 },
        K.thin([0.3, pad[1], pad[2]], [0.3, pivot[1], pivot[2]], 'ht-lever', 0.6, 0.04),
        ...j.hand.map((h, i) => ({ kind: 'seg' as const, a: add(h, [0, 0, -0.05]), b: add(h, [0, 0, 0.05]), w: 0.04, color: 'equip' as const, group: `grip${i}`, bias: 0.02 })),
      ];
    },
  },

  'ponte-gluteo': {
    supine: true,
    handsFrame: 'world',
    elbowPole: [0.3, -1, 0],
    kneePole: [0.25, 1, -0.2],
    toeDir: [0.25, -0.2, 1],
    frame: { side: [-1.0, 1.1], top: 1.4 },
    keys: K.cycle(bridge(Math.PI / 2), bridge(Math.PI / 2 + 0.55), 0.9, 0.9, 0.5),
    equipment: () => [K.box([0, MAT / 2, -0.7], [0, MAT / 2, 0.85], 0.6, MAT, 'mat', 0.5)],
  },

  'cadeira-abdutora': {
    handsFrame: 'world',
    elbowPole: [1, -0.5, -0.5],
    kneePole: [0.3, 0.3, 1],
    toeDir: [0.1, -0.2, 1],
    frame: { front: [-1.0, 1.0] },
    keys: K.cycle(abd(0), abd(0.3), 1.0, 0.3, 0.4),
    equipment: (j) => {
      const prims = K.machineSeat(j);
      j.knee.forEach((k, i) => {
        const s = i === 0 ? 1 : -1;
        const pad = add(k, [s * 0.1, 0, -0.02]);
        prims.push(
          { kind: 'box', a: add(pad, [0, 0, -0.18]), b: add(pad, [0, 0, 0.08]), w: 0.14, t: 0.06, across: [0, 1, 0], color: 'equip', group: `pad${i}`, bias: 0.02 },
          { kind: 'seg', a: add(j.ankle[i], [0, -0.03, -0.02]), b: add(j.ankle[i], [0, -0.03, 0.2]), w: 0.05, color: 'equip', group: `foot${i}`, bias: 0.02 },
        );
      });
      prims.push(...j.hand.map((h, i): Prim => ({ kind: 'seg', a: add(h, [0, 0, -0.05]), b: add(h, [0, 0, 0.05]), w: 0.04, color: 'equip', group: `grip${i}`, bias: 0.02 })));
      return prims;
    },
  },

  'coice-polia': {
    handsFrame: 'world',
    elbowPole: [0.4, -1, -0.3],
    kneePole: [0.1, -0.2, 1],
    frame: { side: [-1.2, 1.0] },
    keys: K.cycle(kick([-0.11, 0.14, 0.04]), kick([-0.11, 0.5, -0.78]), 0.9, 0.3, 0.4),
    equipment: (j) => [
      K.box([0, 0, 0.72], [0, 1.9, 0.72], 0.32, 0.1, 'column', 0.35),
      { kind: 'circle', a: PULLEY, w: 0.05, color: 'equip', group: 'pulley', bias: K.STRUCTURE },
      K.thin(PULLEY, j.ankle[1], 'cable', 0.7),
      // Caneleira no tornozelo
      { kind: 'seg', a: add(j.ankle[1], [0.06, 0.03, 0]), b: add(j.ankle[1], [-0.06, 0.03, 0]), w: 0.08, color: 'equip', group: 'cuff', bias: 0.02 },
      ...j.hand.map((h, i): Prim => ({ kind: 'seg', a: add(h, [0, -0.05, 0]), b: add(h, [0, 0.05, 0]), w: 0.04, color: 'equip', group: `grip${i}`, bias: 0.02 })),
    ],
  },

  passada: {
    handsFrame: 'trunk',
    elbowPole: [0.2, 0, -1],
    kneePole: [0.2, 0, 1],
    toeDir: [0.15, -0.45, 1],
    frame: { side: [-0.75, 1.45] },
    keys: [
      { t: 0, pose: lungeStand },
      { t: 0.3, pose: lungeStand },
      { t: 0.65, pose: lungeStep(1) },
      { t: 1.0, pose: lungeDown(1) },
      { t: 1.25, pose: lungeDown(1) },
      { t: 1.65, pose: lungeStep(1) },
      { t: 2.0, pose: lungeStand },
      { t: 2.3, pose: lungeStand },
      { t: 2.65, pose: lungeStep(0) },
      { t: 3.0, pose: lungeDown(0) },
      { t: 3.25, pose: lungeDown(0) },
      { t: 3.65, pose: lungeStep(0) },
      { t: 4.0, pose: lungeStand },
    ],
    equipment: (j) => K.twoDumbbells(j, [0, 0, 1]),
  },

  'caminhada-lateral': {
    handsFrame: 'trunk',
    elbowPole: [0.6, -1, 0],
    kneePole: [0.35, 0, 1],
    frame: { front: [-1.15, 0.85] },
    keys: [
      { t: 0, pose: ss0 },
      { t: 0.2, pose: ss0 },
      { t: 0.5, pose: ss1, ease: 'in' },
      { t: 0.8, pose: ss2, ease: 'out' },
      { t: 1.1, pose: ss3, ease: 'in' },
      { t: 1.4, pose: ss4, ease: 'out' },
      { t: 1.7, pose: ss4 },
      { t: 2.0, pose: ss3, ease: 'in' },
      { t: 2.3, pose: ss2, ease: 'out' },
      { t: 2.6, pose: ss5, ease: 'in' },
      { t: 2.9, pose: ss6, ease: 'out' },
      { t: 3.2, pose: ss0 },
    ],
    equipment: (j) => {
      // Elástico em volta das coxas, logo acima dos joelhos
      const p0 = add(j.hip[0], mul(sub(j.knee[0], j.hip[0]), 0.85));
      const p1 = add(j.hip[1], mul(sub(j.knee[1], j.hip[1]), 0.85));
      return [{ kind: 'seg', a: add(p0, [0.05, 0, 0]), b: add(p1, [-0.05, 0, 0]), w: 0.03, color: 'equip', group: 'band', opacity: 0.8, bias: 0.06 }];
    },
  },

  'kettlebell-sumo': {
    handsFrame: 'world',
    elbowPole: [0.6, -0.3, -0.6],
    kneePole: [0.75, 0, 0.65],
    toeDir: [0.7, -0.25, 0.7],
    frame: { front: [-1.0, 1.0] },
    keys: K.cycle(sumoUp, sumoDown, 1.1, 0.3, 0.4),
    equipment: (j) => kettlebell(j),
  },
};
