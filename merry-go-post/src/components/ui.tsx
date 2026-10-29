import { Plus, X } from 'lucide-react';
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand-600 text-brand-fg hover:brightness-110 shadow-sm',
  secondary: 'bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 shadow-sm',
  ghost: 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900',
  danger: 'text-red-600 hover:bg-red-50',
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, ...rest }: ButtonProps) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        size === 'sm' ? 'h-8 px-2.5 text-sm' : 'h-10 px-4 text-sm',
        !children && (size === 'sm' ? 'w-8 px-0' : 'w-10 px-0'),
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-100',
        className,
      )}
      {...rest}
    />
  );
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: ReactNode; className?: string }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cx('rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm', className)}>{children}</div>;
}

export function SectionTitle({ children, hint }: { children: ReactNode; hint?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-zinc-900">{children}</h2>
      {hint && <p className="mt-0.5 text-sm text-zinc-500">{hint}</p>}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: ReactNode; title?: string }[];
  onChange: (v: T) => void;
  size?: 'sm' | 'md';
}) {
  return (
    <div className="inline-flex rounded-lg bg-zinc-100 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-md font-medium transition cursor-pointer',
            size === 'sm' ? 'h-7 px-2 text-xs' : 'h-8 px-3 text-sm',
            value === o.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit = '',
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs text-zinc-600">
        <span>{label}</span>
        <span className="tabular-nums text-zinc-400">
          {Number.isInteger(step) ? value : value.toFixed(2)}
          {unit}
        </span>
      </span>
      <input type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}

export function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-zinc-300 bg-white px-6 py-14 text-center">
      <div className="mb-3 grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand-600">{icon}</div>
      <h3 className="font-semibold text-zinc-900">{title}</h3>
      {children && <div className="mt-1 max-w-sm text-sm text-zinc-500">{children}</div>}
    </div>
  );
}

/** Janela sobre a tela; Esc ou clique fora fecham. */
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  actions,
  footer,
  size = 'lg',
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  /** Barra fixa no rodapé (botões de confirmar/cancelar). */
  footer?: ReactNode;
  size?: 'md' | 'lg' | 'xl';
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        role="dialog"
        aria-modal
        className={cx(
          'flex max-h-[min(860px,calc(100vh-2rem))] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl',
          size === 'md' ? 'max-w-xl' : size === 'lg' ? 'max-w-4xl' : 'max-w-6xl',
        )}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-sm text-zinc-500">{subtitle}</div>}
          </div>
          {actions}
          <Button size="sm" variant="ghost" title="Fechar (Esc)" icon={<X size={16} />} onClick={onClose} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex shrink-0 items-center justify-end gap-2 border-t border-zinc-100 px-5 py-3">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

/** Rótulo pequeno de campo nos painéis laterais. */
export const Label = ({ children }: { children: ReactNode }) => <div className="mb-1.5 text-xs font-medium text-zinc-600">{children}</div>;

/** Campo numérico compacto (posições e tamanhos em %). */
export function NumberField({
  label,
  value,
  onChange,
  step = 1,
  min,
  max,
  title,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  title?: string;
}) {
  return (
    <label className="block" title={title}>
      <span className="mb-1 block text-[11px] font-medium text-zinc-500">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? Math.round(value * 100) / 100 : 0}
        step={step}
        min={min}
        max={max}
        onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
        className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm tabular-nums outline-none focus:border-brand-500"
      />
    </label>
  );
}

/**
 * Primeiro item das listagens: um "esqueleto" tracejado do próprio item, que cria um novo.
 * `slide` imita uma miniatura 4:5 com legenda; `row` imita o cartão de cliente.
 */
export function NewItemCard({ label, hint, onClick, shape }: { label: string; hint?: string; onClick: () => void; shape: 'slide' | 'row' }) {
  const plus = (
    <span className="grid h-11 w-11 place-items-center rounded-full bg-zinc-100 text-zinc-500 transition group-hover:bg-brand-600 group-hover:text-brand-fg">
      <Plus size={20} />
    </span>
  );
  const box = 'border-2 border-dashed border-zinc-300 transition group-hover:border-brand-500 group-hover:bg-brand-50';
  if (shape === 'row')
    return (
      <button type="button" onClick={onClick} className={cx('group flex h-full min-h-36 items-center gap-3 rounded-2xl p-5 text-left', box)}>
        {plus}
        <span className="min-w-0">
          <span className="block font-semibold text-zinc-700 group-hover:text-brand-700">{label}</span>
          {hint && <span className="block text-sm text-zinc-500">{hint}</span>}
        </span>
      </button>
    );
  return (
    <button type="button" onClick={onClick} className="group block text-left">
      <span className={cx('flex aspect-[4/5] flex-col items-center justify-center gap-2 rounded-xl px-3 text-center', box)}>
        {plus}
        <span className="text-sm font-semibold text-zinc-700 group-hover:text-brand-700">{label}</span>
        {hint && <span className="text-xs text-zinc-500">{hint}</span>}
      </span>
      {/* Esqueleto da legenda, alinhado com os outros cartões. */}
      <span className="mt-2 block h-3 w-2/3 rounded bg-zinc-200/70" />
      <span className="mt-1.5 block h-2.5 w-1/2 rounded bg-zinc-200/50" />
    </button>
  );
}

export { cx };
