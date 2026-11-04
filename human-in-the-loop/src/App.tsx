import { useEffect, useRef, useState } from 'react'
import type { BuildState } from './game/build/BuildMode'
import { createGame, type DebugState, type Game, type GameStats } from './game/Game'
import { BuildBar } from './ui/BuildBar'
import { WeaponHud } from './ui/WeaponHud'
import type { WeaponState } from './game/weapons/WeaponSystem'
import { DebugPanel } from './ui/DebugPanel'
import { PauseMenu } from './ui/PauseMenu'
import { Intro } from './ui/Intro'
import { MainMenu } from './ui/MainMenu'
import { FOV_RANGE, RES_OPTIONS } from './ui/MenuPanels'
import { loadJson, saveJson } from './ui/storage'
import { NPC_KINDS, type NpcKind } from './game/npc/types'
import type { SandboxState } from './game/sandbox/Sandbox'
import { SpawnMenu } from './ui/SpawnMenu'
import { ToolHud } from './ui/ToolHud'
import { ArenaHud } from './ui/ArenaHud'
import { GAME_MODES, type ArenaState, type GameMode } from './game/arena/Arena'

const SETTINGS_KEY = 'hitl.settings'

interface Settings {
  sensitivity: number
  pixelRatio: number
  fov: number
  blood: number
  debugPanel: boolean
  colliders: boolean
  npcKind: NpcKind
  mode: GameMode
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
    fov: FOV_RANGE.default,
    blood: 1,
    debugPanel: true,
    colliders: false,
    npcKind: 'civilian',
    mode: 'sandbox',
  })
  if (!GAME_MODES.includes(s.mode)) s.mode = 'sandbox'
  if (!NPC_KINDS.includes(s.npcKind)) s.npcKind = 'civilian'
  if (!RES_OPTIONS.includes(s.pixelRatio)) s.pixelRatio = 1
  if (!(s.fov >= FOV_RANGE.min && s.fov <= FOV_RANGE.max)) s.fov = FOV_RANGE.default
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
  /** Abertura (uma vez por carregamento) e menu inicial (até entrar no jogo). */
  const [intro, setIntro] = useState(true)
  const [started, setStarted] = useState(false)
  const [stats, setStats] = useState<GameStats | null>(null)
  const [build, setBuild] = useState<BuildState>({ active: false, selected: 0, placed: 0 })
  const [weapon, setWeapon] = useState<WeaponState | null>(null)
  const [hitAt, setHitAt] = useState(0)
  const [aiming, setAiming] = useState(false)
  const [sandbox, setSandbox] = useState<SandboxState | null>(null)
  const [arena, setArena] = useState<ArenaState | null>(null)
  const mode = settings.mode
  const [debug, setDebugState] = useState<DebugState>({
    panel: settings.debugPanel,
    colliders: settings.colliders,
    paused: false,
    npcStrength: 0.6,
    npcPose: 'stand',
    npcBalance: true,
    npcAutoGetUp: true,
    npcLook: true,
    npcAi: true,
    npcKind: settings.npcKind,
  })

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    let cancelled = false
    setReady(false)
    setArena(null)
    createGame(
      host,
      {
        onLockChange: setLocked,
        onStats: setStats,
        onDebugChange: setDebugState,
        onBuildChange: setBuild,
        onWeaponChange: setWeapon,
        onHitMarker: () => setHitAt(performance.now()),
        onAimChange: setAiming,
        onSandboxChange: setSandbox,
        onArenaChange: setArena,
      },
      debug,
      mode,
    ).then((g) => {
      if (cancelled) return g.dispose()
      gameRef.current = g
      setReady(true)
    })
    return () => {
      cancelled = true
      gameRef.current?.dispose()
      gameRef.current = undefined
    }
    // Trocar de modo recria o jogo; o estado de debug só importa na criação.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  useEffect(() => {
    gameRef.current?.setSensitivity(settings.sensitivity)
    gameRef.current?.setPixelRatio(settings.pixelRatio)
    gameRef.current?.setFov(settings.fov)
    gameRef.current?.setBlood(settings.blood)
    saveJson(SETTINGS_KEY, settings)
  }, [settings, ready])

  // O jogo é a fonte da verdade do debug (atalhos de teclado mudam lá);
  // aqui só guardamos as preferências que devem persistir.
  useEffect(() => {
    setSettings((s) =>
      s.debugPanel === debug.panel && s.colliders === debug.colliders && (s.mode !== 'sandbox' || s.npcKind === debug.npcKind)
        ? s
        : {
            ...s,
            debugPanel: debug.panel,
            colliders: debug.colliders,
            // Na masmorra o tipo vem do modo: não sobrescreve a escolha do sandbox.
            npcKind: s.mode === 'sandbox' ? debug.npcKind : s.npcKind,
          },
    )
  }, [debug.panel, debug.colliders, debug.npcKind])

  useEffect(() => {
    if (locked) setStarted(true)
  }, [locked])

  const game = () => gameRef.current

  return (
    <>
      <div ref={hostRef} className="viewport" />
      {locked && !aiming && <div key={hitAt} className={hitAt ? 'crosshair hit' : 'crosshair'} />}
      {locked && debug.panel && <DebugPanel stats={stats} debug={debug} />}
      {locked && debug.paused && <div className="paused-tag">física pausada</div>}
      {locked && build.active && <BuildBar build={build} />}
      {locked && !build.active && weapon && <WeaponHud weapon={weapon} />}
      {locked && !build.active && mode === 'sandbox' && sandbox && !sandbox.menuOpen && <ToolHud sandbox={sandbox} />}
      {locked && mode !== 'sandbox' && arena && <ArenaHud arena={arena} onRestart={() => game()?.resetScene()} />}
      {locked && sandbox?.menuOpen && (
        <SpawnMenu
          sandbox={sandbox}
          onSpawn={(id) => game()?.spawnItem(id)}
          onTool={(id) => game()?.selectTool(id)}
          onClose={() => game()?.setSpawnMenu(false)}
        />
      )}
      {!locked && !started && (
        <MainMenu
          ready={ready}
          sensitivity={settings.sensitivity}
          pixelRatio={settings.pixelRatio}
          fov={settings.fov}
          npcKind={mode === 'sandbox' ? settings.npcKind : undefined}
          onNpcKind={(k) => game()?.setNpcKind(k)}
          mode={mode}
          onMode={(m) => setSettings((s) => ({ ...s, mode: m }))}
          onPlay={() => game()?.lock()}
          onSensitivity={(sensitivity) => setSettings((s) => ({ ...s, sensitivity }))}
          onPixelRatio={(pixelRatio) => setSettings((s) => ({ ...s, pixelRatio }))}
          onFov={(fov) => setSettings((s) => ({ ...s, fov }))}
          blood={settings.blood}
          onBlood={(blood) => setSettings((s) => ({ ...s, blood }))}
        />
      )}
      {!locked && started && (
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
          resetLabel={mode === 'sandbox' ? undefined : 'Nova masmorra'}
          built={build.placed}
          onClearBuilt={() => game()?.clearBuilt()}
          fov={settings.fov}
          npcKind={mode === 'sandbox' ? debug.npcKind : undefined}
          onNpcKind={(k) => game()?.setNpcKind(k)}
          onFov={(fov) => setSettings((s) => ({ ...s, fov }))}
          blood={settings.blood}
          onBlood={(blood) => setSettings((s) => ({ ...s, blood }))}
          onMainMenu={() => setStarted(false)}
        />
      )}
      {intro && <Intro onDone={() => setIntro(false)} />}
    </>
  )
}
