import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { playSfx, setMuted } from './game/audio'
import { isMapUnlocked, MAPS } from './game/maps'
import { music } from './game/music/player'
import { clearedMaps, loadSave, writeSave, EMPTY_SAVE, type SaveData } from './game/save'
import { SHOP_BY_ID } from './game/shop/upgrades'
import type { DiscoveryKind, RunResult } from './game/types'
import { APPS, type AppId } from './os/apps'
import { ManagedWindow } from './os/ManagedWindow'
import { useWindowManager, type Area } from './os/useWindowManager'
import { BootScreen } from './screens/BootScreen'
import { CreditsScreen } from './screens/CreditsScreen'
import { GameScreen } from './screens/GameScreen'
import { GlossaryScreen } from './screens/GlossaryScreen'
import { HelpScreen } from './screens/HelpScreen'
import { MapSelectScreen } from './screens/MapSelectScreen'
import { RecycleDialog } from './screens/RecycleDialog'
import { ResultsScreen } from './screens/ResultsScreen'
import { ShopScreen } from './screens/ShopScreen'
import { WelcomeScreen } from './screens/WelcomeScreen'
import { Desktop, DesktopIcon } from './ui/Desktop'
import { Icon } from './ui/Icon'
import type { StartMenuEntry } from './ui/StartMenu'

export function App() {
  const [booted, setBooted] = useState(false)
  if (!booted) return <BootScreen onDone={() => setBooted(true)} />
  return <Shell onShutDown={() => setBooted(false)} />
}

/** The desktop "OS": window manager, save data and every app window. */
function Shell({ onShutDown }: { onShutDown(): void }) {
  const [save, setSave] = useState<SaveData>(loadSave)
  const [lastResult, setLastResult] = useState<RunResult | null>(null)
  const [unlockedMap, setUnlockedMap] = useState<string | undefined>()
  const [mapId, setMapId] = useState(MAPS[0].id)
  // remounts the game for each new run
  const [runId, setRunId] = useState(0)
  const areaRef = useRef<HTMLDivElement>(null)
  const [area, setArea] = useState<Area>({ width: window.innerWidth, height: window.innerHeight - 28 })
  const wm = useWindowManager(area)
  const { open, close } = wm

  useEffect(() => writeSave(save), [save])
  useEffect(() => setMuted(save.muted), [save.muted])
  useEffect(() => music.setMuted(save.musicMuted), [save.musicMuted])

  useLayoutEffect(() => {
    const el = areaRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      setArea({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // greet with the Welcome window
  useEffect(() => open('welcome'), [open])

  const isOpen = (id: AppId) => wm.windows.some((w) => w.id === id)

  const gameOpen = wm.windows.some((w) => w.id === 'game')

  /** pointer.exe / Start Run: back to the run in progress, or pick a map. */
  const startRun = useCallback(() => {
    if (gameOpen) return open('game')
    open('maps')
  }, [gameOpen, open])

  const launchMap = useCallback(
    (id: string) => {
      if (gameOpen) return open('game')
      close('results')
      close('maps')
      setMapId(id)
      setRunId((n) => n + 1)
      open('game')
    },
    [gameOpen, open, close],
  )

  const finishRun = useCallback(
    (r: RunResult) => {
      setLastResult(r)
      const before = clearedMaps(save)
      const after = r.victory && !before.includes(r.mapId) ? [...before, r.mapId] : before
      const newlyOpen = MAPS.find((m) => !isMapUnlocked(m, before) && isMapUnlocked(m, after))
      setUnlockedMap(newlyOpen?.id)
      setSave((s) => {
        const rec = s.maps[r.mapId] ?? { bestTime: 0, clears: 0 }
        return {
          ...s,
          kb: s.kb + r.earned,
          runs: s.runs + 1,
          bestTime: Math.max(s.bestTime, r.time),
          bestKills: Math.max(s.bestKills, r.kills),
          totalKills: s.totalKills + r.kills,
          maps: {
            ...s.maps,
            [r.mapId]: r.victory
              ? { clears: rec.clears + 1, bestTime: rec.bestTime ? Math.min(rec.bestTime, r.time) : r.time }
              : rec,
          },
        }
      })
      close('game')
      open('results')
    },
    [save, open, close],
  )

  const discover = useCallback((kind: DiscoveryKind, id: string) => {
    const key = `${kind}:${id}`
    setSave((s) => (s.discovered.includes(key) ? s : { ...s, discovered: [...s.discovered, key] }))
  }, [])

  const buy = useCallback((id: string) => {
    setSave((s) => {
      const def = SHOP_BY_ID[id]
      const level = s.shop[id] ?? 0
      if (!def || level >= def.maxLevel) return s
      const cost = def.cost(level)
      if (s.kb < cost) return s
      playSfx('buy')
      return { ...s, kb: s.kb - cost, shop: { ...s.shop, [id]: level + 1 } }
    })
  }, [])

  const refundAll = useCallback(() => {
    setSave((s) => {
      let back = 0
      for (const [id, level] of Object.entries(s.shop)) {
        const def = SHOP_BY_ID[id]
        if (!def) continue
        for (let l = 0; l < level; l++) back += def.cost(l)
      }
      return { ...s, kb: s.kb + back, shop: {} }
    })
  }, [])

  const resetSave = useCallback(() => setSave((s) => ({ ...EMPTY_SAVE, muted: s.muted })), [])
  const toggleMute = useCallback(() => setSave((s) => ({ ...s, muted: !s.muted })), [])
  const toggleMusic = useCallback(() => setSave((s) => ({ ...s, musicMuted: !s.musicMuted })), [])

  function renderApp(id: AppId) {
    switch (id) {
      case 'welcome':
        return <WelcomeScreen save={save} onOpen={open} onStartRun={startRun} />
      case 'maps':
        return <MapSelectScreen save={save} onStart={launchMap} onClose={() => close('maps')} />
      case 'help':
        return <HelpScreen onClose={() => close('help')} />
      case 'glossary':
        return <GlossaryScreen discovered={save.discovered} onClose={() => close('glossary')} />
      case 'shop':
        return <ShopScreen save={save} onBuy={buy} onRefundAll={refundAll} onClose={() => close('shop')} />
      case 'game':
        return (
          <GameScreen
            key={runId}
            mapId={mapId}
            shop={save.shop}
            discovered={save.discovered}
            active={wm.activeId === 'game'}
            onEnd={finishRun}
            onDiscover={discover}
          />
        )
      case 'results':
        return lastResult ? (
          <ResultsScreen
            result={lastResult}
            save={save}
            unlockedMap={unlockedMap}
            onAgain={() => launchMap(unlockedMap ?? lastResult.mapId)}
            onMaps={() => open('maps')}
            onShop={() => open('shop')}
            onMenu={() => {
              close('results')
              open('welcome')
            }}
          />
        ) : null
      case 'credits':
        return <CreditsScreen onClose={() => close('credits')} />
      case 'recycle':
        return <RecycleDialog onConfirm={resetSave} onClose={() => close('recycle')} />
    }
  }

  const startItems: StartMenuEntry[] = [
    { label: 'Credits...', icon: 'license', onSelect: () => open('credits'), bold: true },
    'separator',
    { label: isOpen('game') ? 'Back to run' : 'New Run...', icon: 'cursor', onSelect: startRun },
    { label: 'My Computer', icon: 'computer', onSelect: () => open('maps') },
    { label: 'Welcome', icon: 'computer', onSelect: () => open('welcome') },
    { label: 'Control Panel', icon: 'controlPanel', onSelect: () => open('shop') },
    { label: 'Glossary', icon: 'bug', onSelect: () => open('glossary') },
    { label: 'Help', icon: 'help', onSelect: () => open('help') },
    'separator',
    { label: 'Shut Down...', icon: 'computer', onSelect: onShutDown },
  ]

  const icons = (
    <>
      <DesktopIcon icon="computer" label="My Computer" onOpen={() => open('maps')} />
      <DesktopIcon icon="cursor" label="pointer.exe" onOpen={startRun} />
      <DesktopIcon icon="controlPanel" label="Control Panel" onOpen={() => open('shop')} />
      <DesktopIcon icon="bug" label="Glossary" onOpen={() => open('glossary')} />
      <DesktopIcon icon="help" label="Help" onOpen={() => open('help')} />
      <DesktopIcon icon="recycle" label="Recycle Bin" onOpen={() => open('recycle')} />
    </>
  )

  const tray = (
    <>
      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }} title="Memory (currency)">
        <Icon name="ram" /> {save.kb} KB
      </span>
      <button
        type="button"
        onClick={toggleMusic}
        title={save.musicMuted ? 'Music off' : 'Music on'}
        aria-label="Toggle music"
        style={{ opacity: save.musicMuted ? 0.35 : 1 }}
      >
        <Icon name="note" />
      </button>
      <button type="button" onClick={toggleMute} title={save.muted ? 'Unmute' : 'Mute'} aria-label="Toggle sound">
        <span style={{ fontSize: 13, filter: 'grayscale(1)' }}>{save.muted ? '🔇' : '🔊'}</span>
      </button>
    </>
  )

  return (
    <Desktop
      areaRef={areaRef}
      icons={icons}
      tasks={wm.windows.map((w) => ({ id: w.id, label: APPS[w.id].label, icon: APPS[w.id].icon, active: w.id === wm.activeId }))}
      onTask={(id) => wm.toggleFromTaskbar(id as AppId)}
      startItems={startItems}
      tray={tray}
    >
      {wm.windows.map((w) => (
        <ManagedWindow key={w.id} win={w} wm={wm} area={area}>
          {renderApp(w.id)}
        </ManagedWindow>
      ))}
    </Desktop>
  )
}
