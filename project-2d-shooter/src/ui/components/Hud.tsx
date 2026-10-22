import type { DebugStats, HudState, RunSummary } from '@game/events';
import { GunIcon } from './GunIcon';

export const formatTime = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;

/** Seconds the first-play hints stay on screen at the start of a scenario. */
export const HINT_SECONDS = 12;

interface HudProps {
  hud: HudState | null;
  replaying: boolean;
  modeTag?: string;
  /** Control hints shown during the first seconds (first few runs only); null = none. */
  hints?: string[] | null;
}

export function Hud({ hud, replaying, modeTag, hints }: HudProps) {
  if (!hud) return null;
  const hpRatio = Math.max(0, hud.hp / hud.maxHp);
  const low = hpRatio <= 0.3 && hud.hp > 0;
  // One pip per round when it fits; a plain readout for big magazines.
  const pips = hud.magazine <= 40 && !hud.infinite && hud.stamina === null;
  const highHorde = hud.horde !== null && hud.horde.alive >= hud.horde.max * 0.75;
  return (
    <div className="hud">
      {low && <div className="hud-vignette" />}

      {/* Where: floor, area, progress to the exit. */}
      <div className="hud-block hud-top-left">
        <div className="hud-where">
          <span className="hud-floor">{hud.floorLabel}</span>
          <span className="hud-area">
            {hud.biomeName}
            {hud.roomName !== '-' && <span className="hud-room"> · {hud.roomName}</span>}
          </span>
        </div>
        <div className="hud-meter hud-progress" title="Caminho até a saída">
          <div className="hud-meter-track">
            <div className="hud-meter-fill" style={{ width: `${hud.progress * 100}%` }} />
          </div>
          <span className="hud-meter-value">{hud.progress >= 1 ? 'SAÍDA' : `${Math.round(hud.progress * 100)}%`}</span>
        </div>
      </div>

      {/* Score: same-size stats, number over label. */}
      <div className="hud-top-center">
        <span className="hud-stat">
          <b>{hud.kills}</b>
          <small>abates</small>
        </span>
        <span className="hud-stat">
          <b>{hud.headshots}</b>
          <small>headshots</small>
        </span>
        <span className="hud-stat">
          <b>{formatTime(hud.time)}</b>
          <small>tempo</small>
        </span>
        {hud.horde && (
          <span className={highHorde ? 'hud-stat is-danger' : 'hud-stat'} title="Zumbis vivos / limite da horda">
            <b>
              {hud.horde.alive}
              <i>/{hud.horde.max}</i>
            </b>
            <small>{hud.horde.wave > 0 ? `vivos · onda ${hud.horde.wave}` : 'vivos'}</small>
          </span>
        )}
      </div>

      <div className="hud-top-right">
        <div className="hud-flags">
          {modeTag && <span className="hud-flag is-mode">{modeTag}</span>}
          {replaying && <span className="hud-flag is-danger">● REPLAY</span>}
          {hud.frozen && <span className="hud-flag is-debug">PAUSADO · F9 avança</span>}
          {hud.god && <span className="hud-flag is-debug">GOD</span>}
          {hud.grid && <span className="hud-flag">GRADE · F2</span>}
        </div>
        <span className="hud-seed">seed {hud.seed}</span>
      </div>

      {hud.horde?.grabbed ? (
        <div className="hud-prompt is-danger">
          AGARRADO! aperte A / D
          <div className="hud-grab-bar" style={{ width: `${hud.horde.struggle * 100}%` }} />
        </div>
      ) : hud.horde?.warning ? (
        <div className="hud-prompt is-danger">ELES ESTÃO VINDO</div>
      ) : (
        hud.prompt && <div className="hud-prompt">{hud.prompt}</div>
      )}
      {hints && hints.length > 0 && hud.time < HINT_SECONDS && (
        <div className={hud.time >= HINT_SECONDS - 2 ? 'hud-hints is-leaving' : 'hud-hints'}>
          {hints.map((h) => (
            <div key={h}>{h}</div>
          ))}
        </div>
      )}

      {/* Vitals: health and focus (bullet time). */}
      <div className="hud-block hud-bottom-left">
        <div className={low ? 'hud-meter hud-hp is-low' : 'hud-meter hud-hp'}>
          <span className="hud-meter-label">vida</span>
          <div className="hud-meter-track">
            <div className="hud-meter-fill" style={{ width: `${100 * hpRatio}%` }} />
          </div>
          <span className="hud-meter-value">{hud.hp}</span>
        </div>
        <div className={hud.slowmo ? 'hud-meter hud-focus is-active' : 'hud-meter hud-focus'} title="Foco (câmera lenta)">
          <span className="hud-meter-label">{hud.slowmo ? 'lento' : 'foco'}</span>
          <div className="hud-meter-track">
            <div className="hud-meter-fill" style={{ width: `${hud.focus * 100}%` }} />
          </div>
          <span className="hud-meter-value">E</span>
        </div>
      </div>

      {/* Arms: slots, the gun, its ammo (or shield stamina / reload). */}
      <div className="hud-block hud-bottom-right">
        {hud.weapons.length > 1 && (
          <div className="hud-slots">
            {hud.weapons.map((w, i) => (
              <span key={i} className={w.active ? 'hud-slot is-active' : 'hud-slot'} title={w.name}>
                {i + 1}
              </span>
            ))}
          </div>
        )}
        <div className="hud-gun">
          {hud.weaponModel && <GunIcon model={hud.weaponModel} attachments={hud.weaponAttachments} />}
          <div className="hud-weapon">
            <span className="hud-weapon-name">{hud.weaponName}</span>
            <small>{hud.fireMode}</small>
          </div>
        </div>
        <div className="hud-ammo-row">
          {hud.stamina !== null ? (
            <div className={hud.guardBroken ? 'hud-meter hud-stamina is-broken' : 'hud-meter hud-stamina'} title="Estamina do escudo">
              <span className="hud-meter-label">{hud.guardBroken ? 'quebrada' : 'escudo'}</span>
              <div className="hud-meter-track">
                <div className="hud-meter-fill" style={{ width: `${hud.stamina * 100}%` }} />
              </div>
            </div>
          ) : hud.reload > 0 ? (
            <div className="hud-meter hud-reload">
              <span className="hud-meter-label">recarga</span>
              <div className="hud-meter-track">
                <div className="hud-meter-fill" style={{ width: `${hud.reload * 100}%` }} />
              </div>
            </div>
          ) : hud.infinite ? (
            <div className="hud-ammo is-infinite">∞</div>
          ) : (
            <div className={hud.ammo === 0 ? 'hud-ammo is-empty' : 'hud-ammo'}>
              <b>{hud.ammo}</b>
              <span className="hud-mag">/{hud.magazine}</span>
              {Number.isFinite(hud.reserve) && <span className={hud.reserve === 0 ? 'hud-reserve is-empty' : 'hud-reserve'}>+{hud.reserve}</span>}
            </div>
          )}
        </div>
        {pips && (
          <div className="hud-pips">
            {Array.from({ length: hud.magazine }, (_, i) => (
              <i key={i} className={i < hud.ammo && hud.reload === 0 ? 'is-full' : ''} />
            ))}
          </div>
        )}
        {(hud.weaponHint || hud.attachments.length > 0) && (
          <div className="hud-hint">{[hud.attachments.length > 0 ? `+ ${hud.attachments.join(', ')}` : '', hud.weaponHint].filter(Boolean).join(' · ')}</div>
        )}
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
    ['Espada: esquerdo', 'golpe (clique de novo: combo de 3)'],
    ['Espada: direito', 'escudo (na hora do golpe: apara)'],
    ['R', 'recarregar'],
    ['1-5 · roda', 'trocar de arma'],
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
