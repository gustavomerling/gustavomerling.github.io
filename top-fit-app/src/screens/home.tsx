import { useMemo, useState } from 'react';
import { Check, Crosshair, Dumbbell, Flame, Footprints, HeartPulse, Pencil, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarView } from '@/components/avatar';
import { Input } from '@/components/ui/input';
import { MonthCalendar } from '@/components/calendar';
import { cn } from '@/lib/utils';
import { dayKey, relativeDay, weekStreak } from '@/lib/dates';
import { ALL_GROUPS, exerciseCount, FOCUS_PRESETS, focusName, MIN_STRENGTH, type Goal } from '@/lib/training';
import { GRUPO_NOME, type Grupo } from '@/data/exercises';
import { useApp, useLevel, type StartOptions } from '@/store/useApp';

const DURATIONS = [20, 30, 45, 60, 75, 90];
const CARDIO = [0, 10, 15, 20, 30];
const SO_CARDIO = -1;

const CARDIO_PADRAO: Record<Goal, number> = { emagrecimento: 20, saude: 15, hipertrofia: 10, forca: 0 };

export function Home({ onOpenWorkout }: { onOpenWorkout: () => void }) {
  const profile = useApp((s) => s.profile)!;
  const checkins = useApp((s) => s.checkins);
  const active = useApp((s) => s.active);
  const startCheckin = useApp((s) => s.startCheckin);
  const [pickTime, setPickTime] = useState(false);

  const lvl = useLevel();
  const last = checkins.at(-1);
  const streak = weekStreak(checkins.map((c) => c.date));
  const now = new Date();
  const thisMonth = checkins.filter((c) => {
    const d = new Date(c.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  const activities = useApp((s) => s.activities);
  const meals = useApp((s) => s.meals);
  const filled = useMemo(() => new Set(checkins.map((c) => dayKey(c.date))), [checkins]);
  const dotted = useMemo(() => new Set([...activities.map((a) => a.day), ...meals.map((m) => m.day)]), [activities, meals]);

  const start = (min: number, cardio: number, opts: StartOptions) => {
    startCheckin(min, cardio, opts);
    setPickTime(false);
    onOpenWorkout();
  };

  return (
    <div className="space-y-5">
      <header className="flex items-center gap-3">
        <AvatarView avatar={profile.avatar} className="size-14" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-muted-foreground">Bora treinar,</p>
          <h1 className="truncate text-xl font-bold">{profile.name}</h1>
        </div>
      </header>

      <Card>
        <CardContent className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="font-semibold">
              Nível <span className="text-primary">{lvl.nome}</span>
            </span>
            <span className="text-xs text-muted-foreground">
              {lvl.next ? `${lvl.faltam} checkins para ${lvl.next.nome}` : 'Nível máximo'}
            </span>
          </div>
          <Progress value={lvl.progress * 100} />
        </CardContent>
      </Card>

      {active ? (
        <Card className="border-primary/40 bg-primary/10">
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Treino em andamento</p>
              <p className="text-lg font-semibold">{active.focus}</p>
              <p className="text-sm text-muted-foreground">
                {active.exercises.filter((e) => e.done).length}/{active.exercises.length} exercícios · {active.plannedMin} min
              </p>
            </div>
            <Button size="lg" className="h-12 w-full text-base" onClick={onOpenWorkout}>
              <Play /> Continuar treino
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Button size="lg" className="h-16 w-full rounded-2xl text-lg font-bold" onClick={() => setPickTime(true)}>
          <Dumbbell className="size-6" /> Fazer checkin
        </Button>
      )}

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Checkins" value={checkins.length} />
        <Stat label="Este mês" value={thisMonth} />
        <Stat label="Semanas seguidas" value={streak} icon={streak > 0 ? <Flame className="size-4 text-orange-400" /> : null} />
      </div>

      <MonthCalendar filled={filled} dotted={dotted} />

      {last && (
        <p className="text-center text-sm text-muted-foreground">
          Último treino: <span className="text-foreground">{last.focus}</span> · {relativeDay(last.date)}
        </p>
      )}

      <CheckinDialog open={pickTime} onOpenChange={setPickTime} onStart={start} />
    </div>
  );
}

function Stat({ label, value, icon }: { label: string; value: number; icon?: React.ReactNode }) {
  return (
    <Card className="py-3">
      <CardContent className="px-3 text-center">
        <div className="flex items-center justify-center gap-1 text-2xl font-bold">
          {value}
          {icon}
        </div>
        <div className="text-[11px] leading-tight text-muted-foreground">{label}</div>
      </CardContent>
    </Card>
  );
}

function CheckinDialog({
  open,
  onOpenChange,
  onStart,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onStart: (minutes: number, cardio: number, opts: StartOptions) => void;
}) {
  const goal = useApp((s) => s.profile!.goal);
  const commute = useApp((s) => s.profile!.commute);
  const setCommute = useApp((s) => s.setCommute);
  const prefs = useApp((s) => s.checkinPrefs);
  const [minutes, setMinutes] = useState(prefs?.minutes ?? 45);
  const [cardio, setCardio] = useState(prefs ? (prefs.cardio === prefs.minutes ? SO_CARDIO : prefs.cardio) : CARDIO_PADRAO[goal]);
  const [groups, setGroups] = useState<Grupo[]>([]);
  const [walked, setWalked] = useState(!!prefs?.walked && !!commute);
  const [editCommute, setEditCommute] = useState(false);
  const [km, setKm] = useState('');
  const [walkMin, setWalkMin] = useState('');

  const valid = (c: number) => c === SO_CARDIO || minutes - c >= MIN_STRENGTH;
  // Se o tempo diminuiu e o cardio escolhido não cabe mais, usa o maior que cabe
  const cardioOk = valid(cardio) ? cardio : [...CARDIO].reverse().find(valid)!;
  const cardioMin = cardioOk === SO_CARDIO ? minutes : cardioOk;
  const n = exerciseCount(goal, minutes - cardioMin);
  const walkOn = walked && !!commute;

  const toggleGroup = (g: Grupo) => setGroups((gs) => (gs.includes(g) ? gs.filter((x) => x !== g) : [...gs, g]));
  const sameAs = (list: Grupo[]) => list.length === groups.length && list.every((g) => groups.includes(g));

  const openCommuteEditor = () => {
    setKm(commute ? String(commute.km).replace('.', ',') : '');
    setWalkMin(commute ? String(commute.minutes) : '');
    setEditCommute(true);
  };
  const kmN = Number(km.replace(',', '.'));
  const minN = Number(walkMin);
  const commuteValid = kmN > 0 && kmN <= 50 && minN > 0 && minN <= 300;
  const saveCommute = () => {
    setCommute({ km: kmN, minutes: minN });
    setEditCommute(false);
    setWalked(true);
  };

  const parts: string[] = [];
  if (cardioOk === SO_CARDIO) parts.push(`${minutes} min de cardio`);
  else {
    parts.push(`${n} exercícios${groups.length ? ` de ${focusName(groups).toLowerCase()}` : ''}`);
    if (cardioMin) parts.push(`${cardioMin} min de cardio`);
  }
  if (walkOn) parts.push(`caminhada de ${commute!.minutes} min`);
  const resumo = parts.join(' + ');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Treino de hoje</DialogTitle>
          <DialogDescription>O treino é montado para caber no seu tempo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium">Quanto tempo você tem na academia?</div>
          <div className="grid grid-cols-6 gap-1.5">
            {DURATIONS.map((m) => (
              <Chip key={m} selected={minutes === m} onClick={() => setMinutes(m)}>
                {m}
              </Chip>
            ))}
          </div>
          <div className="text-right text-xs text-muted-foreground">minutos</div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <HeartPulse className="size-4 text-primary" /> Cardio na academia
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {CARDIO.map((c) => (
              <Chip key={c} selected={cardioOk === c} disabled={!valid(c)} onClick={() => setCardio(c)}>
                {c === 0 ? 'Sem' : `${c} min`}
              </Chip>
            ))}
            <Chip selected={cardioOk === SO_CARDIO} onClick={() => setCardio(SO_CARDIO)}>
              Só cardio
            </Chip>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Footprints className="size-4 text-primary" /> Caminhada até a academia
          </div>
          {editCommute ? (
            <div className="space-y-2 rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">Ida e volta somadas. Fica salvo para os próximos checkins.</p>
              <div className="grid grid-cols-2 gap-2">
                <label className="space-y-1 text-xs text-muted-foreground">
                  Distância (km)
                  <Input inputMode="decimal" placeholder="2" value={km} onChange={(e) => setKm(e.target.value.replace(/[^\d.,]/g, ''))} className="h-10 text-base text-foreground" />
                </label>
                <label className="space-y-1 text-xs text-muted-foreground">
                  Tempo (min)
                  <Input inputMode="numeric" placeholder="20" value={walkMin} onChange={(e) => setWalkMin(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} className="h-10 text-base text-foreground" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" onClick={() => setEditCommute(false)}>
                  Cancelar
                </Button>
                <Button disabled={!commuteValid} onClick={saveCommute}>
                  Salvar trajeto
                </Button>
              </div>
            </div>
          ) : commute ? (
            <div className="flex items-stretch gap-2">
              <button
                type="button"
                onClick={() => setWalked(!walked)}
                className={cn(
                  'flex flex-1 items-center gap-3 rounded-xl border p-3 text-left transition',
                  walkOn ? 'border-primary bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <div className={cn('flex size-5 shrink-0 items-center justify-center rounded-md border', walkOn && 'border-primary bg-primary text-primary-foreground')}>
                  {walkOn && <Check className="size-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold">Fui (ou vou) a pé</div>
                  <div className="text-xs text-muted-foreground">
                    {commute.km.toLocaleString('pt-BR')} km · {commute.minutes} min, conta como cardio fora do tempo do treino
                  </div>
                </div>
              </button>
              <Button variant="outline" size="icon" className="h-auto w-10" onClick={openCommuteEditor} aria-label="Editar trajeto">
                <Pencil />
              </Button>
            </div>
          ) : (
            <button type="button" onClick={openCommuteEditor} className="w-full rounded-xl border border-dashed p-3 text-left text-sm text-muted-foreground hover:bg-muted/50">
              Vai a pé para a academia? Cadastre o trajeto e ele conta como cardio.
            </button>
          )}
        </div>

        {cardioOk !== SO_CARDIO && (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <Crosshair className="size-4 text-primary" /> Foco
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Pill selected={groups.length === 0} onClick={() => setGroups([])}>
                Automático
              </Pill>
              {FOCUS_PRESETS.map((p) => (
                <Pill key={p.nome} selected={groups.length > 0 && sameAs(p.grupos)} onClick={() => setGroups(p.grupos)}>
                  {p.nome}
                </Pill>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {ALL_GROUPS.map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={cn(
                    'h-9 rounded-lg border px-1 text-xs font-medium transition',
                    groups.includes(g) ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50',
                  )}
                >
                  {GRUPO_NOME[g]}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {groups.length ? 'Só os grupos marcados entram no treino.' : 'O app escolhe a parte do corpo mais descansada.'}
            </p>
          </div>
        )}

        <div className="rounded-xl bg-muted/60 p-3 text-center text-sm">
          <span className="text-muted-foreground">Hoje: </span>
          <span className="font-semibold">{resumo}</span>
        </div>

        <Button
          size="lg"
          className="h-12 text-base"
          disabled={editCommute}
          onClick={() => onStart(minutes, cardioMin, { groups: cardioOk === SO_CARDIO ? undefined : groups, walked: walkOn })}
        >
          <Play /> Começar treino
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Pill({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 rounded-full border px-3 text-xs font-semibold transition',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/50',
      )}
    >
      {children}
    </button>
  );
}

function Chip({
  selected,
  disabled,
  onClick,
  children,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'h-10 rounded-lg border text-sm font-semibold transition disabled:opacity-30',
        selected ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/50',
      )}
    >
      {children}
    </button>
  );
}
