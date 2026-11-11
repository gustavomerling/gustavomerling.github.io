import { EXERCISE_BY_ID, EQUIP_LABEL, GRUPO_NOME, secondaryOf } from '@/data/exercises';
import { ACTIVITY_BY_ID, MEAL_BY_ID, byTime } from '@/lib/diary';
import { dayKey } from '@/lib/dates';
import { GOALS, levelInfo } from '@/lib/training';
import { DATA_KEYS, levelCount, type AppData } from '@/store/useApp';

export type Period = 'semana' | 'mes' | 'tudo';

export const PERIODS: { id: Period; nome: string; dias?: number }[] = [
  { id: 'semana', nome: 'Últimos 7 dias', dias: 7 },
  { id: 'mes', nome: 'Últimos 30 dias', dias: 30 },
  { id: 'tudo', nome: 'Tudo', dias: undefined },
];

const ESFORCO = ['', 'muito leve', 'leve', 'moderado', 'pesado', 'exaustivo'];

/** Resumo legível dos dados do período, pensado para colar numa IA. */
export function buildExport(data: AppData, period: Period, now = new Date()) {
  const dias = PERIODS.find((p) => p.id === period)!.dias;
  const start = dias ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - (dias - 1)) : new Date(0);
  const fromKey = dayKey(start);
  const inRange = (iso: string) => dayKey(iso) >= fromKey;
  const inRangeDay = (day: string) => day >= fromKey;
  const p = data.profile;
  const lvl = levelInfo(levelCount(data));

  const treinos = data.checkins
    .filter((c) => inRange(c.date))
    .map((c) => ({
      data: dayKey(c.date),
      hora: new Date(c.date).toTimeString().slice(0, 5),
      foco: c.focus,
      foco_escolhido_pela_pessoa: !!c.chosenGroups?.length,
      tempo_planejado_min: c.plannedMin,
      duracao_real_min: c.finishedAt ? Math.round((new Date(c.finishedAt).getTime() - new Date(c.date).getTime()) / 60000) : undefined,
      esforco_percebido: c.rating?.effort ? `${c.rating.effort}/5 (${ESFORCO[c.rating.effort]})` : undefined,
      observacao: c.rating?.note,
      exercicios: c.exercises.map((se) => {
        const ex = EXERCISE_BY_ID[se.exerciseId];
        const base = {
          nome: ex?.nome ?? se.exerciseId,
          musculo: ex ? GRUPO_NOME[ex.grupo] : undefined,
          auxiliares: ex && secondaryOf(ex).length ? secondaryOf(ex).map((g) => GRUPO_NOME[g]) : undefined,
          equipamento: ex ? EQUIP_LABEL[ex.equip] : undefined,
          concluido: se.done,
        };
        if (ex?.grupo === 'cardio') return { ...base, minutos: se.minutes, distancia_km: se.distanceKm, ritmo: se.detail };
        return {
          ...base,
          prescricao: `${se.sets} × ${se.reps}`,
          descanso_s: se.restSec,
          series: se.log
            ? se.log.map((r, i) => ({ serie: i + 1, feita: r.done, [ex?.tempo ? 'segundos' : 'reps']: r.reps, kg: r.kg }))
            : undefined,
          carga_kg: se.log ? undefined : se.weightKg,
        };
      }),
    }));

  const atividades = data.activities
    .filter((a) => inRangeDay(a.day))
    .sort((a, b) => a.day.localeCompare(b.day) || byTime(a, b))
    .map((a) => ({
      data: a.day,
      hora: a.time,
      atividade: a.name || ACTIVITY_BY_ID[a.kind]?.nome || a.kind,
      minutos: a.minutes,
      quantidade: a.amount != null && a.unit ? `${a.amount} ${a.unit}` : undefined,
      observacao: a.note,
    }));

  const refeicoes = data.meals
    .filter((m) => inRangeDay(m.day))
    .sort((a, b) => a.day.localeCompare(b.day) || byTime(a, b))
    .map((m) => ({ data: m.day, hora: m.time, refeicao: MEAL_BY_ID[m.type]?.nome ?? m.type, descricao: m.description, kcal: m.kcal }));

  return {
    app: 'T.O.P. Fit App',
    gerado_em: now.toISOString(),
    periodo: { de: fromKey, ate: dayKey(now), descricao: PERIODS.find((x) => x.id === period)!.nome },
    perfil: p
      ? {
          objetivo: GOALS.find((g) => g.id === p.goal)?.nome,
          nivel: lvl.nome,
          checkins_no_total: data.checkins.length,
          peso_atual_kg: p.weightKg,
          altura_cm: p.heightCm,
          equipamentos_favoritos: p.equipment.map((e) => EQUIP_LABEL[e]),
          caminhada_ate_academia: p.commute ? `${p.commute.km} km / ${p.commute.minutes} min (ida e volta)` : undefined,
        }
      : null,
    pesagens: data.weights.filter((w) => inRange(w.date)).map((w) => ({ data: dayKey(w.date), kg: w.kg })),
    treinos,
    atividades_do_dia_a_dia: atividades,
    refeicoes,
  };
}

export const AI_PROMPT = `Sou usuário do T.O.P. Fit App, um app de treino de academia. Abaixo estão meus dados em JSON: treinos (com séries, repetições e cargas), pesagens, atividades do dia a dia fora da academia e refeições com horário (e calorias, quando informei).

Analise meu progresso e me diga, em linguagem simples:
1. Como está minha constância e se a frequência é boa para o meu objetivo.
2. Evolução das cargas e repetições: onde progredi, onde estagnei.
3. Equilíbrio entre os grupos musculares (algum está esquecido?).
4. O que as atividades do dia a dia e as refeições mostram sobre a minha rotina.
5. Três ajustes práticos para as próximas semanas.

Não invente dados que não estão no JSON; se faltar algo para concluir, diga o que eu deveria registrar.`;

export const aiText = (exp: ReturnType<typeof buildExport>) => `${AI_PROMPT}\n\n\`\`\`json\n${JSON.stringify(exp, null, 2)}\n\`\`\``;

// ---------- Backup ----------

const BACKUP_MARK = 'top-fit-app-backup';

export function buildBackup(data: AppData) {
  const state = Object.fromEntries(DATA_KEYS.map((k) => [k, data[k]]));
  return { kind: BACKUP_MARK, version: 1, savedAt: new Date().toISOString(), state };
}

/** Lê um arquivo de backup. Lança erro com mensagem amigável se não for válido. */
export function parseBackup(text: string): Partial<AppData> {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('O arquivo não é um JSON válido.');
  }
  const b = json as { kind?: string; state?: Partial<AppData> };
  if (b?.kind !== BACKUP_MARK || !b.state || typeof b.state !== 'object') throw new Error('Este arquivo não é um backup do T.O.P. Fit App.');
  if (!Array.isArray(b.state.checkins)) throw new Error('Backup incompleto: faltam os checkins.');
  return Object.fromEntries(DATA_KEYS.filter((k) => k in b.state!).map((k) => [k, b.state![k]])) as Partial<AppData>;
}

// ---------- Arquivo ----------

/** Compartilha o arquivo pelo menu do sistema (celular) ou baixa (computador). */
export async function shareOrDownload(name: string, content: string) {
  const file = new File([content], name, { type: 'application/json' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name });
      return 'shared' as const;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled' as const;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return 'downloaded' as const;
}

export const stamp = () => dayKey(new Date());
