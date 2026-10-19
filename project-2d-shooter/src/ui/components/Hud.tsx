import type { DebugStats, HudState } from '@game/events';

export function Hud({ hud, replaying }: { hud: HudState | null; replaying: boolean }) {
  if (!hud) return null;
  return (
    <div className="hud">
      <div className="hud-top-left">
        <span className="hud-floor">[{hud.floorLabel}]</span> {hud.biomeName}
      </div>
      <div className="hud-top-right">
        {replaying && <span className="hud-flag hud-replay">● REPLAY</span>}
        {hud.frozen && <span className="hud-flag">PAUSADO (F9 avança)</span>}
        {hud.god && <span className="hud-flag">GOD</span>}
        <span>seed {hud.seed}</span>
      </div>
      <div className="hud-bottom-left">
        <div className="hud-hp">
          <div className="hud-hp-bar" style={{ width: `${(100 * hud.hp) / hud.maxHp}%` }} />
          <span>
            {hud.hp}/{hud.maxHp}
          </span>
        </div>
        <div className="hud-focus" title="Foco (câmera lenta)">
          <div className={hud.slowmo ? 'hud-focus-bar is-active' : 'hud-focus-bar'} style={{ width: `${hud.focus * 100}%` }} />
        </div>
        <div className="hud-money">R$ {hud.money}</div>
        {hud.slowmo && <div className="hud-slowmo">CÂMERA LENTA</div>}
      </div>
      <div className="hud-bottom-right">
        <div className="hud-weapon">
          {hud.weaponName} <small>{hud.fireMode}</small>
        </div>
        <div className="hud-ammo">
          {hud.reloading ? 'RECARREGANDO…' : `${hud.ammo} / ${hud.magazine}`}
          {!hud.reloading && <small className={hud.reserve === 0 ? 'hud-reserve is-empty' : 'hud-reserve'}> +{hud.reserve}</small>}
        </div>
        {hud.attachments.length > 0 && <div className="hud-attachments">+ {hud.attachments.join(', ')}</div>}
        {hud.otherWeapon && <div className="hud-item">[roda] {hud.otherWeapon}</div>}
        <div className="hud-item">
          [Q] {hud.itemName} x{hud.itemCount}
        </div>
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
        `particle ${stats.particles}`,
        `timescl  ${stats.timeScale}`,
        `state    ${stats.playerState}`,
        `pos      ${stats.playerPos}`,
        `room     ${stats.room}`,
        '',
        'F4 god  F6 inimigo  F7 itens',
        'F8 congela  F9 passo  F10 replay',
      ].join('\n')}
    </pre>
  );
}
