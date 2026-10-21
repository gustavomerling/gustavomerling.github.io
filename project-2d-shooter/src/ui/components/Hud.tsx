import type { DebugStats, HudState, RunSummary } from '@game/events';
import { GunIcon } from './GunIcon';

export const formatTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

export function Hud({ hud, replaying, modeTag }: { hud: HudState | null; replaying: boolean; modeTag?: string }) {
  if (!hud) return null;
  const hpRatio = hud.hp / hud.maxHp;
  const low = hpRatio <= 0.3 && hud.hp > 0;
  // One pip per round when it fits; a plain bar for big magazines.
  const pips = hud.magazine <= 40;
  return (
    <div className="hud">
      {low && <div className="hud-vignette" />}
      <div className="hud-top-left">
        <span className="hud-floor">[{hud.floorLabel}]</span> {hud.biomeName}
        {hud.roomName !== '-' && <span className="hud-room"> · {hud.roomName}</span>}
      </div>
      <div className="hud-top-center">
        <span className="hud-stat">
          <b>{hud.kills}</b> abates
        </span>
        <span className="hud-stat">
          <b>{hud.headshots}</b> headshots
        </span>
        <span className="hud-stat">{formatTime(hud.time)}</span>
      </div>
      <div className="hud-top-right">
        {modeTag && <span className="hud-flag hud-mode">{modeTag}</span>}
        {replaying && <span className="hud-flag hud-replay">● REPLAY</span>}
        {hud.frozen && <span className="hud-flag">PAUSADO (F9 avança)</span>}
        {hud.god && <span className="hud-flag">GOD</span>}
        {hud.grid && <span className="hud-flag">GRADE (F2)</span>}
        <span>seed {hud.seed}</span>
      </div>
      <div className="hud-bottom-left">
        <div className={low ? 'hud-hp is-low' : 'hud-hp'}>
          <div className="hud-hp-bar" style={{ width: `${100 * hpRatio}%` }} />
          <span>
            {hud.hp}/{hud.maxHp}
          </span>
        </div>
        <div className="hud-focus" title="Foco (câmera lenta)">
          <div className={hud.slowmo ? 'hud-focus-bar is-active' : 'hud-focus-bar'} style={{ width: `${hud.focus * 100}%` }} />
        </div>
        {hud.slowmo && <div className="hud-slowmo">CÂMERA LENTA</div>}
      </div>
      <div className="hud-bottom-right">
        {hud.weapons.length > 1 && (
          <div className="hud-slots">
            {hud.weapons.map((w, i) => (
              <span key={i} className={w.active ? 'hud-slot is-active' : 'hud-slot'}>
                <small>{i + 1}</small> {w.name}
              </span>
            ))}
          </div>
        )}
        {hud.weaponModel && <GunIcon model={hud.weaponModel} attachments={hud.weaponAttachments} />}
        <div className="hud-weapon">
          {hud.weaponName} <small>{hud.fireMode}</small>
        </div>
        {hud.reload > 0 ? (
          <div className="hud-reload">
            <div className="hud-reload-bar" style={{ width: `${hud.reload * 100}%` }} />
            <span>RECARREGANDO</span>
          </div>
        ) : (
          <div className={hud.ammo === 0 ? 'hud-ammo is-empty' : 'hud-ammo'}>
            {hud.ammo} / {hud.magazine}
            {Number.isFinite(hud.reserve) && <small className={hud.reserve === 0 ? 'hud-reserve is-empty' : 'hud-reserve'}> +{hud.reserve}</small>}
          </div>
        )}
        {pips && (
          <div className="hud-pips">
            {Array.from({ length: hud.magazine }, (_, i) => (
              <i key={i} className={i < hud.ammo && hud.reload === 0 ? 'is-full' : ''} />
            ))}
          </div>
        )}
        {hud.attachments.length > 0 && <div className="hud-attachments">+ {hud.attachments.join(', ')}</div>}
      </div>
    </div>
  );
}

/** Keys, for the pause screen and the main menu. */
export function Controls() {
  const rows: [string, string][] = [
    ['A / D', 'andar'],
    ['Shift', 'correr'],
    ['Espaço / W', 'pular (de novo na parede: walljump)'],
    ['S', 'agachar · correndo: slide'],
    ['W / S na escada', 'subir / descer'],
    ['Mouse', 'mirar · clique: atirar'],
    ['R', 'recarregar'],
    ['1-4 · roda', 'trocar de arma'],
    ['F', 'pegar arma do chão · usar saída'],
    ['Q', 'chute'],
    ['E', 'câmera lenta'],
    ['Esc', 'pausa'],
  ];
  return (
    <dl className="controls">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>
            <kbd>{k}</kbd>
          </dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Score of the attempt, on the death screen. */
export function Summary({ s }: { s: RunSummary }) {
  const accuracy = s.shots > 0 ? Math.round((100 * s.hits) / s.shots) : 0;
  return (
    <div className="summary">
      <div>
        <b>{s.kills}</b>
        <span>abates</span>
      </div>
      <div>
        <b>{s.headshots}</b>
        <span>headshots</span>
      </div>
      <div>
        <b>{accuracy}%</b>
        <span>precisão</span>
      </div>
      <div>
        <b>{formatTime(s.time)}</b>
        <span>tempo</span>
      </div>
    </div>
  );
}

export function DebugPanel({ stats }: { stats: DebugStats | null }) {
  if (!stats) return null;
  return (
    <pre className="debug-panel">
      {[
        `fps      ${stats.fps}`,
        `steps    ${stats.steps}`,
        `entities ${stats.entities}`,
        `timescl  ${stats.timeScale}`,
        `state    ${stats.playerState}`,
        `pos      ${stats.playerPos}`,
        `room     ${stats.room}`,
        '',
        'F2 grade  F4 god  F6 inimigo',
        'F8 congela  F9 passo  F10 replay',
      ].join('\n')}
    </pre>
  );
}
