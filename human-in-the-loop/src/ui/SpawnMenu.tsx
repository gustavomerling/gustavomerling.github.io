import { useEffect, useRef, useState } from 'react'
import type { SandboxState } from '../game/sandbox/Sandbox'
import { SPAWN_ITEMS } from '../game/sandbox/spawnCatalog'
import { TOOLS, type ToolId } from '../game/sandbox/Tools'
import './tools.css'

interface Props {
  sandbox: SandboxState
  onSpawn: (id: string) => void
  onTool: (id: ToolId) => void
  onClose: () => void
}

/**
 * Menu de spawn (Q). O mouse continua capturado (pointer lock), então o
 * menu tem um cursor próprio movido pelo `movementX/Y`; o clique escolhe o
 * cartão sob ele. Botão direito ou Q fecham.
 */
export function SpawnMenu({ sandbox, onSpawn, onTool, onClose }: Props) {
  const [cursor, setCursor] = useState(() => ({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
  const [hover, setHover] = useState<string | null>(null)
  const pos = useRef(cursor)
  const handlers = useRef({ onSpawn, onTool, onClose })
  handlers.current = { onSpawn, onTool, onClose }

  useEffect(() => {
    const pick = () => {
      const el = document.elementFromPoint(pos.current.x, pos.current.y)?.closest<HTMLElement>('[data-pick]')
      return el?.dataset.pick ?? null
    }
    const onMove = (e: MouseEvent) => {
      const p = {
        x: Math.min(window.innerWidth - 2, Math.max(0, pos.current.x + e.movementX)),
        y: Math.min(window.innerHeight - 2, Math.max(0, pos.current.y + e.movementY)),
      }
      pos.current = p
      setCursor(p)
      setHover(pick())
    }
    const onDown = (e: MouseEvent) => {
      if (e.button === 2) return handlers.current.onClose()
      if (e.button !== 0) return
      const id = pick()
      if (!id) return
      const [kind, value] = id.split(':')
      if (kind === 'tool') handlers.current.onTool(value as ToolId)
      else handlers.current.onSpawn(value)
    }
    document.addEventListener('mousemove', onMove)
    window.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('mousemove', onMove)
      window.removeEventListener('mousedown', onDown)
    }
  }, [])

  const card = (key: string, title: string, sub?: string, current = false) => (
    <div
      key={key}
      data-pick={key}
      className={'spawn-card' + (hover === key ? ' hover' : '') + (current ? ' current' : '')}
    >
      <span>{title}</span>
      {sub && <small>{sub}</small>}
    </div>
  )

  return (
    <div className="spawn-menu">
      <div className="spawn-panel">
        <div className="spawn-head">
          <strong>Menu de spawn</strong>
          <span>clique: criar na mira · Q / botão direito: fechar</span>
        </div>
        <div className="spawn-section">Objetos</div>
        <div className="spawn-grid">
          {SPAWN_ITEMS.filter((i) => i.group === 'object').map((i) =>
            card(`spawn:${i.id}`, i.name, i.mass ? `${i.mass} kg` : undefined),
          )}
        </div>
        <div className="spawn-section">Armas (E pega do chão)</div>
        <div className="spawn-grid">
          {SPAWN_ITEMS.filter((i) => i.group === 'weapon').map((i) => card(`spawn:${i.id}`, i.name))}
        </div>
        <div className="spawn-section">Ferramentas</div>
        <div className="spawn-grid">
          {TOOLS.map((t) => card(`tool:${t.id}`, t.name, undefined, sandbox.slot === 'tool' && sandbox.tool === t.id))}
        </div>
        <div className="spawn-foot">
          X apaga o item criado que está na mira · R reseta a cena (apaga tudo) · {sandbox.spawned} criados
        </div>
      </div>
      <div className="spawn-cursor" style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)` }} />
    </div>
  )
}
