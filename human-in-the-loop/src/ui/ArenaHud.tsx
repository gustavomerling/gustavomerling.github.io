import { useEffect, useState } from 'react'
import type { ArenaState } from '../game/arena/Arena'

/** Modos zumbi/SWAT: vida, salas limpas, avisos, flash de dano e tela de morte. */
export function ArenaHud({ arena, onRestart }: { arena: ArenaState; onRestart: () => void }) {
  const [showMsg, setShowMsg] = useState(false)
  useEffect(() => {
    if (!arena.messageAt) return
    setShowMsg(true)
    const id = setTimeout(() => setShowMsg(false), 1600)
    return () => clearTimeout(id)
  }, [arena.messageAt])

  const pct = Math.max(0, Math.min(1, arena.hp / arena.maxHp))
  return (
    <>
      {arena.hurtAt > 0 && <div key={arena.hurtAt} className="hurt-flash" />}
      <div className="arena-hud">
        <div className={pct < 0.3 ? 'hp low' : 'hp'}>
          <span className="hp-label">Vida</span>
          <div className="hp-bar">
            <div className="hp-fill" style={{ width: `${pct * 100}%` }} />
          </div>
          <span className="hp-num">{arena.hp}</span>
        </div>
        <div className="arena-stats">
          Salas {arena.cleared}/{arena.rooms} · abates {arena.kills}
        </div>
      </div>
      {showMsg && !arena.dead && <div key={arena.messageAt} className="arena-msg">{arena.message}</div>}
      {arena.dead && (
        <div className="death-screen">
          <div className="death-title">Você morreu</div>
          <div className="death-sub">
            Salas limpas {arena.cleared}/{arena.rooms} · abates {arena.kills}
          </div>
          <button className="death-btn" onClick={onRestart}>
            Recomeçar <kbd>R</kbd>
          </button>
        </div>
      )}
    </>
  )
}
