import type { ReactNode } from 'react'
import { playUi } from '../audio'
import { Icon, type IconName } from './Icon'

// Painel lateral (no celular, folha que sobe de baixo). Fica sempre montado para guardar o estado;
// fechado, sai da tela e fica inerte.
export function Drawer({
  id,
  title,
  icon,
  open,
  onClose,
  children,
}: {
  id: string
  title: string
  icon: IconName
  open: boolean
  onClose: () => void
  children: ReactNode
}) {
  return (
    <aside
      id={id}
      className="drawer glass"
      data-open={open}
      inert={!open}
      aria-hidden={!open}
      aria-label={title}
    >
      <header className="drawer-header">
        <span className="drawer-icon">
          <Icon name={icon} />
        </span>
        <h2 className="drawer-title">{title}</h2>
        <button
          type="button"
          className="icon-btn"
          aria-label="Fechar painel (Esc)"
          title="Fechar (Esc)"
          onClick={() => {
            playUi('click')
            onClose()
          }}
        >
          <Icon name="close" size={18} />
        </button>
      </header>
      <div className="drawer-body">{children}</div>
    </aside>
  )
}
