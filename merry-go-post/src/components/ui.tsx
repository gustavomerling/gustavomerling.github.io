import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

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

export { cx };
