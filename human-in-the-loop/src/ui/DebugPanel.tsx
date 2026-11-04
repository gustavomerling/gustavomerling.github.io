import type { DebugState, GameStats } from '../game/Game'
import { POSES } from '../game/npc/poses'

const fmt = (n: number) => n.toFixed(2).padStart(6)

/** Painel no canto superior esquerdo durante o jogo (tecla `). */
export function DebugPanel({ stats, debug }: { stats: GameStats | null; debug: DebugState }) {
  return (
    <div className="debug">
      {stats ? (
        <>
          <div className="debug-row">
            <b>{Math.round(stats.fps)} FPS</b> · física {stats.physicsMs.toFixed(1)} ms · render{' '}
            {stats.renderMs.toFixed(1)} ms · {stats.bodies} corpos
          </div>
          <div className="debug-row">
            pos {fmt(stats.player.x)} {fmt(stats.player.y)} {fmt(stats.player.z)} · {stats.player.speed.toFixed(1)} m/s
          </div>
          <div className="debug-row">
            {stats.player.grounded ? 'no chão' : 'no ar'}
            {stats.player.crouching ? ' · agachado' : ''}
          </div>
        </>
      ) : (
        <div className="debug-row">medindo…</div>
      )}
      <div className="debug-row">
        NPC força {Math.round(debug.npcStrength * 100)}% · pose {POSES[debug.npcPose].label} · equilíbrio{' '}
        {debug.npcBalance ? 'ligado' : 'desligado'}
      </div>
      {stats && (
        <div className="debug-row">
          NPC {stats.npc.state === 'standing' ? 'em pé' : 'caído'} · inclinação {stats.npc.tilt.toFixed(2)} rad · captura{' '}
          {fmt(stats.npc.captureForward)} frente {fmt(stats.npc.captureSide)} lado
        </div>
      )}
      <div className="debug-flags">
        <span className={debug.paused ? 'on warn' : ''}>P pausar física</span>
        <span className={debug.paused ? '' : 'off'}>. avançar 1 passo</span>
        <span className={debug.colliders ? 'on' : ''}>V colisores</span>
        <span>R resetar</span>
        <span>T soltar NPC</span>
        <span>[ ] força</span>
        <span>N pose</span>
        <span className={debug.npcBalance ? 'on' : ''}>K equilíbrio</span>
        <span>F/G empurrar</span>
        <span>` fechar</span>
      </div>
    </div>
  )
}
