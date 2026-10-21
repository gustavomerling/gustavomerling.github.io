/**
 * Level atlas (dev tool): renders whole generated levels, one canvas per seed, with the same
 * painters the game uses (backdrop, tiles, grid, exit). Enemy spawns are drawn as red bars,
 * the player spawn as a green one. With `npm run dev` open
 * /tools/atlas.html?seeds=A,B&scale=2&grid=1
 */
import { BIOMES } from '@game/content/biomes/catalog';
import { generateLevel } from '@game/procgen/level';
import { drawBackdrop, drawExit, drawGrid, drawTiles } from '@game/render/tilemap';

const params = new URLSearchParams(location.search);
const biome = BIOMES.get(params.get('biome') ?? 'alleys');
const seeds = (params.get('seeds') ?? 'ATLAS-1,ATLAS-2,ATLAS-3').split(',');
const scale = Number(params.get('scale') ?? 2);
const grid = params.get('grid') !== '0';

for (const seed of seeds) {
  const level = generateLevel(seed, biome);
  const w = level.grid.widthPx;
  const h = level.grid.heightPx;
  const canvas = document.createElement('canvas');
  canvas.width = w * scale;
  canvas.height = h * scale;
  canvas.dataset.seed = seed;
  const ctx = canvas.getContext('2d', { alpha: false })!;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  const view = { x: 0, y: 0, w, h };

  ctx.fillStyle = biome.palette.sky;
  ctx.fillRect(0, 0, w, h);
  drawBackdrop(ctx, level, view);
  drawTiles(ctx, level.grid, biome.palette, view);
  if (grid) drawGrid(ctx, level.grid, view);
  drawExit(ctx, level, biome.palette, biome.exitLabel, 0);
  for (const s of level.enemySpawns) {
    ctx.fillStyle = '#ff3b3b';
    ctx.fillRect(s.pos.x - 4, s.pos.y - 20, 8, 20);
  }
  ctx.fillStyle = '#5dff8a';
  ctx.fillRect(level.spawn.x - 4, level.spawn.y - 24, 8, 24);

  const label = document.createElement('div');
  label.textContent = `${biome.id} · ${seed} · ${level.rooms.map((r) => r.templateId).join(' → ')}`;
  document.body.append(label, canvas);
}
document.body.dataset.ready = '1';
