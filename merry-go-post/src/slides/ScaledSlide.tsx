import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { SLIDE_WIDTH, slideHeight } from '../lib/formats';
import type { Format } from '../types';

export function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    setWidth(el.getBoundingClientRect().width);
    return () => ro.disconnect();
  }, []);
  return [ref, width] as const;
}

interface ScaledSlideProps {
  format: Format;
  /** Largura fixa em px; sem ela, ocupa a largura do container. */
  width?: number;
  className?: string;
  children: ReactNode;
  /** Camada por cima do slide, no tamanho exibido (alças do editor). */
  overlay?: ReactNode;
  /** Permite cliques no próprio slide (edição de texto). */
  interactive?: boolean;
}

/** O slide é sempre desenhado em 1080px de largura e só reduzido visualmente. */
export function ScaledSlide({ format, width, className, children, overlay, interactive }: ScaledSlideProps) {
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  const w = width ?? measured;
  const h = (w * slideHeight(format)) / SLIDE_WIDTH;
  const scale = w / SLIDE_WIDTH;
  return (
    <div ref={ref} className={className} style={{ width: width ?? '100%' }}>
      <div style={{ position: 'relative', width: w, height: h, overflow: 'hidden' }}>
        {w > 0 && (
          <div style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: SLIDE_WIDTH, pointerEvents: interactive ? 'auto' : 'none' }}>
            {children}
          </div>
        )}
        {overlay && <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>{overlay}</div>}
      </div>
    </div>
  );
}
