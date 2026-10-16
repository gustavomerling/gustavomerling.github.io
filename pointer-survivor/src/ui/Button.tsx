import type { ButtonHTMLAttributes } from 'react'
import { playSfx } from '../game/audio'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Thick black border of the dialog's default button. */
  isDefault?: boolean
  big?: boolean
}

export function Button({ isDefault, big, className, onClick, ...rest }: Props) {
  return (
    <button
      type="button"
      className={`btn ${isDefault ? 'default' : ''} ${big ? 'big' : ''} ${className ?? ''}`}
      onClick={(e) => {
        playSfx('click')
        onClick?.(e)
      }}
      {...rest}
    />
  )
}
