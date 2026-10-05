import type { RefObject } from 'react'
import { ChevronDown, ChevronUp, Flame, RotateCcw, RotateCw } from 'lucide-react'

/** Botões na tela para celular/tablet. Escrevem no mesmo conjunto de teclas do teclado. */
export function TouchControls({ keys }: { keys: RefObject<Set<string>> }) {
  const btn = (key: string, label: React.ReactNode, cls = '') => (
    <button
      className={`touch-btn ${cls}`}
      onPointerDown={(e) => {
        e.preventDefault()
        ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
        keys.current.add(key)
      }}
      onPointerUp={() => keys.current.delete(key)}
      onPointerCancel={() => keys.current.delete(key)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  )
  return (
    <div className="touch">
      <div className="touch-group">
        {btn('ArrowLeft', <RotateCcw size={30} />)}
        {btn('ArrowRight', <RotateCw size={30} />)}
      </div>
      <div className="touch-group">
        {btn('Shift', <Flame size={22} />, 'small')}
        {btn('ArrowDown', <ChevronDown size={34} />, 'brake')}
        {btn('ArrowUp', <ChevronUp size={34} />, 'gas')}
      </div>
    </div>
  )
}
