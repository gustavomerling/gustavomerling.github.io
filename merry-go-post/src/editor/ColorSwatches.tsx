import { cx } from '../components/ui';
import { COLOR_LABELS, COLOR_ROLES, resolveColor } from '../lib/color';
import type { ColorRef, Palette } from '../types';

interface ColorSwatchesProps<T extends ColorRef | 'auto'> {
  value: T;
  palette: Palette;
  allowAuto?: boolean;
  /** Dica do botão "A" (padrão: contraste automático). */
  autoLabel?: string;
  onChange: (v: ColorRef | 'auto') => void;
}

/** Cores do cliente + "auto" (contraste com o fundo) + cor livre. */
export function ColorSwatches<T extends ColorRef | 'auto'>({ value, palette, allowAuto, autoLabel = 'Automática (contraste)', onChange }: ColorSwatchesProps<T>) {
  const custom = value !== 'auto' && value.startsWith('#') ? value : null;
  const ring = (on: boolean) => cx('h-7 w-7 rounded-full border border-black/10 transition', on ? 'ring-2 ring-brand-500 ring-offset-2 ring-offset-white' : 'hover:scale-110');
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allowAuto && (
        <button type="button" title={autoLabel} onClick={() => onChange('auto')} className={cx(ring(value === 'auto'), 'grid place-items-center bg-zinc-100 text-[10px] font-bold text-zinc-500')}>
          A
        </button>
      )}
      {COLOR_ROLES.map((r) => (
        <button key={r} type="button" title={COLOR_LABELS[r]} onClick={() => onChange(r)} className={ring(value === r)} style={{ background: palette[r] }} />
      ))}
      <label title="Outra cor" className={cx(ring(!!custom), 'relative cursor-pointer overflow-hidden')} style={{ background: custom ?? 'conic-gradient(red, yellow, lime, cyan, blue, magenta, red)' }}>
        <input
          type="color"
          value={custom ?? (value === 'auto' ? '#000000' : resolveColor(value as ColorRef, palette))}
          onChange={(e) => onChange(e.target.value as ColorRef)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
    </div>
  );
}
