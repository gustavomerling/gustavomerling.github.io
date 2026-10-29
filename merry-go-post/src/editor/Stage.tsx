import { useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import { cx } from '../components/ui';
import { SLIDE_WIDTH, slideHeight } from '../lib/formats';
import { isHidden, resolveBox } from '../slides/layout';
import { ScaledSlide } from '../slides/ScaledSlide';
import { PAGINATION_BOX, SlideView, iconBox } from '../slides/SlideView';
import { getTemplate, type Rect } from '../templates';
import type { Brand, Post, Slide, TextKey } from '../types';
import { useUi } from '../store/ui';
import {
  GRID_COLUMNS,
  HANDLE_DIRS,
  SAFE_MARGIN,
  clamp,
  gridStepY,
  sameSelection,
  snapEdges,
  snapTargets,
  startDrag,
  moveRectSnapped,
  resizeRectSnapped,
  type HandleDir,
  type Selection,
  type SlideUpdater,
} from './types';

interface StageProps {
  post: Post;
  slide: Slide;
  index: number;
  brand: Brand;
  selection: Selection;
  /** Destaque vindo do painel de camadas. */
  hovered?: Selection;
  onSelect: (s: Selection) => void;
  editingKey: TextKey | null;
  onEdit: (key: TextKey | null) => void;
  updateSlide: SlideUpdater;
  updatePost: (fn: (p: Post) => void) => void;
}

function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, size] as const;
}

export function Stage({ post, slide, index, brand, selection, hovered, onSelect, editingKey, onEdit, updateSlide, updatePost }: StageProps) {
  const [ref, size] = useElementSize<HTMLDivElement>();
  const height = slideHeight(post.format);
  const width = Math.max(0, Math.min(size.w - 64, ((size.h - 64) * SLIDE_WIDTH) / height));

  return (
    <div
      ref={ref}
      className="relative grid min-h-0 min-w-0 place-items-center overflow-hidden bg-zinc-100"
      onPointerDown={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('[data-handle],[contenteditable="true"]')) {
          onSelect(null);
          onEdit(null);
        }
      }}
    >
      {width > 0 && (
        <div className="shadow-2xl shadow-black/20">
          <ScaledSlide
            format={post.format}
            width={width}
            interactive
            overlay={
              <Handles
                post={post}
                slide={slide}
                selection={selection}
                hovered={hovered}
                onSelect={onSelect}
                editingKey={editingKey}
                onEdit={onEdit}
                updateSlide={updateSlide}
                updatePost={updatePost}
              />
            }
          >
            <SlideView
              slide={slide}
              index={index}
              total={post.slides.length}
              format={post.format}
              brand={brand}
              pagination={post.pagination}
              editor={{
                editingKey,
                onCommitText: (key, html) => updateSlide((s) => void (s.content[key] = html)),
                onStopEditing: () => onEdit(null),
              }}
            />
          </ScaledSlide>
        </div>
      )}
    </div>
  );
}

type HandlesProps = Omit<StageProps, 'index' | 'brand'>;

/** Estado do arrasto em andamento: retângulo atual (para o selo de tamanho) e linhas-guia de encaixe. */
interface Active {
  rect: Rect;
  lines: { x: number[]; y: number[] };
  showSize: boolean;
}

function Handles({ post, slide, selection, hovered, onSelect, editingKey, onEdit, updateSlide, updatePost }: HandlesProps) {
  const frame = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<Active | null>(null);
  const { showGrid, snapToGrid, showGuides } = useUi();
  const t = getTemplate(slide.templateId);
  const height = slideHeight(post.format);
  const is = (s: Selection) => sameSelection(s, selection);
  const lit = (s: Selection) => !!hovered && sameSelection(s, hovered);
  const tx = snapTargets('x', height, snapToGrid);
  const ty = snapTargets('y', height, snapToGrid);
  const end = () => setActive(null);

  const moveRect = (start: Rect, dx: number, dy: number, free: boolean) => moveRectSnapped(start, dx, dy, free, tx, ty);
  const resizeRect = (start: Rect, dir: HandleDir, dx: number, dy: number, free: boolean) => resizeRectSnapped(start, dir, dx, dy, free, tx, ty);

  // Editando texto: só o contorno da caixa, sem interceptar cliques no contentEditable.
  if (editingKey) {
    const box = resolveBox(t, slide, editingKey);
    return box ? (
      <div
        className="pointer-events-none absolute outline-2 outline-dashed outline-brand-500"
        style={{ left: `${box.x}%`, top: `${box.y}%`, width: `${box.w}%`, height: `${box.h}%` }}
      />
    ) : null;
  }

  return (
    <div ref={frame} className="absolute inset-0">
      {showGrid && <GridOverlay height={height} />}
      {showGuides && <GuidesOverlay format={post.format} />}

      {t.images.map((def, i) => {
        if (isHidden(slide, `img:${i}`)) return null;
        const sel: Selection = { kind: 'image', index: i };
        const img = slide.images[i];
        return (
          <Frame
            key={`img-${i}`}
            rect={def}
            selected={is(sel)}
            highlighted={lit(sel)}
            label="Imagem"
            cursor={is(sel) ? 'grab' : 'pointer'}
            onPointerDown={(e) => {
              const wasSelected = is(sel);
              onSelect(sel);
              onEdit(null);
              if (!wasSelected || !img?.imageId || !frame.current) return;
              const start = { x: img.x, y: img.y };
              // Arrastar a imagem move o enquadramento (object-position).
              startDrag(e, frame.current, (dx, dy) =>
                updateSlide((s) => {
                  const im = s.images[i];
                  im.x = clamp(start.x - (dx / def.w) * 100, 0, 100);
                  im.y = clamp(start.y - (dy / def.h) * 100, 0, 100);
                }),
              );
            }}
            onWheel={(e) => {
              if (!is(sel) || !img?.imageId) return;
              updateSlide((s) => {
                s.images[i].zoom = clamp(s.images[i].zoom - e.deltaY * 0.001, 1, 4);
              });
            }}
          />
        );
      })}

      {(['title', 'body'] as const).map((key) => {
        const box = resolveBox(t, slide, key);
        if (!box || isHidden(slide, key)) return null;
        const sel: Selection = { kind: 'box', key };
        const setRect = (r: Partial<Rect>) => updateSlide((s) => void (s.boxes[key] = { ...s.boxes[key], ...r }));
        return (
          <Frame
            key={key}
            rect={box}
            selected={is(sel)}
            highlighted={lit(sel)}
            label={key === 'title' ? 'Título' : 'Texto'}
            cursor="move"
            onDoubleClick={() => onEdit(key)}
            onPointerDown={(e) => {
              onSelect(sel);
              if (!frame.current) return;
              startDrag(
                e,
                frame.current,
                (dx, dy, ev) => {
                  const m = moveRect(box, dx, dy, ev.altKey);
                  setRect({ x: m.x, y: m.y });
                  setActive({ rect: { ...box, x: m.x, y: m.y }, lines: m.lines, showSize: false });
                },
                end,
              );
            }}
            onResize={(e, dir) => {
              onSelect(sel);
              if (!frame.current) return;
              startDrag(
                e,
                frame.current,
                (dx, dy, ev) => {
                  const r = resizeRect(box, dir, dx, dy, ev.altKey);
                  setRect(r.rect);
                  setActive({ rect: r.rect, lines: r.lines, showSize: true });
                },
                end,
              );
            }}
          />
        );
      })}

      {slide.elements.map((el) => {
        if (isHidden(slide, `icon:${el.id}`)) return null;
        const sel: Selection = { kind: 'icon', id: el.id };
        const b = iconBox(el, height);
        const setEl = (p: Partial<typeof el>) =>
          updateSlide((s) => {
            const it = s.elements.find((x) => x.id === el.id);
            if (it) Object.assign(it, p);
          });
        return (
          <Frame
            key={el.id}
            rect={b}
            selected={is(sel)}
            highlighted={lit(sel)}
            label="Ícone"
            cursor="move"
            square
            onPointerDown={(e) => {
              onSelect(sel);
              onEdit(null);
              if (!frame.current) return;
              startDrag(
                e,
                frame.current,
                (dx, dy, ev) => {
                  const m = moveRect(b, dx, dy, ev.altKey);
                  setEl({ x: m.x + b.w / 2, y: m.y + b.h / 2 });
                  setActive({ rect: { ...b, x: m.x, y: m.y }, lines: m.lines, showSize: false });
                },
                end,
              );
            }}
            onResize={(e, dir) => {
              onSelect(sel);
              if (!frame.current) return;
              // Ícone é quadrado e cresce a partir do centro: a alça arrasta metade do tamanho.
              const ratio = height / SLIDE_WIDTH;
              startDrag(
                e,
                frame.current,
                (dx, dy) => {
                  const ex = dir.includes('e') ? dx : dir.includes('w') ? -dx : 0;
                  const ey = (dir.includes('s') ? dy : dir.includes('n') ? -dy : 0) * ratio;
                  const d = dir.length === 2 ? (ex + ey) / 2 : ex + ey;
                  const size = clamp(el.size + d * 2, 2, 100);
                  setEl({ size });
                  setActive({ rect: iconBox({ ...el, size }, height), lines: { x: [], y: [] }, showSize: true });
                },
                end,
              );
            }}
          />
        );
      })}

      {post.pagination.style !== 'none' && post.slides.length > 1 && !isHidden(slide, 'pagination') && (
        <Frame
          rect={{ x: post.pagination.x - PAGINATION_BOX.w / 2, y: post.pagination.y - PAGINATION_BOX.h / 2, ...PAGINATION_BOX }}
          selected={is({ kind: 'pagination' })}
          highlighted={lit({ kind: 'pagination' })}
          label="Paginação (todos os slides)"
          cursor="move"
          onPointerDown={(e) => {
            onSelect({ kind: 'pagination' });
            onEdit(null);
            if (!frame.current) return;
            const start = { x: post.pagination.x, y: post.pagination.y };
            startDrag(
              e,
              frame.current,
              (dx, dy, ev) => {
                let x = start.x + dx;
                let y = start.y + dy;
                const lines = { x: [] as number[], y: [] as number[] };
                if (!ev.altKey) {
                  const sx = snapEdges([x], tx);
                  const sy = snapEdges([y], ty);
                  x += sx.shift;
                  y += sy.shift;
                  if (sx.line !== null) lines.x.push(sx.line);
                  if (sy.line !== null) lines.y.push(sy.line);
                }
                updatePost((p) => {
                  p.pagination.x = clamp(x, 3, 97);
                  p.pagination.y = clamp(y, 2, 98);
                });
                setActive({ rect: { x: x - PAGINATION_BOX.w / 2, y: y - PAGINATION_BOX.h / 2, ...PAGINATION_BOX }, lines, showSize: false });
              },
              end,
            );
          }}
        />
      )}

      {active && (
        <>
          {active.lines.x.map((x) => (
            <div key={`gx${x}`} className="pointer-events-none absolute inset-y-0 w-px bg-pink-500" style={{ left: `${x}%` }} />
          ))}
          {active.lines.y.map((y) => (
            <div key={`gy${y}`} className="pointer-events-none absolute inset-x-0 h-px bg-pink-500" style={{ top: `${y}%` }} />
          ))}
          {active.showSize && (
            <span
              className="pointer-events-none absolute -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-50"
              style={{ left: `${active.rect.x + active.rect.w / 2}%`, top: `calc(${active.rect.y + active.rect.h}% + 8px)` }}
            >
              {Math.round((active.rect.w / 100) * SLIDE_WIDTH)} × {Math.round((active.rect.h / 100) * height)} px
            </span>
          )}
        </>
      )}
    </div>
  );
}

export function GridOverlay({ height }: { height: number }) {
  const stepY = gridStepY(height);
  const rows = Math.floor(100 / stepY);
  return (
    <div className="pointer-events-none absolute inset-0">
      {Array.from({ length: GRID_COLUMNS - 1 }, (_, i) => (
        <div key={`c${i}`} className="absolute inset-y-0 w-px bg-sky-400/40" style={{ left: `${((i + 1) * 100) / GRID_COLUMNS}%` }} />
      ))}
      {Array.from({ length: rows }, (_, i) => (
        <div key={`r${i}`} className="absolute inset-x-0 h-px bg-sky-400/40" style={{ top: `${(i + 1) * stepY}%` }} />
      ))}
    </div>
  );
}

/** Margem segura, centro e (em 9:16) as áreas cobertas pela interface do Stories. */
export function GuidesOverlay({ format }: { format: Post['format'] }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute border border-dashed border-pink-500/70" style={{ inset: `${SAFE_MARGIN}%` }} />
      <div className="absolute inset-y-0 left-1/2 w-px bg-pink-500/40" />
      <div className="absolute inset-x-0 top-1/2 h-px bg-pink-500/40" />
      {format === '9x16' && (
        <>
          <div className="absolute inset-x-0 top-0 h-[13%] bg-pink-500/15" title="Coberto pelo topo do Stories" />
          <div className="absolute inset-x-0 bottom-0 h-[18%] bg-pink-500/15" title="Coberto pela barra de resposta" />
        </>
      )}
    </div>
  );
}

interface FrameProps {
  rect: Rect;
  selected: boolean;
  label: string;
  cursor: string;
  /** Destaque vindo de fora (mouse sobre a camada na lista). */
  highlighted?: boolean;
  /** Ícones: só as alças dos cantos. */
  square?: boolean;
  onPointerDown: (e: ReactPointerEvent) => void;
  onDoubleClick?: () => void;
  onResize?: (e: ReactPointerEvent, dir: HandleDir) => void;
  onWheel?: (e: ReactWheelEvent) => void;
}

const HANDLE_POS: Record<HandleDir, string> = {
  nw: 'left-0 top-0 cursor-nwse-resize',
  n: 'left-1/2 top-0 cursor-ns-resize',
  ne: 'left-full top-0 cursor-nesw-resize',
  e: 'left-full top-1/2 cursor-ew-resize',
  se: 'left-full top-full cursor-nwse-resize',
  s: 'left-1/2 top-full cursor-ns-resize',
  sw: 'left-0 top-full cursor-nesw-resize',
  w: 'left-0 top-1/2 cursor-ew-resize',
};

export function Frame({ rect, selected, highlighted, label, cursor, square, onPointerDown, onDoubleClick, onResize, onWheel }: FrameProps) {
  return (
    <div
      data-handle
      onPointerDown={onPointerDown}
      onDoubleClick={onDoubleClick}
      onWheel={onWheel}
      className={cx(
        'group pointer-events-auto absolute',
        selected
          ? 'outline-2 outline-brand-500'
          : highlighted
            ? 'bg-brand-500/20 outline-2 outline-dashed outline-brand-500'
            : 'hover:outline-1 hover:outline-dashed hover:outline-brand-500/70',
      )}
      style={{ left: `${rect.x}%`, top: `${rect.y}%`, width: `${rect.w}%`, height: `${rect.h}%`, cursor }}
    >
      {(selected || highlighted) && (
        <span className="pointer-events-none absolute -top-6 left-0 whitespace-nowrap rounded bg-brand-600 px-1.5 py-0.5 text-[10px] font-medium leading-none text-brand-fg">
          {label}
        </span>
      )}
      {selected &&
        onResize &&
        HANDLE_DIRS.filter((d) => !square || d.length === 2).map((d) => (
          <span
            key={d}
            data-handle
            onPointerDown={(e) => onResize(e, d)}
            className={cx(
              'absolute z-10 -translate-x-1/2 -translate-y-1/2 border-2 border-brand-600 bg-white shadow-sm',
              d.length === 2 ? 'h-3 w-3 rounded-sm' : d === 'n' || d === 's' ? 'h-2 w-5 rounded-full' : 'h-5 w-2 rounded-full',
              HANDLE_POS[d],
            )}
          />
        ))}
    </div>
  );
}
