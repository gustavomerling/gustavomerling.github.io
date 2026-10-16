import { H, W, type Ctx2D } from './types';
import { TAU, mulberry32 } from './util';

export interface Background {
  id: string;
  name: string;
  /** Hashtags added to the caption when this background is used. */
  tags: string[];
  /** Light skies need darker, more saturated lines to keep contrast. */
  light?: boolean;
  draw(ctx: Ctx2D, t: number): void;
}

// Every background is a pure function of time (and fixed seeded layouts), so preview and export match.

function vertical(ctx: Ctx2D, stops: string[]) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

function glow(ctx: Ctx2D, x: number, y: number, r: number, color: string) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - r, y - r, r * 2, r * 2);
}

function makeStars(seed: number, n: number, maxY = H * 0.9) {
  const r = mulberry32(seed);
  return Array.from({ length: n }, () => ({
    x: r() * W, y: r() * maxY, s: 0.8 + r() * 2.4, ph: r() * TAU, appear: r(),
  }));
}

function drawStars(ctx: Ctx2D, stars: ReturnType<typeof makeStars>, t: number, visibility = 1) {
  for (const s of stars) {
    const v = Math.min(1, Math.max(0, (visibility - s.appear) * 4));
    if (v <= 0) continue;
    ctx.fillStyle = `rgba(255,248,230,${v * (0.45 + 0.35 * Math.sin(t * 1.3 + s.ph))})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.s, 0, TAU);
    ctx.fill();
  }
}

function mixHex(a: string, b: string, k: number) {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - k) + ((pb >> s) & 255) * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

function puffyCloud(ctx: Ctx2D, x: number, y: number, w: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  for (const [ox, oy, rr] of [[0, 0, 0.32], [-0.3, 0.08, 0.22], [0.3, 0.07, 0.24], [-0.12, -0.12, 0.22], [0.14, -0.1, 0.2]]) {
    ctx.moveTo(x + ox * w + rr * w, y + oy * w);
    ctx.arc(x + ox * w, y + oy * w, rr * w, 0, TAU);
  }
  ctx.fill();
}

const wrapX = (x: number, margin: number) => {
  const span = W + margin * 2;
  return ((((x + margin) % span) + span) % span) - margin;
};

// 1. Dusk to night: the sky darkens over the video, stars appear, the moon rises.
const DUSK = ['#2b3a5c', '#4b4f7d', '#a27f9e', '#e0a99a'];
const NIGHT = ['#0e1430', '#1b2048', '#2f2c5a', '#47396a'];
const duskStars = makeStars(7, 90);
const duskClouds = (() => {
  const r = mulberry32(8);
  return Array.from({ length: 6 }, (_, i) => ({
    x: r() * W, y: H * (i < 3 ? 0.08 + r() * 0.12 : 0.78 + r() * 0.15),
    w: 260 + r() * 260, speed: (6 + r() * 14) * (r() < 0.5 ? -1 : 1),
  }));
})();

const dusk: Background = {
  id: 'dusk',
  name: 'Anoitecer',
  tags: ['#nightsky', '#moon'],
  draw(ctx, t) {
    const k = Math.min(1, t / 70);
    const night = k * k * (3 - 2 * k);
    vertical(ctx, DUSK.map((c, i) => mixHex(c, NIGHT[i], night)));
    drawStars(ctx, duskStars, t, 0.35 + night);

    const mx = W * 0.85, my = 530 - night * 70;
    glow(ctx, mx, my, 220, `rgba(255,240,215,${0.18 + night * 0.12})`);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, W, H);
    ctx.arc(mx + 20, my - 12, 42, 0, TAU, true);
    ctx.clip();
    ctx.fillStyle = '#fff3dc';
    ctx.beginPath();
    ctx.arc(mx, my, 46, 0, TAU);
    ctx.fill();
    ctx.restore();

    for (const c of duskClouds) {
      const x = wrapX(c.x + c.speed * t, c.w);
      for (const [ox, oy, rr] of [[0, 0, 1], [-0.45, 0.12, 0.7], [0.45, 0.1, 0.75]]) {
        glow(ctx, x + ox * c.w, c.y + oy * c.w, (c.w / 2) * rr,
          `rgba(${night > 0.5 ? '170,170,220' : '255,215,225'},${0.13 - night * 0.05})`);
      }
    }

    const cycle = Math.floor(t / 11);
    const local = t - cycle * 11;
    if (cycle > 0 && local < 0.9) {
      const r = mulberry32(cycle * 97);
      const sx = W * (0.15 + r() * 0.5), sy = H * (0.05 + r() * 0.2);
      const p = local / 0.9;
      const hx = sx + p * 520, hy = sy + p * 260;
      const sg = ctx.createLinearGradient(hx - 180, hy - 90, hx, hy);
      sg.addColorStop(0, 'rgba(255,250,235,0)');
      sg.addColorStop(1, `rgba(255,250,235,${0.9 * (1 - p)})`);
      ctx.strokeStyle = sg;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(hx - 180, hy - 90);
      ctx.lineTo(hx, hy);
      ctx.stroke();
    }
  },
};

// 2. Northern lights: soft green/teal/violet curtains waving over a polar night.
const auroraStars = makeStars(21, 110);
const aurora: Background = {
  id: 'aurora',
  name: 'Aurora boreal',
  tags: ['#aurora', '#northernlights'],
  draw(ctx, t) {
    vertical(ctx, ['#040b1c', '#071a2c', '#0c2238', '#132a3c']);
    drawStars(ctx, auroraStars, t);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const ribbons = [
      { base: 560, amp: 90, f: 0.0042, sp: 0.35, h: 420, rgb: '90,255,180', a: 0.2 },
      { base: 760, amp: 70, f: 0.0055, sp: -0.28, h: 340, rgb: '80,220,255', a: 0.13 },
      { base: 440, amp: 60, f: 0.0035, sp: 0.22, h: 280, rgb: '190,130,255', a: 0.12 },
    ];
    // Each curtain is made of thin vertical rays: bright at the lower edge, fading upward, shimmering.
    ctx.lineWidth = 7;
    for (const rb of ribbons) {
      for (let x = -10; x <= W + 10; x += 6) {
        const y = rb.base + Math.sin(x * rb.f + t * rb.sp) * rb.amp + Math.sin(x * rb.f * 2.7 - t * rb.sp * 1.6) * rb.amp * 0.35;
        const len = rb.h * (0.55 + 0.45 * Math.sin(x * 0.021 + t * 0.7 + rb.base));
        const a = rb.a * (0.55 + 0.45 * Math.sin(x * 0.047 - t * 1.1 + rb.base));
        const g = ctx.createLinearGradient(0, y - len, 0, y + 20);
        g.addColorStop(0, `rgba(${rb.rgb},0)`);
        g.addColorStop(0.85, `rgba(${rb.rgb},${a})`);
        g.addColorStop(1, `rgba(${rb.rgb},0)`);
        ctx.strokeStyle = g;
        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x, y - len);
        ctx.stroke();
      }
    }
    ctx.restore();
    // Snowy hills silhouette at the bottom.
    ctx.fillStyle = '#0a1626';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 170 - Math.sin(x * 0.006) * 60 - Math.sin(x * 0.017) * 20);
    ctx.lineTo(W, H);
    ctx.fill();
  },
};

// 3. Under the sea: light rays sway from the surface and bubbles rise.
const bubbles = (() => {
  const r = mulberry32(33);
  return Array.from({ length: 45 }, () => ({
    x: r() * W, off: r() * (H + 200), speed: 40 + r() * 90, r: 3 + r() * 12, ph: r() * TAU,
  }));
})();
const plankton = makeStars(34, 70, H);
const ocean: Background = {
  id: 'ocean',
  name: 'Fundo do mar',
  tags: ['#underwater', '#ocean'],
  draw(ctx, t) {
    vertical(ctx, ['#1d6e8f', '#11486e', '#0a2c4d', '#061a33']);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 6; i++) {
      const sway = Math.sin(t * 0.25 + i * 1.7) * 60;
      const x = 80 + i * 190 + sway;
      const g = ctx.createLinearGradient(0, 0, 0, H * 0.85);
      g.addColorStop(0, `rgba(200,240,255,${0.09 + 0.04 * Math.sin(t * 0.5 + i)})`);
      g.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 40, 0);
      ctx.lineTo(x + 50, 0);
      ctx.lineTo(x + 260, H * 0.85);
      ctx.lineTo(x + 60, H * 0.85);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
    for (const p of plankton) {
      ctx.fillStyle = `rgba(190,240,255,${0.15 + 0.15 * Math.sin(t + p.ph)})`;
      ctx.beginPath();
      ctx.arc(p.x + Math.sin(t * 0.3 + p.ph) * 15, p.y, p.s * 0.8, 0, TAU);
      ctx.fill();
    }
    ctx.lineWidth = 2;
    for (const b of bubbles) {
      const y = H + 100 - ((b.off + b.speed * t) % (H + 200));
      const x = b.x + Math.sin(t * 1.2 + b.ph) * 18;
      ctx.strokeStyle = 'rgba(220,250,255,0.35)';
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, TAU);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(x - b.r * 0.35, y - b.r * 0.35, b.r * 0.25, 0, TAU);
      ctx.fill();
    }
  },
};

// 4. Cotton clouds: a soft pastel daytime sky with fluffy clouds drifting at different depths.
const cottonClouds = (() => {
  const r = mulberry32(44);
  return Array.from({ length: 12 }, (_, i) => {
    const depth = i / 11;
    return {
      x: r() * W, y: 120 + r() * (H - 240), w: 220 + depth * 260,
      speed: 10 + depth * 30, alpha: 0.35 + depth * 0.45,
    };
  });
})();
const cotton: Background = {
  id: 'cotton',
  name: 'Nuvens de algodão',
  tags: ['#clouds', '#cottoncandysky'],
  light: true,
  draw(ctx, t) {
    vertical(ctx, ['#7f93d1', '#a79ad6', '#d7a9cf', '#f2bfc2']);
    glow(ctx, W * 0.2, 420, 420, 'rgba(255,235,210,0.35)');
    for (const c of cottonClouds) {
      puffyCloud(ctx, wrapX(c.x + c.speed * t, c.w), c.y + Math.sin(t * 0.4 + c.x) * 6, c.w, `rgba(255,250,252,${c.alpha * 0.55})`);
    }
  },
};

// 5. Galaxy: colorful nebulae slowly orbit while the star field turns.
const galaxyStars = makeStars(55, 180, H);
const galaxy: Background = {
  id: 'galaxy',
  name: 'Galáxia',
  tags: ['#galaxy', '#space'],
  draw(ctx, t) {
    vertical(ctx, ['#07041a', '#120a2e', '#1d0f3a', '#0d0722']);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const nebulae = [
      ['255,90,200', 0], ['90,140,255', 1.6], ['160,90,255', 3.2], ['60,220,220', 4.6],
    ] as const;
    for (const [rgb, ph] of nebulae) {
      const a = ph + t * 0.05;
      glow(ctx, W / 2 + Math.cos(a) * 330, H / 2 + Math.sin(a) * 620, 520, `rgba(${rgb},0.2)`);
    }
    ctx.restore();
    const rot = t * 0.012, c = Math.cos(rot), s = Math.sin(rot);
    for (const st of galaxyStars) {
      const dx = st.x - W / 2, dy = st.y - H / 2;
      const x = W / 2 + dx * c - dy * s, y = H / 2 + dx * s + dy * c;
      ctx.fillStyle = `rgba(255,250,240,${0.4 + 0.4 * Math.sin(t * 1.5 + st.ph)})`;
      ctx.beginPath();
      ctx.arc(x, y, st.s * 0.9, 0, TAU);
      ctx.fill();
    }
  },
};

// 6. Fireflies: a quiet summer night meadow, glowing fireflies wandering over swaying grass.
const fireflyStars = makeStars(66, 50, H * 0.5);
const fireflies = (() => {
  const r = mulberry32(67);
  return Array.from({ length: 45 }, () => ({
    x: r() * W, y: H * (0.15 + r() * 0.75), ax: 40 + r() * 70, ay: 30 + r() * 50,
    fx: 0.15 + r() * 0.3, fy: 0.2 + r() * 0.3, ph: r() * TAU, blink: 0.6 + r() * 1.2,
  }));
})();
const fireflyNight: Background = {
  id: 'fireflies',
  name: 'Vaga-lumes',
  tags: ['#fireflies', '#summernight'],
  draw(ctx, t) {
    vertical(ctx, ['#07111f', '#0b1d2c', '#10291f', '#0b1f16']);
    drawStars(ctx, fireflyStars, t);
    for (const f of fireflies) {
      const x = f.x + Math.sin(t * f.fx + f.ph) * f.ax;
      const y = f.y + Math.cos(t * f.fy + f.ph * 1.3) * f.ay;
      const on = Math.max(0, Math.sin(t * f.blink + f.ph));
      if (on <= 0.02) continue;
      glow(ctx, x, y, 34, `rgba(210,255,120,${0.35 * on})`);
      ctx.fillStyle = `rgba(240,255,190,${0.9 * on})`;
      ctx.beginPath();
      ctx.arc(x, y, 3.5, 0, TAU);
      ctx.fill();
    }
    // Grass silhouette swaying in the breeze.
    ctx.fillStyle = '#06140d';
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W + 18; x += 18) {
      const h = 120 + ((x * 7919) % 90) + Math.sin(t * 1.2 + x * 0.04) * 10;
      ctx.lineTo(x - 9, H - 90);
      ctx.lineTo(x + Math.sin(t * 1.2 + x * 0.04) * 8, H - h);
    }
    ctx.lineTo(W, H);
    ctx.fill();
  },
};

// 7. Sakura: a soft pink spring sky with cherry blossom petals drifting down.
const petals = (() => {
  const r = mulberry32(77);
  return Array.from({ length: 55 }, () => ({
    x: r() * W, off: r() * (H + 200), speed: 50 + r() * 70, drift: 20 + r() * 50,
    size: 7 + r() * 8, spin: (r() - 0.5) * 3, ph: r() * TAU, tone: r(),
  }));
})();
const sakura: Background = {
  id: 'sakura',
  name: 'Sakura',
  tags: ['#sakura', '#cherryblossom'],
  light: true,
  draw(ctx, t) {
    vertical(ctx, ['#f4bfd3', '#f3d3e1', '#e9dcef', '#d6e2f3']);
    glow(ctx, W * 0.75, 380, 460, 'rgba(255,245,235,0.45)');
    for (const pt of petals) {
      const y = ((pt.off + pt.speed * t) % (H + 200)) - 100;
      const x = pt.x + Math.sin(t * 0.8 + pt.ph) * pt.drift + t * 12;
      ctx.save();
      ctx.translate(((x % (W + 40)) + W + 40) % (W + 40) - 20, y);
      ctx.rotate(pt.ph + t * pt.spin);
      ctx.scale(1, 0.55 + 0.45 * Math.sin(t * 2 + pt.ph));
      ctx.fillStyle = pt.tone > 0.5 ? 'rgba(255,170,200,0.75)' : 'rgba(255,205,222,0.8)';
      ctx.beginPath();
      ctx.ellipse(0, 0, pt.size, pt.size * 0.6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  },
};

// 8. Christmas night: snow falling over pine trees, with a string of twinkling lights at the top.
const snow = (() => {
  const r = mulberry32(88);
  return Array.from({ length: 110 }, () => ({
    x: r() * W, off: r() * (H + 40), speed: 35 + r() * 60, size: 1.5 + r() * 3.5, ph: r() * TAU,
  }));
})();
const pines = (() => {
  const r = mulberry32(89);
  return Array.from({ length: 9 }, (_, i) => ({ x: (i + 0.5) * (W / 9) + (r() - 0.5) * 60, h: 160 + r() * 140 }));
})();
const christmasStars = makeStars(90, 60, H * 0.6);
const BULB_COLORS = ['255,80,90', '90,220,120', '255,210,90', '120,170,255'];
const christmas: Background = {
  id: 'christmas',
  name: 'Noite de Natal',
  tags: ['#christmas', '#snow'],
  draw(ctx, t) {
    vertical(ctx, ['#0a1530', '#122246', '#1b2d55', '#26385f']);
    drawStars(ctx, christmasStars, t);
    // String of lights hanging across the top.
    ctx.strokeStyle = 'rgba(20,30,40,0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 20) {
      const y = 150 + Math.sin((x / W) * Math.PI) * 70;
      x ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    for (let i = 0; i < 18; i++) {
      const x = 30 + i * ((W - 60) / 17);
      const y = 150 + Math.sin((x / W) * Math.PI) * 70 + 14;
      const on = 0.55 + 0.45 * Math.sin(t * 2.2 + i * 1.7);
      const c = BULB_COLORS[i % BULB_COLORS.length];
      glow(ctx, x, y, 34, `rgba(${c},${0.35 * on})`);
      ctx.fillStyle = `rgba(${c},${0.6 + 0.4 * on})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 10, 0, 0, TAU);
      ctx.fill();
    }
    // Pines and snowy ground.
    for (const pn of pines) {
      ctx.fillStyle = '#0c1a2c';
      for (let k = 0; k < 3; k++) {
        const top = H - 150 - pn.h + k * pn.h * 0.28;
        const w = 60 + k * 26;
        ctx.beginPath();
        ctx.moveTo(pn.x, top);
        ctx.lineTo(pn.x - w, top + pn.h * 0.45);
        ctx.lineTo(pn.x + w, top + pn.h * 0.45);
        ctx.fill();
      }
    }
    const gnd = ctx.createLinearGradient(0, H - 180, 0, H);
    gnd.addColorStop(0, '#dfe8f5');
    gnd.addColorStop(1, '#b9c8df');
    ctx.fillStyle = gnd;
    ctx.beginPath();
    ctx.moveTo(0, H);
    for (let x = 0; x <= W; x += 30) ctx.lineTo(x, H - 150 - Math.sin(x * 0.007) * 25);
    ctx.lineTo(W, H);
    ctx.fill();
    for (const f of snow) {
      const y = ((f.off + f.speed * t) % (H + 40)) - 20;
      const x = f.x + Math.sin(t * 0.6 + f.ph) * 25;
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath();
      ctx.arc(x, y, f.size, 0, TAU);
      ctx.fill();
    }
  },
};

// 9. Ball pit: a sea of glossy colored balls seen out of focus, in three depths, gently bobbing.
const PIT_COLORS = ['255,92,110', '255,206,64', '64,160,255', '80,205,140', '255,150,60', '170,120,255', '255,120,200'];
const pitBalls = (() => {
  const r = mulberry32(99);
  // Far layer first so near (bigger, blurrier) balls are drawn on top.
  return [
    { count: 46, rMin: 45, rMax: 75, blur: 0.35, alpha: 0.75 },
    { count: 26, rMin: 95, rMax: 140, blur: 0.55, alpha: 0.7 },
    { count: 12, rMin: 170, rMax: 260, blur: 0.85, alpha: 0.55 },
  ].flatMap((layer, depth) => Array.from({ length: layer.count }, () => ({
    x: r() * W, y: r() * H, r: layer.rMin + r() * (layer.rMax - layer.rMin),
    blur: layer.blur, alpha: layer.alpha, color: PIT_COLORS[Math.floor(r() * PIT_COLORS.length)],
    bob: 6 + depth * 6 + r() * 6, f: 0.35 + r() * 0.4, ph: r() * TAU, drift: (depth + 1) * (r() < 0.5 ? -3 : 3),
  })));
})();
const ballpit: Background = {
  id: 'ballpit',
  name: 'Piscina de bolinhas',
  tags: ['#ballpit', '#colorful'],
  light: true,
  draw(ctx, t) {
    vertical(ctx, ['#ffe1ec', '#fff0d9', '#dff1ff', '#e8defc']);
    for (const b of pitBalls) {
      const x = wrapX(b.x + b.drift * t, b.r), y = b.y + Math.sin(t * b.f + b.ph) * b.bob;
      // Out of focus: a solid core fading over a rim as wide as the blur, plus a soft highlight.
      const g = ctx.createRadialGradient(x - b.r * 0.3, y - b.r * 0.3, 0, x, y, b.r);
      g.addColorStop(0, `rgba(255,255,255,${b.alpha * 0.55})`);
      g.addColorStop(0.3, `rgba(${b.color},${b.alpha})`);
      g.addColorStop(1 - b.blur * 0.6, `rgba(${b.color},${b.alpha * 0.9})`);
      g.addColorStop(1, `rgba(${b.color},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, b.r, 0, TAU);
      ctx.fill();
    }
    // A milky wash softens it all into a dreamy backdrop.
    ctx.fillStyle = 'rgba(255,248,252,0.28)';
    ctx.fillRect(0, 0, W, H);
  },
};

export const BACKGROUNDS: Background[] = [dusk, aurora, ocean, cotton, galaxy, fireflyNight, sakura, christmas, ballpit];

export function getBackground(id: string | undefined): Background {
  return BACKGROUNDS.find((b) => b.id === id) ?? BACKGROUNDS[0];
}
