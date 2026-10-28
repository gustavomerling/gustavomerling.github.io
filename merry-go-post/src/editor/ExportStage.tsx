import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { exportSlidePng, exportSlidesZip } from '../lib/export';
import { slideHeight } from '../lib/formats';
import { SlideView } from '../slides/SlideView';
import type { Brand, Post } from '../types';

interface ExportStageProps {
  post: Post;
  brand: Brand;
  fileName: string;
  /** Índice de um slide só (PNG avulso); sem ele, todos num .zip. */
  only?: number;
  onProgress: (done: number) => void;
  onDone: (error?: unknown) => void;
}

/** Renderiza os slides em tamanho real fora da tela e gera os PNGs. */
export function ExportStage({ post, brand, fileName, only, onProgress, onDone }: ExportStageProps) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const started = useRef(false);
  const indexes = only !== undefined ? [only] : post.slides.map((_, i) => i);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const nodes = refs.current.map((r) => r?.firstElementChild as HTMLElement).filter(Boolean);
    const height = slideHeight(post.format);
    const job =
      only !== undefined
        ? exportSlidePng(nodes[0], height, `${fileName} ${String(only + 1).padStart(2, '0')}`)
        : exportSlidesZip(nodes, height, fileName, onProgress);
    job.then(() => onDone()).catch((e) => onDone(e));
  });

  return createPortal(
    <div aria-hidden style={{ position: 'fixed', left: -100000, top: 0, pointerEvents: 'none' }}>
      {indexes.map((i, k) => (
        <div key={post.slides[i].id} ref={(el) => void (refs.current[k] = el)}>
          <SlideView slide={post.slides[i]} index={i} total={post.slides.length} format={post.format} brand={brand} pagination={post.pagination} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
