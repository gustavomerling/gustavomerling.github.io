import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './Button.tsx'
import { useKey } from './useKey.ts'

interface PanelProps {
  title: string
  onClose: () => void
  children: ReactNode
}

/** Modal panel for secondary menu content (How to Play, About...). */
export function Panel({ title, onClose, children }: PanelProps) {
  useKey(onClose, 'Escape')

  return (
    <div className="panel-backdrop" onClick={onClose}>
      <section className="panel" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2 className="panel__title">{title}</h2>
        <div className="panel__body">{children}</div>
        <Button variant="ghost" icon={X} onClick={onClose}>
          Close
        </Button>
      </section>
    </div>
  )
}
