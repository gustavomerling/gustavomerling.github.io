import { useMemo, useState } from 'react';
import { Copy, Dumbbell, Plus, Trash2, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MonthCalendar } from '@/components/calendar';
import { cn } from '@/lib/utils';
import { dayKey } from '@/lib/dates';
import {
  ACTIVITY_BY_ID,
  ACTIVITY_PRESETS,
  byTime,
  MEAL_BY_ID,
  MEAL_TYPES,
  mealForTime,
  nowTime,
  UNIT_LABEL,
  type ActivityEntry,
  type MealEntry,
  type MealType,
} from '@/lib/diary';
import { useApp } from '@/store/useApp';

type Editing = { kind: 'activity'; entry?: ActivityEntry } | { kind: 'meal'; entry?: MealEntry } | null;

const fmtN = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const parseNum = (s: string) => {
  const n = Number(s.replace(',', '.'));
  return s.trim() && Number.isFinite(n) && n > 0 ? n : undefined;
};

function dayTitle(day: string) {
  const today = dayKey(new Date());
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const d = new Date(day + 'T00:00');
  const label = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  if (day === today) return `Hoje, ${label}`;
  if (day === dayKey(y)) return `Ontem, ${label}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function Diary() {
  const checkins = useApp((s) => s.checkins);
  const activities = useApp((s) => s.activities);
  const meals = useApp((s) => s.meals);
  const saveMeal = useApp((s) => s.saveMeal);
  const [day, setDay] = useState(() => dayKey(new Date()));
  const [editing, setEditing] = useState<Editing>(null);

  const filled = useMemo(() => new Set(checkins.map((c) => dayKey(c.date))), [checkins]);
  const dotted = useMemo(() => new Set([...activities.map((a) => a.day), ...meals.map((m) => m.day)]), [activities, meals]);

  const dayActs = activities.filter((a) => a.day === day);
  const dayMeals = meals.filter((m) => m.day === day);
  const dayCheckins = checkins.filter((c) => dayKey(c.date) === day);
  const kcal = dayMeals.reduce((a, m) => a + (m.kcal ?? 0), 0);

  type Item =
    | { t: string; kind: 'checkin'; c: (typeof checkins)[number] }
    | { t: string; kind: 'activity'; a: ActivityEntry }
    | { t: string; kind: 'meal'; m: MealEntry };
  const items: Item[] = [
    ...dayCheckins.map((c) => ({ t: new Date(c.date).toTimeString().slice(0, 5), kind: 'checkin' as const, c })),
    ...dayActs.map((a) => ({ t: a.time, kind: 'activity' as const, a })),
    ...dayMeals.map((m) => ({ t: m.time, kind: 'meal' as const, m })),
  ].sort((a, b) => a.t.localeCompare(b.t));

  // Rotina: copiar as refeições do último dia que tem refeições
  const prevMealDay = [...new Set(meals.map((m) => m.day))].filter((d) => d < day).sort().at(-1);
  const copyMeals = () => {
    if (!prevMealDay) return;
    const src = meals.filter((m) => m.day === prevMealDay).sort(byTime);
    for (const m of src) saveMeal({ day, time: m.time, type: m.type, description: m.description, kcal: m.kcal });
    toast(`${src.length} ${src.length === 1 ? 'refeição copiada' : 'refeições copiadas'}. Toque para ajustar.`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Diário</h1>
        <p className="text-sm text-muted-foreground">Atividades fora da academia e refeições. Tudo entra na exportação.</p>
      </div>

      <MonthCalendar filled={filled} dotted={dotted} selected={day} onSelect={setDay} />

      <div className="space-y-3">
        <div>
          <h2 className="font-semibold">{dayTitle(day)}</h2>
          <p className="text-xs text-muted-foreground">
            {dayActs.length} {dayActs.length === 1 ? 'atividade' : 'atividades'} · {dayMeals.length} {dayMeals.length === 1 ? 'refeição' : 'refeições'}
            {kcal > 0 && ` · ${kcal.toLocaleString('pt-BR')} kcal`}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-11" onClick={() => setEditing({ kind: 'activity' })}>
            <Plus /> Atividade
          </Button>
          <Button variant="outline" className="h-11" onClick={() => setEditing({ kind: 'meal' })}>
            <Plus /> Refeição
          </Button>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="space-y-3 text-center text-sm text-muted-foreground">
              <p>Nada registrado neste dia.</p>
              {prevMealDay && (
                <Button variant="secondary" size="sm" className="h-9" onClick={copyMeals}>
                  <Copy /> Copiar refeições de {new Date(prevMealDay + 'T00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="py-2">
            <CardContent className="divide-y px-0">
              {items.map((it) => {
                if (it.kind === 'checkin')
                  return (
                    <Row key={'c' + it.c.id} time={it.t} Icon={Dumbbell} title={`Treino: ${it.c.focus}`} sub={`${it.c.exercises.filter((e) => e.done).length}/${it.c.exercises.length} exercícios`} accent />
                  );
                if (it.kind === 'activity') {
                  const p = ACTIVITY_BY_ID[it.a.kind] ?? ACTIVITY_BY_ID.outro;
                  const parts = [
                    it.a.minutes ? `${it.a.minutes} min` : '',
                    it.a.amount != null && it.a.unit ? `${fmtN(it.a.amount)} ${UNIT_LABEL[it.a.unit]}` : '',
                    it.a.note ?? '',
                  ].filter(Boolean);
                  return (
                    <Row
                      key={'a' + it.a.id}
                      time={it.t}
                      Icon={p.Icon}
                      title={it.a.name || p.nome}
                      sub={parts.join(' · ')}
                      onClick={() => setEditing({ kind: 'activity', entry: it.a })}
                    />
                  );
                }
                const mt = MEAL_BY_ID[it.m.type] ?? MEAL_BY_ID.outro;
                return (
                  <Row
                    key={'m' + it.m.id}
                    time={it.t}
                    Icon={mt.Icon}
                    title={mt.nome}
                    sub={[it.m.description, it.m.kcal ? `${it.m.kcal} kcal` : ''].filter(Boolean).join(' · ')}
                    onClick={() => setEditing({ kind: 'meal', entry: it.m })}
                  />
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      <ActivityDialog open={editing?.kind === 'activity'} entry={editing?.kind === 'activity' ? editing.entry : undefined} day={day} onClose={() => setEditing(null)} />
      <MealDialog open={editing?.kind === 'meal'} entry={editing?.kind === 'meal' ? editing.entry : undefined} day={day} onClose={() => setEditing(null)} />
    </div>
  );
}

function Row({
  time,
  Icon,
  title,
  sub,
  onClick,
  accent,
}: {
  time: string;
  Icon: typeof Dumbbell;
  title: string;
  sub?: string;
  onClick?: () => void;
  accent?: boolean;
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className="flex w-full items-center gap-3 px-4 py-2.5 text-left">
      <span className="w-10 shrink-0 text-xs tabular-nums text-muted-foreground">{time}</span>
      <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-full', accent ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground')}>
        <Icon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        {sub && <div className="truncate text-xs text-muted-foreground">{sub}</div>}
      </div>
    </Comp>
  );
}

function TimeField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1 text-xs text-muted-foreground">
      Hora
      <Input type="time" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 text-base text-foreground" />
    </label>
  );
}

function DeleteButton({ onConfirm }: { onConfirm: () => void }) {
  const [sure, setSure] = useState(false);
  return sure ? (
    <Button variant="destructive" onClick={onConfirm}>
      <Check /> Confirmar
    </Button>
  ) : (
    <Button variant="outline" onClick={() => setSure(true)}>
      <Trash2 /> Excluir
    </Button>
  );
}

function ActivityDialog({ open, entry, day, onClose }: { open: boolean; entry?: ActivityEntry; day: string; onClose: () => void }) {
  const save = useApp((s) => s.saveActivity);
  const del = useApp((s) => s.deleteActivity);
  const [kind, setKind] = useState('cachorro');
  const [name, setName] = useState('');
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const reset = () => {
    setKind(entry?.kind ?? 'cachorro');
    setName(entry?.kind === 'outro' ? entry.name : '');
    setTime(entry?.time ?? nowTime());
    setMinutes(entry?.minutes ? String(entry.minutes) : '');
    setAmount(entry?.amount != null ? fmtN(entry.amount) : '');
    setNote(entry?.note ?? '');
  };

  const preset = ACTIVITY_BY_ID[kind];
  const valid = !!time && (kind !== 'outro' || name.trim().length > 0) && (!!parseNum(minutes) || !!parseNum(amount));

  const submit = () => {
    save({
      id: entry?.id,
      day: entry?.day ?? day,
      time,
      kind,
      name: kind === 'outro' ? name.trim() : '',
      minutes: parseNum(minutes),
      amount: preset.unit ? parseNum(amount) : undefined,
      unit: preset.unit ?? undefined,
      note: note.trim() || undefined,
    });
    toast.success(entry ? 'Atividade atualizada.' : 'Atividade registrada.');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto" onOpenAutoFocus={(e) => (e.preventDefault(), reset())}>
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar atividade' : 'Nova atividade'}</DialogTitle>
          <DialogDescription>Tudo que gasta energia fora da academia.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-1.5">
          {ACTIVITY_PRESETS.map(({ id, nome, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setKind(id)}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-medium leading-tight transition',
                kind === id ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              <Icon className="size-4 shrink-0" /> {nome}
            </button>
          ))}
        </div>

        {kind === 'outro' && (
          <label className="block space-y-1 text-xs text-muted-foreground">
            O que foi?
            <Input value={name} maxLength={50} onChange={(e) => setName(e.target.value)} placeholder="Ex.: mudança, futebol com amigos" className="h-10 text-base text-foreground" />
          </label>
        )}

        <div className={cn('grid gap-2', preset.unit ? 'grid-cols-3' : 'grid-cols-2')}>
          <TimeField value={time} onChange={setTime} />
          <label className="block space-y-1 text-xs text-muted-foreground">
            Duração (min)
            <Input inputMode="numeric" value={minutes} placeholder="30" onChange={(e) => setMinutes(e.target.value.replace(/[^\d]/g, '').slice(0, 4))} className="h-10 text-base text-foreground" />
          </label>
          {preset.unit && (
            <label className="block space-y-1 text-xs text-muted-foreground">
              {UNIT_LABEL[preset.unit].charAt(0).toUpperCase() + UNIT_LABEL[preset.unit].slice(1)}
              <Input inputMode="decimal" value={amount} placeholder="0" onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 6))} className="h-10 text-base text-foreground" />
            </label>
          )}
        </div>

        <label className="block space-y-1 text-xs text-muted-foreground">
          Observação (opcional)
          <Input value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: show em pé o tempo todo, subida forte" className="h-10 text-base text-foreground" />
        </label>
        {!valid && time && <p className="text-xs text-muted-foreground">Informe a duração{preset.unit ? ` ou ${UNIT_LABEL[preset.unit]}` : ''}.</p>}

        <DialogFooter className={cn('grid gap-2', entry ? 'grid-cols-2' : 'grid-cols-1')}>
          {entry && (
            <DeleteButton
              onConfirm={() => {
                del(entry.id);
                toast('Atividade excluída.');
                onClose();
              }}
            />
          )}
          <Button disabled={!valid} onClick={submit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function MealDialog({ open, entry, day, onClose }: { open: boolean; entry?: MealEntry; day: string; onClose: () => void }) {
  const save = useApp((s) => s.saveMeal);
  const del = useApp((s) => s.deleteMeal);
  const meals = useApp((s) => s.meals);
  const [time, setTime] = useState('');
  const [type, setType] = useState<MealType>('almoco');
  const [typeTouched, setTypeTouched] = useState(false);
  const [desc, setDesc] = useState('');
  const [kcal, setKcal] = useState('');

  const reset = () => {
    const t = entry?.time ?? nowTime();
    setTime(t);
    setType(entry?.type ?? mealForTime(t));
    setTypeTouched(!!entry);
    setDesc(entry?.description ?? '');
    setKcal(entry?.kcal ? String(entry.kcal) : '');
  };

  // Refeições recentes do mesmo tipo, para repetir a rotina com um toque
  const recent = useMemo(() => {
    const seen = new Set<string>();
    const out: MealEntry[] = [];
    for (const m of [...meals].sort((a, b) => b.day.localeCompare(a.day) || b.time.localeCompare(a.time))) {
      const k = m.description.trim().toLowerCase();
      if (m.type !== type || !k || seen.has(k)) continue;
      seen.add(k);
      out.push(m);
      if (out.length >= 5) break;
    }
    return out;
  }, [meals, type]);

  const valid = !!time && desc.trim().length > 0;
  const submit = () => {
    const k = Number(kcal);
    save({ id: entry?.id, day: entry?.day ?? day, time, type, description: desc.trim(), kcal: k > 0 ? k : undefined });
    toast.success(entry ? 'Refeição atualizada.' : 'Refeição registrada.');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] max-w-sm overflow-y-auto" onOpenAutoFocus={(e) => (e.preventDefault(), reset())}>
        <DialogHeader>
          <DialogTitle>{entry ? 'Editar refeição' : 'Nova refeição'}</DialogTitle>
          <DialogDescription>Hora, o que comeu e, se souber, as calorias.</DialogDescription>
        </DialogHeader>

        <TimeField
          value={time}
          onChange={(t) => {
            setTime(t);
            if (!typeTouched && t) setType(mealForTime(t));
          }}
        />

        <div className="grid grid-cols-3 gap-1.5">
          {MEAL_TYPES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setType(m.id);
                setTypeTouched(true);
              }}
              className={cn(
                'h-9 rounded-lg border px-1 text-xs font-medium leading-tight transition',
                type === m.id ? 'border-primary bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/50',
              )}
            >
              {m.nome}
            </button>
          ))}
        </div>

        <label className="block space-y-1 text-xs text-muted-foreground">
          O que comeu
          <Textarea value={desc} maxLength={300} onChange={(e) => setDesc(e.target.value)} placeholder="Ex.: arroz, feijão, frango grelhado e salada" className="min-h-16 text-foreground" />
        </label>

        {recent.length > 0 && !entry && (
          <div className="space-y-1.5">
            <div className="text-xs text-muted-foreground">Repetir uma recente</div>
            <div className="flex flex-wrap gap-1.5">
              {recent.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setDesc(m.description);
                    setKcal(m.kcal ? String(m.kcal) : '');
                  }}
                  className="max-w-full truncate rounded-full border px-3 py-1 text-xs hover:bg-muted/50"
                >
                  {m.description}
                </button>
              ))}
            </div>
          </div>
        )}

        <label className="block space-y-1 text-xs text-muted-foreground">
          Calorias (opcional)
          <div className="relative">
            <Input inputMode="numeric" value={kcal} placeholder="0" onChange={(e) => setKcal(e.target.value.replace(/[^\d]/g, '').slice(0, 5))} className="h-10 pr-12 text-base text-foreground" />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm">kcal</span>
          </div>
        </label>

        <DialogFooter className={cn('grid gap-2', entry ? 'grid-cols-2' : 'grid-cols-1')}>
          {entry && (
            <DeleteButton
              onConfirm={() => {
                del(entry.id);
                toast('Refeição excluída.');
                onClose();
              }}
            />
          )}
          <Button disabled={!valid} onClick={submit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
