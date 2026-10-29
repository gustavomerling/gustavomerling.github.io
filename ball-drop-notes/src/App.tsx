import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_TIMBRE, ensureAudio, playUi, setMasterVolume } from './audio'
import { Hud, TransportBar } from './components/Bars'
import { ComposePanel, type GenerateRequest } from './components/ComposePanel'
import { Drawer } from './components/Drawer'
import { FilePanel, type Version } from './components/FilePanel'
import { Icon } from './components/Icon'
import { DrawHint, HelpOverlay, Toasts, Welcome } from './components/Overlays'
import { PianoDock, type Recording } from './components/PianoDock'
import { SelectionCard } from './components/SelectionCard'
import { SoundPanel } from './components/SoundPanel'
import { ToolsPanel } from './components/ToolsPanel'
import {
  isTypingTarget,
  type PanelId,
  scaleForNotes,
  STORAGE_VOLUME,
  STORAGE_WELCOME,
  storageGet,
  storageSet,
  type ToastItem,
  type ToastKind,
} from './components/ui'
import { createSim } from './engine'
import { generateTrack, TRACK_STYLES, validateTrack } from './generator'
import { NOTE_DEFAULT, SONGS, songMelody, suggestNextNotes } from './music'
import type { Selection, Settings, Sim, StartMode } from './types'

const SAVE_FILE_NAME = 'ball-drop-notes.json'
const REWIND_SECONDS = 5
const ZOOM_STEP = 1.25
const TOAST_MS = 2800
const DEFAULT_VOLUME = 0.8

const DEFAULT_SETTINGS: Settings = {
  running: false,
  showTrail: true,
  timbre: DEFAULT_TIMBRE,
  metronome: false,
  bpm: 100,
  snap: true,
}

const FINISH_MESSAGES = [
  'Chegou! Que música bonita.',
  'Fim da pista. Bravo!',
  'A bolinha chegou. Toca de novo? Aperte R.',
  'Que viagem! Aperte R para ouvir outra vez.',
]

const PANEL_TITLES: Record<PanelId, string> = {
  compose: 'Compor',
  sound: 'Som',
  tools: 'Ferramentas',
  file: 'Arquivo',
}

function readVolume() {
  const stored = Number(storageGet(STORAGE_VOLUME))
  return storageGet(STORAGE_VOLUME) !== null && Number.isFinite(stored)
    ? Math.min(1, Math.max(0, stored))
    : DEFAULT_VOLUME
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)]

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const barRef = useRef<HTMLElement>(null)
  const simRef = useRef<Sim | null>(null)

  // O motor lê as configurações por este ref a cada quadro. Toda mudança passa por patchSettings,
  // que atualiza o ref na hora (o motor vê imediatamente) e o estado (a interface redesenha).
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const patchSettings = useCallback((patch: Partial<Settings>) => {
    settingsRef.current = { ...settingsRef.current, ...patch }
    setSettings(settingsRef.current)
  }, [])

  const [selection, setSelection] = useState<Selection | null>(null)
  // Notas dos blocos antes do selecionado, para sugerir a próxima.
  const [previousNotes, setPreviousNotes] = useState<number[]>([])
  const [blockCount, setBlockCount] = useState(0)
  // Notas tocadas vão direto para o HUD (assinatura), sem redesenhar o App inteiro a cada quique.
  const noteListeners = useRef(new Set<(note: number) => void>())
  const subscribeNotes = useCallback((listener: (note: number) => void) => {
    const listeners = noteListeners.current
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }, [])
  const [scale, setScale] = useState(0)
  const [paint, setPaint] = useState<number | null>(null)
  const [startMode, setStartMode] = useState<StartMode>('suggest')
  const [loop, setLoop] = useState(false)
  const [sequence, setSequenceSong] = useState<number | null>(null)
  const [versions, setVersions] = useState<Version[]>([])
  const [volume, setVolume] = useState(readVolume)
  const volumeRef = useRef(volume)
  const [panel, setPanel] = useState<PanelId | null>(null)
  const [welcome, setWelcome] = useState(() => storageGet(STORAGE_WELCOME) !== '1')
  const [help, setHelp] = useState(false)
  const [drawHint, setDrawHint] = useState(false)
  const [piano, setPiano] = useState(false)
  const [recording, setRecording] = useState<Recording | null>(null)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const toastId = useRef(0)

  // ---------- Avisos ----------

  const dismissToast = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  // Mostra um aviso curto. Sucesso e erro tocam um som discreto da interface.
  const toast = useCallback(
    (text: string, kind: ToastKind = 'info') => {
      const id = ++toastId.current
      setToasts((list) => [...list.slice(-2), { id, text, kind }])
      if (kind === 'success') playUi('success')
      if (kind === 'error') playUi('error')
      window.setTimeout(() => dismissToast(id), kind === 'party' ? TOAST_MS * 1.6 : TOAST_MS)
    },
    [dismissToast],
  )

  // ---------- Motor ----------

  useEffect(() => {
    const { sim, destroy } = createSim(canvasRef.current!, () => settingsRef.current, {
      onSelection: (next) => {
        setSelection(next)
        const blocks = next ? (simRef.current?.getBlocks() ?? []) : []
        setPreviousNotes(
          blocks
            .slice(0, next?.index ?? 0)
            .filter((b) => !b.finish)
            .map((b) => b.note),
        )
      },
      onPause: () => {
        // O motor pausou sozinho (chegada, rebobinar): o ref precisa mudar já, no mesmo instante.
        patchSettings({ running: false })
      },
      onNote: (note) => noteListeners.current.forEach((listener) => listener(note)),
      onFinish: () => toast(pick(FINISH_MESSAGES), 'party'),
      onBlocksChange: setBlockCount,
    })
    simRef.current = sim
    return () => {
      simRef.current = null
      destroy()
    }
  }, [patchSettings, toast])

  useEffect(() => {
    simRef.current?.setScaleIndex(scale)
  }, [scale])

  useEffect(() => {
    simRef.current?.setPaint(paint)
  }, [paint])

  useEffect(() => {
    simRef.current?.setStartMode(startMode)
  }, [startMode])

  useEffect(() => {
    simRef.current?.setLoop(loop)
  }, [loop])

  useEffect(() => {
    volumeRef.current = volume
    setMasterVolume(volume)
  }, [volume])

  // O navegador só libera o áudio depois de uma interação: a primeira, em qualquer lugar, libera.
  useEffect(() => {
    const unlock = () => {
      ensureAudio()
      setMasterVolume(volumeRef.current)
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
    window.addEventListener('pointerdown', unlock, true)
    window.addEventListener('keydown', unlock, true)
    return () => {
      window.removeEventListener('pointerdown', unlock, true)
      window.removeEventListener('keydown', unlock, true)
    }
  }, [])

  // A altura da barra de baixo vira uma variável CSS, para os painéis não ficarem por cima dela.
  useEffect(() => {
    const bar = barRef.current
    if (!bar || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(() => {
      document.documentElement.style.setProperty('--bar-h', `${Math.ceil(bar.getBoundingClientRect().height)}px`)
    })
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  // ---------- Ações ----------

  const pause = () => {
    if (settingsRef.current.running) patchSettings({ running: false })
  }

  const play = () => {
    ensureAudio()
    patchSettings({ running: true })
  }

  const togglePlay = () => {
    if (settingsRef.current.running) pause()
    else play()
  }

  const reset = () => {
    playUi('click')
    simRef.current?.reset()
  }

  const step = () => {
    ensureAudio()
    pause()
    simRef.current?.step()
  }

  const rewind = () => {
    playUi('click')
    simRef.current?.rewind(REWIND_SECONDS)
  }

  const undo = () => {
    pause()
    playUi('click')
    simRef.current?.undo()
  }

  const fit = () => {
    playUi('click')
    simRef.current?.fitView()
  }

  // Carrega blocos de um texto salvo (arquivo, exemplo, versão), pausando antes.
  const loadDrawing = (text: string, success: string, failure: string) => {
    const sim = simRef.current
    if (!sim) return
    pause()
    if (sim.importDrawing(text)) {
      sim.fitView()
      toast(success, 'success')
    } else {
      toast(failure, 'error')
    }
  }

  // Gera a pista para a melodia, ajusta tempo e escala e solta a bolinha.
  const playTrack = (request: GenerateRequest) => {
    const sim = simRef.current
    if (!sim) return
    pause()
    const segments = generateTrack(request.melody, {
      bpm: request.bpm,
      style: request.style,
      finish: request.finish,
    })
    if (!sim.loadBlocks(segments)) {
      toast('Não deu para gerar a pista. Tente de novo.', 'error')
      return
    }
    patchSettings({ bpm: request.bpm })
    setScale(request.scaleIndex)
    sim.setScaleIndex(request.scaleIndex)
    setPanel(null)
    setDrawHint(false)
    // Confere a pista com a física real, para dizer o quanto ela está no tempo.
    const report = validateTrack(request.melody, segments, request.bpm)
    const timing = report.hits === report.expected ? ` No tempo: ±${Math.round(report.maxErrorMs)} ms.` : ''
    toast(`${request.title}: ${request.melody.notes.length} notas.${timing} Lá vai!`, 'success')
    play()
  }

  // Uma música conhecida, num estilo de pista sorteado.
  const listenExample = () => {
    const song = pick(SONGS)
    if (!song) return
    const melody = songMelody(song)
    playTrack({
      melody,
      bpm: song.bpm,
      scaleIndex: scaleForNotes(melody.notes),
      style: pick(TRACK_STYLES)?.value ?? 'zigzag',
      finish: true,
      title: song.title,
    })
  }

  const dismissWelcome = () => {
    setWelcome(false)
    storageSet(STORAGE_WELCOME, '1')
  }

  const togglePanel = (id: PanelId) => {
    playUi('click')
    setHelp(false)
    setPanel((current) => (current === id ? null : id))
  }

  const saveFile = () => {
    const text = simRef.current?.exportDrawing() ?? ''
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = SAVE_FILE_NAME
    link.click()
    URL.revokeObjectURL(url)
    toast('Arquivo salvo.', 'success')
  }

  // Sugestões de nota para o bloco selecionado, a partir das notas dos blocos anteriores.
  const suggestions = useMemo(
    () => (selection && !selection.finish ? suggestNextNotes(previousNotes, scale, 4) : []),
    [selection, previousNotes, scale],
  )

  // ---------- Teclado ----------
  // O motor já trata Ctrl+Z e Delete/Backspace; o PianoDock trata as teclas do piano
  // (A W S E D F T G Y H U J K O L P ; e Z/X para a oitava). Aqui ficam os atalhos que não brigam com elas.

  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Escape') {
        if (help) setHelp(false)
        else if (welcome) dismissWelcome()
        else if (drawHint) setDrawHint(false)
        else if (panel) setPanel(null)
        else if (piano) setPiano(false)
        else simRef.current?.deselect()
        return
      }
      if (isTypingTarget(e.target) || welcome || e.repeat) return
      if (help && e.key !== '?') return
      switch (e.key) {
        case ' ': {
          e.preventDefault()
          // Tira o foco do botão, para o Espaço não "clicar" nele também.
          if (document.activeElement instanceof HTMLElement) document.activeElement.blur()
          togglePlay()
          break
        }
        case 'r':
        case 'R':
          reset()
          break
        case '0':
          fit()
          break
        case '+':
        case '=':
          simRef.current?.zoomBy(ZOOM_STEP)
          break
        case '-':
        case '_':
          simRef.current?.zoomBy(1 / ZOOM_STEP)
          break
        case '.':
          step()
          break
        case ',':
          rewind()
          break
        case '?':
          setHelp((on) => !on)
          break
      }
    }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => keyHandler.current(e)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const { running, showTrail, timbre, metronome, bpm, snap } = settings
  const showEmptyHint = blockCount === 0 && !welcome && !drawHint && panel === null && !running && !piano

  const togglePiano = () => {
    playUi('click')
    setPiano((on) => !on)
  }

  return (
    <div className="app" data-panel-open={panel !== null} data-piano-open={piano}>
      <canvas ref={canvasRef} className="stage" />

      <Hud
        subscribeNotes={subscribeNotes}
        blockCount={blockCount}
        bpm={bpm}
        running={running}
        paint={paint}
        loop={loop}
        onPaintOff={() => {
          playUi('toggle')
          setPaint(null)
        }}
        onBpm={() => togglePanel('sound')}
      />

      {selection && (
        <SelectionCard
          selection={selection}
          scale={scale}
          bpm={bpm}
          suggestions={suggestions}
          onNote={(note) => {
            simRef.current?.setNote(note)
            simRef.current?.previewNote(note)
          }}
          onFinish={(finish) => {
            playUi('toggle')
            pause()
            simRef.current?.setFinish(finish)
          }}
          onDelete={() => {
            pause()
            simRef.current?.deleteSelected()
          }}
          onClose={() => simRef.current?.deselect()}
        />
      )}

      {showEmptyHint && (
        <div className="empty-hint">
          <span>Arraste no espaço vazio para desenhar um bloco</span>
          <span className="empty-hint-or">ou</span>
          <button type="button" className="btn btn-small btn-primary" onClick={() => togglePanel('compose')}>
            <Icon name="sparkle" size={16} />
            Compor uma pista
          </button>
        </div>
      )}

      <Drawer
        id="panel-compose"
        title={PANEL_TITLES.compose}
        icon="compose"
        open={panel === 'compose'}
        onClose={() => setPanel(null)}
      >
        <ComposePanel
          timbre={timbre}
          recording={recording}
          onOpenPiano={() => {
            playUi('click')
            setPanel(null)
            setPiano(true)
          }}
          onGenerate={playTrack}
          onPreviewNote={(note) => {
            ensureAudio()
            simRef.current?.previewNote(note)
          }}
        />
      </Drawer>

      <Drawer id="panel-sound" title={PANEL_TITLES.sound} icon="sound" open={panel === 'sound'} onClose={() => setPanel(null)}>
        <SoundPanel
          volume={volume}
          onVolume={(v) => {
            setVolume(v)
            storageSet(STORAGE_VOLUME, String(v))
          }}
          timbre={timbre}
          onTimbre={(t) => patchSettings({ timbre: t })}
          onTryTimbre={() => {
            ensureAudio()
            simRef.current?.previewNote(NOTE_DEFAULT + 7)
          }}
          bpm={bpm}
          onBpm={(v) => patchSettings({ bpm: v })}
          metronome={metronome}
          onMetronome={(on) => patchSettings({ metronome: on })}
        />
      </Drawer>

      <Drawer id="panel-tools" title={PANEL_TITLES.tools} icon="tools" open={panel === 'tools'} onClose={() => setPanel(null)}>
        <ToolsPanel
          scale={scale}
          onScale={setScale}
          startMode={startMode}
          onStartMode={setStartMode}
          snap={snap}
          onSnap={(on) => patchSettings({ snap: on })}
          showTrail={showTrail}
          onShowTrail={(on) => patchSettings({ showTrail: on })}
          paint={paint}
          onPaint={setPaint}
          sequence={sequence}
          onSequence={(index) => {
            const sim = simRef.current
            if (!sim) return
            pause()
            const song = index === null ? null : SONGS[index]
            if (!sim.setSequence(song ? song.midi : null)) {
              toast('Não deu para aplicar a música agora.', 'error')
              return
            }
            setSequenceSong(index)
            if (song) {
              // A música também define o tempo do metrônomo.
              patchSettings({ bpm: song.bpm })
              toast(`Blocos seguem "${song.title}" (${song.bpm} BPM).`, 'success')
            }
          }}
          loop={loop}
          onLoop={setLoop}
          onMarkLoop={() => {
            simRef.current?.markLoopStart()
            setLoop(true)
            toast('Início do trecho marcado. Loop ligado.', 'success')
          }}
          onTranspose={(semitones) => {
            pause()
            if (simRef.current?.transpose(semitones)) playUi('click')
            else toast('Assim alguma nota sairia do alcance (Dó3 a Dó6).', 'error')
          }}
          onPattern={(beats) => {
            pause()
            if (simRef.current?.addPattern(beats)) toast('Padrão acrescentado no fim da pista.', 'success')
            else toast('Não deu para acrescentar o padrão.', 'error')
          }}
          onClear={() => {
            pause()
            if (simRef.current?.clearBlocks()) toast('Pista apagada. Ctrl+Z desfaz.', 'info')
          }}
          blockCount={blockCount}
        />
      </Drawer>

      <Drawer id="panel-file" title={PANEL_TITLES.file} icon="file" open={panel === 'file'} onClose={() => setPanel(null)}>
        <FilePanel
          onSave={saveFile}
          onOpenText={(text) => loadDrawing(text, 'Desenho aberto.', 'Não foi possível abrir este arquivo.')}
          onExample={(text, label) => loadDrawing(text, `Exemplo "${label}" aberto.`, 'Não deu para abrir o exemplo.')}
          versions={versions}
          onSaveVersion={() => {
            const text = simRef.current?.exportDrawing() ?? ''
            const label = `Versão ${versions.length + 1}`
            const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            setVersions((list) => [...list, { label, time, text, blocks: blockCount }])
            toast(`${label} guardada.`, 'success')
          }}
          onLoadVersion={(v) => loadDrawing(v.text, `${v.label} carregada.`, 'Não deu para carregar a versão.')}
        />
      </Drawer>

      <PianoDock
        open={piano}
        enabled={!welcome && !help}
        timbre={timbre}
        onTimbre={(t) => patchSettings({ timbre: t })}
        bpm={bpm}
        onBpm={(v) => patchSettings({ bpm: v })}
        onClose={() => setPiano(false)}
        onRecorded={(take) => {
          setRecording(take)
          setPiano(false)
          setPanel('compose')
          toast(`Gravei ${take.faithful.notes.length} notas. Sua melodia está no Compor!`, 'success')
        }}
      />

      <TransportBar
        barRef={barRef}
        piano={piano}
        onPiano={togglePiano}
        running={running}
        onToggle={togglePlay}
        onReset={reset}
        onStep={step}
        onRewind={rewind}
        onUndo={undo}
        onFit={fit}
        panel={panel}
        onPanel={togglePanel}
        onHelp={() => {
          playUi('click')
          setHelp(true)
        }}
      />

      {drawHint && <DrawHint onClose={() => setDrawHint(false)} />}

      <Toasts toasts={toasts} onDismiss={dismissToast} />

      {help && (
        <HelpOverlay
          onClose={() => setHelp(false)}
          onWelcome={() => {
            setHelp(false)
            setWelcome(true)
          }}
        />
      )}

      {welcome && (
        <Welcome
          onClose={dismissWelcome}
          onChoose={(path) => {
            dismissWelcome()
            if (path === 'compose') setPanel('compose')
            else if (path === 'draw') setDrawHint(true)
            else listenExample()
          }}
        />
      )}
    </div>
  )
}

export default App
