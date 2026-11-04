import { useEffect, useState } from 'react'
import type { ArenaState, MapRoom } from '../game/arena/Arena'
import { ROOM_LABELS } from '../game/world/roomTypes'

/** Modos zumbi/SWAT: vida, minimapa, avisos, dano (flash + direção) e telas de morte/vitória. */
export function ArenaHud({ arena, onRestart }: { arena: ArenaState; onRestart: () => void }) {
  const [showMsg, setShowMsg] = useState(false)
  useEffect(() => {
    if (!arena.messageAt) return
    setShowMsg(true)
    const id = setTimeout(() => setShowMsg(false), 1600)
    return () => clearTimeout(id)
  }, [arena.messageAt])

  const pct = Math.max(0, Math.min(1, arena.hp / arena.maxHp))
  const over = arena.dead || arena.won
  return (
    <>
      {arena.hurtAt > 0 && <div key={arena.hurtAt} className="hurt-flash" />}
      {arena.hurtAt > 0 && arena.hurtAngle !== null && (
        <div key={`d${arena.hurtAt}`} className="hurt-dir" style={{ transform: `rotate(var(--hurt-angle, ${arena.hurtAngle}rad))` }}>
          <div className="hurt-arc" />
        </div>
      )}
      {!over && (
        <div className="map-box">
          <Minimap rooms={arena.map} exitOpen={arena.exitOpen} />
          {arena.map.some((r) => r.current) && (
            <div className="room-label">{ROOM_LABELS[arena.map.find((r) => r.current)!.type]}</div>
          )}
        </div>
      )}
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
      {showMsg && !over && (
        <div key={arena.messageAt} className="arena-msg">
          {arena.message}
        </div>
      )}
      {over && (
        <div className={arena.won ? 'death-screen won' : 'death-screen'}>
          <div className="death-title">{arena.won ? 'Você escapou' : 'Você morreu'}</div>
          <div className="death-sub">
            Salas limpas {arena.cleared}/{arena.rooms} · abates {arena.kills}
          </div>
          <button className="death-btn" onClick={onRestart}>
            Nova masmorra <kbd>R</kbd>
          </button>
        </div>
      )}
    </>
  )
}

const CELL = 22
const GAP = 6

/** Minimapa estilo "Isaac": salas vistas, porta a porta; a atual em destaque. */
function Minimap({ rooms, exitOpen }: { rooms: MapRoom[]; exitOpen: boolean }) {
  if (!rooms.length) return null
  const minI = Math.min(...rooms.map((r) => r.i))
  const maxI = Math.max(...rooms.map((r) => r.i))
  const minJ = Math.min(...rooms.map((r) => r.j))
  const maxJ = Math.max(...rooms.map((r) => r.j))
  const step = CELL + GAP
  const w = (maxI - minI + 1) * step - GAP
  const h = (maxJ - minJ + 1) * step - GAP
  const pad = 8
  const visited = new Set(rooms.filter((r) => r.visited).map((r) => `${r.i},${r.j}`))
  return (
    <svg className="minimap" width={w + pad * 2} height={h + pad * 2} viewBox={`${-pad} ${-pad} ${w + pad * 2} ${h + pad * 2}`}>
      {rooms.map((r) => {
        const x = (r.i - minI) * step
        const y = (r.j - minJ) * step
        const doors = r.doors.map((open, d) =>
              !open || d >= 2 || !(r.visited || visited.has(d === 0 ? `${r.i + 1},${r.j}` : `${r.i},${r.j + 1}`)) ? null : d === 0 ? (
                <rect key={d} x={x + CELL} y={y + CELL / 2 - 3} width={GAP} height={6} className="mm-door" />
              ) : (
                <rect key={d} x={x + CELL / 2 - 3} y={y + CELL} width={6} height={GAP} className="mm-door" />
              ),
            )
        const cls = ['mm-room', r.visited ? 'visited' : 'unknown', r.current && 'current', r.hostile && 'hostile']
          .filter(Boolean)
          .join(' ')
        return (
          <g key={`${r.i},${r.j}`}>
            {doors}
            <rect x={x} y={y} width={CELL} height={CELL} rx={2} className={cls} />
            {r.type === 'end' && (
              <rect x={x + 7} y={y + 7} width={8} height={8} className={exitOpen ? 'mm-exit open' : 'mm-exit'} />
            )}
            {r.type === 'start' && <circle cx={x + CELL / 2} cy={y + CELL / 2} r={2.5} className="mm-start" />}
            {r.hostile && !r.current && <circle cx={x + CELL - 5} cy={y + 5} r={2.5} className="mm-enemy" />}
          </g>
        )
      })}
    </svg>
  )
}
