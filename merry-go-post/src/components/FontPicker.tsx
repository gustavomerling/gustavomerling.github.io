import { Check, ChevronDown, Clock, Search, Star } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { FONT_CATALOG, FONT_CATEGORY_LABELS, ensureFont, fontStack, type FontCategory } from '../lib/fonts';
import { useUi } from '../store/ui';
import type { Fonts } from '../types';
import { Button, Modal, Slider, cx } from './ui';

/** Como o texto de teste aparece nos cartões (peso, caixa alta, itálico do texto real). */
export interface FontPreviewStyle {
  weight?: number;
  uppercase?: boolean;
  italic?: boolean;
}

interface FontPickerProps {
  label?: string;
  hint?: string;
  value: string;
  onChange: (family: string) => void;
  sample?: string;
  /** Botão de uma linha (painéis laterais). */
  compact?: boolean;
  /** Texto do botão compacto quando ainda não há fonte escolhida. */
  placeholder?: string;
  /** Texto de teste na janela de escolha (ex.: o texto selecionado no slide). */
  previewText?: string;
  previewStyle?: FontPreviewStyle;
  /** Mostra as fontes da marca primeiro. */
  brandFonts?: Fonts;
}

/** Botão que abre a janela de fontes do Google Fonts; aceita também qualquer nome digitado. */
export function FontPicker({ label, hint, value, onChange, sample, compact, placeholder = 'Escolher fonte…', previewText, previewStyle, brandFonts }: FontPickerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (value) ensureFont(value);
  }, [value]);

  return (
    <div>
      {label && <div className="mb-1.5 text-sm font-medium text-zinc-700">{label}</div>}
      {compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 text-left text-sm hover:border-zinc-300"
        >
          <span className={cx('truncate', !value && 'text-zinc-400')} style={value ? { fontFamily: fontStack(value) } : undefined}>
            {value || placeholder}
          </span>
          <ChevronDown size={15} className="shrink-0 text-zinc-400" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-left hover:border-zinc-300"
        >
          <span className="min-w-0">
            <span className="block text-xs text-zinc-500">{value}</span>
            <span className="block truncate text-2xl leading-tight" style={{ fontFamily: fontStack(value) }}>
              {sample}
            </span>
          </span>
          <ChevronDown size={18} className="shrink-0 text-zinc-400" />
        </button>
      )}
      {hint && <div className="mt-1 text-xs text-zinc-500">{hint}</div>}
      {open && (
        <FontPickerModal
          title={label ? `Fonte: ${label}` : 'Escolher fonte'}
          value={value}
          text={previewText?.trim() || sample || 'O rato roeu a roupa do rei de Roma'}
          style={previewStyle}
          brandFonts={brandFonts}
          onPick={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

type Filter = 'all' | 'brand' | 'favorites' | 'recent' | FontCategory;

interface FontPickerModalProps {
  title: string;
  value: string;
  text: string;
  style?: FontPreviewStyle;
  brandFonts?: Fonts;
  onPick: (family: string) => void;
  onClose: () => void;
}

/** Janela de fontes: cada opção desenha o texto de teste nela mesma; dá para editar o texto e o tamanho. */
export function FontPickerModal({ title, value, text: initialText, style, brandFonts, onPick, onClose }: FontPickerModalProps) {
  const [query, setQuery] = useState('');
  const recentFonts = useUi((s) => s.recentFonts);
  const favoriteFonts = useUi((s) => s.favoriteFonts);
  const markUsed = useUi((s) => s.rememberFont);
  const toggleFavorite = useUi((s) => s.toggleFavoriteFont);
  // Abre nas favoritas/recentes quando existem: é o que mais se repete.
  const [filter, setFilter] = useState<Filter>(() => (favoriteFonts.length ? 'favorites' : recentFonts.length ? 'recent' : 'all'));
  const [text, setText] = useState(initialText);
  const [size, setSize] = useState(32);
  const [chosen, setChosen] = useState(value);

  const brandList = useMemo(() => (brandFonts ? [...new Set(Object.values(brandFonts))] : []), [brandFonts]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const byQuery = (f: string) => !q || f.toLowerCase().includes(q);
    const categoryOf = (family: string) => FONT_CATALOG.find((f) => f.family === family)?.category ?? null;
    const named = (list: string[]) => list.filter(byQuery).map((family) => ({ family, category: categoryOf(family) }));
    if (filter === 'brand') return brandList.filter(byQuery).map((family) => ({ family, category: null }));
    if (filter === 'favorites') return named(favoriteFonts);
    if (filter === 'recent') return named(recentFonts);
    return FONT_CATALOG.filter((f) => (filter === 'all' || f.category === filter) && byQuery(f.family));
  }, [query, filter, brandList, favoriteFonts, recentFonts]);

  const custom = query.trim() && !FONT_CATALOG.some((f) => f.family.toLowerCase() === query.trim().toLowerCase()) ? query.trim() : null;

  const use = (family: string) => {
    markUsed(family);
    onPick(family);
    onClose();
  };

  const filters: { value: Filter; label: string }[] = [
    ...(favoriteFonts.length ? [{ value: 'favorites' as const, label: `★ Favoritas (${favoriteFonts.length})` }] : []),
    ...(recentFonts.length ? [{ value: 'recent' as const, label: 'Recentes' }] : []),
    { value: 'all', label: 'Todas' },
    ...(brandList.length ? [{ value: 'brand' as const, label: 'Da marca' }] : []),
    ...(Object.entries(FONT_CATEGORY_LABELS) as [FontCategory, string][]).map(([v, l]) => ({ value: v, label: l })),
  ];

  const textStyle: CSSProperties = {
    fontSize: size,
    fontWeight: style?.weight ?? 400,
    fontStyle: style?.italic ? 'italic' : undefined,
    textTransform: style?.uppercase ? 'uppercase' : undefined,
    lineHeight: 1.15,
  };

  return (
    <Modal
      size="xl"
      title={title}
      subtitle="Cada opção mostra o seu texto. Clique para escolher, dois cliques para usar direto."
      onClose={onClose}
      footer={
        <>
          <span className="mr-auto truncate text-sm text-zinc-500">
            {chosen ? (
              <>
                Escolhida: <strong className="font-medium text-zinc-800">{chosen}</strong>
              </>
            ) : (
              'Nenhuma fonte escolhida'
            )}
          </span>
          <Button onClick={onClose}>Cancelar</Button>
          <Button variant="primary" disabled={!chosen} onClick={() => use(chosen)}>
            Usar esta fonte
          </Button>
        </>
      }
    >
      <div className="sticky -top-5 z-10 -mx-5 -mt-5 mb-4 space-y-3 border-b border-zinc-100 bg-white px-5 py-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_160px]">
          <label className="flex h-9 items-center gap-2 rounded-lg border border-zinc-200 px-2.5 focus-within:border-brand-500">
            <Search size={15} className="shrink-0 text-zinc-400" />
            <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar ou digitar qualquer fonte do Google Fonts" className="w-full bg-transparent text-sm outline-none" />
          </label>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Texto de teste"
            title="Texto de teste"
            className="h-9 rounded-lg border border-zinc-200 bg-white px-2.5 text-sm outline-none focus:border-brand-500"
          />
          <Slider label="Tamanho" value={size} min={14} max={72} unit="px" onChange={setSize} />
        </div>
        <div className="flex flex-wrap gap-1">
          {filters.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cx('rounded-full px-2.5 py-1 text-xs font-medium', filter === f.value ? 'bg-brand-600 text-brand-fg' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {custom && (
          <FontCard family={custom} meta="Do Google Fonts (digitada)" text={text} style={textStyle} selected={chosen === custom} onSelect={() => setChosen(custom)} onUse={() => use(custom)} />
        )}
        {list.map((f) => (
          <FontCard
            key={f.family}
            family={f.family}
            meta={f.category ? FONT_CATEGORY_LABELS[f.category] : 'Da marca'}
            text={text}
            style={textStyle}
            selected={chosen === f.family}
            current={value === f.family}
            favorite={favoriteFonts.includes(f.family)}
            recent={filter !== 'recent' && recentFonts.includes(f.family)}
            onFavorite={() => toggleFavorite(f.family)}
            onSelect={() => setChosen(f.family)}
            onUse={() => use(f.family)}
          />
        ))}
        {!custom && list.length === 0 && (
          <p className="col-span-full py-8 text-center text-sm text-zinc-500">
            {filter === 'favorites' && !query ? 'Nenhuma favorita ainda: use a estrela nos cartões.' : 'Nenhuma fonte nesse filtro.'}
          </p>
        )}
      </div>
    </Modal>
  );
}

interface FontCardProps {
  family: string;
  meta: string;
  text: string;
  style: CSSProperties;
  selected: boolean;
  current?: boolean;
  favorite?: boolean;
  recent?: boolean;
  onFavorite?: () => void;
  onSelect: () => void;
  onUse: () => void;
}

/** A fonte só é baixada quando o cartão aparece na tela: a lista inteira não pesa. */
function FontCard({ family, meta, text, style, selected, current, favorite, recent, onFavorite, onSelect, onUse }: FontCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        ensureFont(family);
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, [family]);

  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onDoubleClick={onUse}
      onKeyDown={(e) => e.key === 'Enter' && onUse()}
      className={cx(
        'flex min-h-28 cursor-pointer flex-col rounded-xl border p-3 text-left transition',
        selected ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-500' : 'border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50',
      )}
    >
      <span className="mb-1.5 flex items-center gap-2 text-xs text-zinc-500">
        <span className="font-medium text-zinc-700">{family}</span>
        <span>{meta}</span>
        {recent && <Clock size={12} className="text-zinc-400" aria-label="Usada recentemente" />}
        <span className="ml-auto flex items-center gap-2">
          {current && (
            <span className="flex items-center gap-1 text-brand-700">
              <Check size={13} /> atual
            </span>
          )}
          {onFavorite && (
            <button
              type="button"
              title={favorite ? 'Tirar das favoritas' : 'Favoritar'}
              onClick={(e) => {
                e.stopPropagation();
                onFavorite();
              }}
              onDoubleClick={(e) => e.stopPropagation()}
              className={cx('grid h-6 w-6 place-items-center rounded-full transition', favorite ? 'text-amber-500' : 'text-zinc-300 hover:text-amber-500')}
            >
              <Star size={14} fill={favorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </span>
      </span>
      <span className="line-clamp-3 break-words text-zinc-900" style={{ ...style, fontFamily: fontStack(family) }}>
        {text || family}
      </span>
    </div>
  );
}
