// KAIJU KX-1: an original robotic kaiju after one reference picture (3d-test/ref-kaiju.jpg). An upright, heavy
// lizard in gloss white armour plates with green rims, a dark mechanism showing in every gap, a glass chest over
// gears, curved green horns, two rows of jagged dorsal spikes and a long segmented tail lying on the floor.
// Body frame: +x forward (the snout), y up, +z the kaiju's right. The origin is the torso's centre; the floor is
// FLOOR_Y below it. Static for the still loop: pose() is a no-op until the film.
import * as THREE from 'three';
import {rng} from '../kit/util.js';
import {aimX, capsuleR, cylZ, D2R, gearGeo, makeMaterials, put, ring, solid, taperTube, tube, V3} from '../tarantula-shared/parts.js';

export const FLOOR_Y = -1.85;

// a point and its outward normal on an ellipsoid (radii rx, ry, rz) at the SphereGeometry angles phi, theta (deg):
// phi 0 = -x (back), 90 = +z, 180 = +x (front), 270 = -z; theta 0 = top
function ellPt(rx, ry, rz, phi, th, s = 1) {
  const p = phi * D2R;
  const t = th * D2R;
  const ux = -Math.cos(p) * Math.sin(t);
  const uy = Math.cos(t);
  const uz = Math.sin(p) * Math.sin(t);
  const pos = new V3(ux * rx * s, uy * ry * s, uz * rz * s);
  const n = new V3(ux / rx, uy / ry, uz / rz).normalize();
  return {pos, n};
}
function patch(rx, ry, rz, p0, p1, t0, t1, s = 1) {
  const g = new THREE.SphereGeometry(1, Math.max(4, Math.ceil((p1 - p0) / 5)), Math.max(3, Math.ceil((t1 - t0) / 5)), p0 * D2R, (p1 - p0) * D2R, t0 * D2R, (t1 - t0) * D2R);
  g.scale(rx * s, ry * s, rz * s);
  return g;
}
const orientZ = (obj, n) => obj.quaternion.setFromUnitVectors(new V3(0, 0, 1), n);

export function buildKaiju({seed = 7} = {}) {
  const R = rng(seed);
  const M = makeMaterials();
  M.shell.side = THREE.DoubleSide;
  M.orange.side = THREE.DoubleSide;
  M.graphite.side = THREE.DoubleSide;
  const root = new THREE.Group();
  const clear = [];
  const anchors = {};
  const rivets = [];
  const gearG = (r) => gearGeo(Math.max(8, Math.round(r * 90)), r, r * 0.84, Math.max(0.025, r * 0.25), r * 0.28, r > 0.08 ? 5 : 0);

  // an ellipsoid section: dark core, then white plates over green under-plates in a phi x theta grid with gaps;
  // `skip(phi, theta)` leaves a cell open and fills it with a gear and a piston instead
  function armour(parent, [rx, ry, rz], phis, thetas, {skip = () => false, rim = 2.6, core = 0.93, coreMat = M.graphite, rivet = true, stagger = 0} = {}) {
    put(parent, new THREE.SphereGeometry(1, 40, 24).scale(rx * core, ry * core, rz * core), coreMat);
    thetas.forEach(([t0, t1], bi) =>
      phis.forEach(([q0, q1]) => {
        const off = bi % 2 ? stagger : 0;
        const p0 = q0 + off;
        const p1 = q1 + off;
        const pc = (p0 + p1) / 2;
        const tc = (t0 + t1) / 2;
        if (skip(pc, tc)) {
          const {pos, n} = ellPt(rx, ry, rz, pc, tc, core + 0.02);
          const r = Math.min(rx, ry, rz) * 0.22 * (0.7 + R() * 0.4);
          const g = put(parent, gearG(r), R() < 0.5 ? M.gunmetal : M.graphite, pos.x, pos.y, pos.z);
          orientZ(g, n);
          const g2 = put(parent, gearG(r * 0.55), M.steel, pos.x, pos.y, pos.z);
          orientZ(g2, n);
          g2.position.addScaledVector(n, 0.03);
          g2.position.add(new V3(r * 0.5, -r * 0.4, 0));
          return;
        }
        put(parent, patch(rx, ry, rz, p0, p1, t0, t1, 1.0), M.orange);
        const r2 = Math.min(rim, (p1 - p0) / 4, (t1 - t0) / 4);
        put(parent, patch(rx, ry, rz, p0 + r2, p1 - r2, t0 + r2, t1 - r2, 1.018), M.shell);
        if (rivet)
          for (const [pp, tt] of [
            [p0 + r2 * 2.2, t0 + r2 * 2.2],
            [p1 - r2 * 2.2, t0 + r2 * 2.2],
            [p0 + r2 * 2.2, t1 - r2 * 2.2],
            [p1 - r2 * 2.2, t1 - r2 * 2.2],
          ]) {
            const {pos, n} = ellPt(rx, ry, rz, pp, tt, 1.022);
            rivets.push({parent, pos, n});
          }
      }),
    );
  }
  function plates(parent, [rx, ry, rz], cells, {rim = 3.4, core = 0.93, coreMat = M.graphite} = {}) {
    put(parent, new THREE.SphereGeometry(1, 40, 24).scale(rx * core, ry * core, rz * core), coreMat);
    for (const [p0, p1, t0, t1] of cells) {
      put(parent, patch(rx, ry, rz, p0, p1, t0, t1, 1.0), M.orange);
      const r2 = Math.min(rim, (p1 - p0) / 4, (t1 - t0) / 4);
      put(parent, patch(rx, ry, rz, p0 + r2, p1 - r2, t0 + r2, t1 - r2, 1.018), M.shell);
      for (const [pp, tt] of [[p0 + r2 * 2.4, t0 + r2 * 2.4], [p1 - r2 * 2.4, t0 + r2 * 2.4], [p0 + r2 * 2.4, t1 - r2 * 2.4], [p1 - r2 * 2.4, t1 - r2 * 2.4]]) {
        const {pos, n} = ellPt(rx, ry, rz, pp, tt, 1.022);
        rivets.push({parent, pos, n});
      }
    }
  }
  // a limb bone from a to b: a dark core with two white shells, a green cuff at each end and a dark gap between
  function bone(parent, a, b, r0, r1) {
    const A = new V3(...a);
    const B = new V3(...b);
    const L = A.distanceTo(B);
    const g = new THREE.Group();
    g.position.copy(A);
    aimX(g, B.clone().sub(A));
    parent.add(g);
    put(g, solid(0, L, () => Math.max(r0, r1) * 0.7, {segs: 24}), M.graphite);
    const rAt = (u) => r0 + (r1 - r0) * u;
    for (const [u0, u1] of [
      [0.04, 0.42],
      [0.58, 0.96],
    ]) {
      put(g, solid(L * u0, L * u1, capsuleR(rAt(u0), rAt(u1), 0.1), {segs: 32}), M.shell);
      if (u0 < 0.1) put(g, ring(L * u0 - 0.01, L * u0 + 0.025, rAt(u0) * 0.7, rAt(u0) * 1.03, 0.008), M.orange);
      if (u1 > 0.9) put(g, ring(L * u1 - 0.025, L * u1 + 0.01, rAt(u1) * 0.7, rAt(u1) * 1.03, 0.008), M.orange);
    }
    // pistons along the gap
    for (let k = 0; k < 3; k++) {
      const a2 = (k / 3) * Math.PI * 2;
      const rr = rAt(0.5) * 0.85;
      put(g, solid(L * 0.38, L * 0.62, () => rr * 0.18, {segs: 10}), M.steel, 0, Math.cos(a2) * rr, Math.sin(a2) * rr);
    }
    return g;
  }
  // a joint drum: black hub, dark rings, a green ring, a lens cap; faces along n
  function joint(parent, p, n, r) {
    const g = new THREE.Group();
    g.position.set(...p);
    orientZ(g, new V3(...n).normalize());
    parent.add(g);
    put(g, cylZ(r, r, r * 0.5, 36), M.graphite);
    put(g, new THREE.TorusGeometry(r * 0.78, r * 0.09, 10, 40), M.orange, 0, 0, r * 0.27);
    put(g, cylZ(r * 0.6, r * 0.6, r * 0.6, 32), M.black);
    put(g, new THREE.TorusGeometry(r * 0.45, r * 0.06, 8, 32), M.gunmetal, 0, 0, r * 0.31);
    put(g, new THREE.SphereGeometry(r * 0.3, 20, 12).scale(1, 1, 0.5), M.lens, 0, 0, r * 0.3);
    return g;
  }
  const hose = (parent, pts, r) => put(parent, tube(pts, r, 48, 8), M.rubber);

  // ------------------------------------------------------------ torso: an egg tipped forward, glass over the chest
  const torso = new THREE.Group();
  torso.position.set(0.05, 0.02, 0);
  torso.rotation.z = 0.42;
  root.add(torso);
  const TR = [0.78, 1.15, 0.7];
  const phis = [];
  for (let p = 0; p < 360; p += 60) phis.push([p + 4.5, p + 55.5]);
  const chest = (pc, tc) => pc > 140 && pc < 220 && tc > 82 && tc < 150;
  // big irregular plates as in the reference: collar, two pecs, flank plates, back plates, a belly pan; the seams
  // between them are wide and dark, the chest below the pecs is glass
  plates(torso, TR, [
    [140.5, 219.5, 14.5, 33.5], // collar
    [186.5, 231.5, 42.5, 83.5], // left pec
    [128.5, 173.5, 42.5, 83.5], // right pec
    [240.5, 299.5, 18.5, 71.5], // left flank, upper
    [60.5, 119.5, 18.5, 71.5], // right flank, upper
    [244.5, 297.5, 82.5, 135.5], // left flank, lower
    [62.5, 115.5, 82.5, 135.5], // right flank, lower
    [310.5, 354.5, 12.5, 61.5], // back, left
    [5.5, 49.5, 12.5, 61.5], // back, right
    [316.5, 354.5, 74.5, 121.5], // lower back, left
    [5.5, 43.5, 74.5, 121.5], // lower back, right
    [0, 360, 146, 178], // belly pan
  ]);
  for (const [pc, tc] of [[120, 110], [240, 110], [0, 136], [305, 80], [55, 80]]) {
    const {pos, n} = ellPt(...TR, pc, tc, 0.95);
    const r = 0.13 + R() * 0.06;
    orientZ(put(torso, gearG(r), M.gunmetal, pos.x, pos.y, pos.z), n);
    const p2 = put(torso, solid(0, 0.3, () => 0.03), M.steel, pos.x, pos.y, pos.z);
    aimX(p2, new V3(R() - 0.5, R() - 0.5, R() - 0.5));
  }
  // the glass chest: a clear dome over a stack of gears and coils
  M.glassLite = new THREE.MeshPhysicalMaterial({color: '#e8eef0', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.14, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.02, side: THREE.DoubleSide});
  const glass = put(torso, patch(...TR, 130, 230, 88, 154, 1.075), M.glassLite);
  clear.push(glass);
  put(torso, patch(...TR, 128, 232, 86, 156, 1.0), M.orange);
  put(torso, patch(...TR, 131.5, 228.5, 89.5, 152.5, 1.006), M.graphite);
  put(torso, patch(...TR, 135, 225, 93, 149, 1.012), M.black);
  const chestGears = [];
  for (let k = 0; k < 9; k++) {
    const {pos, n} = ellPt(...TR, 146 + (k % 3) * 34 + R() * 6, 100 + Math.floor(k / 3) * 17 + R() * 4, 1.035);
    const r = 0.08 + R() * 0.08;
    const g = put(torso, gearG(r), k % 2 ? M.gunmetal : M.graphite, pos.x, pos.y, pos.z);
    orientZ(g, n);
    chestGears.push({g, q: g.quaternion.clone(), dir: k % 2 ? 1 : -1, rate: 0.12 / r});
  }
  const glassRest = glass.position.clone();
  // a glass window on each flank of the belly, like the reference's hip pane
  for (const z of [-1, 1]) {
    const {pos, n} = ellPt(...TR, z > 0 ? 70 : 290, 120, 1.0);
    const g = put(torso, new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2.4).scale(1, 0.35, 1.4), M.glassLite, pos.x, pos.y, pos.z);
    g.quaternion.setFromUnitVectors(new V3(0, 1, 0), n);
    clear.push(g);
  }

  for (const z of [-1, 1])
    for (let k = 0; k < 4; k++) {
      const g = put(root, gearG(0.16 + k * 0.04), k % 2 ? M.gunmetal : M.graphite, -0.45 + k * 0.12, -0.55 - k * 0.06, z * (0.5 - k * 0.04));
      g.rotation.y = z * 0.3;
    }
  {
    const w = put(root, new THREE.TorusGeometry(0.6, 0.22, 14, 48), M.graphite, -0.15, -0.66, 0);
    w.rotation.x = Math.PI / 2;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      const g = put(root, gearG(0.1 + (k % 3) * 0.03), k % 2 ? M.gunmetal : M.black, -0.15 + Math.cos(a) * 0.72, -0.66 + (k % 2) * 0.05, Math.sin(a) * 0.72);
      g.rotation.y = -a + Math.PI / 2;
    }
  }
  // ------------------------------------------------------------ neck: rings, pistons and hoses up to the head
  const N0 = new V3(0.45, 0.95, 0);
  const N1 = new V3(0.86, 1.36, 0);
  const neck = new THREE.Group();
  neck.position.copy(N0);
  aimX(neck, N1.clone().sub(N0));
  root.add(neck);
  const NL = N0.distanceTo(N1);
  for (let k = 0; k < 5; k++) {
    const x = (k / 4) * NL;
    const r = 0.4 - k * 0.03;
    put(neck, ring(x - 0.03, x + 0.03, r * 0.5, r, 0.01), M.graphite);
    if (k % 2 === 0) put(neck, ring(x + 0.035, x + 0.05, r * 0.6, r * 0.92, 0.005), M.gunmetal);
  }
  put(neck, solid(-0.05, NL + 0.05, () => 0.27, {segs: 20}), M.black);
  for (const z of [-0.15, 0.15]) {
    put(neck, solid(-0.05, NL * 0.6, () => 0.035), M.graphite, 0, -0.12, z);
    put(neck, solid(NL * 0.5, NL + 0.05, () => 0.022), M.steel, 0, -0.12, z);
    hose(neck, [[-0.05, 0.05, z * 1.4], [NL * 0.5, -0.18, z * 1.5], [NL, 0.0, z * 1.2]], 0.025);
  }
  // white vertebra plates over the top of the neck, green-rimmed
  for (let k = 0; k < 3; k++) {
    const g = new THREE.Group();
    g.position.set(NL * (0.15 + k * 0.32), 0.0, 0);
    neck.add(g);
    put(g, patch(0.16, 0.27, 0.27, 0, 360, 0, 62, 1.0), M.orange);
    put(g, patch(0.16, 0.27, 0.27, 0, 360, 0, 59, 1.03), M.shell);
  }

  // ------------------------------------------------------------ head: cranium, snout, open lower jaw, horns
  const head = new THREE.Group();
  head.position.copy(N1);
  head.rotation.z = -0.02;
  head.scale.setScalar(1.4);
  root.add(head);
  anchors.HEAD = head;
  const cran = new THREE.Group();
  cran.position.set(0.06, 0.08, 0);
  head.add(cran);
  plates(cran, [0.3, 0.26, 0.26], [[95, 265, 2, 96], [268, 358, 2, 96], [2, 92, 2, 96], [110, 250, 100, 150]], {rim: 3.2});
  const snout = new THREE.Group();
  snout.position.set(0.3, 0.0, 0);
  head.add(snout);
  plates(snout, [0.28, 0.14, 0.18], [[95, 265, 0, 92]], {rim: 3.4, coreMat: M.black});
  // nostrils
  for (const z of [-0.05, 0.05]) put(snout, new THREE.SphereGeometry(0.009, 8, 6), M.black, 0.27, 0.07, z);
  // the mouth: a black roof and throat
  put(head, new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(0.32, 0.05, 0.14), M.black, 0.3, 0.0, 0);
  // upper teeth along the jaw rim
  const coneG = new THREE.ConeGeometry(1, 1, 8);
  for (let k = 0; k < 14; k++) {
    const side = k % 2 ? 1 : -1;
    const u = Math.floor(k / 2) / 6;
    const phi = side > 0 ? 180 - 70 * u : 180 + 70 * u;
    const {pos} = ellPt(0.28, 0.14, 0.18, phi, 92, 0.94);
    const h = 0.07 - u * 0.025;
    const t = put(snout, coneG, M.gunmetal, pos.x, pos.y - h * 0.4, pos.z);
    t.scale.set(0.018, h, 0.018);
    t.rotation.x = Math.PI;
  }
  // lower jaw, dropped open
  const jaw = new THREE.Group();
  jaw.position.set(0.02, -0.08, 0);
  jaw.rotation.z = -0.1;
  head.add(jaw);
  anchors.JAW = jaw;
  const jawE = new THREE.Group();
  jawE.position.set(0.27, -0.03, 0);
  jaw.add(jawE);
  plates(jawE, [0.29, 0.1, 0.16], [[95, 265, 92, 178]], {rim: 3.4, coreMat: M.black});
  put(jawE, new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.29, 0.03, 0.12), M.graphite, 0, 0, 0);
  for (let k = 0; k < 12; k++) {
    const side = k % 2 ? 1 : -1;
    const u = Math.floor(k / 2) / 5;
    const phi = side > 0 ? 180 - 70 * u : 180 + 70 * u;
    const {pos} = ellPt(0.29, 0.1, 0.16, phi, 90, 0.93);
    const h = 0.06 - u * 0.02;
    const t = put(jawE, coneG, M.gunmetal, pos.x, pos.y + h * 0.4, pos.z);
    t.scale.set(0.016, h, 0.016);
  }
  // eyes: glossy black almond lenses with a green bezel, under a white brow
  for (const z of [-1, 1]) {
    const e = new THREE.Group();
    e.position.set(0.24, 0.13, z * 0.175);
    e.rotation.y = z * -0.5;
    head.add(e);
    put(e, new THREE.SphereGeometry(1, 28, 16).scale(0.1, 0.05, 0.04), M.lens);
    put(e, new THREE.TorusGeometry(1, 0.1, 8, 40).scale(0.105, 0.056, 0.045), M.orange);
    const brow = put(e, patch(0.11, 0.05, 0.06, 0, 360, 0, 70, 1), M.shell, 0, 0.035, 0);
    brow.rotation.z = -0.15;
    anchors[z > 0 ? 'EYE R' : 'EYE L'] = e;
    // the cheek sensor at the jaw hinge
    joint(head, [-0.02, -0.04, z * 0.215], [0, 0, z], 0.065);
  }
  // horns: green, rising up and back then hooking forward
  for (const z of [-1, 1]) {
    put(cran, taperTube([[-0.04, 0.16, z * 0.1], [-0.12, 0.3, z * 0.14], [-0.12, 0.42, z * 0.16], [-0.04, 0.52, z * 0.16]], 0.055, 0.004, 40, 14), M.orange);
    put(cran, ring(-0.02, 0.02, 0.0, 0.065, 0.01), M.shell, -0.04, 0.16, z * 0.1).rotation.z = Math.PI / 2;
  }

  // ------------------------------------------------------------ arms: pad, upper arm, forearm, clawed hand
  const arms = {};
  for (const z of [-1, 1]) {
    const armG = new THREE.Group();
    root.add(armG);
    arms[z] = armG;
    const S = [0.38, 0.4, z * 0.7];
    const pad = new THREE.Group();
    pad.position.set(...S);
    pad.rotation.z = 0.3;
    armG.add(pad);
    plates(pad, [0.34, 0.34, 0.27], [[-60, 296, 2, 104]], {rim: 4});
    const E = [0.4, -0.16, z * 0.84];
    const W = [0.66, -0.42, z * 0.74];
    bone(armG, S, E, 0.19, 0.16);
    joint(armG, E, [0, 0, z], 0.085);
    bone(armG, E, W, 0.15, 0.12);
    put(armG, ring(-0.04, 0.04, 0.06, 0.12, 0.01), M.orange, ...W);
    const hand = new THREE.Group();
    hand.position.set(...W);
    armG.add(hand);
    armG.userData = {E, W};
    put(hand, new THREE.SphereGeometry(0.09, 16, 12).scale(1.1, 0.8, 1), M.graphite, 0.06, -0.04, 0);
    for (let f = 0; f < 4; f++) {
      const fz = (f - 1.5) * 0.045 * z;
      const pts = [[0.08, -0.05, fz], [0.17, -0.1, fz * 1.3], [0.2, -0.2, fz * 1.5], [0.17, -0.28, fz * 1.6]];
      put(hand, taperTube(pts, 0.03, 0.006, 24, 10), M.gunmetal);
      put(hand, new THREE.SphereGeometry(0.03, 10, 8), M.black, 0.12, -0.07, fz * 1.15);
    }
  }

  // everything built so far is the upper body: it hunches forward round the hip below
  const upperList = [...root.children];
  // ------------------------------------------------------------ legs: plated thigh, knee drum, shin, toed foot
  for (const z of [-1, 1]) {
    const dx = z < 0 ? -0.18 : 0.26;
    const H = [-0.36 + dx * 0.4, -0.62, z * 0.58];
    const thigh = new THREE.Group();
    thigh.position.set(...H);
    thigh.rotation.z = 0.25;
    root.add(thigh);
    plates(thigh, [0.62, 0.56, 0.42], [[118, 244, 14, 120], [262, 346, 14, 120], [14, 100, 14, 120], [0, 360, 136, 174]], {rim: 3.4});
    joint(root, [H[0] + 0.05, H[1] - 0.02, z * 1.0], [0, 0, z], 0.16);
    const K = [0.14 + dx, -1.14, z * 0.66];
    const A = [-0.18 + dx, -1.62, z * 0.66];
    joint(root, K, [0.3, 0, z], 0.15);
    bone(root, K, A, 0.32, 0.26);
    joint(root, A, [0, 0, z], 0.075);
    // the foot: a white plated block with a green rim, three toes with dark claws
    const foot = new THREE.Group();
    foot.position.set(A[0] + 0.1, FLOOR_Y + 0.1, A[2]);
    root.add(foot);
    armour(foot, [0.34, 0.15, 0.27], [[100, 178], [182, 260], [262, 358], [2, 98]], [[4, 50], [54, 92]], {rim: 4, rivet: false});
    for (let k = 0; k < 3; k++) {
      const tz = (k - 1) * 0.12;
      const toe = new THREE.Group();
      toe.position.set(0.27, -0.05, tz * 1.3);
      toe.rotation.y = -(k - 1) * 0.3;
      foot.add(toe);
      put(toe, solid(0, 0.16, capsuleR(0.085, 0.07, 0.2)), M.shell);
      put(toe, ring(0.0, 0.025, 0.04, 0.07, 0.006), M.orange);
      put(toe, ring(0.13, 0.15, 0.03, 0.06, 0.006), M.orange);
      put(toe, taperTube([[0.14, 0.0, 0], [0.24, -0.01, 0], [0.3, -0.07, 0]], 0.06, 0.006, 16, 10), M.gunmetal);
    }
  }

  // ------------------------------------------------------------ tail: segments down to the floor, then lying out
  const tailC = new THREE.CatmullRomCurve3([
    new V3(-0.7, -0.5, 0),
    new V3(-1.25, -1.05, -0.04),
    new V3(-1.8, -1.42, -0.16),
    new V3(-2.35, -1.6, -0.36),
    new V3(-2.9, -1.7, -0.62),
    new V3(-3.4, -1.73, -0.92),
    new V3(-3.75, -1.74, -1.2),
  ]);
  const tailR = (u) => 0.44 * (1 - u) + 0.1 * u;
  {
    const pts = tailC.getPoints(40);
    put(root, taperTube(pts, tailR(0) * 0.78, tailR(1) * 0.75, 80, 20), M.graphite);
  }
  const NSEG = 11;
  const spineTail = [];
  const segs = [];
  for (let i = 0; i < NSEG; i++) {
    const u0 = i / NSEG + 0.01;
    const u1 = (i + 1) / NSEG - 0.012;
    const P = tailC.getPointAt(u0);
    const Q = tailC.getPointAt(u1);
    const g = new THREE.Group();
    g.position.copy(P);
    aimX(g, Q.clone().sub(P));
    root.add(g);
    segs.push({g, tan: Q.clone().sub(P).normalize()});
    const L = P.distanceTo(Q);
    const r0 = tailR(u0);
    const r1 = tailR(u1);
    put(g, solid(0, L * 0.76, capsuleR(r0, r1 + (r0 - r1) * 0.24, 0.1), {segs: 36, a0: -Math.PI * 0.36, a1: Math.PI * 0.36}), M.shell);
    const TOP = {a0: -Math.PI * 0.38, a1: Math.PI * 0.38, segs: 24};
    put(g, ring(-0.012, 0.02, r0 * 0.75, r0 * 1.02, 0.006, TOP), M.orange);
    put(g, ring(L * 0.74, L * 0.77, r1 * 0.75, (r1 + (r0 - r1) * 0.24) * 1.02, 0.006, TOP), M.orange);
    
    // a dark ribbed band under the tail
    put(g, ring(L * 0.1, L * 0.9, (r0 + r1) / 2 * 0.95, (r0 + r1) / 2 * 1.03, 0.004, {a0: Math.PI * 0.62, a1: Math.PI * 1.38, segs: 16}), M.graphite);
    spineTail.push({p: tailC.getPointAt((u0 + u1) / 2).add(new V3(0, tailR((u0 + u1) / 2) * 0.92, 0)), t: tailC.getTangentAt((u0 + u1) / 2), h: 0.36 * (1 - i / NSEG) + 0.12});
  }

  // ------------------------------------------------------------ dorsal spikes: two rows of jagged plates
  const SP = [
    [-0.5, 0], [-0.36, 0.34], [-0.5, 0.42], [-0.2, 0.62], [-0.3, 0.7], [0.0, 1.0], [0.1, 0.7], [0.3, 0.68], [0.18, 0.42], [0.42, 0.34], [0.5, 0],
  ];
  const shapeOf = (sx, sy) => {
    const s = new THREE.Shape();
    SP.forEach(([x, y], k) => (k ? s.lineTo(-x * sx, y * sy) : s.moveTo(-x * sx, y * sy)));
    s.closePath();
    return s;
  };
  const ext = (sh, depth) => {
    const g = new THREE.ExtrudeGeometry(sh, {depth, bevelEnabled: true, bevelThickness: depth * 0.3, bevelSize: depth * 0.3, bevelSegments: 1});
    g.translate(0, 0, -depth / 2);
    return g;
  };
  function spike(p, tan, h, z, lean) {
    const g = new THREE.Group();
    g.position.copy(p).add(new V3(0, 0, z));
    g.rotation.z = Math.atan2(-tan.y, -tan.x);
    g.rotation.x = lean;
    root.add(g);
    const w = h * 0.85;
    put(g, ext(shapeOf(w * 1.0, h), 0.03), M.shell);
    const gr = put(g, ext(shapeOf(w * 1.0, h), 0.012), M.orange);
    gr.scale.set(1.2, 1.13, 0.8);
    gr.position.y = -h * 0.03;
    const dk = put(g, ext(shapeOf(w * 0.4, h * 0.45), 0.02), M.graphite, -w * 0.05, 0.0, 0);
    dk.scale.z = 1.6;
    return g;
  }
  torso.updateMatrixWorld(true);
  const back = new THREE.CatmullRomCurve3([[180, 38], [180, 14], [0, 10], [0, 38], [0, 66], [0, 96]].map(([pp, tt]) => torso.localToWorld(ellPt(...TR, pp, tt, 0.97).pos)));
  const BH = [0.36, 0.52, 0.64, 0.7, 0.68, 0.6, 0.52, 0.44];
  neck.updateMatrixWorld(true);
  const nt = N1.clone().sub(N0).normalize();
  [[0.25, 0.26], [0.65, 0.3]].forEach(([u, h]) => {
    const p = N0.clone().lerp(N1, u).add(new V3(-0.26, 0.2, 0));
    for (const s of [-1, 1]) upperList.push(spike(p.clone().add(nt.clone().multiplyScalar(s * 0.04)), nt, h * (s > 0 ? 0.9 : 1), s * 0.06, s * 0.14));
  });
  BH.forEach((h, i) => {
    const u = (i + 0.3) / BH.length;
    const p = back.getPointAt(u);
    const t = back.getTangentAt(u);
    for (const s of [-1, 1]) upperList.push(spike(p.clone().add(t.clone().multiplyScalar(s * 0.06)), t, h * (s > 0 ? 0.9 : 1), s * 0.07, s * 0.14));
  });
  spineTail.forEach(({p, t, h}, i) => {
    for (const s of [-1, 1]) segs[i].g.attach(spike(p.clone().add(t.clone().multiplyScalar(s * 0.05)), t, h * (s > 0 ? 0.85 : 1), s * 0.05, s * 0.18));
  });

  // ------------------------------------------------------------ rivets and small hoses: the second, fine level
  {
    const rg = cylZ(0.014, 0.014, 0.012, 10);
    for (const {parent, pos, n} of rivets) orientZ(put(parent, rg, M.graphite, pos.x, pos.y, pos.z), n);
    for (let k = 0; k < 10; k++) {
      const a = ellPt(...TR, R() * 360, 60 + R() * 100, 0.94).pos;
      const b = ellPt(...TR, R() * 360, 60 + R() * 100, 0.94).pos;
      hose(torso, [a, a.clone().lerp(b, 0.5).multiplyScalar(1.03), b], 0.018);
    }
  }

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  // the hunch: the upper body tips forward round a pivot at the hip, as in the reference
  const upper = new THREE.Group();
  upper.position.set(-0.35, -0.62, 0);
  root.add(upper);
  root.updateMatrixWorld(true);
  for (const o of upperList) upper.attach(o);
  upper.rotation.z = -0.13;
  upper.updateMatrixWorld(true);
  anchors.UPPER = upper;

  // every top-level part, with its rest pose and the way it flies in the explode: straight out from the body's
  // centre, further the further out it sits, with a small tumble
  const C = new V3(-0.5, -0.3, 0);
  const box = new THREE.Box3();
  const items = [...upper.children, ...root.children.filter((o) => o !== upper)].map((o, i) => {
    box.setFromObject(o);
    const c = box.getCenter(new V3());
    const dw = c.clone().sub(C);
    const dist = 0.7 + dw.length() * 0.55;
    dw.y += 0.35;
    dw.normalize();
    const qi = o.parent.getWorldQuaternion(new THREE.Quaternion()).invert();
    return {o, pos: o.position.clone(), q: o.quaternion.clone(), dir: dw.applyQuaternion(qi), dist, axis: new V3(R() - 0.5, R() - 0.5, R() - 0.5).normalize(), spin: (R() - 0.5) * 1.6};
  });
  const tq = new THREE.Quaternion();
  const tq2 = new THREE.Quaternion();
  const ZA = new V3(0, 0, 1);
  // state: {t, explode, head, chest, arm, tail, roar, breathe, turn}
  const pose = (s) => {
    const e = s.explode ?? 0;
    for (const it of items) {
      it.o.position.copy(it.pos).addScaledVector(it.dir, it.dist * e);
      it.o.quaternion.copy(it.q).multiply(tq.setFromAxisAngle(it.axis, it.spin * e));
    }
    root.rotation.y = s.turn ?? 0;
    const roar = s.roar ?? 0;
    upper.rotation.z = -0.13 + 0.012 * (s.breathe ?? 0) + 0.1 * roar;
    // head: the cranium plate lifts on its horns, the jaw drops
    const h = s.head ?? 0;
    cran.position.set(0.06 - 0.04 * h, 0.08 + 0.2 * h, 0);
    cran.rotation.z = 0.35 * h;
    jaw.rotation.z = -0.1 - 0.32 * h - 0.42 * roar;
    head.rotation.z = -0.02 + 0.3 * roar;
    // chest: the dome swings out forward, the gears behind it turn
    const c = s.chest ?? 0;
    glass.position.copy(glassRest).add(new V3(0.5 * c, -0.08 * c, 0));
    const run = (s.t ?? 0) * (0.6 + 2.4 * c);
    for (const gg of chestGears) gg.g.quaternion.copy(gg.q).multiply(tq2.setFromAxisAngle(ZA, gg.dir * gg.rate * run));
    // arm: the near arm pulls off sideways and turns over
    const a = s.arm ?? 0;
    arms[-1].position.z += -0.75 * a;
    arms[-1].position.y += 0.15 * a;
    arms[-1].rotation.x += -0.6 * a;
    // tail: the segments telescope apart along the tail
    const tl = s.tail ?? 0;
    segs.forEach((sg, i) => sg.g.position.addScaledVector(sg.tan, i * 0.11 * tl));
  };
  return {root, pose, clear, M, anchors, parts: {upper, head, cran, jaw, glass, arms, segs, torso}};
}
