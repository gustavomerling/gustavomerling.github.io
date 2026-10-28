import { Icon } from '@iconify/react';
import { Loader2, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cx } from './ui';

/** Atalhos (Phosphor via Iconify) para o que mais aparece em carrossel. */
const SUGGESTED: { label: string; icons: string[] }[] = [
  {
    label: 'Setas',
    icons: ['arrow-right-bold', 'arrow-left-bold', 'arrow-down-bold', 'arrow-up-right-bold', 'arrow-bend-down-right-bold', 'arrow-circle-right-fill', 'caret-double-right-bold', 'hand-swipe-left', 'hand-swipe-right', 'hand-pointing-fill', 'cursor-click-fill'],
  },
  {
    label: 'Balões',
    icons: ['chat-circle-fill', 'chat-teardrop-text-fill', 'chat-dots-fill', 'chats-fill', 'chat-centered-text-fill', 'quotes-fill', 'megaphone-fill'],
  },
  {
    label: 'Sinais',
    icons: ['question-fill', 'question-bold', 'warning-fill', 'info-fill', 'lightbulb-fill', 'check-circle-fill', 'x-circle-fill', 'seal-check-fill', 'plus-circle-fill'],
  },
  {
    label: 'Engajamento',
    icons: ['heart-fill', 'star-fill', 'fire-fill', 'sparkle-fill', 'lightning-fill', 'thumbs-up-fill', 'bookmark-simple-fill', 'share-network-fill', 'paper-plane-tilt-fill', 'smiley-fill', 'hand-heart-fill', 'gift-fill'],
  },
  {
    label: 'Negócios',
    icons: ['target-bold', 'trend-up-bold', 'chart-line-up-bold', 'rocket-launch-fill', 'calendar-blank-fill', 'clock-fill', 'money-fill', 'shopping-cart-fill', 'users-three-fill', 'instagram-logo-fill', 'linkedin-logo-fill'],
  },
].map((g) => ({ ...g, icons: g.icons.map((i) => `ph:${i}`) }));

const SETS = [
  { prefix: 'ph', label: 'Phosphor' },
  { prefix: 'tabler', label: 'Tabler' },
  { prefix: 'solar', label: 'Solar' },
  { prefix: 'material-symbols', label: 'Material' },
  { prefix: 'mdi', label: 'MDI' },
  { prefix: 'fluent-emoji-flat', label: 'Emoji' },
];

/** Busca na API pública do Iconify (200 mil+ ícones de várias coleções abertas). */
async function searchIcons(query: string, prefix: string) {
  const res = await fetch(`https://api.iconify.design/search?query=${encodeURIComponent(query)}&limit=96&prefixes=${prefix}`);
  if (!res.ok) return [];
  const data = (await res.json()) as { icons?: string[] };
  return data.icons ?? [];
}

export function IconPicker({ onPick }: { onPick: (icon: string) => void }) {
  const [query, setQuery] = useState('');
  const [prefix, setPrefix] = useState('ph');
  const [results, setResults] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(() => {
      searchIcons(q, prefix)
        .then(setResults)
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, prefix]);

  const grid = (icons: string[]) => (
    <div className="grid grid-cols-6 gap-1">
      {icons.map((ic) => (
        <button
          key={ic}
          type="button"
          title={ic}
          onClick={() => onPick(ic)}
          className="grid aspect-square place-items-center rounded-lg text-zinc-700 hover:bg-brand-50 hover:text-brand-700"
        >
          <Icon icon={ic} width={24} height={24} />
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg border border-zinc-200 px-2.5 focus-within:border-brand-500">
        <Search size={15} className="text-zinc-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar em inglês: arrow, chat, star…"
          className="h-9 w-full text-sm outline-none"
        />
        {loading && <Loader2 size={15} className="animate-spin text-zinc-400" />}
      </div>
      <div className="flex flex-wrap gap-1">
        {SETS.map((s) => (
          <button
            key={s.prefix}
            type="button"
            onClick={() => setPrefix(s.prefix)}
            className={cx('rounded-full px-2 py-0.5 text-xs', prefix === s.prefix ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200')}
          >
            {s.label}
          </button>
        ))}
      </div>
      {results ? (
        results.length ? (
          grid(results)
        ) : (
          !loading && <p className="py-4 text-center text-sm text-zinc-500">Nada encontrado nessa coleção.</p>
        )
      ) : (
        <div className="space-y-3">
          {SUGGESTED.map((g) => (
            <div key={g.label}>
              <div className="mb-1 text-xs font-medium text-zinc-500">{g.label}</div>
              {grid(g.icons)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
