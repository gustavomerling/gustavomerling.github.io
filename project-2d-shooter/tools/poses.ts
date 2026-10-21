/**
 * Pose sheet (dev tool): the player rig in every state, with each gun, drawn with the
 * game's own painter on the measuring grid. Each cell runs a fresh animator for a few
 * steps, so it shows what the game shows after that much time. With `npm run dev` open
 * /tools/poses.html?scale=6 (&rows=0,3 picks rows, &cols=2-5 a cell range)
 */
import { HumanoidAnimator, type RigInput } from '@game/character/animator';
import { drawHumanoid, rigStyle } from '@game/character/draw';
import { GUN_MODELS, withAttachments } from '@game/content/weapons/models';

const params = new URLSearchParams(location.search);
const scale = Number(params.get('scale') ?? 6);
const CELL = { w: 44, h: 40 };
const style = rigStyle('#f2f2f2');
const gun = (id: string) => GUN_MODELS.get(id);

interface Cell {
  label: string;
  /** Input per step (i = step index, n = step count). */
  input: (i: number, n: number) => Partial<RigInput>;
  steps: number;
  /** Context drawn behind the rig, in cell-local units (feet at 0,0). */
  scenery?: (ctx: CanvasRenderingContext2D) => void;
  /** Feet height above the ground line (airborne cells). */
  lift?: number;
}

const base: RigInput = { state: 'idle', vx: 0, vy: 0, facing: 1, aimAngle: 0, gun: gun('glock') };
const wallAt = (x: number) => (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = '#1b1f27';
  ctx.fillRect(x, -40, 16, 40);
  ctx.fillStyle = '#8a94a6';
  ctx.fillRect(x, -40, 1, 40);
};
const ladder = (ctx: CanvasRenderingContext2D) => {
  ctx.fillStyle = '#9a8a52';
  ctx.fillRect(-5, -36, 1.5, 40);
  ctx.fillRect(3.5, -36, 1.5, 40);
  for (let y = -34; y < 4; y += 4) ctx.fillRect(-5, y, 10, 1.2);
};

const allRows: { title: string; cells: Cell[] }[] = [
  {
    title: 'Empunhadura (mira -0.7 / 0 / +0.6)',
    cells: ['glock', 'uzi', 'shotgun', 'ak47'].flatMap((id) =>
      [-0.7, 0, 0.6].map((a) => ({ label: `${id} ${a}`, steps: 60, input: () => ({ gun: gun(id), aimAngle: a }) })),
    ),
  },
  {
    title: 'Andar (55) e correr (155)',
    cells: [
      ...[0, 6, 12, 18].map((k) => ({ label: `andar +${k}`, steps: 40 + k, input: () => ({ state: 'run' as const, vx: 55 }) })),
      ...[0, 4, 8, 12].map((k) => ({ label: `correr +${k}`, steps: 40 + k, input: () => ({ state: 'sprint' as const, vx: 155 }) })),
      { label: 'desarmado', steps: 46, input: () => ({ state: 'run' as const, vx: 55, gun: null }) },
      { label: 'desarm. corre', steps: 44, input: () => ({ state: 'sprint' as const, vx: 155, gun: null }) },
    ],
  },
  {
    title: 'Pulo: antecipação, impulso, subida, ápice, queda, aterrissagem',
    cells: [
      { label: 'antecipação', steps: 33, input: (i) => ({ state: i < 30 ? 'idle' : 'takeoff' }) },
      { label: 'impulso', steps: 36, lift: 6, input: (i) => ({ state: i < 30 ? 'idle' : i < 33 ? 'takeoff' : 'air', vy: i < 33 ? 0 : -320 }) },
      { label: 'subida', steps: 44, lift: 26, input: (i) => ({ state: i < 30 ? 'idle' : 'air', vy: -260 }) },
      { label: 'ápice', steps: 50, lift: 40, input: (i) => ({ state: i < 30 ? 'idle' : 'air', vy: -10 }) },
      { label: 'queda', steps: 55, lift: 20, input: (i) => ({ state: i < 30 ? 'idle' : 'air', vy: 300 }) },
      { label: 'queda longa', steps: 90, lift: 30, input: (i) => ({ state: i < 30 ? 'idle' : 'air', vy: 430, gun: null }) },
      { label: 'aterrissou', steps: 64, input: (i) => ({ state: i < 60 ? 'air' : 'idle', vy: i < 60 ? 420 : 0 }) },
      { label: 'aterr. +8', steps: 68, input: (i) => ({ state: i < 60 ? 'air' : 'idle', vy: i < 60 ? 420 : 0 }) },
    ],
  },
  {
    title: 'Parede: deslizando, chute do walljump',
    cells: [
      { label: 'desliza', steps: 40, lift: 10, scenery: wallAt(-21), input: () => ({ state: 'wallSlide', vy: 110, wallSide: -1, facing: 1 }) },
      { label: 'desliza ak', steps: 40, lift: 10, scenery: wallAt(-21), input: () => ({ state: 'wallSlide', vy: 110, wallSide: -1, gun: gun('ak47') }) },
      ...[0.1, 0.3, 0.55, 0.9].map((p) => ({
        label: `chute ${p}`,
        steps: 30 + Math.round(p * 14),
        lift: 14,
        scenery: wallAt(-21 - p * 30),
        input: (i: number) => ({ state: i < 30 ? ('wallSlide' as const) : ('wallJump' as const), vy: i < 30 ? 110 : -300, wallSide: -1 as const, progress: Math.max(0, (i - 30) / 14) }),
      })),
    ],
  },
  {
    title: 'Rolamento (queda alta)',
    cells: [0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((p) => ({
      label: `rola ${p}`,
      steps: 30 + Math.round(p * 25),
      input: (i: number) => ({ state: i < 30 ? ('air' as const) : ('roll' as const), vx: 130, vy: i < 30 ? 400 : 0, progress: Math.max(0, (i - 30) / 25) }),
    })),
  },
  {
    title: 'Escada (de costas) e escalar canto',
    cells: [
      ...[0, 4, 8, 12].map((k) => ({ label: `escada +${k}`, steps: 40 + k, lift: 14, scenery: ladder, input: () => ({ state: 'climb' as const, vy: -60 }) })),
      ...[0.05, 0.3, 0.55, 0.8, 1].map((p) => {
        // Body moves like the game's mantle: up first, then across.
        const up = Math.min(1, p / 0.7);
        const across = Math.max(0, (p - 0.3) / 0.7);
        const feetY = -14 * (up * up * (3 - 2 * up));
        const feetX = 9 * (across * across * (3 - 2 * across));
        const lip = { x: 6 - feetX, y: -14 - feetY };
        return {
          label: `canto ${p}`,
          steps: 40,
          lift: -feetY,
          scenery: (ctx: CanvasRenderingContext2D) => {
            ctx.fillStyle = '#1b1f27';
            ctx.fillRect(lip.x, lip.y, 16, -feetY - lip.y);
            ctx.fillStyle = '#8a94a6';
            ctx.fillRect(lip.x, lip.y, 16, 1);
          },
          input: () => ({ state: 'mantle' as const, progress: p, ledge: lip }),
        };
      }),
    ],
  },
  {
    title: 'Recarga: AK (pente cai, busca outro no cinto, encaixa) e escopeta (cartucho a cartucho)',
    cells: [
      ...[0.1, 0.2, 0.35, 0.5, 0.65, 0.84, 0.95].map((r) => ({
        label: `ak ${r}`,
        steps: 40,
        input: (i: number) => ({ gun: gun('ak47'), reload: r * (i / 39) }),
      })),
      ...[0.2, 0.35].map((r) => ({ label: `esc. ${r}`, steps: 40, input: (i: number) => ({ gun: gun('shotgun'), reload: r * (i / 39) }) })),
    ],
  },
  {
    title: 'Troca de arma (glock -> ak47)',
    cells: [0, 3, 6, 9, 12, 15, 19].map((k) => ({
      label: `troca +${k}`,
      steps: 30 + k,
      input: (i: number) => ({ gun: gun(i < 30 ? 'glock' : 'ak47') }),
    })),
  },
  {
    title: 'Slide mirando para trás',
    cells: [
      { label: 'slide frente', steps: 30, input: () => ({ state: 'slide' as const, vx: 200 }) },
      { label: 'slide trás', steps: 30, input: () => ({ state: 'slide' as const, vx: 200, facing: -1 as const, aimAngle: Math.PI }) },
    ],
  },
  {
    title: 'Sniper, attachments e chute',
    cells: [
      { label: 'sniper', steps: 60, input: () => ({ gun: gun('sniper') }) },
      { label: 'glock sil+laser', steps: 60, input: () => ({ gun: withAttachments(gun('glock'), ['suppressor', 'laser']) }) },
      { label: 'uzi pente+', steps: 60, input: () => ({ gun: withAttachments(gun('uzi'), ['extended-mag']) }) },
      { label: 'ak tambor+comp', steps: 60, input: () => ({ gun: withAttachments(gun('ak47'), ['drum-mag', 'compensator']) }) },
      { label: 'chute', steps: 34, input: (i: number) => ({ kick: i < 30 ? undefined : (i - 30) / 10 }) },
    ],
  },
  {
    title: 'Escopeta: pump depois do tiro',
    cells: [0, 0.2, 0.4, 0.6, 0.8].map((t) => ({ label: `pump ${t}`, steps: 40, input: () => ({ gun: gun('shotgun'), cycle: 1 - t }) })),
  },
];

const only = params.get('rows')?.split(',').map(Number);
const span = params.get('cols')?.split('-').map(Number);
const rows = (only ? allRows.filter((_, i) => only.includes(i)) : allRows).map((r) =>
  span ? { ...r, cells: r.cells.slice(span[0], (span[1] ?? span[0]) + 1) } : r,
);
const cols = Math.max(...rows.map((r) => r.cells.length));
const canvas = document.createElement('canvas');
const headerH = 12;
canvas.width = cols * CELL.w * scale;
canvas.height = rows.length * (CELL.h + headerH) * scale;
const ctx = canvas.getContext('2d')!;
ctx.fillStyle = '#0b0d12';
ctx.fillRect(0, 0, canvas.width, canvas.height);

rows.forEach((row, r) => {
  const top = r * (CELL.h + headerH);
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.fillStyle = '#ffd23f';
  ctx.font = '5px monospace';
  ctx.fillText(row.title, 2, top + 7);
  row.cells.forEach((cell, c) => {
    const ox = c * CELL.w + CELL.w / 2;
    const ground = top + headerH + CELL.h - 4;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    // Tile grid (16 px) for proportions.
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 0.25;
    for (let gx = -16; gx <= 16; gx += 8) {
      ctx.beginPath();
      ctx.moveTo(ox + gx, top + headerH);
      ctx.lineTo(ox + gx, ground);
      ctx.stroke();
    }
    for (let gy = ground; gy > top + headerH; gy -= 8) {
      ctx.beginPath();
      ctx.moveTo(ox - 20, gy);
      ctx.lineTo(ox + 20, gy);
      ctx.stroke();
    }
    ctx.fillStyle = '#8a94a6';
    ctx.fillRect(ox - 20, ground, 40, 0.75);
    const feetY = ground - Math.min(cell.lift ?? 0, CELL.h - 30);
    if (cell.scenery) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(ox - 22, top + headerH, 44, CELL.h);
      ctx.clip();
      ctx.translate(ox, feetY);
      cell.scenery(ctx);
      ctx.restore();
    }
    const anim = new HumanoidAnimator(24);
    for (let i = 0; i < cell.steps; i++) anim.update(1 / 60, { ...base, ...cell.input(i, cell.steps) });
    drawHumanoid(ctx, anim, ox, feetY, 1, style);
    ctx.fillStyle = '#9aa3b2';
    ctx.font = '3.2px monospace';
    ctx.fillText(cell.label, ox - 20, ground + 4);
  });
});
document.body.append(canvas);
document.body.dataset.ready = '1';
