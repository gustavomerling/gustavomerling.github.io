import { platform } from '@engine/platform/platform';
import { useCallback, useEffect, useRef, useState } from 'react';
import { RUN_MODES, type RunModeId } from '@game/content/modes/catalog';
import { dailySeed, normalizeSeed, prefs, SEED_CHOICES, type ModeRecord, type Prefs, type SeedChoice } from '@game/prefs';
import { Logo } from '../components/Logo';
import { Menu, Panel } from '../components/Menu';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { MENU_ICONS } from '../components/MenuIcons';
import { ModeHelp } from '../components/ModeHelp';
import { OptionsMenu } from '../components/Options';

interface Props {
  onPlay: (mode: RunModeId) => void;
}

type View = 'main' | 'help' | 'seed' | 'options';

const clock = (seconds: number) => {
  const s = Math.floor(seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** One line with the mode's best marks, under its description. */
function recordLine(mode: RunModeId, r: ModeRecord | undefined): string {
  if (!r || r.attempts === 0) return 'Sem recorde ainda.';
  const parts = [`${r.bestKills} abates`];
  if (mode === 'zombie') parts.push(`sobreviveu ${clock(r.longestLife)}`);
  if (r.fastestClear !== null) parts.push(`saída em ${clock(r.fastestClear)}`);
  parts.push(`${r.attempts} ${r.attempts === 1 ? 'tentativa' : 'tentativas'}`);
  return `Recorde: ${parts.join(' · ')}`;
}

function seedLabel(p: Prefs): { value: string; description: string } {
  switch (p.seedChoice) {
    case 'random':
      return { value: 'Aleatório', description: 'Um mapa novo a cada partida. A/D ou ←/→ mudam.' };
    case 'daily':
      return { value: 'Do dia', description: `O mesmo mapa para todo mundo hoje (${dailySeed()}).` };
    case 'last':
      return { value: 'Repetir', description: `Joga de novo o último mapa (${p.lastSeed ?? '—'}).` };
    case 'custom':
      return {
        value: p.customSeed || 'Digitar…',
        description: p.customSeed ? 'Seed digitada. Enter para editar.' : 'Enter para digitar uma seed (ex.: a do HUD de um amigo).',
      };
  }
}

/** Next seed choice, skipping "Repetir" while nothing was played yet. */
function cycleSeed(p: Prefs, dir: -1 | 1): SeedChoice {
  const options = SEED_CHOICES.filter((c) => c !== 'last' || p.lastSeed !== null);
  const at = Math.max(0, options.indexOf(p.seedChoice));
  return options[(at + dir + options.length) % options.length]!;
}

export function MainMenuScreen({ onPlay }: Props) {
  const store = prefs();
  const [p, setP] = useState<Prefs>(() => store.get());
  const [view, setView] = useState<View>('main');
  const [helpMode, setHelpMode] = useState<RunModeId>(p.lastMode);
  /** Item selected when coming back to the main list (the sub-page that was open). */
  const [focusId, setFocusId] = useState<string>(p.lastMode);
  const open = (next: View, from: string) => {
    setFocusId(from);
    setView(next);
  };
  const update = useCallback((change: (prev: Prefs) => Partial<Prefs>) => setP(store.update(change)), [store]);
  const backToMain = useCallback(() => setView('main'), []);
  const modes = RUN_MODES.all();
  const seed = seedLabel(p);

  const cycleHelp = (dir: -1 | 1) => {
    const i = modes.findIndex((m) => m.id === helpMode);
    setHelpMode(modes[(i + dir + modes.length) % modes.length]!.id);
  };

  return (
    <div className="screen main-menu">
      <MenuBackdrop />
      <div className="menu-stage">
        <div className="menu-brand">
          <Logo />
          <p className="tagline">prédios · becos · tiro com mira</p>
        </div>
        <div className="menu-side">
          {view === 'help' && (
            <>
              <Panel kicker="Controles" title={RUN_MODES.get(helpMode).name}>
                <ModeHelp mode={helpMode} />
              </Panel>
              <Menu
                onBack={backToMain}
                // One row (fits a 720p window): A/D switch the mode shown, Enter/Esc go back.
                items={[
                  {
                    id: 'back',
                    label: 'Voltar',
                    value: RUN_MODES.get(helpMode).name,
                    description: 'A/D ou ←/→ mostram outro modo · Enter ou Esc voltam.',
                    onCycle: cycleHelp,
                    onSelect: backToMain,
                  },
                ]}
              />
            </>
          )}
          {view === 'seed' && (
            <SeedEntry
              initial={p.customSeed}
              onDone={(value) => {
                if (value !== null) update(() => ({ customSeed: value, seedChoice: value ? 'custom' : 'random' }));
                backToMain();
              }}
            />
          )}
          {view === 'options' && (
            <div className="menu-card">
              <div className="menu-card-head">
                <span>Opções</span>
                <span>v{__APP_VERSION__}</span>
              </div>
              <OptionsMenu onBack={backToMain} />
            </div>
          )}
          {view === 'main' && (
            <div className="menu-card">
              <div className="menu-card-head">
                <span>Menu</span>
                <span>v{__APP_VERSION__}</span>
              </div>
              <Menu
                initialId={focusId}
                items={[
                  ...modes.map((mode) => ({
                    id: mode.id,
                    label: mode.name,
                    icon: MENU_ICONS[mode.id],
                    description: `${mode.description}\n${recordLine(mode.id, p.records[mode.id])}`,
                    onSelect: () => onPlay(mode.id),
                  })),
                  {
                    id: 'seed',
                    label: 'Mapa',
                    icon: MENU_ICONS.seed,
                    value: seed.value,
                    description: seed.description,
                    onCycle: (dir) => update((prev) => ({ seedChoice: cycleSeed(prev, dir) })),
                    onSelect: () =>
                      p.seedChoice === 'custom' ? open('seed', 'seed') : update((prev) => ({ seedChoice: cycleSeed(prev, 1) })),
                  },
                  {
                    id: 'controls',
                    label: 'Controles',
                    icon: MENU_ICONS.controls,
                    description: 'Teclas de cada modo: tiro, espada e escudo, movimento.',
                    onSelect: () => {
                      setHelpMode(p.lastMode);
                      open('help', 'controls');
                    },
                  },
                  {
                    id: 'options',
                    label: 'Opções',
                    icon: MENU_ICONS.options,
                    description: 'Volume, sons, tremor de tela, pausa no impacto e partículas.',
                    onSelect: () => open('options', 'options'),
                  },
                  {
                    id: 'quit',
                    label: 'Sair',
                    icon: MENU_ICONS.quit,
                    description: 'Fecha o jogo.',
                    onSelect: () => platform.quit(),
                    hidden: !platform.isDesktop,
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>
      <footer className="footer">
        <span>
          <kbd>W</kbd>
          <kbd>S</kbd> navegar · <kbd>A</kbd>
          <kbd>D</kbd> mudar · <kbd>Enter</kbd> jogar · controle: direcional + A
        </span>
        <span>
          <kbd>F11</kbd> tela cheia · <kbd>Esc</kbd> voltar
        </span>
      </footer>
    </div>
  );
}

/** Typing a seed. Enter confirms (empty = back to random), Esc cancels. */
function SeedEntry({ initial, onDone }: { initial: string; onDone: (value: string | null) => void }) {
  const [text, setText] = useState(initial);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);
  const confirm = () => onDone(normalizeSeed(text) ?? '');
  return (
    <>
      <Panel kicker="Mapa" title="Digitar seed">
        <input
          ref={input}
          className="seed-input"
          value={text}
          maxLength={24}
          spellCheck={false}
          placeholder="K7Q2-M9XA"
          onChange={(e) => setText(e.target.value.toUpperCase())}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              confirm();
            } else if (e.key === 'Escape') {
              e.preventDefault();
              onDone(null);
            }
          }}
        />
        <p className="menu-hint">Letras, números e hífen. A mesma seed gera sempre o mesmo mapa.</p>
      </Panel>
      <Menu
        onBack={() => onDone(null)}
        items={[
          { id: 'ok', label: 'Confirmar', description: 'Usa esta seed nas próximas partidas.', onSelect: confirm },
          { id: 'cancel', label: 'Cancelar', description: 'Volta sem mudar (Esc).', onSelect: () => onDone(null) },
        ]}
      />
    </>
  );
}
