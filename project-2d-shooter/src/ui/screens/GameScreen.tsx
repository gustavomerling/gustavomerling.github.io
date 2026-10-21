import { useEffect, useRef, useState } from 'react';
import { RUN_MODES, type RunModeId } from '@game/content/modes/catalog';
import type { DebugStats, HudState, RunSummary } from '@game/events';
import { GameSession } from '@game/session';
import { Controls, DebugPanel, Hud, Summary } from '../components/Hud';
import { Menu, Panel } from '../components/Menu';

interface Props {
  mode: RunModeId;
  onQuitRun: () => void;
}

/** Hosts the canvas + GameSession, and the React overlays (HUD, pause). */
export function GameScreen({ mode, onQuitRun }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<GameSession | null>(null);
  const [hud, setHud] = useState<HudState | null>(null);
  const [debug, setDebug] = useState<DebugStats | null>(null);
  const [paused, setPaused] = useState(false);
  const [dead, setDead] = useState<RunSummary | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [cleared, setCleared] = useState<RunSummary | null>(null);
  const modeDef = RUN_MODES.get(mode);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const session = new GameSession(canvas, { mode });
    sessionRef.current = session;
    let deathTimer = 0;
    const offs = [
      session.bus.on('hud', setHud),
      session.bus.on('debug', setDebug),
      session.bus.on('replay', setReplaying),
      session.bus.on('ui:pause', () => {
        session.pause();
        setPaused(true);
      }),
      session.bus.on('level:exit', (summary) => {
        session.pause();
        setCleared(summary);
      }),
      session.bus.on('run:over', (summary) => {
        // Let the death play out in slow motion for a moment, then freeze.
        deathTimer = window.setTimeout(() => {
          session.pause();
          setDead(summary);
        }, 900);
      }),
    ];
    session.start();
    canvas.focus();
    return () => {
      window.clearTimeout(deathTimer);
      offs.forEach((off) => off());
      session.dispose();
      sessionRef.current = null;
    };
  }, [mode]);

  const resume = () => {
    sessionRef.current?.resume();
    setPaused(false);
    canvasRef.current?.focus();
  };

  const nextLevel = () => {
    setCleared(null);
    resume();
  };

  const retry = () => {
    sessionRef.current?.restart();
    setDead(null);
    canvasRef.current?.focus();
  };

  return (
    <div className="screen game">
      <canvas ref={canvasRef} className={paused || dead || cleared ? 'game-canvas' : 'game-canvas no-cursor'} tabIndex={0} />
      {dead && (
        <div className="pause-overlay">
          <Panel kicker={modeDef.tag} title={modeDef.deathTitle} tone="danger">
            <Summary s={dead} />
            <Menu
              items={[
                { id: 'retry', label: 'Tentar de novo', description: 'Mesma seed: o mesmo mapa, os inimigos de volta.', onSelect: retry },
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
      <Hud hud={hud} replaying={replaying} modeTag={mode === 'campaign' ? undefined : modeDef.tag} />
      <DebugPanel stats={debug} />
      {paused && (
        <div className="pause-overlay">
          <Panel kicker={modeDef.tag} title="Pausa">
            <div className="pause-columns">
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
                  { id: 'quit', label: 'Abandonar run', description: 'Volta ao menu principal.', onSelect: onQuitRun },
                ]}
              />
              <Controls />
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}
