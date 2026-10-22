import type { RunModeId } from '@game/content/modes/catalog';

type Row = [keys: string, what: string];

/** Same in every mode. Keys come from src/game/input/actions.ts. Texts kept to one line in the 380px card. */
const MOVEMENT: Row[] = [
  ['A / D', 'andar · Shift: correr'],
  ['Espaço', 'pular · na parede: walljump'],
  ['S', 'agachar · correndo: slide'],
  ['W / S', 'escada · S+Espaço: descer'],
  ['E', 'câmera lenta (gasta foco)'],
  ['W / F', 'usar a saída · Esc: pausa'],
];

const GUNS: Row[] = [
  ['Mouse', 'mirar · clique: atirar'],
  ['R', 'recarregar'],
  ['1-5 · roda', 'trocar de arma'],
  ['F', 'pegar arma do chão'],
  ['Q', 'chute (empurra e atordoa)'],
];

const COMBAT: Record<RunModeId, { tip: string; rows: Row[] }> = {
  campaign: {
    tip: 'Headshot dá o dobro de dano. Eles ouvem seus tiros.',
    rows: GUNS,
  },
  zombie: {
    tip: 'Só a cabeça mata; tiro na perna faz rastejar. Eles vêm de trás: não pare.',
    rows: GUNS,
  },
  medieval: {
    tip: 'Erguer o escudo na hora do golpe apara e abre a guarda do inimigo.',
    rows: [
      ['Mouse', 'lado do golpe e do escudo'],
      ['Esquerdo', 'golpe · de novo: combo'],
      ['Direito', 'segurar: escudo'],
      ['Q', 'chute (empurra e atordoa)'],
    ],
  },
};

/** Every mode shows the same number of combat rows, so switching modes never resizes the panel. */
const COMBAT_ROWS = Math.max(...Object.values(COMBAT).map((c) => c.rows.length));

/** Controls page of the main menu: the combat keys of one mode, then movement. */
export function ModeHelp({ mode }: { mode: RunModeId }) {
  const combat = COMBAT[mode];
  const padded: (Row | null)[] = [...combat.rows, ...Array<null>(COMBAT_ROWS - combat.rows.length).fill(null)];
  return (
    <div className="mode-help">
      <p className="mode-help-tip">{combat.tip}</p>
      <h3 className="mode-help-head">Combate</h3>
      <RowList rows={padded} />
      <h3 className="mode-help-head">Movimento</h3>
      <RowList rows={MOVEMENT} />
    </div>
  );
}

function RowList({ rows }: { rows: (Row | null)[] }) {
  return (
    <dl className="controls">
      {rows.map((row, i) => (
        <div key={i} style={row ? undefined : { visibility: 'hidden' }}>
          <dt>
            <kbd>{row?.[0] ?? '-'}</kbd>
          </dt>
          <dd>{row?.[1] ?? '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
