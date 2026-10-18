import { getBackground } from '../backgrounds';
import { getPalette } from '../palettes';
import { DT, FPS, H, SUBSTEPS, W, type Ctx2D, type SimEvent, type Template } from '../types';
import {
  TAU, burst, drawCaption, drawMascot, drawOverlay, drawParticles, hsl,
  mulberry32, updateParticles, type HS, type Particle,
} from '../util';

interface Racer {
  id: number;
  name: string; color: HS;
  x: number; y: number; vx: number; vy: number;
  /** Rolling: the face turns with the ball. */
  rot: number; spin: number;
  squash: number;
  /** Seconds spent almost still, to unjam a ball that got wedged somewhere. */
  still: number;
  /** Deepest point reached and when: a ball that stops making progress gets a push. */
  best: number; bestAt: number;
  /** Slipstream (0-1): the further behind the front, the less drag and the more pull it gets. */
  boost: number;
  trail: [number, number][];
  /** 1-based finishing place, once it crossed the line. */
  place: number | null;
  /** Where it sits in the leaderboard at the bottom, eased toward its rank slot. */
  hudX: number;
}

/**
 * A note block. Every piece of the course is one:
 * - tile: a static piece of a ramp, funnel, stair step or pad;
 * - peg / bumper: a round post (bumpers kick the ball away);
 * - arm: a bar turning around a pivot (spinners, windmills) or swinging from it (pendulums);
 * - shuttle: a bouncy bar sliding left and right;
 * - wheel: a big turning disc that carries the balls along its rim.
 * Any of them can be breakable (hp > 0): glass that cracks with every hit (or every fresh touch) and shatters.
 */
interface Block {
  kind: 'tile' | 'peg' | 'bumper' | 'arm' | 'shuttle' | 'wheel';
  /** Tile: segment a-b. Peg/bumper/wheel: center. Arm: pivot. Shuttle: middle of its travel. */
  ax: number; ay: number; bx: number; by: number;
  /** Peg/bumper/wheel radius, shuttle half length. */
  r: number;
  /** Thickness of segment pieces, and rolling resistance on this piece. */
  th: number; fr: number;
  /** Breakable pieces: health left and at the start (0 = unbreakable). */
  hp: number; hp0: number; broken: boolean;
  /** Glass oval tile: breaks by touches (each fresh one takes one hp, however soft) once its oval is armed. */
  trap?: Trap;
  /** Arm: the bar spans d0..d1 along its angle. */
  d0: number; d1: number;
  /** Arm angle = a0 + w*t (turning) or a0 + amp*sin(w*t + ph) (swinging). Shuttle offset = amp*sin(w*t + ph). */
  a0: number; w: number; amp: number; ph: number;
  /** Restitution, and a minimum outgoing speed for bouncy pieces. */
  e: number; kick: number;
  base: HS;
  lit: HS | null;
  /** Last time each racer touched it: a fresh touch (after leaving it) plays a note. */
  touched: number[];
  flash: number;
  top: number; bottom: number;
  /** Shortcut trapdoor. */
  role?: 'door';
  gate?: Gate;
}

/**
 * A shortcut: the first ball crossing the checkpoint line (x0..x1 at height ty) triggers it; the trapdoor opens at
 * `at`, swinging down around its hinge (hx, hy).
 */
interface Gate {
  pressed: boolean; at: number; color: HS | null; hx: number; hy: number;
  ty: number; x0: number; x1: number;
}
/**
 * A glass oval (center cx, yc, radii a, b). Its glass stays toughened while it waits for the pack: it arms once
 * enough balls are inside, or a while after the first one got in.
 */
interface Trap { cx: number; yc: number; a: number; b: number; armed: boolean; firstAt: number | null }

interface FloatingNote { x: number; y: number; life: number; color: HS; text?: string }

/** Five racers with clearly different colors; yellow is always one of them. */
const RACERS: { name: string; color: HS; light: number }[] = [
  { name: 'Yellow', color: [48, 95], light: 62 },
  { name: 'Pink', color: [335, 85], light: 70 },
  { name: 'Blue', color: [205, 85], light: 64 },
  { name: 'Green', color: [135, 60], light: 60 },
  { name: 'Purple', color: [270, 70], light: 70 },
];
const LIGHT = new Map(RACERS.map((r) => [r.name, r.light]));

const THICK = 22;
const TILE = 92;
const BUCKET = 200;
const PLACES = ['1st', '2nd', '3rd', '4th', '5th'];

type Obstacle =
  | 'pegs' | 'spinners' | 'bumpers' | 'windmills' | 'pendulums' | 'shuttles' | 'stairs'
  | 'wheels' | 'oval' | 'glass';
const OBSTACLES: Obstacle[] = [
  'pegs', 'spinners', 'bumpers', 'windmills', 'pendulums', 'shuttles', 'stairs', 'wheels', 'oval', 'glass',
];

/** Seconds after the start gate drops when the winner should arrive; the last one inside the usual finish window. */
const WINNER_MIN = 46;
const WINNER_MAX = 54;
/** Seconds the camera stays on a ball that just arrived before going back for the next one. */
const HOLD = 0.8;

const easeInOut = (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);

/**
 * Five balls race down a tall course: zig-zag ramps and funnels between obstacles (peg fields, spinners, pinball
 * bumpers, windmills, pendulums over a ramp, bouncy shuttles, stairs, big turning wheels, a glass oval that holds the
 * pack and a glass floor to break through), in a seed-shuffled order, plus one shortcut ramp in every race: the first ball to
 * cross its checkpoint opens a trapdoor that lets the ones behind skip two ramps.
 * Balls far behind the front ride a slipstream (less drag, a bit more pull), so the pack stays together: the winner
 * arrives around 50s after the start and the last one by ~1:05 of video. It opens with a countdown (`pickTime`) on the
 * start gate, for the viewer to pick a color.
 * The music comes only from the note blocks the course is built of, and only from the ball the camera follows: every
 * fresh touch of a block (a new tile rolled onto, a bounce) plays the next note of the song. A block lights up in the color of the
 * first ball that touched it. Wall bumps stay silent; ball-on-ball knocks make a dry click scaled by how hard they hit.
 * The camera follows the best-placed ball still racing, so after the winner it goes back for each of the others; the
 * video ends when the last one crosses the line.
 */
export const marbleRace: Template = {
  id: 'marble-race',
  name: 'Corrida de bolinhas',
  hooks: [
    { text: 'Which color wins? 🏁' },
    { text: 'Pick a color before it starts 👇' },
    { text: 'Comment your color BEFORE the race 🏁' },
    { text: 'The underdog always wins… right? 👀' },
    { text: 'Photo finish? Watch till the end 🏁' },
  ],
  blurbs: [
    'Marble race with five colors on a musical track: every block they touch plays the song.',
    'Satisfying marble run race. Pick your color and watch who wins, with relaxing piano music.',
    'Relaxing marble race simulation with shortcuts, glass and bumpers. Which color is yours?',
  ],
  tags: ['#marblerace', '#marblerun'],
  defaults: {
    sections: 7, gravity: 1500, ballRadius: 30, friction: 0.9, bounce: 0.6, slope: 11.5, catchUp: 0.3, pickTime: 5,
  },
  specs: [
    { key: 'sections', label: 'Trechos da pista', min: 2, max: 14, step: 1 },
    { key: 'slope', label: 'Inclinação das rampas (°)', min: 6, max: 25, step: 0.5 },
    { key: 'friction', label: 'Atrito nas rampas', min: 0.2, max: 3, step: 0.05 },
    { key: 'bounce', label: 'Quique', min: 0.05, max: 0.9, step: 0.05 },
    { key: 'gravity', label: 'Gravidade', min: 600, max: 3000, step: 50 },
    { key: 'catchUp', label: 'Vácuo para quem está atrás', min: 0, max: 1, step: 0.05 },
    { key: 'pickTime', label: 'Contagem para escolher a cor (s)', min: 0, max: 10, step: 1 },
  ],
  create(p, seed, look = {}) {
    const background = getBackground(look.background);
    const palette = getPalette(look.palette).colors;
    const rng = mulberry32(seed);
    const r = p.ballRadius;
    /** Countdown before the start gate drops, for the viewer to pick a color. */
    const pre = p.pickTime;
    const L = 110, R = W - 110, cx = W / 2;
    const colorOffset = Math.floor(rng() * 1000);
    let sectionIdx = 0;
    const sectionColor = () => palette[(colorOffset + sectionIdx++) % palette.length];
    const sign = () => (rng() < 0.5 ? -1 : 1);

    // ---------- Course ----------
    const blocks: Block[] = [];
    const gates: Gate[] = [];
    const traps: Trap[] = [];
    /** Silent floor of the finish basin. */
    const basin: [number, number, number, number][] = [];
    function add(b: Pick<Block, 'kind' | 'ax' | 'ay' | 'base'> & Partial<Block>) {
      const blk: Block = {
        bx: b.ax, by: b.ay, r: 0, d0: 0, d1: 0, a0: 0, w: 0, amp: 0, ph: 0,
        th: THICK, fr: p.friction, hp: 0, hp0: 0, broken: false,
        e: p.bounce, kick: 0, lit: null, touched: [], flash: 0, top: 0, bottom: 0, ...b,
      };
      blk.hp0 = blk.hp;
      const reach = blk.kind === 'arm' ? Math.max(Math.abs(blk.d0), Math.abs(blk.d1)) : blk.kind === 'shuttle' ? 0 : blk.r;
      blk.top = Math.min(blk.ay, blk.by) - reach;
      blk.bottom = Math.max(blk.ay, blk.by) + reach;
      blocks.push(blk);
    }
    /** A straight wall split into tiles, so it plays a little scale as a ball rolls over it. */
    function tiles(ax: number, ay: number, bx: number, by: number, base: HS, extra: Partial<Block> = {}) {
      const n = Math.max(1, Math.round(Math.hypot(bx - ax, by - ay) / TILE));
      for (let i = 0; i < n; i++) {
        add({
          kind: 'tile', base, ...extra,
          ax: ax + ((bx - ax) * i) / n, ay: ay + ((by - ay) * i) / n,
          bx: ax + ((bx - ax) * (i + 1)) / n, by: ay + ((by - ay) * (i + 1)) / n,
        });
      }
    }
    const bouncier = Math.min(0.9, p.bounce + 0.15);

    function pegs(y: number, rows = 5) {
      const base = sectionColor();
      const margin = 100;
      for (let row = 0; row < rows; row++) {
        const even = row % 2 === 0;
        const s = (R - L - 2 * margin) / 4;
        for (let k = 0; k < (even ? 5 : 4); k++) {
          const px = L + margin + (even ? k : k + 0.5) * s + (rng() - 0.5) * 24;
          const py = y + row * 115 + (rng() - 0.5) * 16;
          // About one peg in four is glass.
          add({ kind: 'peg', base, ax: px, ay: py, r: 15, e: bouncier, hp: rng() < 0.25 ? 1.5 : 0 });
        }
      }
      return y + (rows - 1) * 115 + 110;
    }

    /** V-shaped funnel that gathers everyone to the middle. */
    function funnel(y: number) {
      const base = sectionColor();
      const gap = 140, h = 280;
      tiles(L, y, cx - gap / 2, y + h, base);
      tiles(R, y, cx + gap / 2, y + h, base);
      return y + h + 120;
    }

    /** A ramp starting at the wall on the `dir` side (dir > 0: left wall, rolling right), with a gap at its low end. */
    function ramp(y: number, dir: number, base: HS, deg = p.slope * (0.8 + rng() * 0.4), gap = 150) {
      const drop = (R - L - gap) * Math.tan((deg * Math.PI) / 180);
      if (dir > 0) tiles(L, y, R - gap, y + drop, base);
      else tiles(R, y, L + gap, y + drop, base);
      /** Height of the ramp surface at x. */
      const at = (x: number) => y + (drop * (dir > 0 ? x - L : R - x)) / (R - L - gap);
      return { end: y + drop, at };
    }

    function zigzag(y: number, n: number, dir: number) {
      const base = sectionColor();
      for (let i = 0; i < n; i++) {
        y = ramp(y, dir, base).end + 140;
        dir = -dir;
      }
      return { y: y + 20, dir };
    }

    function spinners(y: number) {
      const base = sectionColor();
      for (const [sx, sy] of [[L + 215, y + 160], [R - 215, y + 160], [cx, y + 400]]) {
        add({ kind: 'arm', base, ax: sx, ay: sy, d0: -150, d1: 150, a0: rng() * Math.PI, w: (1.6 + rng() * 0.8) * sign(), e: bouncier });
      }
      return y + 600;
    }

    /** Two big four-armed crosses turning in opposite directions. */
    function windmills(y: number) {
      const base = sectionColor();
      const w = 1.2 + rng() * 0.5, s = sign();
      for (const [k, sx] of [[1, L + 215], [-1, R - 215]]) {
        const a0 = rng() * Math.PI;
        for (const off of [0, Math.PI / 2]) {
          add({ kind: 'arm', base, ax: sx, ay: y + 230, d0: -170, d1: 170, a0: a0 + off, w: w * k * s, e: bouncier });
        }
      }
      return y + 520;
    }

    /** Pinball: big bumpers that kick the balls away, and two bouncy pads by the walls throwing them back in. */
    function bumpers(y: number) {
      const base = sectionColor();
      const spots = [[L + 215, y + 150], [R - 215, y + 150], [cx, y + 360], [L + 200, y + 560], [R - 200, y + 560]];
      for (const [bx, by] of spots) {
        add({ kind: 'bumper', base, ax: bx + (rng() - 0.5) * 30, ay: by, r: 40, e: 0.9, kick: 750 });
      }
      tiles(L, y + 300, L + 120, y + 400, base, { e: 0.9, kick: 950 });
      tiles(R, y + 300, R - 120, y + 400, base, { e: 0.9, kick: 950 });
      return y + 700;
    }

    /** A gentle ramp with two pendulums swinging right over it, knocking the balls back or forward. */
    function pendulums(y: number, dir: number) {
      const base = sectionColor();
      const arm = 230;
      y += arm + 60;
      const rp = ramp(y, dir, base, 12);
      const w = 2 + rng() * 0.6, ph = rng() * TAU;
      for (const f of [0.33, 0.7]) {
        const px = dir > 0 ? L + f * (R - L - 150) : R - f * (R - L - 150);
        // The tip passes at the height of a rolling ball's center.
        const py = rp.at(px) - THICK / 2 - r - arm;
        add({ kind: 'arm', base, ax: px, ay: py, d0: 0, d1: arm, a0: Math.PI / 2, amp: 1, w, ph: ph + f * 2.2, e: bouncier });
      }
      return rp.end + 140;
    }

    /** Three bouncy bars sliding left and right: trampolines on the move. */
    function shuttles(y: number) {
      const base = sectionColor();
      const half = 120, amp = (R - L) / 2 - half - 30;
      for (let i = 0; i < 3; i++) {
        add({ kind: 'shuttle', base, ax: cx, ay: y + 140 + i * 220, r: half, amp, w: 1.2 + rng() * 0.7, ph: rng() * TAU, e: 0.85, kick: 700 });
      }
      return y + 140 + 2 * 220 + 160;
    }

    /** Two flights of stairs the balls hop down, step by step. */
    function stairs(y: number, dir: number) {
      const base = sectionColor();
      const steps = 6, width = 118, rise = 75;
      for (let f = 0; f < 2; f++) {
        for (let i = 0; i < steps; i++) {
          const x0 = dir > 0 ? L + i * width : R - i * width;
          const x1 = x0 + dir * width;
          // A slight tilt keeps them hopping on instead of stopping on a step.
          tiles(x0, y + i * rise, x1, y + i * rise + 12, base);
        }
        y += steps * rise + 120;
        dir = -dir;
      }
      return y + 40;
    }

    /**
     * Four ramps back and forth. Under the low end of the first one a checkpoint line spans the drop: the first ball to
     * fall through it lands on the second ramp and goes on the long way; a moment later a trapdoor opens at the start of
     * that second ramp, right where the balls land, so the ones behind fall through the third ramp's (wider) gap onto
     * the fourth: two ramps skipped.
     */
    function shortcut(y: number, dir: number) {
      const base = sectionColor();
      let rp = ramp(y, dir, base, p.slope);
      const ty = rp.end + 50;
      const firstB = blocks.length;
      const yB = rp.end + 140;
      rp = ramp(yB, -dir, base);
      const gate: Gate = {
        pressed: false, at: 0, color: null, hx: dir > 0 ? R : L, hy: yB,
        ty, x0: dir > 0 ? R - 190 : L, x1: dir > 0 ? R : L + 190,
      };
      gates.push(gate);
      for (let i = firstB; i < firstB + 3; i++) Object.assign(blocks[i], { role: 'door', gate });
      rp = ramp(rp.end + 140, dir, base, undefined, 260);
      rp = ramp(rp.end + 140, -dir, base);
      return rp.end + 160;
    }

    /** Big turning wheels: balls land on the rim and get carried off one side or the other. */
    function wheels(y: number) {
      const base = sectionColor();
      for (const [wx, wy, wr] of [[L + 200, y + 190, 110], [R - 200, y + 190, 110], [cx, y + 470, 125]]) {
        add({ kind: 'wheel', base, ax: wx, ay: wy, r: wr, w: (0.9 + rng() * 0.6) * sign(), e: 0.5 });
      }
      return y + 470 + 125 + 130;
    }

    /**
     * A glass oval, open at the top: a funnel drops everyone in and they bounce around inside. The glass holds until
     * four balls are in (or 4s after the first one), so the pack gathers; then every tile shatters on its second touch.
     */
    function oval(y: number) {
      const base = sectionColor();
      const a = 330, b = 250, mouth = 75, n = 22;
      // Angle (from the top) where the mouth's edge sits; the funnel walls end exactly there, so nobody gets around it.
      const th0 = Math.asin(mouth / a);
      const pt = (th: number): [number, number] => [cx + a * Math.sin(th), yc - b * Math.cos(th)];
      const yc = y + 280 + b * Math.cos(th0);
      const [ex, ey] = pt(th0);
      tiles(L, y, 2 * cx - ex, ey, base);
      tiles(R, y, ex, ey, base);
      const trap: Trap = { cx, yc, a, b, armed: false, firstAt: null };
      traps.push(trap);
      for (let k = 0; k < n; k++) {
        const [x0, y0] = pt(th0 + ((TAU - 2 * th0) * k) / n), [x1, y1] = pt(th0 + ((TAU - 2 * th0) * (k + 1)) / n);
        add({ kind: 'tile', base, ax: x0, ay: y0, bx: x1, by: y1, th: 26, e: 0.5, hp: 2, trap });
      }
      return yc + b + 130;
    }

    /** A glass floor, gently V-shaped, that has to be cracked through, then a row of loose glass bricks. */
    function glass(y: number) {
      const base = sectionColor();
      const n = 6, w = (R - L) / n;
      const h = (x: number) => y + 60 + 60 * (1 - Math.abs(x - cx) / (cx - L));
      for (let i = 0; i < n; i++) {
        const x0 = L + i * w, x1 = x0 + w;
        add({ kind: 'tile', base, ax: x0, ay: h(x0), bx: x1, by: h(x1), th: 30, e: 0.45, hp: 4 });
      }
      for (let k = 0; k < 3; k++) {
        const bx = L + 160 + k * 270, tilt = (rng() - 0.5) * 50;
        add({ kind: 'tile', base, ax: bx - 75, ay: y + 360 - tilt, bx: bx + 75, by: y + 360 + tilt, th: 30, e: 0.5, hp: 2.5 });
      }
      return y + 520;
    }

    const startY = 200;
    let y = pegs(startY + 160, 6);
    y = funnel(y);
    let dir = sign();
    const plan: (Obstacle | 'shortcut')[] = [...OBSTACLES];
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [plan[i], plan[j]] = [plan[j], plan[i]];
    }
    const sections = Math.round(p.sections);
    // Every race has one shortcut, never first (the pack needs time to spread out) nor last.
    plan.splice(Math.min(sections - 2, 1 + Math.floor(rng() * Math.max(1, sections - 3))), 0, 'shortcut');
    for (let i = 0; i < sections; i++) {
      ({ y, dir } = zigzag(y, 1 + Math.floor(rng() * 2), dir));
      if (i === sections - 1) break;
      const kind = plan[i % plan.length];
      if (kind === 'shortcut') {
        // It ends on the side opposite to where it starts; the zigzag after the funnel doesn't care.
        y = funnel(shortcut(y, dir));
        continue;
      }
      if (kind === 'pegs') y = pegs(y);
      else if (kind === 'spinners') y = spinners(y);
      else if (kind === 'bumpers') y = bumpers(y);
      else if (kind === 'windmills') y = windmills(y);
      else if (kind === 'pendulums') y = pendulums(y, dir);
      else if (kind === 'shuttles') y = shuttles(y);
      else if (kind === 'wheels') y = wheels(y);
      else if (kind === 'oval') y = oval(y);
      else if (kind === 'glass') y = glass(y);
      else y = stairs(y, dir);
      y = funnel(y);
    }
    const finishY = y + 120;
    const floorY = finishY + 420;
    basin.push([L, floorY - 70, cx, floorY], [cx, floorY, R, floorY - 70]);

    const buckets = new Map<number, Block[]>();
    for (const b of blocks) {
      for (let k = Math.floor((b.top - r - THICK) / BUCKET); k <= Math.floor((b.bottom + r + THICK) / BUCKET); k++) {
        if (!buckets.has(k)) buckets.set(k, []);
        buckets.get(k)!.push(b);
      }
    }

    // ---------- Racers ----------
    const order = [...RACERS];
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const racers: Racer[] = order.map((d, i) => ({
      id: i, name: d.name, color: d.color,
      x: L + 90 + (i * (R - L - 180)) / (order.length - 1) + (rng() - 0.5) * 30,
      y: startY + (rng() - 0.5) * 20,
      vx: 0, vy: 0, rot: 0, spin: 0, squash: 0, still: 0, best: 0, bestAt: 0, boost: 0, trail: [], place: null, hudX: W / 2,
    }));

    let particles: Particle[] = [];
    let notes: FloatingNote[] = [];
    let finished = 0;
    let leader = racers[0];
    /** The ball the camera follows, and the only one whose touches make music. */
    let focus: Racer | null = racers[0];
    let lastLeadChange = 0;
    let leadGlow = 0;
    let cam = startY - 650;
    /** Eased pan when the camera switches to another ball. */
    let pan: { from: number; start: number; dur: number } | null = null;
    let holdUntil: number | null = null;
    let winner: Racer | null = null;
    let winnerTime: number | null = null;
    /** For the drama score: lead changes in the second half of the race, and when the runner-up arrived. */
    let lateLeadChanges = 0;
    let secondTime: number | null = null;
    const lastClack: number[] = [];

    /** Pushes a ball out of a surface and bounces it, relative to the surface's own velocity. */
    /** Returns the impact speed (0 when just resting or rolling), or -1 when not touching. */
    function contact(
      b: Racer, qx: number, qy: number, minD: number, e: number, kick = 0, svx = 0, svy = 0, fr = p.friction,
    ) {
      const dx = b.x - qx, dy = b.y - qy;
      const d = Math.hypot(dx, dy);
      if (d >= minD || d === 0) return -1;
      const nx = dx / d, ny = dy / d;
      b.x = qx + nx * minD;
      b.y = qy + ny * minD;
      let rvx = b.vx - svx, rvy = b.vy - svy;
      const vn = rvx * nx + rvy * ny;
      if (vn < 0) {
        const out = Math.max(-e * vn, kick);
        rvx += (out - vn) * nx;
        rvy += (out - vn) * ny;
        // Kicks go off a bit sideways, or a ball could juggle on top of a bumper forever.
        if (kick) {
          const side = (rng() - 0.5) * 0.7 * out;
          rvx -= ny * side;
          rvy += nx * side;
        }
        if (vn < -250 || kick) b.squash = Math.min(1, Math.max(-vn, kick) / 900);
      }
      // Rolling resistance on the tangential part: gives every slope a calm cruising speed.
      const vn2 = rvx * nx + rvy * ny;
      const k = Math.min(1, fr * (1 - 0.6 * p.catchUp * b.boost) * DT);
      rvx -= (rvx - vn2 * nx) * k;
      rvy -= (rvy - vn2 * ny) * k;
      b.vx = rvx + svx;
      b.vy = rvy + svy;
      // Rolling without slipping: the spin follows the speed along the surface.
      b.spin = (rvx * -ny + rvy * nx) / r;
      return Math.max(0, -vn);
    }

    function shatter(blk: Block, t: number, events: SimEvent[]) {
      blk.broken = true;
      const mx = (blk.ax + blk.bx) / 2, my = (blk.ay + blk.by) / 2;
      burst(particles, rng, mx, my, 34, 650, [blk.lit ?? blk.base, [0, 0]]);
      if (sim.finishTime === null) events.push({ t, kind: 'break' });
    }

    function closestOnSeg(x: number, y: number, ax: number, ay: number, bx: number, by: number): [number, number] {
      const ex = bx - ax, ey = by - ay;
      const u = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1)));
      return [ax + ex * u, ay + ey * u];
    }

    /** Where a moving block is at time t: its segment and its angular (arm) or sliding (shuttle) speed. */
    function pose(b: Block, t: number): { seg: [number, number, number, number]; omega: number; slide: number } {
      if (b.kind === 'arm') {
        const swing = b.amp !== 0;
        const a = swing ? b.a0 + b.amp * Math.sin(b.w * t + b.ph) : b.a0 + b.w * t;
        const omega = swing ? b.amp * b.w * Math.cos(b.w * t + b.ph) : b.w;
        const c = Math.cos(a), s = Math.sin(a);
        return { seg: [b.ax + c * b.d0, b.ay + s * b.d0, b.ax + c * b.d1, b.ay + s * b.d1], omega, slide: 0 };
      }
      if (b.kind === 'shuttle') {
        const x = b.ax + b.amp * Math.sin(b.w * t + b.ph);
        return { seg: [x - b.r, b.ay, x + b.r, b.ay], omega: 0, slide: b.amp * b.w * Math.cos(b.w * t + b.ph) };
      }
      return { seg: [b.ax, b.ay, b.bx, b.by], omega: 0, slide: 0 };
    }

    function touch(blk: Block, ball: Racer, t: number, events: SimEvent[]) {
      blk.flash = 1;
      if (!blk.lit) blk.lit = ball.color;
      const last = blk.touched[ball.id] ?? -1;
      blk.touched[ball.id] = t;
      if (t - last < 0.15) return;
      if (blk.trap?.armed && --blk.hp <= 0) shatter(blk, t, events);
      if (ball !== focus || sim.finishTime !== null) return;
      events.push({ t, kind: 'hit', x: ball.x });
      notes.push({ x: ball.x + (rng() - 0.5) * 30, y: ball.y - r, life: 1.2, color: ball.color });
    }

    function rank() {
      return [...racers].sort((a, b) => {
        if (a.place !== null || b.place !== null) return (a.place ?? 99) - (b.place ?? 99);
        return b.y - a.y;
      });
    }

    const sim = {
      accept: () => winnerTime !== null && winnerTime - pre >= WINNER_MIN && winnerTime - pre <= WINNER_MAX,
      // A photo finish (runner-up within ~1s) and a few late overtakes make the best races.
      drama: () => Math.min(1, lateLeadChanges / 4)
        + (winnerTime !== null && secondTime !== null ? Math.max(0, 1 - (secondTime - winnerTime) / 1.5) : 0),
      time: 0,
      finishTime: null as number | null,
      step() {
        const events: SimEvent[] = [];
        if (sim.time < pre) {
          // Countdown: the balls wait on the start gate; every second ticks a note, and it drops on GO.
          const before = Math.ceil(pre - sim.time - 1e-6);
          sim.time += 1 / FPS;
          const left = pre - sim.time;
          if (left <= 1e-6) {
            events.push({ t: sim.time, kind: 'break' });
            for (const b of racers) { b.bestAt = sim.time; b.squash = 0.6; }
            burst(particles, rng, cx, startY + r, 40, 700, palette);
          } else if (Math.ceil(left - 1e-6) < before) {
            events.push({ t: sim.time, kind: 'hit' });
            for (const b of racers) b.squash = 0.4;
          }
          for (const b of racers) {
            b.hudX += (W / 2 + (b.id - 2) * 150 - b.hudX) * 0.15;
            b.squash *= 0.82;
          }
          particles = updateParticles(particles, 1 / FPS, 700);
          return events;
        }
        // Slipstream: ramps up from ~250px behind the front, full at ~1500px (or more) behind.
        const front = Math.max(...racers.map((b) => Math.min(b.y, finishY)));
        for (const b of racers) b.boost = b.place !== null ? 0 : Math.min(1, Math.max(0, (front - b.y - 250) / 1300));
        for (let s = 0; s < SUBSTEPS; s++) {
          const t = sim.time + s * DT;
          for (const b of racers) {
            const prevY = b.y;
            b.vy += p.gravity * (1 + 0.3 * p.catchUp * b.boost) * DT;
            const sp = Math.hypot(b.vx, b.vy);
            if (sp > 1400) { b.vx *= 1400 / sp; b.vy *= 1400 / sp; }
            b.x += b.vx * DT;
            b.y += b.vy * DT;
            b.rot += b.spin * DT;
            let touching = false;
            for (const blk of buckets.get(Math.floor(b.y / BUCKET)) ?? []) {
              if (b.y + r + THICK < blk.top || b.y - r - THICK > blk.bottom) continue;
              if (blk.broken || (blk.role === 'door' && blk.gate!.pressed && t >= blk.gate!.at)) continue;
              let impact: number;
              if (blk.kind === 'peg' || blk.kind === 'bumper') {
                impact = contact(b, blk.ax, blk.ay, r + blk.r, blk.e, blk.kick);
              } else if (blk.kind === 'wheel') {
                // The rim drags the ball along: surface velocity w x r at the contact point.
                const d = Math.hypot(b.x - blk.ax, b.y - blk.ay) || 1;
                const qx = blk.ax + ((b.x - blk.ax) / d) * blk.r, qy = blk.ay + ((b.y - blk.ay) / d) * blk.r;
                impact = contact(b, blk.ax, blk.ay, r + blk.r, blk.e, 0, -blk.w * (qy - blk.ay), blk.w * (qx - blk.ax));
              } else {
                const { seg: [ax, ay, bx, by], omega, slide } = pose(blk, t);
                const [qx, qy] = closestOnSeg(b.x, b.y, ax, ay, bx, by);
                // Velocity of the surface at the contact point: w x r for arms, the slide for shuttles.
                impact = contact(b, qx, qy, r + blk.th / 2, blk.e, blk.kick,
                  slide - omega * (qy - blk.ay), omega * (qx - blk.ax), blk.fr);
              }
              if (impact < 0) continue;
              touching = true;
              touch(blk, b, t, events);
              // Glass cracks with every hit, and a little while it's pressed on.
              if (blk.hp0 > 0 && !blk.trap && !blk.broken) {
                blk.hp -= impact / 350 + 1.2 * DT;
                if (blk.hp <= 0) shatter(blk, t, events);
              }
            }
            for (const [ax, ay, bx, by] of basin) {
              const [qx, qy] = closestOnSeg(b.x, b.y, ax, ay, bx, by);
              if (contact(b, qx, qy, r + THICK / 2, 0.3) >= 0) touching = true;
            }
            if (b.x < L + r) { b.x = L + r; if (b.vx < 0) b.vx = -b.vx * 0.5; }
            if (b.x > R - r) { b.x = R - r; if (b.vx > 0) b.vx = -b.vx * 0.5; }
            if (!touching) b.spin *= 0.9995;
            // Two or three balls can wedge in a funnel or on a peg; after a while, a little hop frees them.
            if (b.place === null && touching && Math.hypot(b.vx, b.vy) < 30) b.still += DT;
            else b.still = 0;
            if (b.still > 1.2) {
              b.still = 0;
              b.vx += (rng() - 0.5) * 500;
              b.vy -= 350;
            }
            if (b.y > b.best + 40) { b.best = b.y; b.bestAt = t; }
            if (b.place === null && t - b.bestAt > 6) {
              b.bestAt = t;
              b.vx = (cx - b.x) * 1.5 + (rng() - 0.5) * 300;
              b.vy = -700;
            }
            for (const g of gates) {
              if (g.pressed || prevY >= g.ty || b.y < g.ty || b.x < g.x0 || b.x > g.x1) continue;
              g.pressed = true;
              // Time for the first one to roll past the trapdoor before it opens.
              g.at = t + 1.3;
              g.color = b.color;
              if (sim.finishTime === null) events.push({ t, kind: 'break' });
              notes.push({ x: (g.hx + cx) / 2, y: g.hy - 90, life: 3, color: b.color, text: 'Shortcut open!' });
              burst(particles, rng, (g.x0 + g.x1) / 2, g.ty, 30, 450, [b.color]);
            }
            if (b.place === null && b.y > finishY) {
              b.place = ++finished;
              const first = b.place === 1, last = finished === racers.length;
              burst(particles, rng, b.x, finishY, first || last ? 160 : 60, first || last ? 1100 : 600,
                first || last ? [b.color, b.color, ...palette] : [b.color]);
              notes.push({ x: b.x, y: finishY - 60, life: 1.6, color: b.color });
              if (first) { winner = b; winnerTime = t; }
              if (b.place === 2) secondTime = t;
              if (last) {
                sim.finishTime = t;
                events.push({ t, kind: 'finish' });
              } else {
                events.push({ t, kind: 'break' });
              }
            }
          }
          // Ball-on-ball: soft bumps with a dry click, louder the harder they hit (not a note of the song).
          for (let i = 0; i < racers.length; i++) {
            for (let j = i + 1; j < racers.length; j++) {
              const a = racers[i], b = racers[j];
              const dx = b.x - a.x, dy = b.y - a.y;
              const d = Math.hypot(dx, dy);
              if (d >= 2 * r || d === 0) continue;
              const nx = dx / d, ny = dy / d;
              const push = (2 * r - d) / 2;
              a.x -= nx * push; a.y -= ny * push;
              b.x += nx * push; b.y += ny * push;
              const rv = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
              if (rv > 0) {
                const j2 = rv * 0.85;
                a.vx -= j2 * nx; a.vy -= j2 * ny;
                b.vx += j2 * nx; b.vy += j2 * ny;
                // Resting against each other gives tiny approach speeds: only real knocks click, once per knock.
                const pair = i * racers.length + j;
                if (rv > 70 && t - (lastClack[pair] ?? -1) > 0.08 && sim.finishTime === null) {
                  lastClack[pair] = t;
                  // Knocks the camera can't see sound fainter.
                  const seen = Math.max(a.y, b.y) > cam - 100 && Math.min(a.y, b.y) < cam + H + 100;
                  events.push({ t, kind: 'clack', vel: Math.min(1, (rv - 70) / 900) * (seen ? 1 : 0.35) });
                }
              }
            }
          }
        }
        sim.time += 1 / FPS;

        const ranked = rank();
        // A lead change needs a real margin, so two balls side by side don't flicker the crown.
        if (ranked[0] !== leader && (ranked[0].place !== null || ranked[0].y > leader.y + 25)) {
          leader = ranked[0];
          leadGlow = 1;
          if (!winner && sim.time - lastLeadChange > 1.5 && sim.time > pre + 2) {
            events.push({ t: sim.time, kind: 'break' });
            notes.push({ x: leader.x, y: leader.y - r * 2, life: 1.4, color: leader.color });
          }
          lastLeadChange = sim.time;
          if (!winner && sim.time > pre + WINNER_MIN / 2) lateLeadChanges++;
        }
        ranked.forEach((b, i) => { b.hudX += (W / 2 + (i - 2) * 150 - b.hudX) * 0.15; });
        // The camera lingers on a ball that just arrived, then pans (eased) to the best-placed one still racing.
        const next = ranked.find((b) => b.place === null) ?? null;
        if (next !== focus) {
          if (focus?.place != null && holdUntil === null) holdUntil = sim.time + HOLD;
          if (holdUntil === null || sim.time >= holdUntil) {
            const dist = Math.abs((next ? next.y : floorY) - (focus ? focus.y : floorY));
            pan = { from: cam, start: sim.time, dur: Math.min(2.6, Math.max(0.5, dist / 1200)) };
            focus = next;
            holdUntil = null;
          }
        }
        const target = Math.max(startY - 650, (focus ? Math.min(focus.y, floorY - 60) : floorY - 60) - H * 0.6);
        if (pan && sim.time < pan.start + pan.dur) {
          cam = pan.from + (target - pan.from) * easeInOut((sim.time - pan.start) / pan.dur);
        } else {
          pan = null;
          cam += (target - cam) * 0.08;
        }
        for (const b of racers) {
          if (b.boost * p.catchUp > 0.1) b.trail.push([b.x, b.y]);
          if (b.trail.length > 10 || (b.boost * p.catchUp <= 0.1 && b.trail.length)) b.trail.shift();
        }

        particles = updateParticles(particles, 1 / FPS, 700);
        notes = notes.filter((n) => (n.life -= 1 / FPS) > 0);
        for (const n of notes) n.y -= 90 / FPS;
        for (const tr of traps) {
          if (tr.armed) continue;
          const inside = racers.filter((b) => ((b.x - tr.cx) / tr.a) ** 2 + ((b.y - tr.yc) / tr.b) ** 2 < 1).length;
          if (inside && tr.firstAt === null) tr.firstAt = sim.time;
          if (inside >= 4 || (tr.firstAt !== null && sim.time - tr.firstAt > 4)) {
            tr.armed = true;
            for (const blk of blocks) if (blk.trap === tr) blk.flash = 1;
            if (sim.finishTime === null) events.push({ t: sim.time, kind: 'break' });
            notes.push({ x: tr.cx, y: tr.yc - tr.b - 60, life: 2.2, color: leader.color, text: 'Break out!' });
          }
        }
        for (const blk of blocks) blk.flash *= 0.88;
        for (const b of racers) b.squash *= 0.82;
        leadGlow *= 0.95;
        return events;
      },
      draw(ctx: Ctx2D, overlay: string) {
        background.draw(ctx, sim.time);
        const light = background.light;
        ctx.save();
        ctx.translate(0, -cam);
        ctx.lineCap = 'round';
        // Side walls.
        ctx.strokeStyle = light ? 'rgba(80,60,110,0.35)' : 'rgba(255,255,255,0.22)';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.moveTo(L - 3, Math.max(startY - 200, cam - 50)); ctx.lineTo(L - 3, Math.min(floorY, cam + H + 50));
        ctx.moveTo(R + 3, Math.max(startY - 200, cam - 50)); ctx.lineTo(R + 3, Math.min(floorY, cam + H + 50));
        ctx.stroke();

        const lo = cam - 200, hi = cam + H + 200;
        const pivot = light ? 'rgba(80,60,110,0.6)' : 'rgba(255,255,255,0.8)';
        for (const blk of blocks) {
          if (blk.bottom < lo || blk.top > hi || blk.broken) continue;
          const col = blk.lit ?? blk.base;
          const l = blk.lit ? (light ? 55 : 68) + blk.flash * 20 : (light ? 70 : 82);
          const a = blk.lit ? 1 : (light ? 0.75 : 0.55);
          ctx.strokeStyle = ctx.fillStyle = hsl(col, l, a);
          if (blk.kind === 'wheel') {
            ctx.beginPath();
            ctx.arc(blk.ax, blk.ay, blk.r + blk.flash * 4, 0, TAU);
            ctx.fill();
            // Spokes turning, so the spin reads.
            ctx.strokeStyle = light ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 8;
            ctx.beginPath();
            for (let k = 0; k < 3; k++) {
              const sa = blk.w * sim.time + (k * Math.PI) / 3;
              const sx = Math.cos(sa) * blk.r * 0.75, sy = Math.sin(sa) * blk.r * 0.75;
              ctx.moveTo(blk.ax - sx, blk.ay - sy);
              ctx.lineTo(blk.ax + sx, blk.ay + sy);
            }
            ctx.stroke();
            ctx.fillStyle = pivot;
            ctx.beginPath();
            ctx.arc(blk.ax, blk.ay, 12, 0, TAU);
            ctx.fill();
            continue;
          }
          if (blk.kind === 'peg' || blk.kind === 'bumper') {
            ctx.beginPath();
            ctx.arc(blk.ax, blk.ay, blk.r + blk.flash * (blk.kind === 'bumper' ? 9 : 5), 0, TAU);
            ctx.fill();
            if (blk.hp0 > 0) drawGlass(ctx, blk, blk.ax - 9, blk.ay, blk.ax + 9, blk.ay);
            if (blk.kind === 'bumper') {
              ctx.strokeStyle = light ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.55)';
              ctx.lineWidth = 5;
              ctx.beginPath();
              ctx.arc(blk.ax, blk.ay, blk.r * 0.55, 0, TAU);
              ctx.stroke();
            }
            continue;
          }
          let [ax, ay, bx, by] = pose(blk, sim.time).seg;
          const doorOpen = blk.role === 'door' && blk.gate!.pressed && sim.time >= blk.gate!.at;
          if (doorOpen) {
            // The trapdoor swings down around its hinge and fades out.
            const g = blk.gate!;
            const u = Math.min(1, (sim.time - g.at) / 0.4);
            const ang = u * 1.45 * (g.hx < cx ? 1 : -1);
            const c = Math.cos(ang), sn = Math.sin(ang);
            const rot = (x: number, y: number) => [g.hx + (x - g.hx) * c - (y - g.hy) * sn, g.hy + (x - g.hx) * sn + (y - g.hy) * c];
            [ax, ay] = rot(ax, ay);
            [bx, by] = rot(bx, by);
            ctx.strokeStyle = hsl(g.color!, light ? 55 : 72, 0.8);
          }
          // Tiles are drawn a bit shorter than their physics, so each note block reads as its own key.
          const len = Math.hypot(bx - ax, by - ay) || 1;
          const ux = (bx - ax) / len, uy = (by - ay) / len;
          const inset = blk.kind === 'tile' ? Math.min(14, len * 0.15) : 0;
          ctx.lineWidth = blk.th - 4 + blk.flash * 6 + (blk.kick ? 4 : 0);
          ctx.beginPath();
          ctx.moveTo(ax + ux * inset, ay + uy * inset);
          ctx.lineTo(bx - ux * inset, by - uy * inset);
          ctx.stroke();
          if (blk.role === 'door' && !doorOpen) {
            // Hatched, so it reads as a trapdoor.
            ctx.save();
            ctx.setLineDash([8, 12]);
            ctx.lineWidth = 6;
            ctx.strokeStyle = light ? 'rgba(80,60,110,0.55)' : 'rgba(255,255,255,0.75)';
            ctx.beginPath();
            ctx.moveTo(ax + ux * inset, ay + uy * inset);
            ctx.lineTo(bx - ux * inset, by - uy * inset);
            ctx.stroke();
            ctx.restore();
          }
          if (blk.hp0 > 0) drawGlass(ctx, blk, ax + ux * inset, ay + uy * inset, bx - ux * inset, by - uy * inset);
          if (blk.kind === 'arm') {
            ctx.fillStyle = pivot;
            ctx.beginPath();
            ctx.arc(blk.ax, blk.ay, 7, 0, TAU);
            ctx.fill();
          }
        }

        // Shortcut checkpoints: a dashed beam across the drop, pulsing until someone crosses it.
        for (const g of gates) {
          if (g.ty < lo || g.ty > hi) continue;
          ctx.save();
          ctx.setLineDash([16, 12]);
          ctx.lineDashOffset = -sim.time * 60;
          ctx.lineWidth = 7;
          ctx.strokeStyle = g.color
            ? hsl(g.color, light ? 55 : 70)
            : `rgba(255, ${light ? 120 : 220}, 90, ${0.65 + Math.sin(sim.time * 6) * 0.3})`;
          ctx.beginPath();
          ctx.moveTo(g.x0 + 8, g.ty); ctx.lineTo(g.x1 - 8, g.ty);
          ctx.stroke();
          ctx.restore();
          ctx.fillStyle = pivot;
          for (const px of [g.x0 + 8, g.x1 - 8]) {
            ctx.beginPath();
            ctx.arc(px, g.ty, 9, 0, TAU);
            ctx.fill();
          }
        }

        // Finish line: a checkered strip.
        if (finishY > lo && finishY < hi) {
          const sq = 20;
          for (let i = 0; L + i * sq < R; i++) {
            for (let j = 0; j < 2; j++) {
              ctx.fillStyle = (i + j) % 2 === 0 ? 'rgba(255,255,255,0.9)' : 'rgba(40,30,60,0.85)';
              ctx.fillRect(L + i * sq, finishY - sq + j * sq, Math.min(sq, R - L - i * sq), sq);
            }
          }
        }
        if (floorY - 100 < hi) {
          ctx.strokeStyle = hsl(palette[0], light ? 55 : 80, 0.9);
          ctx.lineWidth = THICK;
          ctx.beginPath();
          ctx.moveTo(L, floorY - 70); ctx.lineTo(cx, floorY); ctx.lineTo(R, floorY - 70);
          ctx.stroke();
        }

        // Start gate under the waiting balls: on GO its two halves swing down from the middle.
        const open = Math.min(1, Math.max(0, (sim.time - pre) / 0.35));
        if (open < 1) {
          const gy = startY + 10 + r + THICK / 2;
          ctx.strokeStyle = hsl(palette[0], light ? 55 : 78, 1 - open);
          ctx.lineWidth = THICK - 4;
          ctx.beginPath();
          for (const [hx, dir] of [[L, 1], [R, -1]] as const) {
            const ang = open * 1.4 * dir;
            ctx.moveTo(hx, gy);
            ctx.lineTo(hx + Math.cos(ang) * (cx - L) * dir, gy + Math.sin(ang) * (cx - L) * dir);
          }
          ctx.stroke();
        }

        drawParticles(ctx, particles);
        ctx.font = '700 44px "Nunito", "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        for (const n of notes) {
          if (n.text) {
            ctx.font = '800 46px "Nunito", "Segoe UI", system-ui, sans-serif';
            ctx.lineWidth = 7;
            ctx.strokeStyle = `rgba(45,30,70,${0.5 * Math.min(1, n.life)})`;
            ctx.strokeText(n.text, n.x, n.y);
          }
          ctx.fillStyle = hsl(n.color, light ? 50 : 75, Math.min(1, n.life));
          ctx.fillText(n.text ?? '♪', n.x, n.y);
          if (n.text) ctx.font = '700 44px "Nunito", "Segoe UI", system-ui, sans-serif';
        }
        // Slipstream trails behind the balls catching up.
        for (const b of racers) {
          b.trail.forEach(([tx, ty], i) => {
            const k = (i + 1) / b.trail.length;
            ctx.fillStyle = hsl(b.color, 75, k * 0.6 * b.boost * p.catchUp);
            ctx.beginPath();
            ctx.arc(tx, ty, r * (0.4 + k * 0.5), 0, TAU);
            ctx.fill();
          });
        }
        for (const b of racers) drawRacer(ctx, b, r, b.rot);
        // The leader wears a little crown; finished balls show their place.
        if (sim.time >= pre) drawCrown(ctx, leader.x, leader.y - r - 14 - leadGlow * 8, 1 + leadGlow * 0.3);
        ctx.font = '800 30px "Nunito", "Segoe UI", system-ui, sans-serif';
        ctx.lineWidth = 6;
        ctx.strokeStyle = 'rgba(45,30,70,0.55)';
        ctx.fillStyle = '#fff8f0';
        for (const b of racers) {
          if (b.place === null || b === leader) continue;
          ctx.strokeText(PLACES[b.place - 1], b.x, b.y - r - 22);
          ctx.fillText(PLACES[b.place - 1], b.x, b.y - r - 22);
        }
        ctx.restore();

        drawOverlay(ctx, overlay);
        // Leaderboard: the five balls in race order, sliding when someone overtakes.
        const hudY = H - 420;
        ctx.fillStyle = light ? 'rgba(255,255,255,0.45)' : 'rgba(25,18,45,0.45)';
        ctx.beginPath();
        ctx.roundRect(W / 2 - 390, hudY - 58, 780, 150, 40);
        ctx.fill();
        ctx.font = '700 28px "Nunito", "Segoe UI", system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255,248,240,0.9)';
        ctx.strokeStyle = 'rgba(45,30,70,0.5)';
        ctx.lineWidth = 6;
        // During the countdown the names take the places' spot.
        if (sim.time >= pre) PLACES.forEach((label, i) => {
          ctx.strokeText(label, W / 2 + (i - 2) * 150, hudY + 62);
          ctx.fillText(label, W / 2 + (i - 2) * 150, hudY + 62);
        });
        for (const b of racers) drawRacer(ctx, { ...b, x: b.hudX, y: hudY, squash: 0 }, 34, 0);
        if (sim.time < pre + 0.8) drawCountdown(ctx);
        if (winner) drawCaption(ctx, `${winner.name} wins! 🏆`, hudY - 110);
      },
    };

    /** "Pick your color!" with the racers' names, the seconds left, then GO! */
    function drawCountdown(ctx: Ctx2D) {
      const left = pre - sim.time;
      const fade = left > 0 ? 1 : Math.max(0, 1 + left / 0.8);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.shadowColor = 'rgba(20,15,40,0.55)';
      ctx.shadowBlur = 18;
      ctx.strokeStyle = 'rgba(45,30,70,0.55)';
      if (left > 0) {
        drawCaption(ctx, 'Pick your color!', 470);
        // The racers' names under them in the leaderboard, in their colors.
        ctx.font = '800 30px "Nunito", "Segoe UI", system-ui, sans-serif';
        ctx.lineWidth = 6;
        for (const b of racers) {
          ctx.strokeText(b.name, b.hudX, H - 420 + 62);
          ctx.fillStyle = hsl(b.color, 75);
          ctx.fillText(b.name, b.hudX, H - 420 + 62);
        }
      }
      // Each number pops in big and settles.
      const frac = left > 0 ? left - Math.floor(left - 1e-6) : 1 + left;
      const k = left > 0 ? 1 + 0.35 * Math.max(0, frac - 0.75) / 0.25 : 1 + 0.4 * (1 - fade);
      ctx.translate(W / 2, 1000);
      ctx.scale(k, k);
      ctx.font = '900 220px "Nunito", "Segoe UI", system-ui, sans-serif';
      ctx.lineWidth = 16;
      const label = left > 0 ? String(Math.ceil(left - 1e-6)) : 'GO!';
      ctx.strokeText(label, 0, 0);
      ctx.fillStyle = '#fff8f0';
      ctx.fillText(label, 0, 0);
      ctx.restore();
    }

    function drawRacer(ctx: Ctx2D, b: Racer, size: number, rot: number) {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(rot);
      drawMascot(ctx, 0, 0, size, b.color[0], b.squash, b.color[1], LIGHT.get(b.name) ?? 70);
      ctx.restore();
    }

    return sim;
  },
};

/** Glass look: a white shine along the piece, and cracks that spread as it takes hits. */
function drawGlass(ctx: Ctx2D, blk: Block, ax: number, ay: number, bx: number, by: number) {
  ctx.save();
  ctx.lineCap = 'round';
  const len = Math.hypot(bx - ax, by - ay) || 1;
  const ux = (bx - ax) / len, uy = (by - ay) / len, nx = -uy, ny = ux;
  const half = blk.kind === 'tile' ? blk.th / 2 - 5 : blk.r - 5;
  if (blk.kind === 'tile') {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ax + ux * 6 - nx * (half - 3), ay + uy * 6 - ny * (half - 3));
    ctx.lineTo(ax + ux * len * 0.45 - nx * (half - 3), ay + uy * len * 0.45 - ny * (half - 3));
    ctx.stroke();
  }
  const cracks = Math.ceil((1 - blk.hp / blk.hp0) * 3);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2.5;
  for (let i = 0; i < cracks; i++) {
    const f = (i + 1) / (cracks + 1);
    const mx = ax + (bx - ax) * f, my = ay + (by - ay) * f;
    ctx.beginPath();
    ctx.moveTo(mx - nx * half, my - ny * half);
    ctx.lineTo(mx + ux * 6, my + uy * 6);
    ctx.lineTo(mx - ux * 4 + nx * half, my - uy * 4 + ny * half);
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrown(ctx: Ctx2D, x: number, y: number, k: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(k, k);
  ctx.fillStyle = '#ffd34d';
  ctx.strokeStyle = 'rgba(120,70,0,0.6)';
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-18, 8);
  ctx.lineTo(-20, -10);
  ctx.lineTo(-9, -1);
  ctx.lineTo(0, -15);
  ctx.lineTo(9, -1);
  ctx.lineTo(20, -10);
  ctx.lineTo(18, 8);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
