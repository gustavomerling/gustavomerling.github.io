import { useEffect, useRef, useState } from 'react'
import type { BuildState } from './game/build/BuildMode'
import { createGame, type DebugState, type Game, type GameStats } from './game/Game'
import { BuildBar } from './ui/BuildBar'
import { WeaponHud } from './ui/WeaponHud'
import type { WeaponState } from './game/weapons/WeaponSystem'
import { DebugPanel } from './ui/DebugPanel'
import { PauseMenu, RES_OPTIONS } from './ui/PauseMenu'
import { loadJson, saveJson } from './ui/storage'

const SETTINGS_KEY = 'hitl.settings'

interface Settings {
  sensitivity: number
  pixelRatio: number
  debugPanel: boolean
  colliders: boolean
}

/** Lê também as chaves antigas (passos 2–3) para não perder o que já foi ajustado. */
function legacy(key: string, fallback: number) {
  try {
    const v = Number(localStorage.getItem(key))
    return v > 0 ? v : fallback
  } catch {
    return fallback
  }
}

function loadSettings(): Settings {
  const s = loadJson<Settings>(SETTINGS_KEY, {
    sensitivity: legacy('hitl.sensitivity', 1),
    pixelRatio: legacy('hitl.pixelRatio', 1),
    debugPanel: true,
    colliders: false,
  })
  if (!RES_OPTIONS.includes(s.pixelRatio)) s.pixelRatio = 1
  return s
}

/**
 * React cuida só da camada de UI (HUD, menus). A cena 3D e a física rodam
 * fora do ciclo de render do React, num loop imperativo próprio.
 */
export default function App() {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Game | undefined>(undefined)
  const [settings, setSettings] = useState(loadSettings)
  const [ready, setReady] = useState(false)
  const [locked, setLocked] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [build, setBuild] = useState<BuildState>({ active: false, selected: 0, placed: 0 })
  const [weapon, setWeapon] = useState<WeaponState | null>(null)
  const [debug, setDebugState] = useState<DebugState>({
    panel: settings.debugPanel,
    colliders: settings.colliders,
    paused: false,
    npcStrength: 0.6,
    npcPose: 'stand',
    npcBalance: true,
    npcAutoGetUp: true,
    npcLook: true,
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    createGame(host, { onLockChange: setLocked, onStats: setStats, onDebugChange: setDebugState, onBuildChange: setBuild, onWeaponChange: setWeapon }, debug).then((g) => {
      if (cancelled) return g.dispose()
      gameRef.current = g
      setReady(true)
    })
    return () => {
      cancelled = true
      gameRef.current?.dispose()
      gameRef.current = undefined
    }
    // O estado inicial de debug só importa na criação.
  }, [])

  useEffect(() => {
    gameRef.current?.setSensitivity(settings.sensitivity)
    gameRef.current?.setPixelRatio(settings.pixelRatio)
    saveJson(SETTINGS_KEY, settings)
  }, [settings, ready])

  // O jogo é a fonte da verdade do debug (atalhos de teclado mudam lá);
  // aqui só guardamos as preferências que devem persistir.
  useEffect(() => {
    setSettings((s) =>
      s.debugPanel === debug.panel && s.colliders === debug.colliders
        ? s
        : { ...s, debugPanel: debug.panel, colliders: debug.colliders },
    )
  }, [debug.panel, debug.colliders])

  const game = () => gameRef.current

  return (
    <>
      <div ref={hostRef} className="viewport" />
      {locked && <div className="crosshair" />}
      {locked && debug.panel && <DebugPanel stats={stats} debug={debug} />}
      {locked && debug.paused && <div className="paused-tag">física pausada</div>}
      {locked && build.active && <BuildBar build={build} />}
      {locked && !build.active && weapon && <WeaponHud weapon={weapon} />}
      {!locked && (
        <PauseMenu
          ready={ready}
          sensitivity={settings.sensitivity}
          pixelRatio={settings.pixelRatio}
          debug={debug}
          onPlay={() => game()?.lock()}
          onSensitivity={(sensitivity) => setSettings((s) => ({ ...s, sensitivity }))}
          onPixelRatio={(pixelRatio) => setSettings((s) => ({ ...s, pixelRatio }))}
          onDebug={(patch) => game()?.setDebug(patch)}
          onStep={() => game()?.stepOnce()}
          onReset={() => game()?.resetScene()}
          built={build.placed}
          onClearBuilt={() => game()?.clearBuilt()}
        />
      )}
    </>
  )
}
