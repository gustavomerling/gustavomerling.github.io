import { EXERCISE_BY_ID, GRUPO_NOME, type Grupo } from '@/data/exercises';
import { levelInfo, type Checkin, type Goal } from '@/lib/training';
import type { WeightEntry } from '@/store/useApp';
import { weekStreak } from '@/lib/dates';

export type InsightTone = 'good' | 'neutral' | 'attention';
export type InsightKind = 'frequencia' | 'peso' | 'imc' | 'carga' | 'equilibrio' | 'cardio' | 'nivel' | 'constancia';

export interface Insight {
  kind: InsightKind;
  tone: InsightTone;
  text: string;
}

export interface Summary {
  headline: string;
  insights: Insight[];
}

const DAY = 864e5;
const fmt = (n: number, d = 1) => n.toLocaleString('pt-BR', { maximumFractionDigits: d });
const plural = (n: number, um: string, varios: string) => `${fmt(n, 0)} ${n === 1 ? um : varios}`;

/** IMC com a faixa da OMS. */
export function bmi(kg: number, cm?: number) {
  if (!cm || cm < 100) return null;
  const value = kg / (cm / 100) ** 2;
  const faixa =
    value < 18.5 ? 'abaixo do peso' : value < 25 ? 'peso normal' : value < 30 ? 'sobrepeso' : value < 35 ? 'obesidade grau I' : value < 40 ? 'obesidade grau II' : 'obesidade grau III';
  const tone: InsightTone = value >= 18.5 && value < 25 ? 'good' : value < 30 && value >= 18.5 ? 'neutral' : 'attention';
  // Peso da faixa normal para essa altura
  const m2 = (cm / 100) ** 2;
  return { value, faixa, tone, min: 18.5 * m2, max: 24.9 * m2 };
}

const MAIN_GROUPS: Grupo[] = ['peito', 'costas', 'ombros', 'biceps', 'triceps', 'quadriceps', 'posterior', 'gluteos', 'core'];

export function buildSummary(input: {
  checkins: Checkin[];
  weights: WeightEntry[];
  goal: Goal;
  levelCount: number;
  heightCm?: number;
  currentKg?: number;
  now?: number;
}): Summary {
  const { checkins, weights, goal } = input;
  const now = input.now ?? Date.now();
  const insights: Insight[] = [];

  if (!checkins.length) {
    return {
      headline: 'Faça seu primeiro checkin para começar a ver sua evolução.',
      insights: [],
    };
  }

  const since = (days: number) => checkins.filter((c) => now - new Date(c.date).getTime() < days * DAY);
  const last28 = since(28);
  const prev28 = checkins.filter((c) => {
    const age = now - new Date(c.date).getTime();
    return age >= 28 * DAY && age < 56 * DAY;
  });
  const perWeek = last28.length / 4;
  const prevPerWeek = prev28.length / 4;
  const firstAge = (now - new Date(checkins[0].date).getTime()) / DAY;

  // ---------- Frequência ----------
  if (firstAge < 14) {
    insights.push({
      kind: 'frequencia',
      tone: 'good',
      text: `Você fez ${plural(checkins.length, 'treino', 'treinos')} desde que começou. Bom começo: o mais importante agora é criar o hábito.`,
    });
  } else {
    let tone: InsightTone = perWeek >= 3 ? 'good' : perWeek >= 2 ? 'neutral' : 'attention';
    let text = `Média de ${fmt(perWeek)} ${perWeek === 1 ? 'treino' : 'treinos'} por semana no último mês`;
    if (prev28.length) {
      const diff = perWeek - prevPerWeek;
      if (diff >= 0.5) text += `, acima do mês anterior (${fmt(prevPerWeek)}).`;
      else if (diff <= -0.5) {
        text += `, abaixo do mês anterior (${fmt(prevPerWeek)}).`;
        if (tone === 'good') tone = 'neutral';
      } else text += ', parecida com o mês anterior.';
    } else text += '.';
    if (perWeek < 2) text += ' Tente chegar a 2 ou 3 por semana para ver resultado.';
    insights.push({ kind: 'frequencia', tone, text });
  }

  const lastAge = Math.floor((now - new Date(checkins.at(-1)!.date).getTime()) / DAY);
  if (lastAge >= 5) {
    insights.push({
      kind: 'constancia',
      tone: 'attention',
      text: `Seu último treino foi há ${lastAge} dias. Um treino curto de 20 minutos já ajuda a retomar o ritmo.`,
    });
  }

  const streak = weekStreak(checkins.map((c) => c.date), new Date(now));
  if (streak >= 3) {
    insights.push({ kind: 'constancia', tone: 'good', text: `${streak} semanas seguidas treinando. A constância é o que mais faz diferença.` });
  }

  // ---------- Peso corporal ----------
  if (weights.length >= 2) {
    const first = weights[0];
    const last = weights.at(-1)!;
    const delta = last.kg - first.kg;
    const days = Math.max(1, Math.round((new Date(last.date).getTime() - new Date(first.date).getTime()) / DAY));
    const periodo = days < 14 ? `em ${days} dias` : days < 60 ? `em ${Math.round(days / 7)} semanas` : `em ${Math.round(days / 30)} meses`;
    const abs = Math.abs(delta);
    let tone: InsightTone = 'neutral';
    let text: string;
    if (abs < 0.5) {
      text = `Seu peso está estável (${fmt(last.kg)} kg) ${periodo}.`;
      if (goal === 'emagrecimento') text += ' Para emagrecer, a alimentação costuma pesar mais que o treino.';
    } else if (delta < 0) {
      text = `Você perdeu ${fmt(abs)} kg ${periodo} (de ${fmt(first.kg)} para ${fmt(last.kg)} kg).`;
      tone = goal === 'emagrecimento' || goal === 'saude' ? 'good' : goal === 'hipertrofia' ? 'attention' : 'neutral';
      if (goal === 'hipertrofia') text += ' Para ganhar massa, vale comer um pouco mais.';
    } else {
      text = `Você ganhou ${fmt(abs)} kg ${periodo} (de ${fmt(first.kg)} para ${fmt(last.kg)} kg).`;
      tone = goal === 'hipertrofia' || goal === 'forca' ? 'good' : goal === 'emagrecimento' ? 'attention' : 'neutral';
    }
    // Ritmo de perda muito rápido
    const perWeekKg = (delta / days) * 7;
    if (perWeekKg < -1 && days >= 14) {
      tone = 'attention';
      text += ' É um ritmo rápido: mais de 1 kg por semana.';
    }
    insights.push({ kind: 'peso', tone, text });
  } else {
    insights.push({ kind: 'peso', tone: 'neutral', text: 'Registre seu peso de vez em quando na aba Evolução para acompanhar a tendência.' });
  }

  // ---------- IMC ----------
  const kgNow = weights.at(-1)?.kg ?? input.currentKg;
  const imc = kgNow != null ? bmi(kgNow, input.heightCm) : null;
  if (imc) {
    let text = `Seu IMC é ${fmt(imc.value)} (${imc.faixa}).`;
    if (imc.value >= 25 && goal === 'hipertrofia') text += ' Quem ganha muita massa muscular pode ter IMC alto sem excesso de gordura.';
    else if (imc.value >= 25) text += ` A faixa normal para a sua altura vai de ${fmt(imc.min, 0)} a ${fmt(imc.max, 0)} kg.`;
    else if (imc.value < 18.5) text += ' Vale conversar com um profissional sobre alimentação.';
    insights.push({ kind: 'imc', tone: imc.tone, text });
  } else if (!input.heightCm) {
    insights.push({ kind: 'imc', tone: 'neutral', text: 'Informe sua altura no Perfil para ver o IMC.' });
  }

  // ---------- Cargas ----------
  const loads = new Map<string, number[]>();
  for (const c of checkins)
    for (const se of c.exercises)
      if (se.done && se.weightKg != null) loads.set(se.exerciseId, [...(loads.get(se.exerciseId) ?? []), se.weightKg]);
  const progress = [...loads.entries()]
    .filter(([, v]) => v.length >= 2)
    .map(([id, v]) => ({ id, first: v[0], last: v.at(-1)!, pct: v[0] > 0 ? (v.at(-1)! - v[0]) / v[0] : 0, tail: v.slice(-3) }));
  const up = progress.filter((p) => p.last > p.first).sort((a, b) => b.pct - a.pct);
  const stuck = progress.filter((p) => p.tail.length === 3 && p.tail.every((x) => x === p.tail[0]));

  if (up.length) {
    const best = up[0];
    const nome = EXERCISE_BY_ID[best.id]?.nome ?? best.id;
    insights.push({
      kind: 'carga',
      tone: 'good',
      text:
        `Sua carga subiu em ${plural(up.length, 'exercício', 'exercícios')}. Destaque: ${nome}, de ${fmt(best.first)} para ${fmt(best.last)} kg (+${fmt(best.pct * 100, 0)}%).`,
    });
  } else if (loads.size && !progress.length) {
    insights.push({
      kind: 'carga',
      tone: 'neutral',
      text: 'Continue registrando as cargas: a partir do segundo registro de um exercício dá para ver a progressão.',
    });
  } else if (!loads.size) {
    insights.push({
      kind: 'carga',
      tone: 'neutral',
      text: 'Ao marcar um exercício com carga, informe o peso usado. Assim dá para ver se você está ficando mais forte.',
    });
  }
  if (stuck.length) {
    const nome = EXERCISE_BY_ID[stuck[0].id]?.nome ?? stuck[0].id;
    insights.push({
      kind: 'carga',
      tone: 'neutral',
      text:
        stuck.length === 1
          ? `${nome} está com a mesma carga há 3 treinos. Se as repetições estão saindo fáceis, tente subir um pouco.`
          : `${stuck.length} exercícios estão com a mesma carga há 3 treinos (ex.: ${nome}). Se estiver fácil, suba um pouco.`,
    });
  }

  // ---------- Equilíbrio entre grupos (últimos 21 dias) ----------
  if (firstAge >= 10) {
    const lastSeen = new Map<Grupo, number>();
    for (const c of checkins)
      for (const se of c.exercises) {
        const ex = EXERCISE_BY_ID[se.exerciseId];
        if (ex && se.done) lastSeen.set(ex.grupo, new Date(c.date).getTime());
      }
    const forgotten = MAIN_GROUPS.filter((g) => !lastSeen.has(g) || now - lastSeen.get(g)! > 14 * DAY);
    if (forgotten.length && forgotten.length <= 4) {
      const nomes = forgotten.map((g) => GRUPO_NOME[g].toLowerCase());
      const lista = nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes.at(-1)}` : nomes[0];
      insights.push({
        kind: 'equilibrio',
        tone: 'attention',
        text: `Faz mais de 2 semanas que você não treina ${lista}. Se for falta de máquina, use "Não disponível" que o app troca.`,
      });
    } else if (!forgotten.length && last28.length >= 4) {
      insights.push({ kind: 'equilibrio', tone: 'good', text: 'Todos os grupos musculares foram treinados nas últimas 2 semanas. Treino equilibrado.' });
    }
  }

  // ---------- Exercícios completos ----------
  const recent = checkins.slice(-6);
  const total = recent.reduce((a, c) => a + c.exercises.length, 0);
  const done = recent.reduce((a, c) => a + c.exercises.filter((e) => e.done).length, 0);
  if (total >= 10) {
    const rate = done / total;
    if (rate < 0.7)
      insights.push({
        kind: 'constancia',
        tone: 'attention',
        text: `Nos últimos treinos você completou ${fmt(rate * 100, 0)}% dos exercícios. Talvez valha escolher um tempo menor no checkin.`,
      });
    else if (rate >= 0.95)
      insights.push({ kind: 'constancia', tone: 'good', text: 'Você está completando praticamente todos os exercícios dos treinos.' });
  }

  // ---------- Cardio (últimos 28 dias) ----------
  const cardioMin = last28.reduce(
    (a, c) => a + c.exercises.filter((e) => e.done && EXERCISE_BY_ID[e.exerciseId]?.grupo === 'cardio').reduce((s, e) => s + (e.minutes ?? 0), 0),
    0,
  );
  const cardioWeek = cardioMin / 4;
  const km = last28.reduce((a, c) => a + c.exercises.reduce((s, e) => s + (e.done && e.distanceKm ? e.distanceKm : 0), 0), 0);
  if (cardioMin > 0) {
    const tone: InsightTone = cardioWeek >= 60 ? 'good' : 'neutral';
    let text = `${fmt(cardioMin, 0)} minutos de cardio no último mês (~${fmt(cardioWeek, 0)} por semana)`;
    text += km > 0 ? `, somando ${fmt(km)} km.` : '.';
    if (cardioWeek < 60 && (goal === 'emagrecimento' || goal === 'saude')) text += ' Para o seu objetivo, mirar em 90 a 150 min por semana ajuda.';
    insights.push({ kind: 'cardio', tone, text });
  } else if ((goal === 'emagrecimento' || goal === 'saude') && last28.length >= 2) {
    insights.push({ kind: 'cardio', tone: 'attention', text: 'Nenhum cardio no último mês. Para o seu objetivo, inclua alguns minutos no checkin.' });
  }

  // ---------- Nível ----------
  const lvl = levelInfo(input.levelCount);
  if (lvl.next) {
    const weeks = perWeek > 0 ? Math.ceil(lvl.faltam / perWeek) : null;
    insights.push({
      kind: 'nivel',
      tone: 'neutral',
      text:
        `Faltam ${plural(lvl.faltam, 'checkin', 'checkins')} para o nível ${lvl.next.nome}` +
        (weeks && weeks <= 52 ? `; no seu ritmo atual, umas ${plural(weeks, 'semana', 'semanas')}.` : '.'),
    });
  } else {
    insights.push({ kind: 'nivel', tone: 'good', text: 'Você está no nível máximo. Agora é manter e progredir as cargas.' });
  }

  // ---------- Manchete ----------
  const goods = insights.filter((i) => i.tone === 'good').length;
  const attn = insights.filter((i) => i.tone === 'attention').length;
  let headline: string;
  if (firstAge < 14) headline = 'Você está começando bem. Mantenha o ritmo nas próximas semanas.';
  else if (lastAge >= 7) headline = 'Faz um tempo que você não treina. Bora retomar?';
  else if (goods >= attn + 2) headline = 'Você está evoluindo bem. Continue assim.';
  else if (attn > goods) headline = 'Alguns pontos merecem atenção para você evoluir mais.';
  else headline = 'Evolução no caminho certo, com espaço para melhorar.';

  // Atenção primeiro, depois bons, depois neutros
  const order: Record<InsightTone, number> = { attention: 0, good: 1, neutral: 2 };
  insights.sort((a, b) => order[a.tone] - order[b.tone]);

  return { headline, insights };
}
