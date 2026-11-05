import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Flame, HeartPulse, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarView } from '@/components/avatar';
import { cn } from '@/lib/utils';
import { dayKey, MONTHS, relativeDay, WEEKDAYS_SHORT, weekStreak } from '@/lib/dates';
import { exerciseCount, MIN_STRENGTH, type Goal } from '@/lib/training';
import { useApp, useLevel } from '@/store/useApp';

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

  const start = (min: number, cardio: number) => {
    startCheckin(min, cardio);
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

      <Calendar dates={checkins.map((c) => c.date)} />

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

function Calendar({ dates }: { dates: string[] }) {
  const today = new Date();
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const done = useMemo(() => new Set(dates.map(dayKey)), [dates]);

  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const todayKey = dayKey(today);
  const isCurrentMonth = y === today.getFullYear() && m === today.getMonth();

  return (
    <Card>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setCursor(new Date(y, m - 1, 1))} aria-label="Mês anterior">
            <ChevronLeft />
          </Button>
          <span className="font-semibold">
            {MONTHS[m]} {y}
          </span>
          <Button
            variant="ghost"
            size="icon"
            disabled={isCurrentMonth}
            onClick={() => setCursor(new Date(y, m + 1, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight />
          </Button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="pb-1 text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const k = dayKey(new Date(y, m, d));
            const has = done.has(k);
            return (
              <div key={i} className="flex justify-center">
                <div
                  className={cn(
                    'flex size-9 items-center justify-center rounded-full text-sm',
                    has && 'bg-primary font-bold text-primary-foreground',
                    !has && k === todayKey && 'ring-1 ring-primary',
                    !has && k > todayKey && 'text-muted-foreground/50',
                  )}
                >
                  {d}
                </div>
              </div>
            );
          })}
        </div>
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
  onStart: (minutes: number, cardio: number) => void;
}) {
  const goal = useApp((s) => s.profile!.goal);
  const prefs = useApp((s) => s.checkinPrefs);
  const [minutes, setMinutes] = useState(prefs?.minutes ?? 45);
  const [cardio, setCardio] = useState(prefs ? (prefs.cardio === prefs.minutes ? SO_CARDIO : prefs.cardio) : CARDIO_PADRAO[goal]);

  const valid = (c: number) => c === SO_CARDIO || minutes - c >= MIN_STRENGTH;
  // Se o tempo diminuiu e o cardio escolhido não cabe mais, usa o maior que cabe
  const cardioOk = valid(cardio) ? cardio : [...CARDIO].reverse().find(valid)!;
  const cardioMin = cardioOk === SO_CARDIO ? minutes : cardioOk;
  const n = exerciseCount(goal, minutes - cardioMin);

  const resumo =
    cardioOk === SO_CARDIO
      ? `${minutes} min de cardio`
      : `${n} exercícios${cardioMin ? ` + ${cardioMin} min de cardio` : ''}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Treino de hoje</DialogTitle>
          <DialogDescription>O treino é montado para caber no seu tempo.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="text-sm font-medium">Quanto tempo você tem?</div>
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
            <HeartPulse className="size-4 text-primary" /> Cardio
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

        <div className="rounded-xl bg-muted/60 p-3 text-center text-sm">
          <span className="text-muted-foreground">Hoje: </span>
          <span className="font-semibold">{resumo}</span>
        </div>

        <Button size="lg" className="h-12 text-base" onClick={() => onStart(minutes, cardioMin)}>
          <Play /> Começar treino
        </Button>
      </DialogContent>
    </Dialog>
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
