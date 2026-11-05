import { useRef, useState } from 'react';
import { Check, ImagePlus, Moon, Shuffle, Sun } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { EQUIP_LABEL, EQUIP_ORDER, type Equip } from '@/data/exercises';
import { GOALS, LEVELS, type Goal, type Nivel } from '@/lib/training';
import type { Avatar } from '@/store/useApp';
import {
  AVATAR_COLORS,
  AVATAR_ICONS,
  AVATAR_PATTERNS,
  AvatarView,
  initialsOf,
  randomAvatar,
  resizeImage,
} from '@/components/avatar';
import { EQUIP_ICON, GOAL_ICON, LEVEL_ICON } from '@/components/icons';

type Custom = Extract<Avatar, { kind: 'custom' }>;
type Tab = 'icone' | 'cor' | 'fundo';

export function AvatarPicker({ value, onChange, name }: { value: Avatar; onChange: (a: Avatar) => void; name: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>('icone');
  // Guarda o último avatar desenhado, para voltar a ele depois de usar uma foto
  const [custom, setCustom] = useState<Custom>(value.kind === 'custom' ? value : randomAvatar(name));
  const initials = initialsOf(name);

  const update = (patch: Partial<Custom>) => {
    const next = { ...custom, ...patch, initials };
    setCustom(next);
    onChange(next);
  };

  const preview: Avatar = value.kind === 'upload' ? value : { ...custom, initials };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <IconButton label="Aleatório" onClick={() => update({ ...randomAvatar(name) })}>
          <Shuffle className="size-5" />
        </IconButton>
        <AvatarView avatar={preview} className="size-28 shadow-lg ring-4 ring-background" />
        <IconButton label="Foto" active={value.kind === 'upload'} onClick={() => input.current?.click()}>
          <ImagePlus className="size-5" />
        </IconButton>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          try {
            onChange({ kind: 'upload', dataUrl: await resizeImage(f) });
          } catch {
            toast.error('Não consegui abrir essa imagem.');
          }
        }}
      />

      <div className="grid grid-cols-3 rounded-xl bg-muted p-1 text-sm">
        {(['icone', 'cor', 'fundo'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => {
              setTab(t);
              if (value.kind === 'upload') onChange(custom);
            }}
            className={cn(
              'rounded-lg py-1.5 font-medium transition',
              tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
            )}
          >
            {{ icone: 'Ícone', cor: 'Cor', fundo: 'Fundo' }[t]}
          </button>
        ))}
      </div>

      {tab === 'icone' && (
        <div className="grid grid-cols-6 gap-2">
          <Tile selected={custom.icon === 'iniciais'} onClick={() => update({ icon: 'iniciais' })} label="Iniciais">
            <span className="text-sm font-extrabold">{initials || 'AB'}</span>
          </Tile>
          {AVATAR_ICONS.map(({ id, Icon }) => (
            <Tile key={id} selected={custom.icon === id} onClick={() => update({ icon: id })} label={id}>
              <Icon className="size-5" />
            </Tile>
          ))}
        </div>
      )}

      {tab === 'cor' && (
        <div className="space-y-4">
          <div className="grid grid-cols-6 gap-3">
            {AVATAR_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                aria-label={c.id}
                onClick={() => update({ color: c.id })}
                className={cn(
                  'mx-auto flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-background transition',
                  custom.color === c.id && 'ring-2 ring-foreground',
                )}
                style={{ background: `linear-gradient(135deg, ${c.a}, ${c.b})` }}
              >
                {custom.color === c.id && <Check className="size-4 text-white drop-shadow" />}
              </button>
            ))}
          </div>
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Cor do ícone</div>
            <div className="grid grid-cols-2 gap-2">
              {(['claro', 'escuro'] as const).map((fg) => (
                <button
                  key={fg}
                  type="button"
                  onClick={() => update({ fg })}
                  className={cn(
                    'flex items-center justify-center gap-2 rounded-xl border py-2 text-sm font-medium transition',
                    custom.fg === fg ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                  )}
                >
                  {fg === 'claro' ? <Sun className="size-4" /> : <Moon className="size-4" />}
                  {fg === 'claro' ? 'Claro' : 'Escuro'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'fundo' && (
        <div className="grid grid-cols-3 gap-3">
          {AVATAR_PATTERNS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => update({ pattern: p.id })}
              className={cn(
                'flex flex-col items-center gap-1.5 rounded-xl border p-2 text-xs transition',
                custom.pattern === p.id ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
              )}
            >
              <AvatarView avatar={{ ...custom, initials, pattern: p.id }} className="size-12" />
              {p.nome}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
      <span
        className={cn(
          'flex size-11 items-center justify-center rounded-full border bg-card text-foreground transition hover:bg-muted',
          active && 'border-primary text-primary',
        )}
      >
        {children}
      </span>
      {label}
    </button>
  );
}

function Tile({ selected, onClick, label, children }: { selected: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'flex aspect-square items-center justify-center rounded-xl border transition',
        selected ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50',
      )}
    >
      {children}
    </button>
  );
}

function OptionCard({
  selected,
  onClick,
  Icon,
  title,
  desc,
}: {
  selected: boolean;
  onClick: () => void;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-4 rounded-xl border p-4 text-left transition',
        selected ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
      )}
    >
      <span
        className={cn(
          'flex size-11 shrink-0 items-center justify-center rounded-full',
          selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground',
        )}
      >
        <Icon className="size-5" />
      </span>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="text-sm text-muted-foreground">{desc}</div>
      </div>
      {selected && <Check className="size-5 text-primary" />}
    </button>
  );
}

export function GoalPicker({ value, onChange }: { value: Goal | null; onChange: (g: Goal) => void }) {
  return (
    <div className="grid gap-3">
      {GOALS.map((g) => (
        <OptionCard key={g.id} selected={value === g.id} onClick={() => onChange(g.id)} Icon={GOAL_ICON[g.id]} title={g.nome} desc={g.desc} />
      ))}
    </div>
  );
}

export function LevelPicker({ value, onChange }: { value: Nivel | null; onChange: (n: Nivel) => void }) {
  return (
    <div className="grid gap-3">
      {LEVELS.map((l) => (
        <OptionCard
          key={l.nivel}
          selected={value === l.nivel}
          onClick={() => onChange(l.nivel)}
          Icon={LEVEL_ICON[l.nivel]}
          title={l.nome}
          desc={`${l.desc}. ${l.divisao}.`}
        />
      ))}
    </div>
  );
}

export function EquipPicker({ value, onChange }: { value: Equip[]; onChange: (e: Equip[]) => void }) {
  const toggle = (e: Equip) => onChange(value.includes(e) ? value.filter((x) => x !== e) : [...value, e]);
  return (
    <div className="grid grid-cols-2 gap-3">
      {EQUIP_ORDER.map((e) => {
        const on = value.includes(e);
        const Icon = EQUIP_ICON[e];
        return (
          <button
            key={e}
            type="button"
            onClick={() => toggle(e)}
            className={cn(
              'flex items-center gap-2.5 rounded-xl border p-3 text-left text-sm font-medium transition',
              on ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
            )}
          >
            <Icon className={cn('size-5', on ? 'text-primary' : 'text-muted-foreground')} />
            <span className="flex-1">{EQUIP_LABEL[e]}</span>
            {on && <Check className="size-4 text-primary" />}
          </button>
        );
      })}
    </div>
  );
}
