import { Icon } from '@iconify/react';
import { ChevronDown, ChevronUp, Eye, EyeOff, Hash, Image, Shapes, Stamp, Trash2, Type, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cx } from '../components/ui';
import { isHidden } from '../slides/layout';
import { getTemplate } from '../templates';
import type { LayerId, Post, Slide } from '../types';
import { sameSelection, type Selection, type SlideUpdater } from './types';

interface LayersPanelProps {
  post: Post;
  slide: Slide;
  selection: Selection;
  onSelect: (s: Selection) => void;
  updateSlide: SlideUpdater;
}

interface Row {
  id: LayerId;
  label: string;
  detail?: string;
  icon: LucideIcon | string;
  select?: Selection;
  /** Ícones podem mudar de ordem e ser apagados. */
  iconIndex?: number;
}

const plain = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

/** Camadas de cima para baixo, como no slide. */
function rowsOf(post: Post, slide: Slide): Row[] {
  const t = getTemplate(slide.templateId);
  const rows: Row[] = [];
  if (post.pagination.style !== 'none' && post.slides.length > 1) rows.push({ id: 'pagination', label: 'Paginação', icon: Hash, select: { kind: 'pagination' } });
  [...slide.elements].reverse().forEach((el) => {
    rows.push({ id: `icon:${el.id}`, label: 'Ícone', detail: el.icon.split(':')[1], icon: el.icon, select: { kind: 'icon', id: el.id }, iconIndex: slide.elements.indexOf(el) });
  });
  if (t.boxes.some((b) => b.key === 'body')) rows.push({ id: 'body', label: 'Texto', detail: plain(slide.content.body) || 'vazio', icon: Type, select: { kind: 'box', key: 'body' } });
  if (t.boxes.some((b) => b.key === 'title')) rows.push({ id: 'title', label: 'Título', detail: plain(slide.content.title) || 'vazio', icon: Type, select: { kind: 'box', key: 'title' } });
  if (t.logo) rows.push({ id: 'logo', label: 'Logo', icon: Stamp });
  if (t.decorations?.length) rows.push({ id: 'decor', label: 'Elementos do template', detail: `${t.decorations.length}`, icon: Shapes });
  for (let i = t.images.length - 1; i >= 0; i--) {
    rows.push({ id: `img:${i}`, label: t.images.length > 1 ? `Imagem ${i + 1}` : 'Imagem', detail: slide.images[i]?.imageId ? undefined : 'vazia', icon: Image, select: { kind: 'image', index: i } });
  }
  return rows;
}

export function LayersPanel({ post, slide, selection, onSelect, updateSlide }: LayersPanelProps) {
  const rows = rowsOf(post, slide);

  const toggle = (id: LayerId) =>
    updateSlide((s) => {
      const h = s.hidden ?? [];
      s.hidden = h.includes(id) ? h.filter((x) => x !== id) : [...h, id];
    });

  const moveIcon = (from: number, dir: 1 | -1) =>
    updateSlide((s) => {
      const to = from + dir;
      if (to < 0 || to >= s.elements.length) return;
      const [el] = s.elements.splice(from, 1);
      s.elements.splice(to, 0, el);
    });

  return (
    <section className="border-b border-zinc-100 p-2">
      <ul className="space-y-0.5">
        {rows.map((r) => {
          const hidden = isHidden(slide, r.id);
          const selected = r.select ? sameSelection(r.select, selection) : false;
          const IconC = typeof r.icon === 'string' ? null : r.icon;
          return (
            <li
              key={r.id}
              onClick={() => r.select && !hidden && onSelect(r.select)}
              className={cx(
                'group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm',
                r.select && !hidden && 'cursor-pointer',
                selected ? 'bg-brand-50 text-brand-700' : 'text-zinc-700 hover:bg-zinc-50',
              )}
            >
              <span className={cx('grid h-6 w-6 shrink-0 place-items-center rounded bg-zinc-100', hidden && 'opacity-40')}>
                {IconC ? <IconC size={14} /> : <Icon icon={r.icon as string} width={14} height={14} />}
              </span>
              <span className={cx('min-w-0 flex-1', hidden && 'opacity-40')}>
                <span className="block truncate leading-tight">{r.label}</span>
                {r.detail && <span className="block truncate text-[11px] leading-tight text-zinc-400">{r.detail}</span>}
              </span>
              {r.iconIndex !== undefined && (
                <span className="flex opacity-0 transition group-hover:opacity-100">
                  <Tool title="Para frente" onClick={() => moveIcon(r.iconIndex!, 1)}>
                    <ChevronUp size={14} />
                  </Tool>
                  <Tool title="Para trás" onClick={() => moveIcon(r.iconIndex!, -1)}>
                    <ChevronDown size={14} />
                  </Tool>
                  <Tool
                    title="Apagar"
                    onClick={() => {
                      updateSlide((s) => void s.elements.splice(r.iconIndex!, 1));
                      if (selected) onSelect(null);
                    }}
                  >
                    <Trash2 size={13} />
                  </Tool>
                </span>
              )}
              <Tool
                title={hidden ? 'Mostrar' : 'Ocultar'}
                onClick={() => {
                  toggle(r.id);
                  if (selected && !hidden) onSelect(null);
                }}
              >
                {hidden ? <EyeOff size={14} /> : <Eye size={14} />}
              </Tool>
            </li>
          );
        })}
      </ul>
      <p className="px-2 pt-2 text-[11px] text-zinc-400">Camadas ocultas também não saem na exportação.</p>
    </section>
  );
}

function Tool({ title, onClick, children }: { title: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="grid h-6 w-6 place-items-center rounded text-zinc-400 hover:bg-zinc-200 hover:text-zinc-800"
    >
      {children}
    </button>
  );
}
