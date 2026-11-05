import { useState } from 'react';
import { Pencil, RotateCcw, Trash2 } from 'lucide-react';
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
import { useApp, useLevel, type Profile as P } from '@/store/useApp';

type Section = 'nome' | 'avatar' | 'nivel' | 'objetivo' | 'equipamentos' | 'altura' | null;

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

  const lvl = useLevel();
  const GoalIcon = GOAL_ICON[profile.goal];
  const LevelIcon = LEVEL_ICON[lvl.nivel];
  const goal = GOALS.find((g) => g.id === profile.goal)!;

  const open = (s: Section) => {
    setDraft(profile);
    setDraftLevel(lvl.nivel);
    setEdit(s);
  };
  const save = () => {
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
        </CardContent>
      </Card>

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
      <p className="text-center text-xs text-muted-foreground">Seus dados ficam só neste aparelho.</p>

      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[90dvh] max-w-sm overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {{ nome: 'Seu nome', avatar: 'Avatar', nivel: 'Nível', objetivo: 'Objetivo', equipamentos: 'Equipamentos favoritos', altura: 'Sua altura' }[edit ?? 'nome']}
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
          {edit === 'objetivo' && <GoalPicker value={draft.goal} onChange={(goal) => setDraft({ ...draft, goal })} />}
          {edit === 'equipamentos' && (
            <EquipPicker value={draft.equipment} onChange={(equipment) => setDraft({ ...draft, equipment })} />
          )}
          <DialogFooter>
            <Button
              onClick={save}
              disabled={
                (edit === 'equipamentos' && draft.equipment.length === 0) ||
                (edit === 'altura' && !(draft.heightCm && draft.heightCm >= 120 && draft.heightCm <= 230))
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
            <DialogDescription>Perfil, checkins e histórico de peso serão apagados deste aparelho.</DialogDescription>
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
