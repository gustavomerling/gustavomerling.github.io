import { Flag, RotateCcw, Settings, Skull, Timer, Trophy } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Navigate } from '../app/screens.ts'
import { formatTime, loadProgress, recordWin, unlockLevel } from '../app/storage.ts'
import { SettingsPanel } from '../components/SettingsPanel.tsx'
import { BINDINGS, CONTROL_HELP } from '../engine/controls.ts'
import { FpsGame, type RespawnReason, type RunStats } from '../engine/FpsGame.ts'
import { LEVELS } from '../engine/levels/index.ts'
import type { GameSettings } from '../engine/settings.ts'

const RESPAWN_MESSAGES: Record<RespawnReason, string> = {
  fall: 'Você caiu!',
  hazard: 'Cuidado com o perigo!',
  restart: 'Nível reiniciado',
}

type Finish = RunStats & { record: boolean; best: number | null }

export function GameScreen({
  startLevel,
  settings,
  onSettingsChange,
  onNavigate,
}: {
  /** Index in `LEVELS` where the player starts. */
  startLevel: number
  settings: GameSettings
  onSettingsChange: (settings: GameSettings) => void
  onNavigate: Navigate
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<FpsGame | null>(null)
  const settingsRef = useRef(settings)
  const toastTimer = useRef<number | undefined>(undefined)
  const bannerTimer = useRef<number | undefined>(undefined)
  const timerRef = useRef<HTMLSpanElement>(null)
  const altitudeRef = useRef<HTMLDivElement>(null)

  const [levelIndex, setLevelIndex] = useState(startLevel)
  const [locked, setLocked] = useState(false)
  const [started, setStarted] = useState(false)
  const [falls, setFalls] = useState(0)
  const [toast, setToast] = useState<{ text: string; kind: RespawnReason; id: number } | null>(null)
  const [banner, setBanner] = useState<{ index: number; id: number } | null>(null)
  const [flash, setFlash] = useState(0)
  const [finish, setFinish] = useState<Finish | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [fullRun, setFullRun] = useState(startLevel === 0)

  const level = LEVELS[levelIndex]

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const showBanner = (index: number) => {
      setBanner({ index, id: performance.now() })
      window.clearTimeout(bannerTimer.current)
      bannerTimer.current = window.setTimeout(() => setBanner(null), 2600)
    }

    let firstLock = true
    const game = new FpsGame(
      host,
      LEVELS,
      {
        onLockChange: (isLocked) => {
          setLocked(isLocked)
          if (!isLocked) return
          setStarted(true)
          setShowSettings(false)
          if (firstLock) {
            firstLock = false
            showBanner(game.levelIndex)
          }
        },
        onLevelChange: (index, reached) => {
          setLevelIndex(index)
          if (reached) {
            unlockLevel(index)
            showBanner(index)
          }
        },
        onRespawn: (reason, count) => {
          setFalls(count)
          setFlash((value) => value + 1)
          setToast({ text: RESPAWN_MESSAGES[reason], kind: reason, id: performance.now() })
          window.clearTimeout(toastTimer.current)
          toastTimer.current = window.setTimeout(() => setToast(null), 1400)
        },
        onFinish: (stats) => {
          const record = recordWin(stats.time, stats.falls, stats.fullRun)
          setFinish({ ...stats, record, best: loadProgress().bestTime })
        },
      },
      startLevel,
    )
    game.applySettings(settingsRef.current)
    gameRef.current = game

    // The timer and the altitude meter change every frame: write them straight to
    // the DOM instead of re-rendering React 60 times a second.
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      if (timerRef.current) timerRef.current.textContent = formatTime(game.elapsed)
      if (altitudeRef.current) {
        const progress = Math.min(1, Math.max(0, game.height / game.top))
        altitudeRef.current.style.setProperty('--progress', progress.toFixed(4))
      }
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      game.dispose()
      gameRef.current = null
      window.clearTimeout(toastTimer.current)
      window.clearTimeout(bannerTimer.current)
    }
  }, [startLevel])

  useEffect(() => {
    settingsRef.current = settings
    gameRef.current?.applySettings(settings)
  }, [settings])

  // M toggles the sound, in game or paused.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || !BINDINGS.mute.includes(event.code)) return
      const current = settingsRef.current
      onSettingsChange({ ...current, muted: !current.muted })
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onSettingsChange])

  const restartRun = (index: number) => {
    const game = gameRef.current
    if (!game) return
    game.restart(index)
    setFalls(0)
    setFinish(null)
    setFullRun(game.isFullRun)
    game.requestLock()
  }

  const restartLevel = () => {
    const game = gameRef.current
    if (!game) return
    game.respawn()
    game.requestLock()
  }

  return (
    <div className="game">
      <div className="game__canvas" ref={hostRef} />

      <div className="crosshair" aria-hidden />
      {flash > 0 && <div key={flash} className="flash" aria-hidden />}

      <div className="hud-top">
        <div className="hud-chip hud-chip--level">
          <span className="hud-chip__eyebrow">
            {level.name} <span className="hud-chip__dim">/ {LEVELS.length}</span>
          </span>
          <span className="hud-chip__title">{level.tagline}</span>
        </div>

        <div className="hud-stats">
          {!fullRun && <span className="hud-chip hud-chip--practice">Treino</span>}
          <span className="hud-chip hud-stat" title="Tempo">
            <Timer size={16} aria-hidden />
            <span ref={timerRef}>0:00.0</span>
          </span>
          <span className="hud-chip hud-stat" title="Quedas">
            <Skull size={16} aria-hidden />
            <span key={falls} className="hud-stat__bump">
              {falls}
            </span>
          </span>
        </div>
      </div>

      <div className="altimeter" ref={altitudeRef} aria-hidden>
        <Flag className="altimeter__flag" size={14} />
        <div className="altimeter__track">
          {LEVELS.map((def, index) => (
            <span
              key={def.id}
              className={`altimeter__tick${index <= levelIndex ? ' altimeter__tick--done' : ''}`}
              style={{ bottom: `${(index / LEVELS.length) * 100}%` }}
            >
              {index + 1}
            </span>
          ))}
          <div className="altimeter__fill" />
          <div className="altimeter__marker" />
        </div>
      </div>

      <div className="hud">
        {CONTROL_HELP.filter((control) => control.inHud).map((control) => (
          <span key={control.id}>
            <b>{control.keys}</b> {control.action.toLowerCase()}
          </span>
        ))}
      </div>

      {banner && (
        <div key={banner.id} className="banner" aria-live="polite">
          <span className="banner__eyebrow">{LEVELS[banner.index].name}</span>
          <span className="banner__title">{LEVELS[banner.index].tagline}</span>
        </div>
      )}

      {toast && (
        <div key={toast.id} className={`toast toast--${toast.kind}`}>
          {toast.text}
        </div>
      )}

      {finish && (
        <div className="overlay">
          <div className="overlay__card overlay__card--win">
            <Trophy className="overlay__trophy" size={44} aria-hidden />
            <h2 className="overlay__title">{finish.record ? 'Novo recorde!' : 'Você chegou ao topo!'}</h2>
            <p className="overlay__text">
              {finish.fullRun
                ? 'A torre inteira, do primeiro degrau ao cume.'
                : 'Treino concluído. Comece do Nível 1 para valer recorde.'}
            </p>
            <dl className="results">
              <div>
                <dt>Tempo</dt>
                <dd>{formatTime(finish.time)}</dd>
              </div>
              <div>
                <dt>Quedas</dt>
                <dd>{finish.falls}</dd>
              </div>
              <div>
                <dt>Recorde</dt>
                <dd>{finish.best === null ? '—' : formatTime(finish.best)}</dd>
              </div>
            </dl>
            <button className="overlay__play" onClick={() => restartRun(0)}>
              Jogar de novo
            </button>
            <button className="overlay__back" onClick={() => onNavigate('menu')}>
              Voltar ao menu
            </button>
          </div>
        </div>
      )}

      {!locked && !finish && (
        <div className="overlay">
          <div className="overlay__card">
            <h2 className="overlay__title">{started ? 'Pausado' : 'Pronto?'}</h2>
            <p className="overlay__text">
              {started
                ? 'Clique para voltar ao jogo.'
                : `${level.name}: ${level.tagline}. Chegue ao cristal no topo da torre.`}
            </p>
            <button className="overlay__play" onClick={() => gameRef.current?.requestLock()}>
              {started ? 'Continuar' : 'Começar'}
            </button>

            {started && (
              <div className="overlay__row">
                <button className="overlay__back" onClick={restartLevel}>
                  <RotateCcw size={15} aria-hidden /> Reiniciar nível
                </button>
                <button className="overlay__back" onClick={() => restartRun(0)}>
                  <Flag size={15} aria-hidden /> Recomeçar torre
                </button>
              </div>
            )}

            <button
              className="overlay__back"
              aria-expanded={showSettings}
              onClick={() => setShowSettings((value) => !value)}
            >
              <Settings size={15} aria-hidden /> Configurações
            </button>
            {showSettings && <SettingsPanel settings={settings} onChange={onSettingsChange} />}

            <button className="overlay__back" onClick={() => onNavigate('menu')}>
              Voltar ao menu
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
