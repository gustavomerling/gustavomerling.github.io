// KAIJU KX-1 on the green page: the body from kaiju.js, the studio from the tarantula, the page from ../green.
// Everything is a pure function of t: each act opens one part (about 1 s out, a hold, 0.5 s back), every act has its
// own camera aimed at its part, then a full explode on a turntable, the reassembly and a roar pushed in from below.
import * as THREE from 'three';
import {runSim} from '../kit/runtime.js';
import {createConsole} from '../green/console.js';
import {makeCursor, makeLabels, PAPER_GREEN, SHIFT} from '../green/look.js';
import {PAL} from '../tarantula-shared/parts.js';
import {createStage, PAPER} from '../tarantula-shared/stage.js';
import {buildKaiju, FLOOR_Y} from './kaiju.js';

const D2R = Math.PI / 180;
Object.assign(PAL, {orange: '#14a03c'});
Object.assign(PAPER, PAPER_GREEN);

const sm = (a, b, x) => {
  const u = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return u * u * u * (u * (u * 6 - 15) + 10);
};
// a part's opening for an act at T: out over T+0.3..T+1.3, hold, back over T+2.2..T+2.7
const open = (T, t, hold = 2.2) => sm(T + 0.3, T + 1.3, t) * (1 - sm(T + hold, T + hold + 0.5, t));

const ACTS = [['head', 'Head'], ['chest', 'Core'], ['arm', 'Arm'], ['tail', 'Tail'], ['exploded', 'Teardown'], ['roar', 'Roar']];
const PAGE = {
  name: 'Kaiju',
  code: 'KX-1',
  title: 'Robotic Kaiju, Taken Apart',
  date: '2026-11-6',
  nav: [['overview', 'Overview'], ...ACTS],
  pills: ACTS,
  sub: {
    overview: ['2 legs · 11 tail segments', '36 dorsal plates'],
    head: ['Crown lifts 30 cm', 'Jaw drops 25°'],
    chest: ['Glass dome, 9 gears', 'Core 4,200 rpm'],
    arm: ['Shoulder, elbow, wrist', '4 claws per hand'],
    tail: ['11 segments telescope', 'Reach + 1.1 m'],
    exploded: ['Every part apart', 'Turntable 360°'],
    roar: ['Head up 17°', 'Jaw wide open'],
  },
  cards: [{k: 'Core', kind: 'wave', unit: 'krpm'}, {k: 'Hydraulics', kind: 'bar', unit: '%'}, {k: 'Tail servos', kind: 'bars', n: 8}, {k: 'Battery', kind: 'bar', unit: '%'}],
};
const STATUS = {intro: 'Standing', head: 'Head open', chest: 'Core open', arm: 'Arm apart', tail: 'Tail extended', exploded: 'Teardown', assemble: 'Reassembly', roar: 'Roaring'};

export function makeKaijuGreen(TL) {
  const SCRIPT = TL.script;
  const at = Object.fromEntries(SCRIPT.map((e) => [e.act, e.t]));
  return async ({canvas, capture}) => {
    const app = document.getElementById('app');
    const st = createStage({canvas, floorY: FLOOR_Y, guides: {centre: [-0.6, 0.1, 0], scale: 2.2}});
    const k = buildKaiju();
    st.addBee(k);
    const P = k.parts;
    k.root.updateMatrixWorld(true);
    const wp = (o, v = [0, 0, 0]) => o.localToWorld(new THREE.Vector3(...v)).toArray();
    // camera targets, read once from the rest pose
    const T_HEAD = wp(P.head, [0.25, 0.05, 0]);
    const T_CHEST = wp(P.glass.parent, [0.62, -0.35, 0]);
    const T_ARM = wp(P.arms[-1], P.arms[-1].userData.E);
    const T_TAIL = wp(P.segs[6].g);

    // label anchors {obj, at}
    const anchors = {
      HORN: {obj: P.cran, at: new THREE.Vector3(-0.04, 0.52, -0.16)},
      JAW: {obj: P.jaw, at: new THREE.Vector3(0.45, -0.08, 0)},
      DOME: {obj: P.glass, at: new THREE.Vector3(0.75, -0.1, 0)},
      GEARS: {obj: P.glass.parent, at: new THREE.Vector3(0.7, -0.5, -0.25)},
      CLAW: {obj: P.arms[-1], at: new THREE.Vector3(...P.arms[-1].userData.W)},
      ELBOW: {obj: P.arms[-1], at: new THREE.Vector3(...P.arms[-1].userData.E)},
      SEG: {obj: P.segs[4].g, at: new THREE.Vector3(0, 0.3, 0)},
      TIP: {obj: P.segs[10].g, at: new THREE.Vector3(0.1, 0.1, 0)},
    };
    const TEXT = {
      HORN: ['Crown and horns', 'lifts on 2 rams'],
      JAW: ['Lower jaw', '24 steel teeth'],
      DOME: ['Glass dome', 'swings out 50 cm'],
      GEARS: ['Core gears', '9 wheels, 2 trains'],
      CLAW: ['Hand', '4 claws, 3 joints'],
      ELBOW: ['Elbow drum', 'lit ring, 3 pistons'],
      SEG: ['Tail segment', 'slides on the spine'],
      TIP: ['Tail tip', 'reach + 1.1 m'],
    };
    const LABELS = {head: ['HORN', 'JAW'], chest: ['DOME', 'GEARS'], arm: ['CLAW', 'ELBOW'], tail: ['SEG', 'TIP']};

    // cameras: one per act, eased in over 1 s from the previous one
    const CAMS = [
      [0, {t: [-1.0, -0.2, -0.2], az: 136, el: 7, d: 9.8}],
      [at.head, {t: T_HEAD, az: 118, el: 8, d: 7.2}],
      [at.chest, {t: T_CHEST, az: 84, el: 2, d: 8.2}],
      [at.arm, {t: T_ARM, az: 168, el: 14, d: 7.6}],
      [at.tail, {t: T_TAIL, az: 215, el: 38, d: 11}],
      [at.exploded, {t: [-0.8, -0.1, 0], az: 140, el: 13, d: 15.5}],
      [at.assemble + 0.6, {t: [-0.9, -0.1, -0.1], az: 132, el: 6, d: 11}],
      [at.roar, {t: [T_HEAD[0] - 0.4, T_HEAD[1] - 0.6, T_HEAD[2]], az: 108, el: -6, d: 10.5}],
    ];
    const lerp = (a, b, u) => a + (b - a) * u;
    const camAt = (t) => {
      let c = CAMS[0][1];
      for (let i = 1; i < CAMS.length; i++) {
        const [ti, ci] = CAMS[i];
        if (t < ti) break;
        const u = sm(ti, ti + 1.0, t);
        c = {t: c.t.map((v, j) => lerp(v, ci.t[j], u)), az: lerp(c.az, ci.az, u), el: lerp(c.el, ci.el, u), d: lerp(c.d, ci.d, u)};
      }
      // a slow drift so no beat sits parked; the roar pushes in
      const push = sm(at.roar + 0.4, TL.duration, t);
      return {tx: c.t[0], ty: c.t[1], tz: c.t[2], az: (c.az + 5 * Math.sin(t * 0.35)) * D2R, el: c.el * D2R, d: c.d * (1 - 0.12 * push)};
    };

    const stateAt = (t) => {
      const explode = sm(at.exploded + 0.2, at.exploded + 1.6, t) * (1 - sm(at.assemble, at.assemble + 1.0, t));
      const roar = sm(at.roar + 0.1, at.roar + 0.7, t);
      const s = {
        t,
        head: open(at.head, t),
        chest: open(at.chest, t),
        arm: open(at.arm, t),
        tail: open(at.tail, t),
        explode,
        roar,
        breathe: Math.sin((t * 2 * Math.PI) / 3.2),
        turn: 2 * Math.PI * sm(at.exploded + 0.2, at.assemble + 1.0, t),
      };
      let view = 'intro';
      for (const e of SCRIPT) if (t >= e.t) view = e.act;
      s.view = view === 'assemble' ? 'exploded' : view;
      s.statusKey = view;
      return s;
    };

    const ui = createConsole(app, PAGE);
    const cursorAt = makeCursor(ui, SCRIPT);
    const labels = makeLabels(st, anchors, TEXT);
    const fit = () => (app.style.transform = `scale(${Math.min(innerWidth / 1600, innerHeight / 900)})`);
    const resize = () => {
      fit();
      st.resize(1600, 900, capture ? devicePixelRatio || 1 : Math.min(devicePixelRatio || 1, 2));
    };
    resize();
    return {
      resize,
      render(t) {
        const s = stateAt(t);
        k.pose(s);
        k.root.updateMatrixWorld(true);
        const c = camAt(t);
        st.frame({...c, sx: SHIFT[0], sy: SHIFT[1]}, {guides: s.explode});
        const o = s[s.view] ?? 0;
        const set = (LABELS[s.view] ?? []).map((key) => [key, key, '']);
        const core = 1.2 + 2.6 * s.chest + 0.4 * Math.sin(t * 1.7);
        const wave = [];
        for (let i = 0; i <= 90; i++) wave.push((0.3 + 0.6 * s.chest) * Math.sin(2 * Math.PI * core * 0.6 * (t - 1.2 + (i / 90) * 1.2)));
        const hyd = 0.42 + 0.3 * Math.max(s.head, s.arm, s.roar) + 0.05 * Math.sin(t * 2.3);
        const servos = Array.from({length: 8}, (_, i) => Math.min(1, 0.25 + 0.6 * s.tail * (0.5 + 0.5 * Math.sin(t * 5 + i)) + 0.1 * Math.sin(t * 1.3 + i * 0.9) ** 2));
        const bat = 0.92 - 0.003 * t;
        ui.update({
          time: t,
          dur: TL.duration,
          status: STATUS[s.statusKey] ?? 'Standing',
          cards: [{v: core.toFixed(1), wave}, {v: Math.round(hyd * 100), bar: hyd}, {bars: servos}, {v: Math.round(bat * 100), bar: bat}],
          apart: Math.round(Math.max(o, s.explode) * 100),
          view: s.view === 'intro' ? 'overview' : s.view,
          callouts: labels({set, o}),
          cursor: cursorAt(t),
        });
        return {};
      },
    };
  };
}

export const runKaijuGreen = (TL, title = 'kaiju-film') =>
  runSim({duration: TL.duration, fps: 60, theme: 'light', hud: {enabled: false, title, subtitle: ''}, director: {enabled: false}, watermark: ''}, makeKaijuGreen(TL));
