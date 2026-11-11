import { useState } from 'react';
import { AlertCircle, Check, ChevronDown, ChevronRight, Circle, CircleCheck, Info, Minus as Flat, Play, Plus, Route, Sparkles, Trash2, TrendingDown, TrendingUp, Weight } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, LineChart } from '@/components/charts';
import { GRUPO_NOME, EXERCISE_BY_ID, type Grupo } from '@/data/exercises';
import { fmtDate, weekStart } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { Checkin } from '@/lib/training';
import { bmi, buildSummary, type InsightTone } from '@/lib/insights';
import { levelCount, useApp } from '@/store/useApp';

export function Evolution({ onOpenWorkout }: { onOpenWorkout: () => void }) {
  const weights = useApp((s) => s.weights);
  const checkins = useApp((s) => s.checkins);
  const profile = useApp((s) => s.profile)!;
  const count = useApp(levelCount);
  const addWeight = useApp((s) => s.addWeight);
  const [kg, setKg] = useState('');
  const [detail, setDetail] = useState<Checkin | null>(null);

  const summary = buildSummary({
    checkins,
    weights,
    goal: profile.goal,
    levelCount: count,
    heightCm: profile.heightCm,
    currentKg: profile.weightKg,
  });
  const imc = bmi(weights.at(-1)?.kg ?? profile.weightKg, profile.heightCm);

  const save = () => {
    const v = Number(kg.replace(',', '.'));
    if (!(v >= 30 && v <= 300)) return toast.error('Informe um peso entre 30 e 300 kg.');
    addWeight(v);
    setKg('');
    toast.success('Peso registrado.');
  };

  const first = weights[0]?.kg;
  const lastW = weights.at(-1)?.kg;
  const delta = first != null && lastW != null ? lastW - first : 0;

  // Checkins nas últimas 8 semanas
  const now = weekStart(new Date());
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const s = new Date(now);
    s.setDate(s.getDate() - (7 - i) * 7);
    return s;
  });
  const bars = weeks.map((s) => {
    const e = new Date(s);
    e.setDate(e.getDate() + 7);
    const value = checkins.filter((c) => {
      const d = new Date(c.date);
      return d >= s && d < e;
    }).length;
    return { label: `${s.getDate()}/${s.getMonth() + 1}`, value };
  });

  // Grupos mais treinados
  const byGroup = new Map<Grupo, number>();
  for (const c of checkins)
    for (const se of c.exercises) {
      const ex = EXERCISE_BY_ID[se.exerciseId];
      if (ex && se.done) byGroup.set(ex.grupo, (byGroup.get(ex.grupo) ?? 0) + 1);
    }
  const groups = [...byGroup.entries()].sort((a, b) => b[1] - a[1]);
  const gmax = groups[0]?.[1] ?? 1;

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">Evolução</h1>

      <SummaryCard headline={summary.headline} insights={summary.insights} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Peso corporal</span>
            {weights.length > 1 && (
              <span className="flex items-center gap-1 text-sm font-normal text-muted-foreground">
                {delta > 0 ? <TrendingUp className="size-4" /> : <TrendingDown className="size-4" />}
                {delta > 0 ? '+' : ''}
                {delta.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} kg
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {imc && (
            <div className="flex items-center justify-between rounded-lg bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">IMC</span>
              <span>
                <span className="font-bold tabular-nums">{imc.value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>{' '}
                <span className="text-muted-foreground">· {imc.faixa}</span>
              </span>
            </div>
          )}
          <LineChart unit="kg" points={weights.slice(-20).map((w) => ({ label: fmtDate(w.date), value: w.kg }))} />
          <div className="flex gap-2">
            <Input
              inputMode="decimal"
              placeholder={lastW ? `Hoje (último: ${lastW} kg)` : 'Peso em kg'}
              value={kg}
              onChange={(e) => setKg(e.target.value.replace(/[^\d.,]/g, ''))}
              onKeyDown={(e) => e.key === 'Enter' && save()}
              className="h-10"
            />
            <Button className="h-10" onClick={save} disabled={!kg}>
              <Plus /> Registrar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Loads checkins={checkins} />

      <Card>
        <CardHeader>
          <CardTitle>Checkins por semana</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart bars={bars} />
        </CardContent>
      </Card>

      {groups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Exercícios feitos por grupo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {groups.map(([g, n]) => (
              <div key={g} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 text-muted-foreground">{GRUPO_NOME[g]}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(n / gmax) * 100}%` }} />
                </div>
                <span className="w-6 text-right tabular-nums">{n}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {checkins.length === 0 ? (
            <p className="text-sm text-muted-foreground">Seus checkins vão aparecer aqui.</p>
          ) : (
            <ul className="divide-y">
              {[...checkins].reverse().slice(0, 30).map((c) => (
                <li key={c.id}>
                  <button className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm" onClick={() => setDetail(c)}>
                    <div className="min-w-0">
                      <div className="truncate font-medium">{c.focus}</div>
                      <div className="text-xs text-muted-foreground">
                        {c.exercises.filter((e) => e.done).length}/{c.exercises.length} exercícios · {c.plannedMin} min
                      </div>
                    </div>
                    <span className="flex shrink-0 items-center gap-1 text-muted-foreground">
                      {fmtDate(c.date)} <ChevronRight className="size-4" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <CheckinDetail
        checkin={detail}
        onClose={() => setDetail(null)}
        onReopened={() => {
          setDetail(null);
          onOpenWorkout();
        }}
      />
    </div>
  );
}

const fmtKg = (kg: number) => kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Cargas registradas por exercício. Toque num exercício para ver o gráfico. */
function Loads({ checkins }: { checkins: Checkin[] }) {
  const [open, setOpen] = useState<string | null>(null);

  // Agrupa por exercício, guardando a ordem do registro mais recente
  const map = new Map<string, { date: string; kg: number }[]>();
  for (const c of checkins)
    for (const se of c.exercises)
      if (se.done && se.weightKg != null) {
        const arr = map.get(se.exerciseId) ?? [];
        arr.push({ date: c.date, kg: se.weightKg });
        map.set(se.exerciseId, arr);
      }
  const rows = [...map.entries()]
    .map(([id, pts]) => ({ id, pts, last: pts.at(-1)! }))
    .sort((a, b) => b.last.date.localeCompare(a.last.date));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cargas</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ao marcar um exercício como feito, informe a carga usada. Sua progressão aparece aqui.
          </p>
        ) : (
          <ul className="divide-y">
            {rows.map(({ id, pts, last }) => {
              const delta = last.kg - pts[0].kg;
              const isOpen = open === id;
              const Trend = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Flat;
              return (
                <li key={id} className="py-2">
                  <button className="flex w-full items-center gap-3 text-left" onClick={() => setOpen(isOpen ? null : id)}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{EXERCISE_BY_ID[id]?.nome ?? id}</div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Trend className={cn('size-3.5', delta > 0 && 'text-primary')} />
                        {pts.length > 1
                          ? `${delta > 0 ? '+' : ''}${fmtKg(delta)} kg desde ${fmtDate(pts[0].date)}`
                          : 'Primeiro registro'}
                      </div>
                    </div>
                    <span className="font-bold tabular-nums">{fmtKg(last.kg)} kg</span>
                    <ChevronDown className={cn('size-4 text-muted-foreground transition', isOpen && 'rotate-180')} />
                  </button>
                  {isOpen && (
                    <div className="pt-3">
                      <LineChart unit="kg" points={pts.slice(-20).map((p) => ({ label: fmtDate(p.date), value: p.kg }))} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const TONE: Record<InsightTone, { Icon: typeof Info; cls: string }> = {
  good: { Icon: TrendingUp, cls: 'text-primary' },
  neutral: { Icon: Info, cls: 'text-muted-foreground' },
  attention: { Icon: AlertCircle, cls: 'text-amber-400' },
};

function SummaryCard({ headline, insights }: ReturnType<typeof buildSummary>) {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" /> Resumo
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="font-semibold leading-snug">{headline}</p>
        {insights.length > 0 && (
          <ul className="space-y-2.5">
            {insights.map((i, k) => {
              const { Icon, cls } = TONE[i.tone];
              return (
                <li key={k} className="flex gap-2.5 text-sm leading-snug">
                  <Icon className={cn('mt-0.5 size-4 shrink-0', cls)} />
                  <span className="text-muted-foreground">{i.text}</span>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

const fmtN = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Detalhe de um treino encerrado, com opção de reabrir ou excluir. */
function CheckinDetail({ checkin, onClose, onReopened }: { checkin: Checkin | null; onClose: () => void; onReopened: () => void }) {
  const active = useApp((s) => s.active);
  const reopenCheckin = useApp((s) => s.reopenCheckin);
  const deleteCheckin = useApp((s) => s.deleteCheckin);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const c = checkin;

  return (
    <Dialog
      open={!!c}
      onOpenChange={(o) => {
        if (!o) {
          setConfirmDelete(false);
          onClose();
        }
      }}
    >
      {c && (
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{c.focus}</DialogTitle>
            <DialogDescription>
              {new Date(c.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })} ·{' '}
              {new Date(c.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · {c.plannedMin} min
            </DialogDescription>
          </DialogHeader>

          {c.rating && (
            <div className="space-y-1 rounded-lg bg-muted/60 px-3 py-2 text-sm">
              {c.rating.effort && (
                <div>
                  <span className="text-muted-foreground">Esforço: </span>
                  <span className="font-semibold">
                    {c.rating.effort}/5 · {['', 'Muito leve', 'Leve', 'Moderado', 'Pesado', 'Exaustivo'][c.rating.effort]}
                  </span>
                </div>
              )}
              {c.rating.note && <p className="text-muted-foreground">{c.rating.note}</p>}
            </div>
          )}

          <ul className="space-y-2">
            {c.exercises.map((se) => {
              const ex = EXERCISE_BY_ID[se.exerciseId];
              const rows = se.log?.filter((r) => r.done) ?? [];
              return (
                <li key={se.uid} className="flex items-start gap-2.5 text-sm">
                  {se.done ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-primary" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
                  <span className={cn('min-w-0 flex-1', !se.done && 'text-muted-foreground')}>
                    {ex?.nome ?? se.exerciseId}
                    {rows.length > 0 && (
                      <span className="block text-xs text-muted-foreground">
                        {rows.length} {rows.length === 1 ? 'série' : 'séries'}: {rows.map((r) => (r.kg != null ? `${fmtN(r.kg)}×${r.reps ?? '–'}` : `${r.reps ?? '–'}${ex?.tempo ? ' s' : ''}`)).join(', ')}
                      </span>
                    )}
                  </span>
                  {se.weightKg != null && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      <Weight className="size-3" /> {fmtN(se.weightKg)} kg
                    </span>
                  )}
                  {se.distanceKm != null && (
                    <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-primary">
                      <Route className="size-3" /> {fmtN(se.distanceKm)} km
                    </span>
                  )}
                </li>
              );
            })}
          </ul>

          {active && <p className="text-xs text-muted-foreground">Para reabrir, finalize ou descarte o treino em andamento primeiro.</p>}

          <DialogFooter className="grid grid-cols-2 gap-2">
            {confirmDelete ? (
              <Button
                variant="destructive"
                onClick={() => {
                  deleteCheckin(c.id);
                  setConfirmDelete(false);
                  onClose();
                  toast('Checkin excluído.');
                }}
              >
                <Check /> Confirmar
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setConfirmDelete(true)}>
                <Trash2 /> Excluir
              </Button>
            )}
            <Button
              disabled={!!active}
              onClick={() => {
                if (reopenCheckin(c.id)) {
                  toast('Treino reaberto.');
                  onReopened();
                }
              }}
            >
              <Play /> Reabrir treino
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
