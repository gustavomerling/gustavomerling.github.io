import type { DebugState, GameStats } from '../game/Game'
import type { NpcDebug } from '../game/npc/Npc'
import { POSES } from '../game/npc/poses'

const AI_LABEL: Record<string, string> = {
  idle: 'ocioso',
  alert: 'alerta',
  threatened: 'ameaçado',
  dodging: 'esquivando',
  fleeing: 'fugindo',
  cover: 'na cobertura',
  walkTo: 'indo ao ponto',
  body: 'corpo no controle',
}

function npcStateLabel(n: NpcDebug) {
  switch (n.state) {
    case 'standing':
      return (n.stepping ? 'dando passo' : 'em pé') + (n.staggered ? ' (atordoado)' : '')
    case 'falling':
      return 'caindo'
    case 'down':
      return 'no chão'
    case 'gettingUp':
      return `levantando (${n.getUpStage})`
    case 'unconscious':
      return n.outCold ? 'inconsciente' : 'desmaiado'
    case 'crawling':
      return 'rastejando'
  }
}

const REGION_LABEL: Record<string, string> = {
  head: 'cabeça',
  torso: 'tronco',
  armL: 'braço E',
  armR: 'braço D',
  legL: 'perna E',
  legR: 'perna D',
}

/** Barras de integridade por região + dor. */
function Health({ n }: { n: NpcDebug }) {
  return (
    <div className="health">
      {Object.entries(n.health).map(([r, h]) => (
        <div key={r} className="health-row">
          <span>{REGION_LABEL[r]}</span>
          <i>
            <b style={{ width: `${h}%`, background: h > 60 ? '#9bc47a' : h > 30 ? '#e8b931' : '#e8742c' }} />
          </i>
          <em>{Math.round(h)}</em>
        </div>
      ))}
      <div className="health-row">
        <span>dor</span>
        <i>
          <b style={{ width: `${n.pain * 100}%`, background: '#c8607a' }} />
        </i>
        <em>{Math.round(n.pain * 100)}</em>
      </div>
    </div>
  )
}

const fmt = (n: number) => n.toFixed(2).padStart(6)

/** Painel no canto superior esquerdo durante o jogo (tecla `). */
export function DebugPanel({ stats, debug }: { stats: GameStats | null; debug: DebugState }) {
  return (
    <div className="debug">
      <div className="debug-head">
        <span>telemetria</span>
        <span>` fecha</span>
      </div>
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
          NPC {npcStateLabel(stats.npc)} ·{' '}
          {stats.npc.steps} passos · inclinação {stats.npc.tilt.toFixed(2)} rad · captura{' '}
          {fmt(stats.npc.captureForward)} frente {fmt(stats.npc.captureSide)} lado
        </div>
      )}
      {stats && (
        <div className="debug-row">
          IA <b>{AI_LABEL[stats.brain.ai]}</b> · {stats.brain.sees ? 'vê o jogador' : 'não vê'}
          {stats.brain.aimed ? ' · mirado' : ''} · ameaça {stats.brain.threat.toFixed(2)}
          {stats.brain.reflex ? ` · reflexo: ${stats.brain.reflex}` : ''}
          {stats.npc.grip ? ` · ${stats.npc.grip}` : ''}
        </div>
      )}
      {stats && <Health n={stats.npc} />}
      <div className="debug-flags">
        <span className={debug.paused ? 'on warn' : ''}>P pausar física</span>
        <span className={debug.paused ? '' : 'off'}>. avançar 1 passo</span>
        <span className={debug.colliders ? 'on' : ''}>V colisores</span>
        <span>R resetar</span>
        <span>T soltar NPC</span>
        <span>[ ] força</span>
        <span>N pose</span>
        <span className={debug.npcBalance ? 'on' : ''}>K equilíbrio</span>
        <span className={debug.npcAutoGetUp ? 'on' : ''}>L levantar</span>
        <span className={debug.npcLook ? 'on' : ''}>O olhar</span>
        <span className={debug.npcAi ? 'on' : ''}>I IA</span>
        <span>M ir ao ponto</span>
        <span>F/G empurrar</span>
      </div>
    </div>
  )
}
