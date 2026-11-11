import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Ban,
  Check,
  ChevronDown,
  ChevronRight,
  Footprints,
  HeartPulse,
  History,
  Minus,
  PartyPopper,
  Plus,
  RefreshCw,
  Route,
  Shuffle,
  Star,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { EXERCISE_BY_ID, GRUPO_NOME, tagsOf, type Exercise, type Grupo, type Tag } from '@/data/exercises';
import { fmtDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import {
  ALL_GROUPS,
  parseTarget,
  progression,
  usesDistance,
  usesWeight,
  weightStep,
  type Checkin,
  type CheckinRating,
  type SessionExercise,
} from '@/lib/training';
import { useApp } from '@/store/useApp';
import { ANIMS } from '@/anim/library';
import { ExerciseFigure } from '@/anim/figure';

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
const fmtRest = (sec: number) => (sec >= 120 && sec % 60 === 0 ? `${sec / 60} min` : `${sec} s`);

// ---------- Descanso ----------

let audio: AudioContext | null = null;
/** Precisa ser chamado num toque (o navegador só libera o som assim). */
function primeAudio() {
  try {
    audio ??= new AudioContext();
    if (audio.state === 'suspended') void audio.resume();
  } catch {
    audio = null;
  }
}
function beep() {
  if (!audio) return;
  const t = audio.currentTime;
  [0, 0.22].forEach((d) => {
    const o = audio!.createOscillator();
    const g = audio!.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.0001, t + d);
    g.gain.exponentialRampToValueAtTime(0.25, t + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d + 0.18);
    o.connect(g).connect(audio!.destination);
    o.start(t + d);
    o.stop(t + d + 0.2);
  });
}

interface Rest {
  end: number;
  total: number;
  /** Série em que a pessoa está agora (a próxima a fazer) */
  current: number;
  planned: number;
  name: string;
}

/** Cronômetro de descanso no cantinho da tela, com a série atual embaixo. */
function RestTimer({ rest, onChange }: { rest: Rest; onChange: (r: Rest | null) => void }) {
  const [now, setNow] = useState(Date.now());
  const fired = useRef(false);
  useEffect(() => {
    fired.current = false;
  }, [rest.end]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);
  const left = Math.max(0, Math.ceil((rest.end - now) / 1000));
  useEffect(() => {
    if (left > 0 || fired.current) return;
    fired.current = true;
    navigator.vibrate?.([200, 100, 200]);
    beep();
  }, [left]);

  const over = left === 0;
  const done = rest.current - 1;
  const label =
    done < rest.planned ? `Série ${rest.current} de ${rest.planned}` : done === rest.planned ? `${rest.planned} de ${rest.planned} feitas` : `${done} séries (+${done - rest.planned})`;
  const progress = over ? 1 : 1 - (rest.end - now) / (rest.total * 1000);
  return (
    <div className="pb-safe fixed right-3 bottom-3 z-40">
      <div className={cn('relative w-40 overflow-hidden rounded-2xl border bg-card/95 p-3 shadow-lg backdrop-blur', over && 'border-primary')}>
        <div className="absolute inset-x-0 top-0 h-1 bg-muted">
          <div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="flex items-start justify-between gap-1">
          <div className={cn('text-2xl font-bold tabular-nums leading-none', over && 'text-primary')}>
            {over ? 'Bora!' : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`}
          </div>
          <button type="button" onClick={() => onChange(null)} aria-label="Fechar cronômetro" className="-mt-1 -mr-1 p-1 text-muted-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="mt-1.5 text-sm font-semibold">
          {label}
        </div>
        <div className="truncate text-[11px] text-muted-foreground">{rest.name}</div>
        {!over && (
          <button
            type="button"
            onClick={() => onChange({ ...rest, end: rest.end + 15000, total: rest.total + 15 })}
            className="mt-2 h-7 w-full rounded-lg border text-xs font-medium text-muted-foreground"
          >
            +15 s
          </button>
        )}
      </div>
    </div>
  );
}

// ---------- Tela ----------

export function Workout({ onClose }: { onClose: () => void }) {
  const active = useApp((s) => s.active);
  const commute = useApp((s) => s.profile?.commute);
  const finishCheckin = useApp((s) => s.finishCheckin);
  const reopenCheckin = useApp((s) => s.reopenCheckin);
  const cancelCheckin = useApp((s) => s.cancelCheckin);
  const toggleCommute = useApp((s) => s.toggleCommute);
  const [confirm, setConfirm] = useState<'finish' | 'cancel' | null>(null);
  const [rest, setRest] = useState<Rest | null>(null);

  if (!active) return null;
  const done = active.exercises.filter((e) => e.done).length;
  const total = active.exercises.length;
  const hasCommute = active.exercises.some((e) => e.exerciseId === 'caminhada-academia');

  const startRest = (sec: number, info: Omit<Rest, 'end' | 'total'>) => {
    primeAudio();
    const s = Math.max(sec, 30);
    setRest({ end: Date.now() + s * 1000, total: s, ...info });
  };

  const finish = (rating: CheckinRating) => {
    const id = finishCheckin(rating);
    setConfirm(null);
    toast.success('Checkin feito! Bom treino.', {
      duration: 8000,
      action: id ? { label: 'Desfazer', onClick: () => reopenCheckin(id) && toast('Treino reaberto. Está em andamento na tela inicial.') } : undefined,
    });
    onClose();
  };

  return (
    <div className={cn('space-y-4', rest && 'pb-36')}>
      <header className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-bold">{active.focus}</h1>
          <p className="text-xs text-muted-foreground">
            {total} {total === 1 ? 'exercício' : 'exercícios'} · ~{active.plannedMin} min
            {active.cardioMin ? ` (${active.cardioMin} de cardio)` : ''}
          </p>
        </div>
      </header>

      <div className="flex items-center gap-3">
        <Progress value={total ? (done / total) * 100 : 0} className="flex-1" />
        <span className="text-sm tabular-nums text-muted-foreground">
          {done}/{total}
        </span>
      </div>

      <div className="space-y-3">
        {active.exercises.map((se, i) => (
          <ExerciseCard key={se.uid} se={se} index={i + 1} onRest={startRest} />
        ))}
      </div>

      {commute && !hasCommute && (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => toggleCommute(true)}>
          <Footprints /> Adicionar caminhada até a academia ({commute.minutes} min)
        </Button>
      )}

      <div className="space-y-2 pt-2">
        <Button size="lg" className="h-12 w-full text-base" onClick={() => setConfirm('finish')}>
          <PartyPopper /> Finalizar checkin
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirm('cancel')}>
          Descartar treino
        </Button>
      </div>

      <FinishDialog open={confirm === 'finish'} done={done} total={total} onClose={() => setConfirm(null)} onFinish={finish} />

      <Dialog open={confirm === 'cancel'} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Descartar este treino?</DialogTitle>
            <DialogDescription>Ele não vai contar como checkin.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                cancelCheckin();
                setConfirm(null);
                onClose();
              }}
            >
              Descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {rest && <RestTimer rest={rest} onChange={setRest} />}
    </div>
  );
}

const EFFORT: { v: 1 | 2 | 3 | 4 | 5; nome: string }[] = [
  { v: 1, nome: 'Muito leve' },
  { v: 2, nome: 'Leve' },
  { v: 3, nome: 'Moderado' },
  { v: 4, nome: 'Pesado' },
  { v: 5, nome: 'Exaustivo' },
];

/** Finalização com avaliação opcional (esforço + observação). */
function FinishDialog({
  open,
  done,
  total,
  onClose,
  onFinish,
}: {
  open: boolean;
  done: number;
  total: number;
  onClose: () => void;
  onFinish: (r: CheckinRating) => void;
}) {
  const [effort, setEffort] = useState<CheckinRating['effort']>();
  const [note, setNote] = useState('');
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          setEffort(undefined);
          setNote('');
        }}
      >
        <DialogHeader>
          <DialogTitle>Como foi o treino?</DialogTitle>
          <DialogDescription>
            {done === total ? 'Tudo feito, mandou bem!' : `Você marcou ${done} de ${total} exercícios. O checkin conta do mesmo jeito.`}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <div className="text-sm font-medium">Esforço</div>
          <div className="grid grid-cols-5 gap-1.5">
            {EFFORT.map((e) => (
              <button
                key={e.v}
                type="button"
                onClick={() => setEffort(effort === e.v ? undefined : e.v)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-lg border py-2 text-[10px] leading-tight transition',
                  effort === e.v ? 'border-primary bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted/50',
                )}
              >
                <span className={cn('text-base font-bold', effort !== e.v && 'text-foreground')}>{e.v}</span>
                {e.nome}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <div className="text-sm font-medium">Observação</div>
          <Textarea
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: ombro incomodou no supino, dormi mal, academia lotada"
            className="min-h-20"
          />
        </div>
        <p className="text-xs text-muted-foreground">Opcional. Entra na exportação para a IA analisar.</p>
        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={onClose}>
            Voltar
          </Button>
          <Button onClick={() => onFinish({ effort, note })}>
            <Check /> Finalizar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TagList({ tags, small }: { tags: Tag[]; small?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Badge
          key={t.label}
          variant={t.kind === 'sec' ? 'outline' : 'secondary'}
          className={cn('font-normal', small && 'text-[11px]', t.kind === 'main' && 'bg-primary/15 font-semibold text-primary', t.kind === 'sec' && 'text-muted-foreground')}
        >
          {t.kind === 'sec' ? `+ ${t.label}` : t.label}
        </Badge>
      ))}
    </div>
  );
}

type OnRest = (sec: number, info: Omit<Rest, 'end' | 'total'>) => void;

function ExerciseCard({ se, index, onRest }: { se: SessionExercise; index: number; onRest: OnRest }) {
  const setDone = useApp((s) => s.setDone);
  const markUnavailable = useApp((s) => s.markUnavailable);
  const countSet = useApp((s) => s.countSet);
  const [ask, setAsk] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [open, setOpen] = useState(false);
  const ex = EXERCISE_BY_ID[se.exerciseId];
  if (!ex) return null;
  const isCardio = ex.grupo === 'cardio';
  const isCommute = ex.id === 'caminhada-academia';
  const km = isCardio && (usesDistance(ex) || isCommute);
  const strength = !isCardio;
  const count = se.setsDone ?? 0;
  const doneRows = se.log?.filter((r) => r.done) ?? [];

  const toggle = () => {
    if (se.done) setDone(se.uid, false);
    else if (strength || (km && !isCommute)) setAsk(true);
    else setDone(se.uid, true, isCommute ? { distanceKm: se.distanceKm } : undefined);
  };

  const finishedSet = () => {
    const n = countSet(se.uid);
    onRest(se.restSec, { current: n + 1, planned: se.sets, name: ex.nome });
  };

  const unavailable = () => {
    const r = markUnavailable(se.uid);
    toast(`"${ex.nome}" não vai aparecer mais.`, {
      description: r === 'removed' ? 'Sem substituto parecido, então saiu do treino. Dá pra restaurar no Perfil.' : 'Dá pra restaurar no Perfil.',
    });
    setOpen(false);
  };

  // Resumo do que foi registrado: "3 × 12 · 100 kg"
  const summary = (() => {
    if (!se.done || !doneRows.length) return null;
    const reps = doneRows[0].reps;
    const kg = doneRows[0].kg;
    return `${doneRows.length} × ${reps ?? '–'}${ex.tempo ? ' s' : ''}${kg != null ? ` · ${fmtNum(kg)} kg` : ''}`;
  })();

  return (
    <Card className={cn('gap-3 py-4 transition', se.done && 'opacity-60')}>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start gap-3">
          <Checkbox checked={se.done} onCheckedChange={toggle} className="mt-1 size-6 rounded-md" aria-label="Concluído" />
          <button className="min-w-0 flex-1 text-left" onClick={toggle}>
            <div className="text-xs text-muted-foreground">#{index}</div>
            <div className={cn('font-semibold leading-snug', se.done && 'line-through')}>{ex.nome}</div>
            {se.minutes ? (
              <div className="mt-1 space-y-0.5 text-sm">
                <span className="flex items-center gap-1 font-bold text-primary">
                  <HeartPulse className="size-3.5" /> {se.minutes} min
                </span>
                <p className="text-muted-foreground">{se.detail}</p>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2 text-sm">
                <span className="font-bold text-primary">
                  {se.sets} × {se.reps}
                </span>
                <span className="flex items-center gap-1 text-muted-foreground">
                  <Timer className="size-3.5" /> {fmtRest(se.restSec)}
                </span>
              </div>
            )}
          </button>
          {isCardio && se.done && se.distanceKm != null && (
            <button
              onClick={() => !isCommute && setAsk(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-sm font-bold text-primary"
              aria-label="Editar distância"
            >
              <Route className="size-3.5" /> {fmtNum(se.distanceKm)} km
            </button>
          )}
          {summary && (
            <button
              onClick={() => setAsk(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-sm font-bold text-primary"
              aria-label="Editar séries"
            >
              {summary}
            </button>
          )}
        </div>

        <TagList tags={tagsOf(ex)} />

        {strength && !se.done && (
          <Button variant="secondary" className="h-10 w-full justify-between" onClick={finishedSet}>
            <span className="flex items-center gap-2">
              <Timer /> Terminei a série {count + 1}
            </span>
            <span className="text-xs text-muted-foreground">
              {count > 0 ? `${count} de ${se.sets} feitas` : `descanso ${fmtRest(se.restSec)}`}
            </span>
          </Button>
        )}

        {!isCommute && (
          <>
            <button onClick={() => setOpen(!open)} className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
              Como fazer <ChevronDown className={cn('size-3.5 transition', open && 'rotate-180')} />
            </button>
            {open && (
              <div className="space-y-2">
                {ANIMS[ex.id] && (
                  <div className="grid grid-cols-2 gap-2">
                    {(['front', 'side'] as const).map((v) => (
                      <figure key={v} className="space-y-1">
                        <ExerciseFigure def={ANIMS[ex.id]} view={v} className="aspect-square w-full rounded-lg" />
                        <figcaption className="text-center text-[11px] text-muted-foreground">{v === 'front' ? 'Frente' : 'Lado'}</figcaption>
                      </figure>
                    ))}
                  </div>
                )}
                <p className="text-sm leading-relaxed text-muted-foreground">{ex.instrucoes}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={() => setSwapping(true)}>
                <RefreshCw /> Trocar
              </Button>
              <Button variant="outline" size="sm" className="h-9 text-muted-foreground" onClick={unavailable}>
                <Ban /> Não disponível
              </Button>
            </div>
          </>
        )}
      </CardContent>
      <SwapDialog
        open={swapping}
        uid={se.uid}
        current={ex}
        onClose={() => setSwapping(false)}
        onSwapped={() => {
          setSwapping(false);
          setOpen(false);
        }}
      />
      {km && !isCommute && (
        <MetricDialog
          open={ask}
          ex={ex}
          initial={se.distanceKm}
          onClose={() => setAsk(false)}
          onSave={(v) => {
            setDone(se.uid, true, { distanceKm: v });
            setAsk(false);
          }}
        />
      )}
      {strength && <StrengthDialog open={ask} se={se} ex={ex} onClose={() => setAsk(false)} />}
    </Card>
  );
}

/** Número com botões − e +, aceita vírgula. */
function Stepper({
  label,
  unit,
  value,
  onChange,
  step,
  decimal,
}: {
  label: string;
  unit?: string;
  value: string;
  onChange: (v: string) => void;
  step: number;
  decimal?: boolean;
}) {
  const n = Number(value.replace(',', '.'));
  const bump = (d: number) => {
    const base = Number.isFinite(n) ? n : 0;
    onChange(fmtNum(Math.max(0, Math.round((base + d) / step) * step)));
  };
  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="icon-lg" className="size-11" onClick={() => bump(-step)} aria-label={`Diminuir ${label}`}>
          <Minus />
        </Button>
        <div className="relative flex-1">
          <Input
            aria-label={label}
            inputMode={decimal ? 'decimal' : 'numeric'}
            value={value}
            onFocus={(e) => e.target.select()}
            onChange={(e) => onChange(e.target.value.replace(decimal ? /[^\d.,]/g : /[^\d]/g, '').slice(0, 6))}
            placeholder="0"
            className={cn('h-11 text-center text-xl font-bold', unit && 'pr-9')}
          />
          {unit && <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{unit}</span>}
        </div>
        <Button variant="outline" size="icon-lg" className="size-11" onClick={() => bump(step)} aria-label={`Aumentar ${label}`}>
          <Plus />
        </Button>
      </div>
    </div>
  );
}

/** Ao marcar a musculação: quantas séries, quantas reps e qual peso (uma vez por exercício). */
function StrengthDialog({ open, se, ex, onClose }: { open: boolean; se: SessionExercise; ex: Exercise; onClose: () => void }) {
  const completeSets = useApp((s) => s.completeSets);
  const checkins = useApp((s) => s.checkins);
  const weighted = usesWeight(ex);
  const prog = progression(ex, se.reps, checkins);
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [kg, setKg] = useState('');

  const reset = () => {
    const done = se.done ? se.log?.filter((r) => r.done) : undefined;
    const first = done?.[0] ?? se.log?.[0];
    setSets(String(done?.length || se.setsDone || se.sets));
    setReps(first?.reps != null ? String(first.reps) : String(parseTarget(se.reps)?.max ?? ''));
    setKg(weighted && first?.kg != null ? fmtNum(first.kg) : '');
  };

  const setsN = Number(sets);
  const repsN = Number(reps);
  const kgN = Number(kg.replace(',', '.'));
  const valid = setsN >= 1 && setsN <= 20 && repsN >= 1 && repsN <= 300 && (!weighted || kg === '' || (kgN > 0 && kgN <= 500));

  const save = () => {
    completeSets(se.uid, { sets: setsN, reps: repsN, kg: weighted && kg !== '' ? kgN : undefined });
    onClose();
  };
  const skip = () => {
    completeSets(se.uid, { sets: se.setsDone || se.sets });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" onOpenAutoFocus={(e) => (e.preventDefault(), reset())}>
        <DialogHeader>
          <DialogTitle>Como foi?</DialogTitle>
          <DialogDescription>
            {ex.nome} · previsto {se.sets} × {se.reps}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3">
          <Stepper label="Séries" value={sets} onChange={setSets} step={1} />
          <Stepper label={ex.tempo ? 'Segundos' : 'Repetições'} value={reps} onChange={setReps} step={1} />
        </div>
        {weighted && (
          <Stepper
            label={ex.equip === 'halteres' ? 'Peso de cada halter' : 'Peso'}
            unit="kg"
            decimal
            value={kg}
            onChange={setKg}
            step={weightStep(ex)}
          />
        )}

        {prog && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg bg-muted/60 px-3 py-2 text-xs">
            <History className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">
              {fmtDate(prog.date)}: <span className="text-foreground">{prog.text}</span>
            </span>
            {prog.suggestKg != null && (
              <button
                type="button"
                onClick={() => setKg(fmtNum(prog.suggestKg!))}
                className="ml-auto flex items-center gap-1 rounded-md bg-primary/15 px-2 py-1 font-semibold text-primary"
              >
                <TrendingUp className="size-3.5" /> Subir para {fmtNum(prog.suggestKg)} kg
              </button>
            )}
          </div>
        )}
        {!prog && <p className="text-center text-xs text-muted-foreground">Primeiro registro deste exercício</p>}

        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={skip}>
            Pular
          </Button>
          <Button disabled={!valid} onClick={save}>
            <Check /> Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Último valor de distância registrado deste exercício. */
function lastKm(checkins: Checkin[], id: string) {
  for (let i = checkins.length - 1; i >= 0; i--)
    for (const se of checkins[i].exercises)
      if (se.exerciseId === id && se.done && se.distanceKm != null) return { date: checkins[i].date, v: se.distanceKm };
  return null;
}

/** Pergunta a distância (km) ao marcar um cardio como feito. */
function MetricDialog({
  open,
  ex,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  ex: Exercise;
  initial?: number;
  onClose: () => void;
  onSave: (v?: number) => void;
}) {
  const checkins = useApp((s) => s.checkins);
  const last = lastKm(checkins, ex.id);
  const [value, setValue] = useState('');
  const step = 0.1;
  const n = Number(value.replace(',', '.'));
  const valid = value !== '' && n > 0 && n <= 100;

  const bump = (d: number) => {
    const base = valid ? n : (last?.v ?? 0);
    setValue(fmtNum(Math.max(0, Math.round((base + d) / step) * step)));
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm" onOpenAutoFocus={() => setValue(initial != null ? fmtNum(initial) : last ? fmtNum(last.v) : '')}>
        <DialogHeader>
          <DialogTitle>Quantos km deram?</DialogTitle>
          <DialogDescription>{ex.nome} · olhe no painel do aparelho ou no app de corrida</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon-lg" className="size-12" onClick={() => bump(-step)} aria-label="Diminuir">
            <Minus />
          </Button>
          <div className="relative flex-1">
            <Input
              inputMode="decimal"
              value={value}
              onChange={(e) => setValue(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && valid && onSave(n)}
              placeholder="0"
              className="h-12 pr-10 text-center text-2xl font-bold"
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">km</span>
          </div>
          <Button variant="outline" size="icon-lg" className="size-12" onClick={() => bump(step)} aria-label="Aumentar">
            <Plus />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {last ? `Última vez: ${fmtNum(last.v)} km em ${fmtDate(last.date)}` : 'Primeiro registro deste exercício'}
        </p>

        <DialogFooter className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => onSave(undefined)}>
            Pular
          </Button>
          <Button disabled={!valid} onClick={() => onSave(n)}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Lista de exercícios equivalentes para trocar, e troca do grupo muscular inteiro. */
function SwapDialog({
  open,
  uid,
  current,
  onClose,
  onSwapped,
}: {
  open: boolean;
  uid: string;
  current: Exercise;
  onClose: () => void;
  onSwapped: () => void;
}) {
  const swapOptions = useApp((s) => s.swapOptions);
  const swapTo = useApp((s) => s.swapTo);
  const swapGroup = useApp((s) => s.swapGroup);
  const favorites = useApp((s) => s.profile?.equipment ?? []);
  const options = open ? swapOptions(uid).map((id) => EXERCISE_BY_ID[id]).filter(Boolean) : [];
  const [tab, setTab] = useState<'exercicio' | 'grupo'>('exercicio');
  const canGroup = current.grupo !== 'cardio';

  const toGroup = (g: Grupo) => {
    swapGroup(current.grupo, g);
    toast(`${GRUPO_NOME[current.grupo]} trocado por ${GRUPO_NOME[g]}.`, { description: 'Séries já feitas foram mantidas.' });
    onSwapped();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85dvh] max-w-sm flex-col" onOpenAutoFocus={() => setTab('exercicio')}>
        <DialogHeader>
          <DialogTitle>Trocar</DialogTitle>
          <DialogDescription>
            No lugar de <span className="text-foreground">{current.nome}</span>.
          </DialogDescription>
        </DialogHeader>

        {canGroup && (
          <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
            {(
              [
                ['exercicio', 'Só este exercício'],
                ['grupo', `Todo o grupo`],
              ] as const
            ).map(([id, nome]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn('h-8 rounded-md font-medium transition', tab === id ? 'bg-background shadow-sm' : 'text-muted-foreground')}
              >
                {nome}
              </button>
            ))}
          </div>
        )}

        {tab === 'grupo' && canGroup ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Hoje sem <span className="text-foreground">{GRUPO_NOME[current.grupo]}</span>? Os exercícios desse grupo que você ainda não começou
              viram exercícios do grupo escolhido.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ALL_GROUPS.filter((g) => g !== current.grupo).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => toGroup(g)}
                  className="flex h-11 items-center justify-between rounded-xl border px-3 text-sm font-medium transition hover:border-primary hover:bg-primary/10"
                >
                  {GRUPO_NOME[g]} <Shuffle className="size-3.5 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>
        ) : options.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Não há outra opção disponível para esse grupo.</p>
        ) : (
          <ul className="-mx-2 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
            {options.map((o) => {
              const fav = favorites.includes(o.equip);
              return (
                <li key={o.id}>
                  <button
                    onClick={() => {
                      swapTo(uid, o.id);
                      toast(`Trocado por ${o.nome}.`);
                      onSwapped();
                    }}
                    className="flex w-full items-center gap-3 rounded-xl border p-3 text-left transition hover:border-primary hover:bg-primary/10"
                  >
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-sm font-semibold leading-snug">
                        {o.nome}
                        {fav && <Star className="size-3.5 shrink-0 fill-primary text-primary" aria-label="Equipamento favorito" />}
                      </div>
                      <TagList tags={tagsOf(o)} small />
                    </div>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

