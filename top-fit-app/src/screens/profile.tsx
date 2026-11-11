import { useRef, useState } from 'react';
import { Check, ClipboardCopy, Download, FileUp, Moon, Monitor, Pencil, RotateCcw, Share2, Sun, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AvatarView } from '@/components/avatar';
import { AvatarPicker, EquipPicker, GoalPicker, LevelPicker } from '@/components/profile-fields';
import { GOAL_ICON, LEVEL_ICON } from '@/components/icons';
import { EQUIP_LABEL, EXERCISE_BY_ID } from '@/data/exercises';
import { GOALS, type Nivel } from '@/lib/training';
import { ACCENTS, MODES, type ThemeMode } from '@/lib/theme';
import { aiText, buildBackup, buildExport, parseBackup, PERIODS, shareOrDownload, stamp, type Period } from '@/lib/export';
import { cn } from '@/lib/utils';
import { useApp, useLevel, type Profile as P } from '@/store/useApp';

type Section = 'nome' | 'avatar' | 'nivel' | 'objetivo' | 'equipamentos' | 'altura' | 'trajeto' | null;

export function Profile() {
  const profile = useApp((s) => s.profile)!;
  const blocked = useApp((s) => s.blocked);
  const unblock = useApp((s) => s.unblock);
  const saveProfile = useApp((s) => s.saveProfile);
  const resetAll = useApp((s) => s.resetAll);
  const setLevel = useApp((s) => s.setLevel);
  const [edit, setEdit] = useState<Section>(null);
  const [draft, setDraft] = useState<P>(profile);
  const [confirmReset, setConfirmReset] = useState(false);
  const [draftLevel, setDraftLevel] = useState<Nivel>(1);
  const setCommute = useApp((s) => s.setCommute);
  const [km, setKm] = useState('');
  const [walkMin, setWalkMin] = useState('');

  const lvl = useLevel();
  const GoalIcon = GOAL_ICON[profile.goal];
  const LevelIcon = LEVEL_ICON[lvl.nivel];
  const goal = GOALS.find((g) => g.id === profile.goal)!;

  const open = (s: Section) => {
    setDraft(profile);
    setDraftLevel(lvl.nivel);
    setKm(profile.commute ? String(profile.commute.km).replace('.', ',') : '');
    setWalkMin(profile.commute ? String(profile.commute.minutes) : '');
    setEdit(s);
  };
  const kmN = Number(km.replace(',', '.'));
  const minN = Number(walkMin);
  const save = () => {
    if (edit === 'trajeto') {
      setCommute(km || walkMin ? { km: kmN, minutes: minN } : undefined);
      setEdit(null);
      toast.success(km || walkMin ? 'Trajeto salvo.' : 'Trajeto removido.');
      return;
    }
    if (edit === 'nivel') {
      if (draftLevel !== lvl.nivel) setLevel(draftLevel);
      setEdit(null);
      toast.success('Nível atualizado.');
      return;
    }
    saveProfile({ ...draft, name: draft.name.trim() || profile.name });
    setEdit(null);
    toast.success('Perfil atualizado.');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col items-center gap-3 pt-2 text-center">
        <button onClick={() => open('avatar')} className="relative">
          <AvatarView avatar={profile.avatar} className="size-24" />
          <span className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Pencil className="size-3.5" />
          </span>
        </button>
        <button onClick={() => open('nome')} className="text-2xl font-bold">
          {profile.name}
        </button>
        <Badge>{lvl.nome}</Badge>
      </div>

      <Card>
        <CardContent className="divide-y">
          <Row
            label="Nível"
            value={
              <span className="flex items-center gap-2">
                <LevelIcon className="size-4 text-primary" /> {lvl.nome}
              </span>
            }
            onClick={() => open('nivel')}
          />
          <Row
            label="Objetivo"
            value={
              <span className="flex items-center gap-2">
                <GoalIcon className="size-4 text-primary" /> {goal.nome}
              </span>
            }
            onClick={() => open('objetivo')}
          />
          <Row
            label="Equipamentos"
            value={profile.equipment.map((e) => EQUIP_LABEL[e]).join(', ')}
            onClick={() => open('equipamentos')}
          />
          <Row
            label="Altura"
            value={profile.heightCm ? `${profile.heightCm} cm` : 'Não informada'}
            hint={profile.heightCm ? undefined : 'Informe para ver seu IMC na Evolução'}
            onClick={() => open('altura')}
          />
          <Row label="Peso atual" value={`${profile.weightKg.toLocaleString('pt-BR')} kg`} hint="Registre na aba Evolução" />
          <Row
            label="Caminhada até a academia"
            value={profile.commute ? `${profile.commute.km.toLocaleString('pt-BR')} km · ${profile.commute.minutes} min (ida e volta)` : 'Não cadastrada'}
            hint={profile.commute ? undefined : 'Se vai a pé, conta como cardio no checkin'}
            onClick={() => open('trajeto')}
          />
        </CardContent>
      </Card>

      <Appearance />

      <DataCard />

      <Card>
        <CardHeader>
          <CardTitle>Exercícios indisponíveis</CardTitle>
        </CardHeader>
        <CardContent>
          {blocked.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nenhum. Quando você tocar em "Não disponível" num exercício, ele aparece aqui.
            </p>
          ) : (
            <ul className="divide-y">
              {blocked.map((id) => (
                <li key={id} className="flex items-center justify-between gap-2 py-2 text-sm">
                  <span>{EXERCISE_BY_ID[id]?.nome ?? id}</span>
                  <Button variant="ghost" size="sm" onClick={() => unblock(id)}>
                    <RotateCcw /> Restaurar
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Button variant="destructive" className="w-full" onClick={() => setConfirmReset(true)}>
        <Trash2 /> Apagar todos os dados
      </Button>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {{ nome: 'Seu nome', avatar: 'Avatar', nivel: 'Nível', objetivo: 'Objetivo', equipamentos: 'Equipamentos favoritos', altura: 'Sua altura', trajeto: 'Caminhada até a academia' }[edit ?? 'nome']}
            </DialogTitle>
          </DialogHeader>
          {edit === 'nome' && (
            <div className="space-y-2">
              <Label htmlFor="nome">Nome</Label>
              <Input id="nome" value={draft.name} maxLength={30} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
          )}
          {edit === 'avatar' && (
            <AvatarPicker value={draft.avatar} name={profile.name} onChange={(avatar) => setDraft({ ...draft, avatar })} />
          )}
          {edit === 'nivel' && <LevelPicker value={draftLevel} onChange={setDraftLevel} />}
          {edit === 'altura' && (
            <div className="space-y-2">
              <Label htmlFor="altura">Altura (cm)</Label>
              <Input
                id="altura"
                inputMode="numeric"
                placeholder="170"
                value={draft.heightCm ?? ''}
                onChange={(e) => {
                  const v = e.target.value.replace(/[^\d]/g, '').slice(0, 3);
                  setDraft({ ...draft, heightCm: v ? Number(v) : undefined });
                }}
              />
            </div>
          )}
          {edit === 'trajeto' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ida e volta somadas. No checkin, marque "Fui a pé" e isso conta como cardio sem ocupar o tempo da academia.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="km">Distância (km)</Label>
                  <Input id="km" inputMode="decimal" placeholder="2" value={km} onChange={(e) => setKm(e.target.value.replace(/[^\d.,]/g, ''))} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="walkmin">Tempo (min)</Label>
                  <Input id="walkmin" inputMode="numeric" placeholder="20" value={walkMin} onChange={(e) => setWalkMin(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">Deixe os dois vazios para remover.</p>
            </div>
          )}
          {edit === 'objetivo' && <GoalPicker value={draft.goal} onChange={(goal) => setDraft({ ...draft, goal })} />}
          {edit === 'equipamentos' && (
            <EquipPicker value={draft.equipment} onChange={(equipment) => setDraft({ ...draft, equipment })} />
          )}
          <DialogFooter>
            <Button
              onClick={save}
              disabled={
                (edit === 'equipamentos' && draft.equipment.length === 0) ||
                (edit === 'altura' && !(draft.heightCm && draft.heightCm >= 120 && draft.heightCm <= 230)) ||
                (edit === 'trajeto' && (km !== '' || walkMin !== '') && !(kmN > 0 && kmN <= 50 && minN > 0 && minN <= 300))
              }
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmReset} onOpenChange={setConfirmReset}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Apagar tudo?</DialogTitle>
            <DialogDescription>Perfil, checkins, diário e histórico de peso serão apagados deste aparelho. Faça um backup antes, se quiser guardar.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmReset(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={resetAll}>
              Apagar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({ label, value, hint, onClick }: { label: string; value: React.ReactNode; hint?: string; onClick?: () => void }) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp onClick={onClick} className="flex w-full items-center justify-between gap-4 py-3 text-left first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-medium">{value}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {onClick && <Pencil className="size-4 shrink-0 text-muted-foreground" />}
    </Comp>
  );
}

const MODE_ICON: Record<ThemeMode, typeof Sun> = { escuro: Moon, claro: Sun, sistema: Monitor };

function Appearance() {
  const theme = useApp((s) => s.theme);
  const setTheme = useApp((s) => s.setTheme);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Aparência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-1.5">
          {MODES.map((m) => {
            const Icon = MODE_ICON[m.id];
            const on = theme.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => setTheme({ mode: m.id })}
                className={cn(
                  'flex h-10 items-center justify-center gap-1.5 rounded-lg border text-sm font-medium transition',
                  on ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/50',
                )}
              >
                <Icon className="size-4" /> {m.nome}
              </button>
            );
          })}
        </div>
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">Cor de destaque</div>
          <div className="flex flex-wrap gap-2.5">
            {ACCENTS.map((a) => {
              const on = theme.accent === a.id;
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setTheme({ accent: a.id })}
                  aria-label={a.nome}
                  title={a.nome}
                  className={cn('flex size-10 items-center justify-center rounded-full ring-offset-2 ring-offset-card transition', on && 'ring-2 ring-foreground')}
                  style={{ background: a.swatch }}
                >
                  {on && <Check className="size-5 text-black/80" />}
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/** Exportar para IA (por período) e backup/restauração completos. */
function DataCard() {
  const restore = useApp((s) => s.restore);
  const [period, setPeriod] = useState<Period>('semana');
  const [pending, setPending] = useState<ReturnType<typeof parseBackup> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const exp = () => buildExport(useApp.getState(), period);
  const counts = (() => {
    const e = exp();
    return `${e.treinos.length} ${e.treinos.length === 1 ? 'treino' : 'treinos'}, ${e.atividades_do_dia_a_dia.length} ${e.atividades_do_dia_a_dia.length === 1 ? 'atividade' : 'atividades'}, ${e.refeicoes.length} ${e.refeicoes.length === 1 ? 'refeição' : 'refeições'}`;
  })();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(aiText(exp()));
      toast.success('Copiado com as instruções.', { description: 'Cole no ChatGPT, Claude ou outra IA.' });
    } catch {
      toast.error('Não deu para copiar. Use "Arquivo JSON".');
    }
  };
  const file = async () => {
    const r = await shareOrDownload(`top-fit-${period}-${stamp()}.json`, JSON.stringify(exp(), null, 2));
    if (r === 'downloaded') toast.success('Arquivo baixado.');
  };
  const backup = async () => {
    const r = await shareOrDownload(`top-fit-backup-${stamp()}.json`, JSON.stringify(buildBackup(useApp.getState())));
    if (r === 'downloaded') toast.success('Backup baixado. Guarde num lugar seguro.');
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
    } catch (e) {
      toast.error((e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Seus dados</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <div className="text-sm font-medium">Exportar para uma IA analisar</div>
          <div className="grid grid-cols-3 gap-1.5">
            {PERIODS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPeriod(p.id)}
                className={cn(
                  'h-9 rounded-lg border text-xs font-semibold transition',
                  period === p.id ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/50',
                )}
              >
                {p.nome}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{counts}</p>
          <div className="grid grid-cols-2 gap-2">
            <Button className="h-10" onClick={copy}>
              <ClipboardCopy /> Copiar para IA
            </Button>
            <Button variant="outline" className="h-10" onClick={file}>
              <Share2 /> Arquivo JSON
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">"Copiar para IA" já leva um pedido de análise junto com os dados.</p>
        </div>

        <div className="space-y-2 border-t pt-4">
          <div className="text-sm font-medium">Backup</div>
          <p className="text-xs text-muted-foreground">
            Seus dados ficam só neste aparelho. Se limpar o navegador ou trocar de celular, restaure por aqui.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="h-10" onClick={backup}>
              <Download /> Fazer backup
            </Button>
            <Button variant="outline" className="h-10" onClick={() => fileRef.current?.click()}>
              <FileUp /> Restaurar
            </Button>
          </div>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
        </div>
      </CardContent>

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restaurar este backup?</DialogTitle>
            <DialogDescription>
              {pending &&
                `${pending.checkins?.length ?? 0} checkins, ${pending.activities?.length ?? 0} atividades e ${pending.meals?.length ?? 0} refeições${pending.profile ? ` de ${pending.profile.name}` : ''}. `}
              Tudo o que está neste aparelho agora será substituído.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                restore(pending!);
                setPending(null);
                toast.success('Backup restaurado.');
              }}
            >
              <RotateCcw /> Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
