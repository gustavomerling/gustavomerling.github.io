import { createContext, useContext } from 'react';
import { cx } from '../components/ui';
import { COLOR_LABELS, COLOR_ROLES, FIXED_COLORS, resolveColor } from '../lib/color';
import type { ColorRef, FixedColor, Palette } from '../types';

interface ColorSwatchesProps<T extends ColorRef | 'auto'> {
  value: T;
  palette: Palette;
  allowAuto?: boolean;
  /** Dica do botão "A" (padrão: contraste automático). */
  autoLabel?: string;
  onChange: (v: ColorRef | 'auto') => void;
}

/** Cores livres (hex) já usadas no post ou template aberto, oferecidas de novo em todo seletor. */
export const RecentColorsContext = createContext<string[]>([]);

const RECENT_LIMIT = 8;

/** Hex usados em qualquer lugar do objeto (fundos, textos, ícones, filtros…), sem repetir. */
export function collectHexColors(data: unknown): string[] {
  const found = JSON.stringify(data).match(/"#[0-9a-f]{6}"/gi) ?? [];
  return [...new Set(found.map((h) => h.slice(1, -1).toLowerCase()))].slice(0, RECENT_LIMIT);
}

/** Cores do cliente + preto/branco absolutos + "auto" (contraste com o fundo) + cor livre. */
export function ColorSwatches<T extends ColorRef | 'auto'>({ value, palette, allowAuto, autoLabel = 'Automática (contraste)', onChange }: ColorSwatchesProps<T>) {
  const recentAll = useContext(RecentColorsContext);
  const taken = new Set([...Object.values(palette), ...Object.values(FIXED_COLORS).map((c) => c.hex)].map((h) => h.toLowerCase()));
  const recent = recentAll.filter((h) => !taken.has(h));
  const custom = value !== 'auto' && value.startsWith('#') && !recent.includes(value.toLowerCase()) ? value : null;
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
      <span className="h-5 w-px bg-zinc-200" />
      {(Object.keys(FIXED_COLORS) as FixedColor[]).map((r) => (
        <button key={r} type="button" title={`${FIXED_COLORS[r].label} absoluto`} onClick={() => onChange(r)} className={ring(value === r)} style={{ background: FIXED_COLORS[r].hex }} />
      ))}
      {recent.length > 0 && <span className="h-5 w-px bg-zinc-200" />}
      {recent.map((h) => (
        <button key={h} type="button" title={`Cor já usada aqui: ${h}`} onClick={() => onChange(h as ColorRef)} className={ring(value.toLowerCase() === h)} style={{ background: h }} />
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
