import { useState } from 'react';
import { ArrowLeft, Ban, ChevronDown, ChevronRight, HeartPulse, Minus, PartyPopper, Plus, RefreshCw, Route, Star, Timer, Weight } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { EXERCISE_BY_ID, tagsOf, type Exercise } from '@/data/exercises';
import { fmtDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { usesDistance, usesWeight, weightStep, type Checkin, type SessionExercise } from '@/lib/training';
import { useApp } from '@/store/useApp';
import { ANIMS } from '@/anim/library';
import { ExerciseFigure } from '@/anim/figure';

export function Workout({ onClose }: { onClose: () => void }) {
  const active = useApp((s) => s.active);
  const finishCheckin = useApp((s) => s.finishCheckin);
  const reopenCheckin = useApp((s) => s.reopenCheckin);
  const cancelCheckin = useApp((s) => s.cancelCheckin);
  const [confirm, setConfirm] = useState<'finish' | 'cancel' | null>(null);

  if (!active) return null;
  const done = active.exercises.filter((e) => e.done).length;
  const total = active.exercises.length;

  const finish = () => {
    const id = finishCheckin();
    setConfirm(null);
    toast.success('Checkin feito! Bom treino.', {
      duration: 8000,
      action: id ? { label: 'Desfazer', onClick: () => reopenCheckin(id) && toast('Treino reaberto. Está em andamento na tela inicial.') } : undefined,
    });
    onClose();
  };

  return (
    <div className="space-y-4">
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
          <ExerciseCard key={se.uid} se={se} index={i + 1} />
        ))}
      </div>

      <div className="space-y-2 pt-2">
        <Button
          size="lg"
          className="h-12 w-full text-base"
          onClick={() => (done === total ? finish() : setConfirm('finish'))}
        >
          <PartyPopper /> Finalizar checkin
        </Button>
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setConfirm('cancel')}>
          Descartar treino
        </Button>
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{confirm === 'finish' ? 'Finalizar o checkin?' : 'Descartar este treino?'}</DialogTitle>
            <DialogDescription>
              {confirm === 'finish'
                ? `Você marcou ${done} de ${total} exercícios. O checkin conta do mesmo jeito.`
                : 'Ele não vai contar como checkin.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            {confirm === 'finish' ? (
              <Button onClick={finish}>Finalizar</Button>
            ) : (
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
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ExerciseCard({ se, index }: { se: SessionExercise; index: number }) {
  const setDone = useApp((s) => s.setDone);
  const [ask, setAsk] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const markUnavailable = useApp((s) => s.markUnavailable);
  const [open, setOpen] = useState(false);
  const ex = EXERCISE_BY_ID[se.exerciseId];
  if (!ex) return null;
  const metric: 'kg' | 'km' | null = usesWeight(ex) ? 'kg' : usesDistance(ex) ? 'km' : null;
  const value = metric === 'kg' ? se.weightKg : metric === 'km' ? se.distanceKm : undefined;

  const toggle = () => {
    if (se.done) setDone(se.uid, false);
    else if (metric) setAsk(true);
    else setDone(se.uid, true);
  };

  const refresh = () => setSwapping(true);

  const unavailable = () => {
    const r = markUnavailable(se.uid);
    toast(`"${ex.nome}" não vai aparecer mais.`, {
      description: r === 'removed' ? 'Sem substituto parecido, então saiu do treino. Dá pra restaurar no Perfil.' : 'Dá pra restaurar no Perfil.',
    });
    setOpen(false);
  };

  return (
    <Card className={cn('gap-3 py-4 transition', se.done && 'opacity-60')}>
      <CardContent className="space-y-3 px-4">
        <div className="flex items-start gap-3">
          <Checkbox
            checked={se.done}
            onCheckedChange={toggle}
            className="mt-1 size-6 rounded-md"
            aria-label="Concluído"
          />
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
                  <Timer className="size-3.5" /> {se.restSec >= 120 ? `${se.restSec / 60} min` : `${se.restSec} s`}
                </span>
              </div>
            )}
          </button>
          {se.done && value != null && (
            <button
              onClick={() => setAsk(true)}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-primary/15 px-2 py-1 text-sm font-bold text-primary"
              aria-label={metric === 'kg' ? 'Editar carga' : 'Editar distância'}
            >
              {metric === 'kg' ? <Weight className="size-3.5" /> : <Route className="size-3.5" />} {fmtNum(value)} {metric}
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {tagsOf(ex).map((t) => (
            <Badge key={t} variant="secondary" className="font-normal">
              {t}
            </Badge>
          ))}
        </div>

        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs font-medium text-muted-foreground"
        >
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
          <Button variant="outline" size="sm" className="h-9" onClick={refresh}>
            <RefreshCw /> Trocar
          </Button>
          <Button variant="outline" size="sm" className="h-9 text-muted-foreground" onClick={unavailable}>
            <Ban /> Não disponível
          </Button>
        </div>
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
      {metric && (
        <MetricDialog
          open={ask}
          ex={ex}
          metric={metric}
          initial={value}
          onClose={() => setAsk(false)}
          onSave={(v) => {
            setDone(se.uid, true, metric === 'kg' ? { weightKg: v } : { distanceKm: v });
            setAsk(false);
          }}
        />
      )}
    </Card>
  );
}

const fmtNum = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Último valor registrado deste exercício (carga ou distância). */
function lastValue(checkins: Checkin[], id: string, metric: 'kg' | 'km') {
  for (let i = checkins.length - 1; i >= 0; i--)
    for (const se of checkins[i].exercises) {
      const v = metric === 'kg' ? se.weightKg : se.distanceKm;
      if (se.exerciseId === id && se.done && v != null) return { date: checkins[i].date, v };
    }
  return null;
}

/** Pergunta a carga (kg) ou a distância (km) ao marcar o exercício como feito. */
function MetricDialog({
  open,
  ex,
  metric,
  initial,
  onClose,
  onSave,
}: {
  open: boolean;
  ex: Exercise;
  metric: 'kg' | 'km';
  initial?: number;
  onClose: () => void;
  onSave: (v?: number) => void;
}) {
  const checkins = useApp((s) => s.checkins);
  const last = lastValue(checkins, ex.id, metric);
  const [value, setValue] = useState('');
  const step = metric === 'kg' ? weightStep(ex) : 0.1;
  const n = Number(value.replace(',', '.'));
  const valid = value !== '' && n > 0 && n <= (metric === 'kg' ? 500 : 100);

  const bump = (d: number) => {
    const base = valid ? n : (last?.v ?? 0);
    setValue(fmtNum(Math.max(0, Math.round((base + d) / step) * step)));
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (o) return;
        onClose();
      }}
    >
      <DialogContent
        className="max-w-sm"
        onOpenAutoFocus={() => setValue(initial != null ? fmtNum(initial) : last ? fmtNum(last.v) : '')}
      >
        <DialogHeader>
          <DialogTitle>{metric === 'kg' ? 'Qual carga você usou?' : 'Quantos km deram?'}</DialogTitle>
          <DialogDescription>
            {ex.nome}
            {ex.equip === 'halteres' && ' · peso de cada halter'}
            {metric === 'km' && ' · olhe no painel do aparelho ou no app de corrida'}
          </DialogDescription>
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
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">{metric}</span>
          </div>
          <Button variant="outline" size="icon-lg" className="size-12" onClick={() => bump(step)} aria-label="Aumentar">
            <Plus />
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          {last ? `Última vez: ${fmtNum(last.v)} ${metric} em ${fmtDate(last.date)}` : 'Primeiro registro deste exercício'}
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

/** Lista de exercícios equivalentes para trocar, em vez de sortear. */
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
  const favorites = useApp((s) => s.profile?.equipment ?? []);
  const options = open ? swapOptions(uid).map((id) => EXERCISE_BY_ID[id]).filter(Boolean) : [];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[85dvh] max-w-sm flex-col">
        <DialogHeader>
          <DialogTitle>Trocar exercício</DialogTitle>
          <DialogDescription>
            Opções no lugar de <span className="text-foreground">{current.nome}</span>, para o mesmo grupo muscular.
          </DialogDescription>
        </DialogHeader>
        {options.length === 0 ? (
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
                      <div className="flex flex-wrap gap-1">
                        {tagsOf(o).map((t) => (
                          <Badge key={t} variant="secondary" className="text-[11px] font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
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
