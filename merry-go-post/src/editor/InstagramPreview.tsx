import { Icon } from '@iconify/react';
import { Bookmark, ChevronLeft, ChevronRight, Heart, MessageCircle, MoreHorizontal, Send, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from '../components/ui';
import { ScaledSlide } from '../slides/ScaledSlide';
import { SlideView } from '../slides/SlideView';
import { StoredImage } from '../components/StoredImage';
import type { Brand, Post } from '../types';

/** Como o carrossel aparece no feed: perfil, swipe entre slides, ações e legenda. */
export function InstagramPreview({ post, brand, start, onClose }: { post: Post; brand: Brand; start: number; onClose: () => void }) {
  const [i, setI] = useState(start);
  const total = post.slides.length;
  const go = (d: number) => setI((v) => Math.min(total - 1, Math.max(0, v + d)));
  const p = brand.profile;
  const handle = (p.handle || p.displayName || 'perfil').replace(/^@/, '');

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
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
      <button type="button" onClick={onClose} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-[#fff]/10 text-[#fff] hover:bg-[#fff]/20" title="Fechar (Esc)">
        <X size={18} />
      </button>
      {/* O "celular" é sempre claro, como o app. */}
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
        <div className="relative">
          <ScaledSlide format={post.format}>
            <SlideView slide={post.slides[i]} index={i} total={total} format={post.format} brand={brand} pagination={post.pagination} />
          </ScaledSlide>
          <span className="absolute right-3 top-3 rounded-full bg-black/60 px-2 py-0.5 text-xs font-medium text-[#fff]">
            {i + 1}/{total}
          </span>
          {i > 0 && (
            <button type="button" onClick={() => go(-1)} className="absolute left-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#fff]/90 shadow">
              <ChevronLeft size={16} />
            </button>
          )}
          {i < total - 1 && (
            <button type="button" onClick={() => go(1)} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-[#fff]/90 shadow">
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
    </div>
  );
}
