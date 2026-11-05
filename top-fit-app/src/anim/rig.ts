/**
 * Boneco 3D minimalista (estilo pictograma) projetado em vista frontal e lateral.
 *
 * Coordenadas em metros: y para cima (chão em 0), z para a frente da pessoa,
 * x para a esquerda da pessoa. Índice 0 = lado esquerdo, 1 = lado direito.
 * Vista frontal: tela = (x, y), profundidade = z (quem está à frente fica por cima).
 * Vista lateral: olhamos do lado direito da pessoa, ela olha para a direita da tela:
 *   tela = (z, y), profundidade = -x (lado direito mais perto).
 *
 * Inclinação do tronco (pitch): 0 = em pé; π/2 = deitado com a cabeça para +z.
 * Com `supine`, o peito fica para cima (deitado de costas / banco inclinado);
 * sem ele, com pitch π/2, o peito fica para baixo (prancha/flexão).
 */

export type V3 = [number, number, number];
export type View = 'front' | 'side';

export const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const len = (a: V3) => Math.hypot(a[0], a[1], a[2]);
export const norm = (a: V3): V3 => {
  const l = len(a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp3 = (a: V3, b: V3, t: number): V3 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
export const mid = (a: V3, b: V3) => lerp3(a, b, 0.5);

/** Medidas do boneco (~1,80 m). */
export const BODY = {
  shin: 0.46,
  thigh: 0.47,
  trunk: 0.58,
  headR: 0.115,
  headGap: 0.17,
  shoulderHalf: 0.19,
  shoulderDrop: 0.06,
  hipHalf: 0.1,
  upperArm: 0.31,
  forearm: 0.29,
  foot: 0.19,
};

/** Pose-chave. Mãos podem ser dadas no referencial do tronco (seguem a inclinação) ou do mundo. */
export interface Pose {
  pelvis: V3;
  /** Inclinação do tronco para a frente, em radianos */
  pitch: number;
  hands: [V3, V3];
  feet: [V3, V3];
  /** Rotação do corpo todo em torno do eixo do tronco (ex.: prancha lateral = π/2). */
  roll?: number;
  /** Rotação só dos ombros em torno do eixo do tronco (ex.: giro russo). */
  twist?: number;
  /** Giro do corpo todo em torno do eixo vertical do mundo. */
  yaw?: number;
  /** Direção de cada pé nesta pose (mundo, sem espelhar): [esquerdo, direito]. Sobrepõe `toeDir`. */
  toes?: [V3, V3];
  /** Direção da cabeça a partir do pescoço (mundo). Sobrepõe o cálculo automático. */
  headDir?: V3;
}

export interface RigOptions {
  handsFrame?: 'trunk' | 'world';
  /** Deitado de costas / recostado: o peito fica virado para cima */
  supine?: boolean;
  /** Para onde apontam os cotovelos (direção no mundo; o x é espelhado por lado) */
  elbowPole?: V3;
  /** Para onde apontam os joelhos */
  kneePole?: V3;
  /** Direção do pé, do tornozelo para a ponta (x espelhado por lado) */
  toeDir?: V3;
}

export interface Joints {
  pelvis: V3;
  neck: V3;
  head: V3;
  up: V3; // eixo do tronco
  fwd: V3; // para onde o peito aponta
  lat: V3; // eixo lateral dos ombros (para a esquerda da pessoa)
  shoulder: [V3, V3];
  elbow: [V3, V3];
  hand: [V3, V3];
  hip: [V3, V3];
  knee: [V3, V3];
  ankle: [V3, V3];
  toe: [V3, V3];
}

const SIDE = [1, -1] as const; // esquerda = +x
const mirror = (v: V3, s: number): V3 => [s * v[0], v[1], v[2]];

const rotY = (v: V3, a: number): V3 => [v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a)];
const rotX = (v: V3, a: number): V3 => [v[0], v[1] * Math.cos(a) - v[2] * Math.sin(a), v[1] * Math.sin(a) + v[2] * Math.cos(a)];

/**
 * Eixos do tronco: roll (em torno do próprio eixo), depois pitch (inclinação para a frente), depois yaw (giro no mundo).
 * `lat` aponta para a esquerda da pessoa, `fwd` para onde o peito aponta.
 */
export function trunkAxes(pitch: number, supine = false, roll = 0, yaw = 0) {
  const t = (v: V3) => rotY(rotX(rotY(v, roll), pitch), yaw);
  const up = t([0, 1, 0]);
  const f = t([0, 0, 1]);
  const lat = t([1, 0, 0]);
  return { up, fwd: supine ? mul(f, -1) : f, lat };
}

/** Ponto no referencial do tronco: x lateral, a ao longo do tronco (a partir da pelve), f para onde o peito aponta. */
export function trunkPoint(pelvis: V3, pitch: number, p: V3, supine = false, roll = 0, yaw = 0): V3 {
  const { up, fwd, lat } = trunkAxes(pitch, supine, roll, yaw);
  return add(add(add(pelvis, mul(lat, p[0])), mul(up, p[1])), mul(fwd, p[2]));
}

/** IK de dois ossos: devolve a articulação do meio (cotovelo/joelho). */
function ik(root: V3, target: V3, a: number, b: number, pole: V3): V3 {
  const d0 = sub(target, root);
  const d = Math.min(Math.max(len(d0), Math.abs(a - b) + 1e-3), a + b - 1e-4);
  const u = norm(d0);
  let p = sub(pole, mul(u, dot(pole, u)));
  if (len(p) < 1e-6) p = [0, 0, 1];
  p = norm(p);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const sinA = Math.sqrt(Math.max(0, 1 - cosA * cosA));
  return add(root, add(mul(u, a * cosA), mul(p, a * sinA)));
}

export function solve(pose: Pose, opt: RigOptions = {}): Joints {
  const { pelvis, pitch } = pose;
  const roll = pose.roll ?? 0;
  const yaw = pose.yaw ?? 0;
  const twist = pose.twist ?? 0;
  const { up, lat: hipLat } = trunkAxes(pitch, opt.supine, roll, yaw);
  // Ombros podem girar em relação ao quadril (twist)
  const { fwd, lat } = trunkAxes(pitch, opt.supine, roll + twist, yaw);
  const neck = add(pelvis, mul(up, BODY.trunk));
  // Em pé inclinado, a cabeça "olha para a frente" (endireita um pouco). Deitado, fica alinhada.
  const blend = opt.supine ? 0 : 0.45 * Math.max(Math.cos(pitch), 0);
  const headDir = norm(add(mul(up, 1 - blend), [0, blend, 0]));
  const head = add(neck, mul(pose.headDir ? norm(pose.headDir) : headDir, BODY.headGap));

  const hands = pose.hands.map((h) =>
    opt.handsFrame === 'world' ? h : trunkPoint(pelvis, pitch, h, opt.supine, roll + twist, yaw),
  ) as [V3, V3];
  const elbowPole = opt.elbowPole ?? [0.5, -0.4, -1];
  const kneePole = opt.kneePole ?? [0.3, 0, 1];
  const toeDir = opt.toeDir ?? [0.3, -0.25, 1];

  const shoulder = SIDE.map((s) => add(add(pelvis, mul(up, BODY.trunk - BODY.shoulderDrop)), mul(lat, s * BODY.shoulderHalf))) as [V3, V3];
  const elbow = SIDE.map((s, i) => ik(shoulder[i], hands[i], BODY.upperArm, BODY.forearm, mirror(elbowPole, s))) as [V3, V3];
  const hip = SIDE.map((s) => add(pelvis, mul(hipLat, s * BODY.hipHalf))) as [V3, V3];
  const knee = SIDE.map((s, i) => ik(hip[i], pose.feet[i], BODY.thigh, BODY.shin, mirror(kneePole, s))) as [V3, V3];
  const toe = SIDE.map((s, i) => add(pose.feet[i], mul(norm(pose.toes ? pose.toes[i] : mirror(toeDir, s)), BODY.foot))) as [V3, V3];

  return { pelvis, neck, head, up, fwd, lat, shoulder, elbow, hand: hands, hip, knee, ankle: pose.feet, toe };
}

// ---------- Primitivas de desenho ----------

export type Side = 0 | 1 | null;

export interface Prim {
  /** seg: cápsula de a até b. circle: esfera em a. box: caixa de a até b (w = largura, t = espessura). */
  kind: 'seg' | 'circle' | 'box';
  a: V3;
  b?: V3;
  /** Espessura (seg), raio (circle) ou largura (box). Pode variar por vista. */
  w: number | { front: number; side: number };
  /** box: espessura */
  t?: number;
  /** box: direção da largura (padrão: x) */
  across?: V3;
  color: 'body' | 'equip';
  side?: Side;
  /** Desempate na ordem de desenho */
  bias?: number;
  /** Partes do mesmo grupo (ex.: um braço inteiro) são desenhadas juntas, sem contorno entre elas */
  group?: string;
  opacity?: number;
}

export function bodyPrims(j: Joints): Prim[] {
  const torsoA = add(j.pelvis, mul(j.up, 0.06));
  const torsoB = add(j.pelvis, mul(j.up, BODY.trunk - 0.1));
  const prims: Prim[] = [
    { kind: 'seg', a: torsoA, b: torsoB, w: { front: 0.3, side: 0.2 }, color: 'body', side: null, group: 'torso', bias: 0.005 },
    { kind: 'circle', a: j.head, w: BODY.headR, color: 'body', side: null, group: 'head' },
  ];
  for (const i of [0, 1] as const) {
    const leg = `leg${i}`;
    const arm = `arm${i}`;
    prims.push(
      { kind: 'seg', a: j.hip[i], b: j.knee[i], w: 0.12, color: 'body', side: i, group: leg },
      { kind: 'seg', a: j.knee[i], b: j.ankle[i], w: 0.1, color: 'body', side: i, group: leg },
      { kind: 'seg', a: j.ankle[i], b: j.toe[i], w: 0.075, color: 'body', side: i, group: leg },
      { kind: 'seg', a: j.shoulder[i], b: j.elbow[i], w: 0.09, color: 'body', side: i, bias: 0.01, group: arm },
      { kind: 'seg', a: j.elbow[i], b: j.hand[i], w: 0.08, color: 'body', side: i, bias: 0.01, group: arm },
    );
  }
  return prims;
}

/** Os 8 cantos de uma caixa orientada de a até b. */
export function boxCorners(p: Prim): V3[] {
  const axis = norm(sub(p.b!, p.a));
  let across = norm(p.across ?? [1, 0, 0]);
  if (Math.abs(dot(across, axis)) > 0.95) across = [0, 0, 1];
  const n = norm(cross(axis, across));
  across = norm(cross(n, axis));
  const w = (typeof p.w === 'number' ? p.w : p.w.front) / 2;
  const t = (p.t ?? 0.06) / 2;
  const out: V3[] = [];
  for (const e of [p.a, p.b!]) for (const sw of [-w, w]) for (const st of [-t, t]) out.push(add(add(e, mul(across, sw)), mul(n, st)));
  return out;
}

export const project = (p: V3, view: View): [number, number] => (view === 'front' ? [p[0], p[1]] : [p[2], p[1]]);
export const depth = (p: V3, view: View) => (view === 'front' ? p[2] : -p[0]);

// ---------- Animação por poses-chave ----------

export type Ease = 'inout' | 'in' | 'out' | 'linear';

export interface Key {
  t: number; // segundos
  pose: Pose;
  /** Curva do trecho que CHEGA nesta pose (padrão: inout). Use in/out para arcos sem parada no meio. */
  ease?: Ease;
}

export interface AnimDef extends RigOptions {
  keys: Key[]; // a última pose deve ser igual à primeira para o loop
  /** `phase` vai de 0 a 1 ao longo do loop (útil para peças que giram/deslizam sozinhas). */
  equipment?: (j: Joints, phase: number) => Prim[];
  /** Área visível: [min, max] horizontal por vista, altura máxima e mínima */
  frame?: { front?: [number, number]; side?: [number, number]; top?: number };
}

const EASE: Record<Ease, (t: number) => number> = {
  inout: (t) => 0.5 - 0.5 * Math.cos(Math.PI * t),
  in: (t) => 1 - Math.cos((Math.PI * t) / 2),
  out: (t) => Math.sin((Math.PI * t) / 2),
  linear: (t) => t,
};

export function poseAt(def: AnimDef, time: number): Pose {
  const total = def.keys.at(-1)!.t;
  const t = ((time % total) + total) % total;
  let i = 0;
  while (i < def.keys.length - 2 && t > def.keys[i + 1].t) i++;
  const k0 = def.keys[i];
  const k1 = def.keys[i + 1];
  const span = k1.t - k0.t;
  const e = span > 0 ? EASE[k1.ease ?? 'inout'](Math.min(1, Math.max(0, (t - k0.t) / span))) : 0;
  const a = k0.pose;
  const b = k1.pose;
  // Pés e cabeça opcionais: se só uma das poses define, a outra usa o padrão
  const dflt = def.toeDir ?? [0.3, -0.25, 1];
  const toesOf = (p: Pose): [V3, V3] => p.toes ?? [mirror(dflt, 1), mirror(dflt, -1)];
  const toes: [V3, V3] | undefined =
    a.toes || b.toes ? [lerp3(toesOf(a)[0], toesOf(b)[0], e), lerp3(toesOf(a)[1], toesOf(b)[1], e)] : undefined;
  const headDir = a.headDir && b.headDir ? lerp3(a.headDir, b.headDir, e) : (a.headDir ?? b.headDir);
  return {
    toes,
    headDir,
    pelvis: lerp3(a.pelvis, b.pelvis, e),
    pitch: a.pitch + (b.pitch - a.pitch) * e,
    hands: [lerp3(a.hands[0], b.hands[0], e), lerp3(a.hands[1], b.hands[1], e)],
    feet: [lerp3(a.feet[0], b.feet[0], e), lerp3(a.feet[1], b.feet[1], e)],
    roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * e,
    twist: (a.twist ?? 0) + ((b.twist ?? 0) - (a.twist ?? 0)) * e,
    yaw: (a.yaw ?? 0) + ((b.yaw ?? 0) - (a.yaw ?? 0)) * e,
  };
}
