import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Copy, Plus, Trash2 } from 'lucide-react';
import { cx } from '../components/ui';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import type { Brand, Post, Slide } from '../types';

interface SlideStripProps {
  post: Post;
  brand: Brand;
  currentId: string;
  onSelect: (id: string) => void;
  onReorder: (slides: Slide[]) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function SlideStrip({ post, brand, currentId, onSelect, onReorder, onDuplicate, onDelete, onAdd }: SlideStripProps) {
  // Distância mínima: um clique simples seleciona, arrastar reordena.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const onDragEnd = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const from = post.slides.findIndex((s) => s.id === e.active.id);
    const to = post.slides.findIndex((s) => s.id === e.over!.id);
    onReorder(arrayMove(post.slides, from, to));
  };

  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={post.slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            {post.slides.map((s, i) => (
              <StripItem
                key={s.id}
                slide={s}
                index={i}
                post={post}
                brand={brand}
                active={s.id === currentId}
                onSelect={() => onSelect(s.id)}
                onDuplicate={() => onDuplicate(s.id)}
                onDelete={post.slides.length > 1 ? () => onDelete(s.id) : undefined}
              />
            ))}
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={onAdd}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-zinc-200 py-3 text-xs font-medium text-zinc-500 hover:border-brand-500 hover:text-brand-700"
        >
          <Plus size={14} /> Slide
        </button>
      </div>
    </aside>
  );
}

function StripItem({
  slide,
  index,
  post,
  brand,
  active,
  onSelect,
  onDuplicate,
  onDelete,
}: {
  slide: Slide;
  index: number;
  post: Post;
  brand: Brand;
  active: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onDelete?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined }}
      className={cx('group relative flex gap-2', isDragging && 'opacity-80')}
    >
      <span className={cx('w-4 pt-1 text-right text-xs tabular-nums', active ? 'font-semibold text-brand-700' : 'text-zinc-400')}>{index + 1}</span>
      <div
        {...attributes}
        {...listeners}
        onClick={onSelect}
        className={cx(
          'min-w-0 flex-1 cursor-grab overflow-hidden rounded-md ring-2 transition active:cursor-grabbing',
          active ? 'ring-brand-500' : 'ring-transparent hover:ring-zinc-300',
        )}
      >
        <ScaledSlide format={post.format}>
          <SlideView slide={slide} index={index} total={post.slides.length} format={post.format} brand={brand} pagination={post.pagination} />
        </ScaledSlide>
      </div>
      <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition group-hover:opacity-100">
        <button type="button" title="Duplicar" onClick={onDuplicate} className="grid h-6 w-6 place-items-center rounded bg-white/95 text-zinc-600 shadow hover:text-brand-700">
          <Copy size={12} />
        </button>
        {onDelete && (
          <button type="button" title="Apagar" onClick={onDelete} className="grid h-6 w-6 place-items-center rounded bg-white/95 text-zinc-600 shadow hover:text-red-600">
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
