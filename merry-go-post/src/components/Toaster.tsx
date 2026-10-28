import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { useToasts } from '../store/ui';
import { cx } from './ui';

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
      {toasts.map((t) => {
        const Icon = ICONS[t.tone];
        return (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-800 shadow-lg"
          >
            <Icon size={17} className={cx(t.tone === 'success' && 'text-emerald-500', t.tone === 'error' && 'text-red-500', t.tone === 'info' && 'text-brand-600')} />
            {t.message}
            <button type="button" onClick={() => dismiss(t.id)} className="ml-1 text-zinc-400 hover:text-zinc-700">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
