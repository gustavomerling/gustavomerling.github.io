import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { AvatarPicker, EquipPicker, GoalPicker, LevelPicker } from '@/components/profile-fields';
import { randomAvatar } from '@/components/avatar';
import type { Equip } from '@/data/exercises';
import type { Goal, Nivel } from '@/lib/training';
import { useApp, type Avatar } from '@/store/useApp';

const STEPS = ['nome', 'avatar', 'nivel', 'objetivo', 'peso', 'equipamentos'] as const;

export function Onboarding() {
  const saveProfile = useApp((s) => s.saveProfile);
  const setLevel = useApp((s) => s.setLevel);
  const [step, setStep] = useState(-1);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<Avatar>(() => randomAvatar());
  const [nivel, setNivel] = useState<Nivel | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [equipment, setEquipment] = useState<Equip[]>([]);

  const kg = Number(weight.replace(',', '.'));
  const cm = Number(height.replace(',', '.'));
  const valid = [name.trim().length > 0, true, !!nivel, !!goal, kg >= 30 && kg <= 300 && cm >= 120 && cm <= 230, equipment.length > 0];

  const next = () => {
    if (step < STEPS.length - 1) return setStep(step + 1);
    saveProfile({ name: name.trim(), avatar, goal: goal!, weightKg: kg, heightCm: cm, equipment });
    setLevel(nivel!);
  };

  if (step === -1) {
    return (
      <div className="pt-safe pb-safe flex min-h-dvh flex-col items-center justify-between px-6 text-center">
        <div />
        <div className="space-y-6">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" className="mx-auto size-24 rounded-3xl" />
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              T.O.P. <span className="text-primary">Fit</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Treinos Organizados e Práticos</p>
          </div>
          <p className="mx-auto max-w-xs text-sm text-muted-foreground">
            Faça checkin, receba um treino que completa o anterior e acompanhe sua evolução.
          </p>
        </div>
        <Button size="lg" className="mb-4 h-12 w-full max-w-sm text-base" onClick={() => setStep(0)}>
          Começar
        </Button>
      </div>
    );
  }

  const title = {
    nome: 'Como podemos te chamar?',
    avatar: 'Monte seu avatar',
    nivel: 'Qual é o seu nível?',
    objetivo: 'Qual é o seu objetivo?',
    peso: 'Seu peso e sua altura',
    equipamentos: 'Quais equipamentos você prefere?',
  }[STEPS[step]];

  const hint = {
    nome: '',
    avatar: 'Escolha ícone, cor e fundo, ou use uma foto.',
    nivel: 'Você sobe de nível automaticamente conforme faz checkins.',
    objetivo: 'Isso define séries, repetições e descanso.',
    peso: 'Servem para acompanhar sua evolução e calcular o IMC.',
    equipamentos: 'Os treinos vão priorizar esses. Dá pra marcar vários.',
  }[STEPS[step]];

  return (
    <div className="pt-safe pb-safe mx-auto flex min-h-dvh max-w-md flex-col px-5">
      <div className="flex items-center gap-3 py-2">
        <Button variant="ghost" size="icon" onClick={() => setStep(step - 1)} aria-label="Voltar">
          <ArrowLeft />
        </Button>
        <Progress value={((step + 1) / STEPS.length) * 100} className="flex-1" />
        <span className="w-8 text-right text-xs text-muted-foreground">
          {step + 1}/{STEPS.length}
        </span>
      </div>

      <div className="mt-6 flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
        </div>

        {STEPS[step] === 'nome' && (
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && valid[0] && next()}
            placeholder="Seu nome"
            className="h-12 text-lg"
            maxLength={30}
          />
        )}
        {STEPS[step] === 'avatar' && <AvatarPicker value={avatar} onChange={setAvatar} name={name} />}
        {STEPS[step] === 'nivel' && <LevelPicker value={nivel} onChange={setNivel} />}
        {STEPS[step] === 'objetivo' && <GoalPicker value={goal} onChange={setGoal} />}
        {STEPS[step] === 'peso' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="space-y-1.5">
              <span className="text-sm text-muted-foreground">Peso</span>
              <div className="relative">
                <Input
                  autoFocus
                  inputMode="decimal"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value.replace(/[^\d.,]/g, ''))}
                  placeholder="70"
                  className="h-14 pr-10 text-center text-3xl font-bold"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">kg</span>
              </div>
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-muted-foreground">Altura</span>
              <div className="relative">
                <Input
                  inputMode="numeric"
                  value={height}
                  onChange={(e) => setHeight(e.target.value.replace(/[^\d]/g, '').slice(0, 3))}
                  onKeyDown={(e) => e.key === 'Enter' && valid[4] && next()}
                  placeholder="170"
                  className="h-14 pr-10 text-center text-3xl font-bold"
                />
                <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground">cm</span>
              </div>
            </label>
          </div>
        )}
        {STEPS[step] === 'equipamentos' && <EquipPicker value={equipment} onChange={setEquipment} />}
      </div>

      <Button size="lg" className="my-4 h-12 text-base" disabled={!valid[step]} onClick={next}>
        {step === STEPS.length - 1 ? 'Montar meus treinos' : 'Continuar'}
      </Button>
    </div>
  );
}
