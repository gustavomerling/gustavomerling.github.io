import type { LucideIcon } from 'lucide-react'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'ghost'
type Size = 'md' | 'sm'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  icon?: LucideIcon
}

/** Pass `aria-label` when using an icon without children. */
export function Button({ variant = 'primary', size = 'md', icon: Icon, className = '', children, ...props }: ButtonProps) {
  const iconOnly = Icon && !children
  return (
    <button
      type="button"
      className={`btn btn--${variant} btn--${size} ${iconOnly ? 'btn--icon' : ''} ${className}`}
      title={iconOnly ? props['aria-label'] : undefined}
      {...props}
    >
      {Icon && <Icon size={size === 'sm' ? 16 : 20} strokeWidth={2.2} aria-hidden />}
      {children}
    </button>
  )
}
