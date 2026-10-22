import { useEffect, useRef, useState } from 'react';
import { RUN_MODES, type RunModeId } from '@game/content/modes/catalog';
import type { DebugStats, HudState, RunSummary } from '@game/events';
import { GameSession, type SessionOptions } from '@game/session';
import { Controls, DebugPanel, HINT_SECONDS, Hud, Summary } from '../components/Hud';
import { Menu, Panel } from '../components/Menu';
import { OptionsMenu } from '../components/Options';

/** First-play hints: shown at the start of the first few runs of each mode. */
const HINT_RUNS = 3;
const HINT_KEY = 'shooter2d.hintRuns';
const HINTS: Record<RunModeId, string[]> = {
  campaign: [
    'A / D andar · Shift correr · Espaço pular',
    'Mouse mira · clique atira · R recarrega',
    'S agacha ou desliza · E câmera lenta · Esc pausa',
    'Siga para a direita até a SAÍDA →',
  ],
  zombie: [
    'A / D andar · Shift correr · Espaço pular',
    'Só tiro na cabeça mata · tiro na perna derruba',
    'Eles vêm de trás: siga para a SAÍDA →',
  ],
  medieval: [
    'A / D andar · Espaço pular',
    'Clique esquerdo golpeia (de novo: combo)',
    'Direito levanta o escudo · na hora do golpe: apara',
  ],
};

function hintRunsSeen(): Partial<Record<RunModeId, number>> {
  try {
    const seen: unknown = JSON.parse(localStorage.getItem(HINT_KEY) ?? '{}');
    return seen && typeof seen === 'object' ? (seen as Partial<Record<RunModeId, number>>) : {};
  } catch {
    return {}; // No storage: show them every time.
  }
}

/** Hints for this run, or null once the player has seen them HINT_RUNS times (counted per mode). */
function firstPlayHints(mode: RunModeId): string[] | null {
  const count = hintRunsSeen()[mode];
  return typeof count === 'number' && count >= HINT_RUNS ? null : HINTS[mode];
}

function markHintsSeen(mode: RunModeId): void {
  try {
    const seen = hintRunsSeen();
    localStorage.setItem(HINT_KEY, JSON.stringify({ ...seen, [mode]: (seen[mode] ?? 0) + 1 }));
  } catch {
    // Ignore: storage full or blocked.
  }
}

interface Props {
  mode: RunModeId;
  onQuitRun: () => void;
  /** Seed, starting grid and prefs store chosen on the main menu (App remounts this screen per run). */
  session?: Omit<SessionOptions, 'mode'>;
}

/** Hosts the canvas + GameSession, and the React overlays (HUD, pause). */
export function GameScreen({ mode, onQuitRun, session: sessionOptions }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [debug, setDebug] = useState<DebugStats | null>(null);
  const [paused, setPaused] = useState(false);
  /** Pause sub-page: the pause list or "Opções". */
  const [pauseView, setPauseView] = useState<'main' | 'options'>('main');
  const [dead, setDead] = useState<RunSummary | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [cleared, setCleared] = useState<RunSummary | null>(null);
  const modeDef = RUN_MODES.get(mode);
  const [hints, setHints] = useState(() => firstPlayHints(mode));
  // Once shown in full, they don't come back on restarts or the next scenario.
  const hintsDone = hints !== null && hud !== null && hud.time >= HINT_SECONDS;
  const hintsCounted = useRef(false);
  useEffect(() => {
    if (!hintsDone) return;
    setHints(null);
    if (!hintsCounted.current) {
      hintsCounted.current = true;
      markHintsSeen(mode);
    }
  }, [hintsDone, mode]);
  /** Death or exit in progress: don't stack the pause menu on top of it. */
  const endingRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const session = new GameSession(canvas, { ...sessionOptions, mode });
    sessionRef.current = session;
    let deathTimer = 0;
    const offs = [
      session.bus.on('hud', setHud),
      session.bus.on('debug', setDebug),
      session.bus.on('replay', setReplaying),
      session.bus.on('ui:pause', () => {
        if (endingRef.current) return;
        session.pause();
        setPaused(true);
      }),
      session.bus.on('level:exit', (summary) => {
        endingRef.current = true;
        session.pause();
        setCleared(summary);
      }),
      session.bus.on('run:over', (summary) => {
        endingRef.current = true;
        // Let the death play out in slow motion for a moment, then freeze.
        deathTimer = window.setTimeout(() => {
          session.pause();
          setDead(summary);
        }, 900);
      }),
    ];
    // Alt-Tab / click outside: pause instead of dying unattended.
    const onBlur = () => {
      if (session.isPaused || endingRef.current) return;
      session.pause();
      setPaused(true);
    };
    window.addEventListener('blur', onBlur);
    session.start();
    canvas.focus();
    return () => {
      window.removeEventListener('blur', onBlur);
      window.clearTimeout(deathTimer);
      offs.forEach((off) => off());
      session.dispose();
      sessionRef.current = null;
    };
    // `session` options are fixed per mount (App keys this screen by run).
  }, [mode]);

  const resume = () => {
    sessionRef.current?.resume();
    setPaused(false);
    setPauseView('main');
    canvasRef.current?.focus();
  };

  const nextLevel = () => {
    endingRef.current = false;
    setCleared(null);
    resume();
  };

  const retry = () => {
    endingRef.current = false;
    sessionRef.current?.restart();
    setDead(null);
    canvasRef.current?.focus();
  };

  // Quick retry on the death screen: R, like reloading.
  useEffect(() => {
    if (!dead) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyR' || e.repeat) return;
      e.preventDefault();
      endingRef.current = false;
      sessionRef.current?.restart();
      setDead(null);
      canvasRef.current?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dead]);

  return (
    <div className="screen game">
      <canvas ref={canvasRef} className={paused || dead || cleared ? 'game-canvas' : 'game-canvas no-cursor'} tabIndex={0} />
      {dead && (
        <div className="pause-overlay">
          <Panel kicker={modeDef.tag} title={modeDef.deathTitle} tone="danger">
            <Summary s={dead} />
            <Menu
              items={[
                {
                  id: 'retry',
                  label: 'Tentar de novo',
                  description: 'Mesma seed: o mesmo mapa, os inimigos de volta. Atalho: R.',
                  onSelect: retry,
                },
                { id: 'quit', label: 'Menu principal', description: 'Volta à escolha de modo.', onSelect: onQuitRun },
              ]}
            />
          </Panel>
        </div>
      )}
      {cleared && (
        <div className="pause-overlay">
          <Panel kicker="Fase concluída" title="Saída alcançada" tone="accent">
            <Summary s={cleared} />
            <Menu
              onBack={nextLevel}
              items={[
                { id: 'next', label: 'Próximo cenário', description: 'Carrega o próximo trecho da run.', onSelect: nextLevel },
                { id: 'quit', label: 'Menu principal', description: 'Abandona a run e volta ao menu.', onSelect: onQuitRun },
              ]}
            />
          </Panel>
        </div>
      )}
      <Hud hud={hud} replaying={replaying} modeTag={mode === 'campaign' ? undefined : modeDef.tag} hints={hints} />
      <DebugPanel stats={debug} />
      {paused && (
        <div className="pause-overlay">
          <Panel kicker={modeDef.tag} title={pauseView === 'options' ? 'Opções' : 'Pausa'}>
            <div className="pause-columns">
              {pauseView === 'options' ? (
                <OptionsMenu onBack={() => setPauseView('main')} />
              ) : (
                <Menu
                  onBack={resume}
                  items={[
                    { id: 'resume', label: 'Continuar', description: 'Volta ao jogo (Esc).', onSelect: resume },
                    {
                      id: 'restart',
                      label: 'Reiniciar',
                      description: 'Recomeça a run com a mesma seed.',
                      onSelect: () => {
                        setPaused(false);
                        retry();
                      },
                    },
                    {
                      id: 'options',
                      label: 'Opções',
                      description: 'Volume, sons, tremor, pausa no impacto e partículas.',
                      onSelect: () => setPauseView('options'),
                    },
                    { id: 'quit', label: 'Abandonar run', description: 'Volta ao menu principal.', onSelect: onQuitRun },
                  ]}
                />
              )}
              <Controls />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
