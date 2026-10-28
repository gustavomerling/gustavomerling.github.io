import { Search, X } from 'lucide-react';

export function SearchInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <label className="flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2.5 focus-within:border-brand-500">
      <Search size={15} className="shrink-0 text-zinc-400" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm outline-none" />
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-zinc-400 hover:text-zinc-700" title="Limpar">
          <X size={14} />
        </button>
      )}
    </label>
  );
}

/** Busca sem acento e sem diferenciar maiúsculas. */
export const matches = (text: string, query: string) => {
  const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  return norm(text).includes(norm(query.trim()));
};
