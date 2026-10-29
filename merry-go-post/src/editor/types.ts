import type { PointerEvent as ReactPointerEvent } from 'react';
import type { Rect } from '../templates';
import type { Slide, TextKey } from '../types';

export type Selection =
  | { kind: 'box'; key: TextKey }
  | { kind: 'image'; index: number }
  | { kind: 'icon'; id: string }
  | { kind: 'pagination' }
  | null;

export type SlideUpdater = (fn: (s: Slide) => void) => void;

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

export const sameSelection = (a: Selection, b: Selection) => JSON.stringify(a) === JSON.stringify(b);

/** Arrasto em % do elemento de referência (o slide exibido). */
export function startDrag(
  e: ReactPointerEvent,
  frame: HTMLElement,
  onMove: (dx: number, dy: number, ev: PointerEvent) => void,
  onEnd?: () => void,
) {
  e.preventDefault();
  e.stopPropagation();
  const rect = frame.getBoundingClientRect();
  const sx = e.clientX;
  const sy = e.clientY;
  let raf = 0;
  const move = (ev: PointerEvent) => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => onMove(((ev.clientX - sx) / rect.width) * 100, ((ev.clientY - sy) / rect.height) * 100, ev));
  };
  const up = () => {
    cancelAnimationFrame(raf);
    window.removeEventListener('pointermove', move);
    window.removeEventListener('pointerup', up);
    onEnd?.();
  };
  window.addEventListener('pointermove', move);
  window.addEventListener('pointerup', up);
}

// ——— Grade e encaixe ———

/** 12 colunas; as linhas têm o mesmo tamanho em px, então o passo vertical depende do formato. */
export const GRID_COLUMNS = 12;
export const gridStepX = 100 / GRID_COLUMNS;
export const gridStepY = (slideHeightPx: number) => (gridStepX * 1080) / slideHeightPx;

/** Margem segura padrão dos templates. */
export const SAFE_MARGIN = 8;

const SNAP_THRESHOLD = 1.2;

/**
 * Encaixa uma ou mais arestas (ex.: esquerda, centro, direita) nos alvos.
 * Devolve o deslocamento a aplicar e a linha-guia encontrada.
 */
export function snapEdges(edges: number[], targets: number[]): { shift: number; line: number | null } {
  let best = { shift: 0, line: null as number | null, dist: SNAP_THRESHOLD };
  for (const e of edges)
    for (const t of targets) {
      const d = Math.abs(t - e);
      if (d < best.dist) best = { shift: t - e, line: t, dist: d };
    }
  return { shift: best.shift, line: best.line };
}

export function snapTargets(axis: 'x' | 'y', heightPx: number, grid: boolean) {
  const base = [0, SAFE_MARGIN, 50, 100 - SAFE_MARGIN, 100];
  if (!grid) return base;
  const step = axis === 'x' ? gridStepX : gridStepY(heightPx);
  const lines: number[] = [];
  for (let v = 0; v <= 100.001; v += step) lines.push(Math.round(v * 1000) / 1000);
  return [...base, ...lines];
}

export type HandleDir = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export const HANDLE_DIRS: HandleDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

/** Move um retângulo com encaixe nas bordas/centro; devolve a nova origem. */
export function moveRectSnapped(start: Rect, dx: number, dy: number, free: boolean, tx: number[], ty: number[]) {
  let x = start.x + dx;
  let y = start.y + dy;
  const lines = { x: [] as number[], y: [] as number[] };
  if (!free) {
    const sx = snapEdges([x, x + start.w / 2, x + start.w], tx);
    const sy = snapEdges([y, y + start.h / 2, y + start.h], ty);
    x += sx.shift;
    y += sy.shift;
    if (sx.line !== null) lines.x.push(sx.line);
    if (sy.line !== null) lines.y.push(sy.line);
  }
  return { x, y, lines };
}

/** Redimensiona pela alça `dir`, ancorando o lado oposto e encaixando a aresta que se move. */
export function resizeRectSnapped(start: Rect, dir: HandleDir, dx: number, dy: number, free: boolean, tx: number[], ty: number[]) {
  let { x, y, w, h } = start;
  const lines = { x: [] as number[], y: [] as number[] };
  const snap = (v: number, targets: number[], axis: 'x' | 'y') => {
    if (free) return v;
    const s = snapEdges([v], targets);
    if (s.line !== null) lines[axis].push(s.line);
    return v + s.shift;
  };
  if (dir.includes('e')) w = snap(start.x + start.w + dx, tx, 'x') - x;
  if (dir.includes('w')) {
    const left = snap(start.x + dx, tx, 'x');
    w = start.x + start.w - left;
    x = left;
  }
  if (dir.includes('s')) h = snap(start.y + start.h + dy, ty, 'y') - y;
  if (dir.includes('n')) {
    const top = snap(start.y + dy, ty, 'y');
    h = start.y + start.h - top;
    y = top;
  }
  // Tamanho mínimo sem deixar a caixa "virar" ao passar do lado oposto.
  if (w < 6) {
    if (dir.includes('w')) x = start.x + start.w - 6;
    w = 6;
  }
  if (h < 3) {
    if (dir.includes('n')) y = start.y + start.h - 3;
    h = 3;
  }
  return { rect: { x, y, w, h }, lines };
}

