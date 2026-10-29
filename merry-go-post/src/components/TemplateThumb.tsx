import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo, useRef, type ReactNode } from 'react';
import { sampleSlide } from '../lib/sample';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import type { TemplateDef } from '../templates';
import type { Brand } from '../types';
import { cx } from './ui';

/** Miniatura de um template com texto de exemplo. */
export function TemplateThumb({ template, brand, children }: { template: TemplateDef; brand: Brand; children?: ReactNode }) {
  const slide = useMemo(() => sampleSlide(template), [template]);
  return (
    <div className="relative overflow-hidden rounded-xl border border-zinc-200 shadow-sm">
      <ScaledSlide format="4x5">
        <SlideView slide={slide} template={template} index={0} total={1} format="4x5" brand={brand} pagination={{ style: 'none', x: 50, y: 95, color: 'auto' }} />
      </ScaledSlide>
      {children}
    </div>
  );
}

/** Fileira horizontal com rolagem e setas: economiza espaço vertical em listas longas. */
export function HorizontalCarousel({ children, itemWidth = 150 }: { children: ReactNode; itemWidth?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * (ref.current.clientWidth - itemWidth), behavior: 'smooth' });
  return (
    <div className="group/car relative">
      <div ref={ref} className="flex snap-x gap-3 overflow-x-auto px-0.5 pb-3 pt-1 [scrollbar-width:thin]" style={{ ['--item-w' as string]: `${itemWidth}px` }}>
        {children}
      </div>
      {([-1, 1] as const).map((dir) => (
        <button
          key={dir}
          type="button"
          onClick={() => scroll(dir)}
          title={dir < 0 ? 'Anteriores' : 'Próximos'}
          className={cx(
            'absolute top-[40%] z-10 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-200 bg-white text-zinc-600 opacity-0 shadow-md transition group-hover/car:opacity-100 hover:text-zinc-900',
            dir < 0 ? 'left-0 -translate-x-1/3' : 'right-0 translate-x-1/3',
          )}
        >
          {dir < 0 ? <ChevronLeft size={18} /> : <ChevronRight size={18} />}
        </button>
      ))}
    </div>
  );
}

/** Item do carrossel horizontal (largura fixa, encaixe na rolagem). */
export const CarouselItem = ({ children }: { children: ReactNode }) => <div className="w-(--item-w) shrink-0 snap-start">{children}</div>;
