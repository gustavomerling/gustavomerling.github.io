import { Check } from 'lucide-react';
import { useEffect } from 'react';
import { ensureFonts, fontStack } from '../lib/fonts';
import type { FontRole, Fonts } from '../types';
import { FontPicker, type FontPreviewStyle } from './FontPicker';
import { cx } from './ui';

const ROLES: { role: FontRole; label: string }[] = [
  { role: 'base', label: 'Base' },
  { role: 'highlight', label: 'Destaque' },
  { role: 'ultra', label: 'Ultra' },
];

interface FontChoiceProps {
  fonts: Fonts;
  /** Papel da marca em uso (quando não há fonte avulsa). */
  role: FontRole;
  /** Fonte avulsa, fora da marca. */
  family?: string;
  onRole: (role: FontRole) => void;
  onFamily: (family: string) => void;
  /** Texto da camada, usado como teste na janela de fontes. */
  previewText?: string;
  previewStyle?: FontPreviewStyle;
}

/** As três fontes da marca pelo nome (cada uma desenhada nela mesma) + qualquer outra do Google Fonts. */
export function FontChoice({ fonts, role, family, onRole, onFamily, previewText, previewStyle }: FontChoiceProps) {
  useEffect(() => ensureFonts(Object.values(fonts)), [fonts]);
  return (
    <div className="space-y-1.5">
      <div className="overflow-hidden rounded-lg border border-zinc-200">
        {ROLES.map(({ role: r, label }) => {
          const on = !family && role === r;
          return (
            <button
              key={r}
              type="button"
              onClick={() => onRole(r)}
              className={cx(
                'flex w-full items-center gap-2 border-b border-zinc-100 px-2.5 py-1.5 text-left last:border-b-0',
                on ? 'bg-brand-50 text-brand-700' : 'text-zinc-800 hover:bg-zinc-50',
              )}
            >
              <span className="min-w-0 flex-1 truncate text-[15px]" style={{ fontFamily: fontStack(fonts[r]) }}>
                {fonts[r]}
              </span>
              <span className="text-[11px] text-zinc-400">{label}</span>
              <Check size={14} className={on ? 'text-brand-600' : 'invisible'} />
            </button>
          );
        })}
      </div>
      <div className={cx('rounded-lg', family && 'ring-2 ring-brand-500 ring-offset-1 ring-offset-white')}>
        <FontPicker
          compact
          value={family ?? ''}
          placeholder="Outra fonte (fora da marca)…"
          onChange={onFamily}
          previewText={previewText}
          previewStyle={previewStyle}
          brandFonts={fonts}
        />
      </div>
    </div>
  );
}
