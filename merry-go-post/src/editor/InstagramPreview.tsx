import { Icon } from '@iconify/react';
import { Bookmark, ChevronLeft, ChevronRight, GalleryHorizontal, Heart, MessageCircle, MoreHorizontal, Send, Smartphone, X } from 'lucide-react';
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cx } from '../components/ui';
import { SLIDE_WIDTH, slideHeight } from '../lib/formats';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { StoredImage } from '../components/StoredImage';
import type { Brand, Post } from '../types';

type Mode = 'phone' | 'sequence';

/** Largura do "celular". */
const PHONE_W = 400;
/** Fração da largura arrastada que já conta como swipe. */
const SWIPE_THRESHOLD = 0.15;

/**
 * Como o carrossel aparece no feed (perfil, swipe entre slides, ações e legenda)
 * ou todos os slides emendados, para conferir o encaixe visual entre eles.
 */
export function InstagramPreview({ post, brand, start, onClose }: { post: Post; brand: Brand; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [mode, setMode] = useState<Mode>('phone');
  const total = post.slides.length;
  const go = (d: number) => setI((v) => Math.min(total - 1, Math.max(0, v + d)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      e.stopPropagation();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/75 p-4 backdrop-blur-sm" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-[#fff]/10 text-[#fff] hover:bg-[#fff]/20" title="Fechar (Esc)">
        <X size={18} />
      </button>
      <div className="flex rounded-full bg-[#fff]/10 p-1 text-sm text-[#fff]" onClick={(e) => e.stopPropagation()}>
        {(
          [
            ['phone', <Smartphone key="i" size={15} />, 'No celular'],
            ['sequence', <GalleryHorizontal key="i" size={15} />, 'Todos os slides'],
          ] as const
        ).map(([m, icon, label]) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cx('flex items-center gap-1.5 rounded-full px-3 py-1.5 font-medium transition', mode === m ? 'bg-[#fff] text-[#111]' : 'hover:bg-[#fff]/10')}
          >
            {icon}
            {label}
          </button>
        ))}
      </div>
      {mode === 'phone' ? (
        <Phone post={post} brand={brand} i={i} go={go} />
      ) : (
        <Sequence
          post={post}
          brand={brand}
          current={i}
          onOpen={(k) => {
            setI(k);
            setMode('phone');
          }}
        />
      )}
    </div>
  );
}

/** Arrasto horizontal com o ponteiro (mouse ou toque); devolve o deslocamento atual em px. */
function useSwipe(onEnd: (dx: number) => void) {
  const [dx, setDx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const startX = useRef(0);
  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    startX.current = e.clientX;
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: ReactPointerEvent) => dragging && setDx(e.clientX - startX.current);
  const finish = () => {
    if (!dragging) return;
    setDragging(false);
    onEnd(dx);
    setDx(0);
  };
  return { dx, dragging, handlers: { onPointerDown, onPointerMove, onPointerUp: finish, onPointerCancel: finish } };
}

function Phone({ post, brand, i, go }: { post: Post; brand: Brand; i: number; go: (d: number) => void }) {
  const total = post.slides.length;
  const p = brand.profile;
  const handle = (p.handle || p.displayName || 'perfil').replace(/^@/, '');
  const swipe = useSwipe((dx) => {
    if (Math.abs(dx) > PHONE_W * SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  });
  // Nas pontas, o arrasto "resiste" como no app.
  const edge = (i === 0 && swipe.dx > 0) || (i === total - 1 && swipe.dx < 0);
  const offset = -i * PHONE_W + (edge ? swipe.dx * 0.3 : swipe.dx);

  return (
    // O "celular" é sempre claro, como o app.
    <div className="w-[400px] max-w-full overflow-hidden rounded-2xl bg-[#fff] text-[#111] shadow-2xl" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-2.5 px-3 py-2.5">
        <div className="h-8 w-8 overflow-hidden rounded-full bg-[#ddd] ring-2 ring-pink-500 ring-offset-2">
          {p.avatar ? <StoredImage id={p.avatar} className="h-full w-full object-cover" /> : null}
        </div>
        <span className="flex items-center gap-1 text-sm font-semibold">
          {handle}
          {p.verified && <Icon icon="ph:seal-check-fill" color="#1d9bf0" width={15} />}
        </span>
        <MoreHorizontal size={18} className="ml-auto" />
      </div>
      <div className="relative touch-pan-y select-none overflow-hidden" style={{ cursor: swipe.dragging ? 'grabbing' : 'grab' }} {...swipe.handlers}>
        <div className="flex" style={{ transform: `translateX(${offset}px)`, transition: swipe.dragging ? 'none' : 'transform 280ms cubic-bezier(.2,.8,.2,1)' }}>
          {post.slides.map((s, k) => (
            <div key={s.id} className="shrink-0" style={{ width: PHONE_W }}>
              {/* Só desenha os vizinhos: carrosséis longos continuam leves. */}
              {Math.abs(k - i) <= 1 ? (
                <ScaledSlide format={post.format} width={PHONE_W}>
                  <SlideView slide={s} index={k} total={total} format={post.format} brand={brand} pagination={post.pagination} />
                </ScaledSlide>
              ) : (
                <div style={{ height: (PHONE_W * slideHeight(post.format)) / SLIDE_WIDTH }} />
              )}
            </div>
          ))}
        </div>
        <span className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-[#fff]">
          {i + 1}/{total}
        </span>
        {i > 0 && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => go(-1)}
            className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#fff]/90 shadow"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        {i < total - 1 && (
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => go(1)}
            className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#fff]/90 shadow"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      <div className="flex items-center gap-4 px-3 pt-2.5">
        <Heart size={22} />
        <MessageCircle size={22} />
        <Send size={22} />
        <div className="mx-auto flex gap-1">
          {post.slides.map((_, k) => (
            <span key={k} className={cx('h-1.5 w-1.5 rounded-full', k === i ? 'bg-[#0095f6]' : 'bg-[#ccc]')} />
          ))}
        </div>
        <Bookmark size={22} />
      </div>
      <div className="max-h-40 overflow-y-auto px-3 pb-3 pt-2 text-sm leading-snug">
        <div className="font-semibold">{p.followers ? `${p.followers} seguidores` : 'Curtido por muitas pessoas'}</div>
        <p className="mt-1 whitespace-pre-line">
          <span className="font-semibold">{handle}</span> {post.caption || <span className="text-[#999]">Sem legenda ainda — escreva em Conteúdo.</span>}
        </p>
      </div>
    </div>
  );
}

/** Todos os slides lado a lado, emendados, com rolagem por arrasto. */
function Sequence({ post, brand, current, onOpen }: { post: Post; brand: Brand; current: number; onOpen: (i: number) => void }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [gap, setGap] = useState(false);
  const drag = useRef<{ x: number; left: number; moved: boolean } | null>(null);
  const height = slideHeight(post.format);
  // Cabe na altura da janela, deixando espaço para os controles.
  const w = Math.min(420, ((window.innerHeight - 200) * SLIDE_WIDTH) / height);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, current * w - (el.clientWidth - w) / 2);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex w-full max-w-full flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
      <div
        ref={scroller}
        className="max-w-full cursor-grab select-none overflow-x-auto pb-3 active:cursor-grabbing"
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse' || e.button !== 0 || !scroller.current) return;
          drag.current = { x: e.clientX, left: scroller.current.scrollLeft, moved: false };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || !scroller.current) return;
          if (Math.abs(e.clientX - d.x) > 4) d.moved = true;
          scroller.current.scrollLeft = d.left - (e.clientX - d.x);
        }}
        onPointerUp={() => setTimeout(() => (drag.current = null))}
        onPointerLeave={() => (drag.current = null)}
      >
        <div className="flex w-max shadow-2xl" style={{ gap: gap ? 12 : 0 }}>
          {post.slides.map((s, k) => (
            <button
              key={s.id}
              type="button"
              title={`Abrir o slide ${k + 1} no celular`}
              onClick={() => !drag.current?.moved && onOpen(k)}
              className="block shrink-0"
            >
              <ScaledSlide format={post.format} width={w}>
                <SlideView slide={s} index={k} total={post.slides.length} format={post.format} brand={brand} pagination={post.pagination} />
              </ScaledSlide>
            </button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-[#fff]/70">
        <label className="flex cursor-pointer items-center gap-1.5">
          <input type="checkbox" checked={gap} onChange={(e) => setGap(e.target.checked)} className="accent-[#fff]" />
          Separar os slides
        </label>
        <span>Arraste para os lados · clique num slide para abrir no celular</span>
      </div>
    </div>
  );
}
