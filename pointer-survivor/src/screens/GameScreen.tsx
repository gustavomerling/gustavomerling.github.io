import { useEffect, useRef, useState } from 'react'
import { Engine } from '../game/engine/Engine'
import { MAP_BY_ID } from '../game/maps'
import { formatTime } from '../game/math'
import { music } from '../game/music/player'
import type { DiscoveryKind, HudSnapshot, RunResult, UpgradeOption } from '../game/types'
import { Button } from '../ui/Button'
import { Icon } from '../ui/Icon'
import { Modal } from '../ui/Modal'
import { ProgressBar } from '../ui/ProgressBar'
import { Window } from '../ui/Window'

interface Props {
  mapId: string
  shop: Record<string, number>
  /** save keys like "enemies:bug" that are already in the glossary */
  discovered: string[]
  /** false while the window is minimized or another window has focus — the run pauses */
  active: boolean
  onEnd(result: RunResult): void
  onDiscover(kind: DiscoveryKind, id: string): void
}

/** Hosts the canvas + Engine and renders HUD and dialogs in React. */
export function GameScreen({ mapId, shop, discovered, active, onEnd, onDiscover }: Props) {
  const map = MAP_BY_ID[mapId]
  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<Engine | null>(null)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [choices, setChoices] = useState<UpgradeOption[] | null>(null)
  const [paused, setPaused] = useState(false)
  const [result, setResult] = useState<RunResult | null>(null)

  // engine lifecycle
  useEffect(() => {
    const canvas = canvasRef.current
    const stage = stageRef.current
    if (!canvas || !stage) return
    const engine = new Engine(canvas, shop, map, discovered, {
      onHud: setHud,
      onLevelUp: setChoices,
      onEnd: (r) => {
        music.stop()
        setResult(r)
      },
      onDiscover: (kind, id) => discoverRef.current(kind, id),
      onBoss: () => music.play('boss'),
    })
    music.play(map.music)
    // dev-only handle for testing (e.g. jumping to the boss from the console)
    if (import.meta.env.DEV) (window as unknown as { __engine?: Engine }).__engine = engine
    engineRef.current = engine
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      // minimized windows report 0x0; keep the last arena shape
      if (width < 40 || height < 40) return
      engine.resize(width - 4, height - 4)
    })
    ro.observe(stage)
    engine.start()
    return () => {
      ro.disconnect()
      engine.dispose()
      engineRef.current = null
      music.stop()
    }
    // map/shop/discovered are fixed for the whole run, so the engine is created once
  }, [])

  // latest callback without recreating the engine
  const discoverRef = useRef(onDiscover)
  discoverRef.current = onDiscover

  const blocked = !!choices || !!result

  useEffect(() => {
    engineRef.current?.setPaused(paused)
    music.setPaused(paused || !!choices)
  }, [paused, choices])

  // losing focus (minimize, clicking another window) pauses the run
  useEffect(() => {
    if (!active && !blocked) setPaused(true)
  }, [active, blocked])

  // keyboard: pause + quick-pick level-up choices
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!active) return
      if (choices) {
        const i = Number(e.key) - 1
        if (i >= 0 && i < choices.length) pick(choices[i])
        return
      }
      if (!result && (e.key === 'Escape' || e.key.toLowerCase() === 'p')) setPaused((p) => !p)
      if (!result && !paused && (e.key === ' ' || e.key === 'Delete')) {
        e.preventDefault()
        engineRef.current?.triggerTaskManager()
      }
    }
    const onHide = () => {
      if (!blocked) setPaused(true)
    }
    const onVisibility = () => document.hidden && onHide()
    window.addEventListener('keydown', onKey)
    window.addEventListener('blur', onHide)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('blur', onHide)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  function pick(option: UpgradeOption) {
    setChoices(null)
    // engine may immediately re-emit onLevelUp if more level-ups are queued
    engineRef.current?.choose(option)
  }

  const taskReady = (hud?.taskCharge ?? 0) >= 1

  return (
    <>
      <Window
        title={`pointer.exe — ${map.path}`}
        icon="cursor"
        className="game-window"
        flush
        onClose={() => !blocked && setPaused(true)}
        status={[
          <div className="loadout" key="loadout">
            {hud?.weapons.map((w) => (
              <span key={w.id} className="slot" title={`${w.name} Lv ${w.level}`}>
                <Icon name={w.icon} />
                <b>{w.level}</b>
              </span>
            ))}
            <span style={{ width: 8 }} />
            {hud?.passives.map((p) => (
              <span key={p.id} className="slot" title={`${p.name} Lv ${p.level}`}>
                <Icon name={p.icon} />
                <b>{p.level}</b>
              </span>
            ))}
          </div>,
          <span key="kills">☠ {hud?.kills ?? 0}</span>,
          <span key="floppies" style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <Icon name="floppy" /> {hud?.floppies ?? 0}
          </span>,
        ]}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="hud">
            <div className="hud-block">
              <Icon name="heart" />
              <ProgressBar value={hud?.hp ?? 1} max={hud?.maxHp ?? 1} color="#c00000" label="HP" />
              <span>
                {Math.ceil(hud?.hp ?? 0)}/{hud?.maxHp ?? 0}
              </span>
            </div>
            <div className="hud-block">
              <b>LV {hud?.level ?? 1}</b>
              <ProgressBar value={hud?.xp ?? 0} max={hud?.xpToNext ?? 1} label="XP" />
            </div>
            <div className="hud-block" title="Ctrl+Alt+Del: fills with kills. Press Space to end every process on screen.">
              <button
                type="button"
                className={`btn task-btn ${taskReady ? 'ready' : ''}`}
                disabled={!taskReady}
                onClick={() => engineRef.current?.triggerTaskManager()}
              >
                <Icon name="taskManager" />
                {taskReady ? 'Ctrl+Alt+Del!' : `${Math.floor((hud?.taskCharge ?? 0) * 100)}%`}
              </button>
            </div>
            <div className="hud-block" style={{ marginLeft: 'auto' }}>
              {hud && hud.bossIn > 0 && (
                <span className="boss-in" title="Boss arrives in">
                  BOSS {formatTime(hud.bossIn)}
                </span>
              )}
              <span className="hud-time" title="Time">
                {formatTime(hud?.time ?? 0)}
              </span>
            </div>
          </div>
          <div className="game-stage" ref={stageRef}>
            <canvas ref={canvasRef} />
            {choices && <LevelUpDialog level={hud?.level ?? 1} choices={choices} onPick={pick} />}
            {paused && !blocked && (
              <PauseDialog
                onResume={() => setPaused(false)}
                onQuit={() => {
                  setPaused(false)
                  engineRef.current?.forfeit()
                }}
              />
            )}
            {result && <EndDialog result={result} onClose={() => onEnd(result)} />}
          </div>
        </div>
      </Window>
    </>
  )
}

function LevelUpDialog({ level, choices, onPick }: { level: number; choices: UpgradeOption[]; onPick(o: UpgradeOption): void }) {
  const [sel, setSel] = useState(0)
  return (
    <Modal>
      <Window title={`Level Up! — Level ${level}`} icon="cpu" style={{ width: 'min(400px, 100%)' }}>
        <div>New components were found. Choose one to install:</div>
        <div className="choices" role="listbox">
          {choices.map((c, i) => (
            <button
              key={c.key}
              role="option"
              aria-selected={i === sel}
              className={`choice ${i === sel ? 'selected' : ''}`}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              onClick={() => onPick(c)}
              autoFocus={i === 0}
            >
              <Icon name={c.icon} size={32} />
              <span className="meta">
                <b>
                  {i + 1}. {c.title}
                </b>
                <span className="sub">{c.subtitle}</span>
                <span>{c.description}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="dialog-buttons">
          <Button isDefault onClick={() => onPick(choices[sel])}>
            Install
          </Button>
        </div>
      </Window>
    </Modal>
  )
}

function PauseDialog({ onResume, onQuit }: { onResume(): void; onQuit(): void }) {
  const [confirm, setConfirm] = useState(false)
  return (
    <Modal>
      <Window title="pointer.exe — Paused" icon="clock" onClose={onResume} style={{ width: 'min(340px, 100%)' }}>
        {confirm ? (
          <div className="dialog-row">
            <Icon name="warning" size={32} />
            <p style={{ margin: 0 }}>End this run now? You still keep the KB earned so far.</p>
          </div>
        ) : (
          <div className="dialog-row">
            <Icon name="clock" size={32} />
            <p style={{ margin: 0 }}>The game is paused. Press Esc to resume.</p>
          </div>
        )}
        <div className="dialog-buttons">
          {confirm ? (
            <>
              <Button onClick={onQuit}>End run</Button>
              <Button isDefault autoFocus onClick={() => setConfirm(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button isDefault autoFocus onClick={onResume}>
                Resume
              </Button>
              <Button onClick={() => setConfirm(true)}>Quit run...</Button>
            </>
          )}
        </div>
      </Window>
    </Modal>
  )
}

function EndDialog({ result, onClose }: { result: RunResult; onClose(): void }) {
  return (
    <Modal>
      <Window
        title={result.victory ? 'Pointer Survivor' : 'pointer.exe'}
        icon={result.victory ? 'computer' : 'warning'}
        onClose={onClose}
        style={{ width: 'min(420px, 100%)' }}
      >
        <div className="dialog-row">
          <Icon name={result.victory ? 'license' : 'warning'} size={32} />
          <div>
            {result.victory ? (
              <p style={{ margin: 0 }}>
                <b>It is now safe to turn off your computer.</b>
                <br />
                The boss of {MAP_BY_ID[result.mapId]?.name ?? 'this map'} is gone. Cleared in {formatTime(result.time)}.
              </p>
            ) : (
              <p style={{ margin: 0 }}>
                <b>This program has performed an illegal operation and will be shut down.</b>
                <br />
                If the problem persists, buy more RAM.
              </p>
            )}
            <div className="sunken" style={{ marginTop: 8, fontFamily: 'Courier New, monospace', fontSize: 11 }}>
              TIME={formatTime(result.time)} KILLS={result.kills} LV={result.level} FLOPPY={result.floppies}
              <br />
              KB_EARNED={result.earned}
            </div>
          </div>
        </div>
        <div className="dialog-buttons">
          <Button isDefault autoFocus onClick={onClose}>
            {result.victory ? 'OK' : 'Close'}
          </Button>
        </div>
      </Window>
    </Modal>
  )
}
