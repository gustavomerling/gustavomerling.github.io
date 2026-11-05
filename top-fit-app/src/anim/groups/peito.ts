import { add, mid, type AnimDef, type Prim, type V3 } from '../rig';
import * as K from '../kit';

export const PEITO: Record<string, AnimDef> = {
  // ---------------- Peito ----------------
  'supino-reto-halteres': {
    ...K.LYING,
    elbowPole: [1, -0.6, 0],
    keys: K.cycle({ ...K.lying, hands: K.sym(0.13, 0.42, 0.6) }, { ...K.lying, hands: K.sym(0.42, 0.42, 0.13) }),
    equipment: (j) => [...K.flatBench(K.FLAT_Z), ...K.twoDumbbells(j, [1, 0, 0])],
  },

  'supino-reto-barra': {
    ...K.LYING,
    elbowPole: [1, -0.6, 0],
    keys: K.cycle({ ...K.lying, hands: K.sym(0.4, 0.42, 0.6) }, { ...K.lying, hands: K.sym(0.4, 0.42, 0.15) }),
    equipment: (j) => [...K.flatBench(K.FLAT_Z), ...K.rack(K.FLAT_Z + 0.8), ...K.barbell(mid(j.hand[0], j.hand[1]))],
  },

  'supino-inclinado-halteres': {
    ...K.LYING,
    elbowPole: [1, -0.6, 0],
    frame: { side: [-1.05, 1.05], top: 1.9 },
    keys: K.cycle({ ...K.INCLINE, hands: K.sym(0.13, 0.7, 0.52) }, { ...K.INCLINE, hands: K.sym(0.42, 0.45, 0.14) }),
    equipment: (j) => [...K.inclineBench(j), ...K.twoDumbbells(j, [1, 0, 0])],
  },

  'supino-inclinado-barra': {
    ...K.LYING,
    elbowPole: [1, -0.6, 0],
    frame: { side: [-1.05, 1.05], top: 1.9 },
    keys: K.cycle({ ...K.INCLINE, hands: K.sym(0.4, 0.72, 0.5) }, { ...K.INCLINE, hands: K.sym(0.4, 0.45, 0.15) }),
    equipment: (j) => [...K.inclineBench(j), ...K.barbell(mid(j.hand[0], j.hand[1]))],
  },

  'supino-maquina': {
    handsFrame: 'trunk',
    elbowPole: [1, -0.5, -0.6],
    kneePole: [0.25, 1, 1],
    keys: K.cycle({ ...K.SEATED, hands: K.sym(0.32, 0.42, 0.14) }, { ...K.SEATED, hands: K.sym(0.26, 0.42, 0.6) }, 1.0),
    equipment: (j) => {
      const prims = K.machineSeat(j);
      j.hand.forEach((h, i) => {
        const s = i === 0 ? 1 : -1;
        const pivot: V3 = [s * 0.35, 1.55, j.pelvis[2] - 0.3];
        prims.push(
          { kind: 'seg', a: add(h, [0, -0.07, 0]), b: add(h, [0, 0.07, 0]), w: 0.045, color: 'equip', group: `handle${i}`, bias: 0.02 },
          K.thin(add(h, [s * 0.06, 0.07, 0]), pivot, `lever${i}`, 0.5, 0.035),
        );
      });
      return prims;
    },
  },

  'crucifixo-halteres': {
    ...K.LYING,
    elbowPole: [0.4, -1, 0],
    keys: K.arc(
      { ...K.lying, hands: K.sym(0.1, 0.45, 0.58) },
      { ...K.lying, hands: K.sym(0.45, 0.45, 0.42) },
      { ...K.lying, hands: K.sym(0.66, 0.45, 0.1) },
    ),
    // Pegada neutra: halteres alinhados com o corpo
    equipment: (j) => [...K.flatBench(K.FLAT_Z), ...K.twoDumbbells(j, j.up)],
  },

  voador: {
    handsFrame: 'world',
    elbowPole: [1, -0.7, -0.2],
    kneePole: [0.25, 1, 1],
    keys: K.arc(
      { ...K.SEATED, pitch: 0, hands: K.sym(0.52, 1.38, -0.02) },
      { ...K.SEATED, pitch: 0, hands: K.sym(0.38, 1.38, 0.3) },
      { ...K.SEATED, pitch: 0, hands: K.sym(0.1, 1.38, 0.42) },
    ),
    equipment: (j) => {
      const prims = K.machineSeat(j);
      j.hand.forEach((h, i) => {
        const s = i === 0 ? 1 : -1;
        prims.push(
          { kind: 'box', a: j.elbow[i], b: h, w: 0.12, t: 0.07, color: 'equip', group: `pad${i}`, across: [0, 0, 1], bias: 0.02 },
          K.thin(add(h, [0, 0.05, 0]), [s * 0.12, 1.7, j.pelvis[2] - 0.12], `arm${i}m`, 0.5, 0.035),
        );
      });
      return prims;
    },
  },

  crossover: {
    handsFrame: 'world',
    elbowPole: [1, 0.2, -1],
    frame: { front: [-1.3, 1.3], top: 2.25 },
    keys: K.arc(
      { ...K.STAGGER, pitch: 0.25, hands: K.sym(0.78, 1.5, -0.05) },
      { ...K.STAGGER, pitch: 0.25, hands: K.sym(0.5, 1.28, 0.32) },
      { ...K.STAGGER, pitch: 0.25, hands: K.sym(0.07, 0.95, 0.48) },
    ),
    equipment: (j) => {
      const prims: Prim[] = [];
      j.hand.forEach((h, i) => {
        const s = i === 0 ? 1 : -1;
        const pulley: V3 = [s * 1.04, 1.95, -0.15];
        prims.push(
          K.box([s * 1.14, 0, -0.15], [s * 1.14, 2.15, -0.15], 0.14, 0.08, `post${i}`, 0.5, [0, 0, 1]),
          { kind: 'circle', a: pulley, w: 0.05, color: 'equip', group: `pulley${i}`, bias: K.STRUCTURE },
          K.thin(pulley, h, `cable${i}`, 0.7),
          { kind: 'seg', a: add(h, [0, -0.05, 0]), b: add(h, [0, 0.05, 0]), w: 0.04, color: 'equip', group: `grip${i}`, bias: 0.02 },
        );
      });
      return prims;
    },
  },

  flexao: {
    handsFrame: 'world',
    elbowPole: [0.7, 0.3, -1],
    kneePole: [0, -1, 0],
    toeDir: [0.05, -0.75, 0.66],
    frame: { side: [-1.2, 0.9], top: 1.3 },
    keys: K.cycle({ ...K.plank(0.39), hands: K.PUSH_HANDS }, { ...K.plank(0.1), hands: K.PUSH_HANDS }, 1.0),
  },

  'mergulho-paralelas': {
    handsFrame: 'world',
    elbowPole: [0.15, 0, -1],
    kneePole: [0.1, 0, 1],
    toeDir: [0.1, -0.6, -0.8],
    frame: { top: 2.2 },
    keys: K.cycle(K.dipTop, K.dipBottom, 1.1),
    equipment: () =>
      [0.3, -0.3].flatMap((x, i): Prim[] => [
        { kind: 'seg', a: [x, 1.12, -0.38], b: [x, 1.12, 0.45], w: 0.05, color: 'equip', group: `bar${i}` },
        { kind: 'seg', a: [x, 0, 0.42], b: [x, 1.12, 0.42], w: 0.06, color: 'equip', group: `post${i}`, opacity: 0.5, bias: K.STRUCTURE },
      ]),
  },

  'supino-elastico': {
    handsFrame: 'trunk',
    elbowPole: [1, -0.5, -0.6],
    keys: K.cycle({ ...K.STAGGER, hands: K.sym(0.3, 0.42, 0.1) }, { ...K.STAGGER, hands: K.sym(0.2, 0.42, 0.6) }, 1.0),
    equipment: (j) => {
      const anchor: V3 = [0, 1.28, -0.7];
      return [
        K.box([0, 0, -0.75], [0, 1.7, -0.75], 0.12, 0.08, 'anchor-post', 0.3),
        K.thin(anchor, j.hand[0], 'band0', 0.75, 0.022),
        K.thin(anchor, j.hand[1], 'band1', 0.75, 0.022),
      ];
    },
  },
};
