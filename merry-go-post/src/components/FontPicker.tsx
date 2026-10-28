import { Check, ChevronDown, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FONT_CATALOG, FONT_CATEGORY_LABELS, ensureFont, fontStack } from '../lib/fonts';
import { cx } from './ui';

interface FontPickerProps {
  label: string;
  hint: string;
  value: string;
  onChange: (family: string) => void;
  sample: string;
}

/** Combobox de fontes do Google Fonts; aceita também qualquer nome digitado. */
export function FontPicker({ label, hint, value, onChange, sample }: FontPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => ensureFont(value), [value]);

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    return () => window.removeEventListener('pointerdown', close);
  }, [open]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return FONT_CATALOG.filter((f) => !q || f.family.toLowerCase().includes(q));
  }, [query]);

  // A prévia de cada opção só pede o CSS; o arquivo da fonte vem sob demanda.
  useEffect(() => {
    if (open) list.slice(0, 40).forEach((f) => ensureFont(f.family));
  }, [open, list]);

  const custom = query.trim() && !FONT_CATALOG.some((f) => f.family.toLowerCase() === query.trim().toLowerCase());

  return (
    <div ref={root} className="relative">
      <div className="mb-1.5 text-sm font-medium text-zinc-700">{label}</div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
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
      <div className="mt-1 text-xs text-zinc-500">{hint}</div>
      {open && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">
          <div className="flex items-center gap-2 border-b border-zinc-100 px-3">
            <Search size={16} className="text-zinc-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ou digitar qualquer fonte do Google Fonts"
              className="h-10 w-full text-sm outline-none"
            />
          </div>
          <div className="max-h-72 overflow-y-auto py-1">
            {custom && (
              <button
                type="button"
                onClick={() => {
                  onChange(query.trim());
                  setOpen(false);
                }}
                className="block w-full px-3 py-2 text-left text-sm text-brand-700 hover:bg-brand-50"
              >
                Usar “{query.trim()}”
              </button>
            )}
            {list.map((f) => (
              <button
                key={f.family}
                type="button"
                onClick={() => {
                  onChange(f.family);
                  setOpen(false);
                }}
                className={cx('flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-zinc-50', f.family === value && 'bg-brand-50')}
              >
                <span className="text-lg" style={{ fontFamily: fontStack(f.family) }}>
                  {f.family}
                </span>
                <span className="flex items-center gap-2 text-xs text-zinc-400">
                  {FONT_CATEGORY_LABELS[f.category]}
                  {f.family === value && <Check size={14} className="text-brand-600" />}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
