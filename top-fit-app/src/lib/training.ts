import { EXERCISES, EXERCISE_BY_ID, GRUPO_NOME, type Equip, type Exercise, type Grupo } from '@/data/exercises';

export type Goal = 'hipertrofia' | 'emagrecimento' | 'forca' | 'saude';

export const GOALS: { id: Goal; nome: string; desc: string }[] = [
  { id: 'hipertrofia', nome: 'Ganhar massa', desc: 'Hipertrofia: músculos maiores' },
  { id: 'emagrecimento', nome: 'Emagrecer', desc: 'Queimar gordura com ritmo intenso' },
  { id: 'forca', nome: 'Ficar mais forte', desc: 'Cargas altas, poucas repetições' },
  { id: 'saude', nome: 'Saúde e disposição', desc: 'Condicionamento e bem-estar' },
];

/** Uma série registrada. Nos isométricos, `reps` são segundos. */
export interface SetLog {
  reps?: number;
  kg?: number;
  done: boolean;
}

export interface SessionExercise {
  uid: string;
  exerciseId: string;
  sets: number;
  reps: string;
  restSec: number;
  done: boolean;
  /** Só cardio: duração em minutos e como fazer (ritmo) */
  minutes?: number;
  detail?: string;
  /** Carga usada (kg; nos halteres, por halter) */
  weightKg?: number;
  /** Distância percorrida no cardio (km) */
  distanceKm?: number;
  /** Musculação: séries feitas (pode ter mais ou menos que o previsto) */
  log?: SetLog[];
  /** Séries contadas pelo cronômetro de descanso durante o treino */
  setsDone?: number;
}

/** Como a pessoa se sentiu no treino (preenchido ao finalizar). */
export interface CheckinRating {
  /** 1 = muito leve … 5 = exaustivo */
  effort?: 1 | 2 | 3 | 4 | 5;
  note?: string;
}

export interface Checkin {
  id: string;
  /** Minutos de cardio dentro de plannedMin */
  cardioMin?: number;
  /** ISO de quando o checkin começou */
  date: string;
  finishedAt?: string;
  plannedMin: number;
  focus: string;
  exercises: SessionExercise[];
  /** Exercícios já trocados nesta sessão (não voltam no Refresh) */
  skipped: string[];
  /** Grupos escolhidos no checkin (ausente = automático pela recuperação) */
  chosenGroups?: Grupo[];
  rating?: CheckinRating;
}

// ---------- Cargas ----------

/** Exercícios em que faz sentido perguntar a carga. */
export const usesWeight = (ex: Exercise) =>
  !ex.tempo && ex.grupo !== 'cardio' && ex.equip !== 'corporal' && ex.equip !== 'elastico';

/** Cardio em que faz sentido perguntar a distância. */
const DISTANCIA = new Set(['esteira-inclinada', 'esteira-corrida', 'corrida-rua', 'bike', 'eliptico', 'remo']);
export const usesDistance = (ex: Exercise) => DISTANCIA.has(ex.id);

export const weightStep = (ex: Exercise) => (ex.equip === 'halteres' || ex.equip === 'kettlebell' ? 1 : 2.5);

/** Histórico de cargas de um exercício nos checkins concluídos (mais antigo primeiro). */
export function weightHistory(checkins: Checkin[], exerciseId: string) {
  const out: { date: string; kg: number }[] = [];
  for (const c of checkins)
    for (const se of c.exercises)
      if (se.exerciseId === exerciseId && se.done && se.weightKg != null) out.push({ date: c.date, kg: se.weightKg });
  return out;
}

// ---------- Séries ----------

/** Faixa de repetições (ou segundos) da prescrição: "8–12" → {min: 8, max: 12}. */
export function parseTarget(reps: string) {
  const m = reps.match(/(\d+)(?:\s*[–-]\s*(\d+))?/);
  if (!m) return null;
  const min = Number(m[1]);
  return { min, max: m[2] ? Number(m[2]) : min };
}

/** Última vez em que o exercício foi feito (checkins concluídos). */
export function lastPerformance(history: Checkin[], exerciseId: string) {
  for (let i = history.length - 1; i >= 0; i--)
    for (const se of history[i].exercises)
      if (se.exerciseId === exerciseId && (se.done || se.log?.some((r) => r.done))) return { date: history[i].date, se };
  return null;
}

/** Séries iniciais: repete a carga da última vez; reps no topo da faixa. */
export function initLog(ex: Exercise, sets: number, reps: string, history: Checkin[]): SetLog[] {
  const target = parseTarget(reps);
  const last = lastPerformance(history, ex.id)?.se;
  const lastRows = last?.log?.filter((r) => r.done) ?? [];
  const lastKg = usesWeight(ex) ? (lastRows.at(-1)?.kg ?? last?.weightKg) : undefined;
  return Array.from({ length: sets }, (_, i) => ({
    done: false,
    kg: usesWeight(ex) ? (lastRows[i]?.kg ?? lastKg) : undefined,
    reps: target?.max,
  }));
}

/** Recalcula os campos resumidos (feito, carga, nº de séries) a partir das séries. */
export function syncFromLog(se: SessionExercise): SessionExercise {
  if (!se.log) return se;
  const doneRows = se.log.filter((r) => r.done);
  const kg = [...doneRows].reverse().find((r) => r.kg != null)?.kg;
  return { ...se, sets: se.log.length, done: se.log.length > 0 && doneRows.length === se.log.length, weightKg: kg };
}

const fmtN = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });

/** Texto da última vez + sugestão de progressão de carga. */
export function progression(ex: Exercise, reps: string, history: Checkin[]) {
  const last = lastPerformance(history, ex.id);
  if (!last) return null;
  const rows = last.se.log?.filter((r) => r.done) ?? [];
  const target = parseTarget(reps);
  const unit = ex.tempo ? ' s' : '';
  let text: string;
  if (rows.length) {
    const kgs = new Set(rows.map((r) => r.kg));
    const repsTxt = rows.map((r) => (r.reps ?? '–') + unit).join(', ');
    if (kgs.size === 1 && rows[0].kg != null) text = `${fmtN(rows[0].kg)} kg × ${repsTxt}`;
    else if (rows.some((r) => r.kg != null)) text = rows.map((r) => `${r.kg != null ? fmtN(r.kg) : '–'} kg × ${r.reps ?? '–'}`).join(', ');
    else text = `${rows.length} ${rows.length === 1 ? 'série' : 'séries'}: ${repsTxt}`;
  } else if (last.se.weightKg != null) text = `${fmtN(last.se.weightKg)} kg`;
  else return null;

  // Progressão: fez todas as séries no topo da faixa com a mesma carga → sobe um degrau
  let suggestKg: number | undefined;
  const lastKg = rows.at(-1)?.kg;
  if (usesWeight(ex) && lastKg != null && target && rows.length > 0 && rows.length === (last.se.log?.length ?? 0)) {
    if (rows.every((r) => r.kg === lastKg && (r.reps ?? 0) >= target.max)) suggestKg = lastKg + weightStep(ex);
  }
  return { date: last.date, text, suggestKg };
}

// ---------- Níveis ----------

export type Nivel = 1 | 2 | 3;

export const LEVELS: { nivel: Nivel; nome: string; min: number; desc: string; divisao: string }[] = [
  { nivel: 1, nome: 'Iniciante', min: 0, desc: 'Estou começando ou voltando agora', divisao: 'Treinos de corpo inteiro' },
  { nivel: 2, nome: 'Intermediário', min: 24, desc: 'Treino há alguns meses com regularidade', divisao: 'Alterna superiores e inferiores' },
  { nivel: 3, nome: 'Avançado', min: 72, desc: 'Treino há mais de um ano e domino a técnica', divisao: 'Empurrar, puxar e pernas' },
];

/** Offset que faz a contagem atual de checkins cair no início do nível escolhido. */
export const offsetForLevel = (nivel: Nivel, checkins: number) => LEVELS[nivel - 1].min - checkins;

export function levelInfo(completed: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && completed >= LEVELS[i + 1].min) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1];
  const progress = next ? (completed - cur.min) / (next.min - cur.min) : 1;
  return { ...cur, next, progress, faltam: next ? next.min - completed : 0 };
}

// ---------- Divisão por recuperação ----------

export const ALL_GROUPS: Grupo[] = ['quadriceps', 'costas', 'peito', 'posterior', 'gluteos', 'ombros', 'biceps', 'triceps', 'panturrilha', 'core'];

/** Quanto espaço cada grupo merece no treino (grupos grandes primeiro). */
const PESO: Record<Grupo, number> = {
  quadriceps: 3, costas: 3, peito: 3, posterior: 2, gluteos: 2, ombros: 2, biceps: 1.4, triceps: 1.4, panturrilha: 1, core: 1.5, cardio: 0,
};

const SPLITS: Record<1 | 2 | 3, { nome: string; grupos: Grupo[] }[]> = {
  1: [{ nome: 'Corpo inteiro', grupos: ALL_GROUPS }],
  2: [
    { nome: 'Superiores', grupos: ['peito', 'costas', 'ombros', 'biceps', 'triceps'] },
    { nome: 'Inferiores + abdômen', grupos: ['quadriceps', 'posterior', 'gluteos', 'panturrilha', 'core'] },
  ],
  3: [
    { nome: 'Empurrar (peito, ombro, tríceps)', grupos: ['peito', 'ombros', 'triceps'] },
    { nome: 'Puxar (costas, bíceps, abdômen)', grupos: ['costas', 'biceps', 'core'] },
    { nome: 'Pernas', grupos: ['quadriceps', 'posterior', 'gluteos', 'panturrilha'] },
  ],
};

/** Atalhos de foco no checkin. */
export const FOCUS_PRESETS: { nome: string; grupos: Grupo[] }[] = [
  { nome: 'Corpo inteiro', grupos: ALL_GROUPS },
  { nome: 'Superiores', grupos: ['peito', 'costas', 'ombros', 'biceps', 'triceps'] },
  { nome: 'Inferiores', grupos: ['quadriceps', 'posterior', 'gluteos', 'panturrilha'] },
  { nome: 'Empurrar', grupos: ['peito', 'ombros', 'triceps'] },
  { nome: 'Puxar', grupos: ['costas', 'biceps'] },
  { nome: 'Braços', grupos: ['biceps', 'triceps'] },
];

const sameSet = (a: Grupo[], b: Grupo[]) => a.length === b.length && a.every((g) => b.includes(g));

/** Nome do foco a partir dos grupos: atalho conhecido ou "Peito, Costas e Bíceps". */
export function focusName(grupos: Grupo[]) {
  const preset = [...FOCUS_PRESETS, ...SPLITS[2], ...SPLITS[3]].find((p) => sameSet(p.grupos, grupos));
  if (preset) return preset.nome;
  const names = ALL_GROUPS.filter((g) => grupos.includes(g)).map((g) => GRUPO_NOME[g]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} e ${names.at(-1)}` : (names[0] ?? 'Treino');
}

const WEEK_H = 168;

/** Horas desde que cada grupo foi treinado pela última vez (máx. 1 semana). */
function hoursSince(history: Checkin[], now: number): Record<Grupo, number> {
  const out = Object.fromEntries(ALL_GROUPS.map((g) => [g, WEEK_H])) as Record<Grupo, number>;
  for (const c of history) {
    const h = Math.min(WEEK_H, (now - new Date(c.date).getTime()) / 3.6e6);
    for (const se of c.exercises) {
      const ex = EXERCISE_BY_ID[se.exerciseId];
      if (ex && h < out[ex.grupo]) out[ex.grupo] = h;
    }
  }
  return out;
}

const fresh = (h: number) => 0.5 + h / WEEK_H; // 0.5 (treinou agora) .. 1.5 (uma semana)

// ---------- Prescrição por objetivo ----------

const MIN_POR_EXERCICIO: Record<Goal, number> = { hipertrofia: 7.5, forca: 9, emagrecimento: 6, saude: 6.5 };

/** Musculação precisa de pelo menos esse tempo para valer a pena. */
export const MIN_STRENGTH = 15;

export function exerciseCount(goal: Goal, minutes: number) {
  if (minutes < MIN_STRENGTH) return 0;
  return Math.max(3, Math.min(10, Math.round((minutes - 5) / MIN_POR_EXERCICIO[goal])));
}

export function prescribe(ex: Exercise, goal: Goal, nivel: 1 | 2 | 3): Pick<SessionExercise, 'sets' | 'reps' | 'restSec'> {
  if (ex.tempo) {
    const reps = nivel === 1 ? '20–30 s' : nivel === 2 ? '30–45 s' : '45–60 s';
    return { sets: 3, reps, restSec: 45 };
  }
  switch (goal) {
    case 'forca':
      if (ex.composto) return nivel === 1 ? { sets: 3, reps: '6–8', restSec: 120 } : { sets: 4, reps: '4–6', restSec: 180 };
      return { sets: 3, reps: '8–10', restSec: 90 };
    case 'hipertrofia':
      return ex.composto ? { sets: nivel === 1 ? 3 : 4, reps: '8–12', restSec: 90 } : { sets: 3, reps: '10–12', restSec: 60 };
    case 'emagrecimento':
      return { sets: 3, reps: '12–15', restSec: 45 };
    case 'saude':
      return { sets: nivel === 1 ? 2 : 3, reps: '10–12', restSec: 60 };
  }
}

// ---------- Cardio ----------

/** Pode virar intervalado (máquinas de caminhada inclinada e circuito já são contínuos por natureza). */
const INTERVALAVEL = new Set(['esteira-corrida', 'bike', 'eliptico', 'remo', 'corrida-rua', 'pular-corda', 'escada']);

export function prescribeCardio(ex: Exercise, goal: Goal, nivel: Nivel, minutes: number, afterStrength: boolean): Pick<SessionExercise, 'sets' | 'reps' | 'restSec' | 'minutes' | 'detail'> {
  let detail: string;
  if (goal === 'emagrecimento' && nivel >= 2 && minutes <= 20 && INTERVALAVEL.has(ex.id)) {
    detail = nivel === 3 ? 'Intervalado: 30 s forte + 30 s leve, repetindo até o fim' : 'Intervalado: 30 s forte + 60 s leve, repetindo até o fim';
  } else if (afterStrength && (goal === 'hipertrofia' || goal === 'forca')) {
    detail = 'Ritmo leve: dá para conversar normalmente';
  } else {
    detail = 'Ritmo moderado: respiração acelerada, mas ainda dá para falar frases curtas';
  }
  return { sets: 1, reps: `${minutes} min`, restSec: 0, minutes, detail };
}

// ---------- Escolha de exercícios ----------

export interface GenContext {
  goal: Goal;
  nivel: 1 | 2 | 3;
  favorites: Equip[];
  blocked: string[];
  history: Checkin[]; // checkins concluídos, mais recente por último
}

const uid = () => Math.random().toString(36).slice(2, 10);

function scoreExercise(ex: Exercise, ctx: GenContext, preferCompound: boolean, recent: string[][]) {
  let s = Math.random() * 2;
  if (ctx.favorites.includes(ex.equip)) s += 3;
  if (preferCompound && ex.composto) s += 2.5;
  else if (!preferCompound && ex.composto && ex.grupo !== 'cardio') s -= 1.5; // 2º do mesmo grupo: varia com um isolado
  if (ctx.goal === 'emagrecimento' && ex.composto) s += 1;
  if (ex.nivel === ctx.nivel) s += 0.5; // desafio na medida
  // Complementar os últimos treinos: evita repetir o mesmo exercício em seguida
  if (recent[0]?.includes(ex.id)) s -= 4;
  else if (recent[1]?.includes(ex.id)) s -= 2;
  return s;
}

function candidates(grupo: Grupo, ctx: GenContext, exclude: Set<string>) {
  return EXERCISES.filter((e) => e.grupo === grupo && !e.extra && e.nivel <= ctx.nivel && !ctx.blocked.includes(e.id) && !exclude.has(e.id));
}

function recentIds(history: Checkin[]) {
  return history.slice(-3).reverse().map((c) => c.exercises.map((e) => e.exerciseId));
}

export interface CheckinOptions {
  /** Grupos escolhidos pela pessoa; vazio = automático */
  groups?: Grupo[];
  /** Caminhada até a academia (não ocupa o tempo do treino) */
  commute?: { km: number; minutes: number };
}

/** Card da caminhada até a academia, já marcado como feito. */
export function commuteExercise(c: { km: number; minutes: number }): SessionExercise {
  return {
    uid: uid(),
    exerciseId: 'caminhada-academia',
    sets: 1,
    reps: `${c.minutes} min`,
    restSec: 0,
    minutes: c.minutes,
    distanceKm: c.km,
    detail: 'Ida e volta a pé. Conta como cardio e não ocupa o tempo do treino.',
    done: true,
  };
}

export function generateCheckin(ctx: GenContext, minutes: number, cardioMin = 0, opts: CheckinOptions = {}, now = Date.now()): Checkin {
  const hs = hoursSince(ctx.history, now);

  // 1. Escolhe o foco: o que a pessoa pediu ou a parte do corpo mais descansada
  const picked = opts.groups?.filter((g) => g !== 'cardio') ?? [];
  const split = picked.length
    ? { nome: focusName(picked), grupos: picked }
    : SPLITS[ctx.nivel]
        .map((o) => ({ o, s: o.grupos.reduce((a, g) => a + hs[g], 0) / o.grupos.length + Math.random() }))
        .sort((a, b) => b.s - a.s)[0].o;

  // 2. Distribui as vagas entre os grupos do foco
  const n = exerciseCount(ctx.goal, minutes - cardioMin);
  const recent = recentIds(ctx.history);
  const assigned: Partial<Record<Grupo, number>> = {};
  const chosen: { ex: Exercise; slot: number }[] = [];
  const used = new Set<string>();
  const dead = new Set<Grupo>();

  for (let slot = 0; slot < n; slot++) {
    const grupos = split.grupos.filter((g) => !dead.has(g));
    if (!grupos.length) break;
    const g = grupos
      .map((g) => ({ g, s: (PESO[g] * fresh(hs[g])) / (1 + (assigned[g] ?? 0)) }))
      .sort((a, b) => b.s - a.s)[0].g;
    const cands = candidates(g, ctx, used);
    if (!cands.length) {
      dead.add(g);
      slot--;
      continue;
    }
    const first = !assigned[g];
    const ex = cands.map((e) => ({ e, s: scoreExercise(e, ctx, first, recent) })).sort((a, b) => b.s - a.s)[0].e;
    assigned[g] = (assigned[g] ?? 0) + 1;
    used.add(ex.id);
    chosen.push({ ex, slot });
  }

  // 3. Ordena: compostos primeiro, grupos grandes antes, abdômen no fim
  chosen.sort((a, b) => {
    const ca = a.ex.grupo === 'core' ? 2 : a.ex.composto ? 0 : 1;
    const cb = b.ex.grupo === 'core' ? 2 : b.ex.composto ? 0 : 1;
    return ca - cb || PESO[b.ex.grupo] - PESO[a.ex.grupo] || a.slot - b.slot;
  });

  const exercises: SessionExercise[] = chosen.map(({ ex }) => newSessionExercise(ex, ctx.goal, ctx.nivel, 0, true, ctx.history));

  // 4. Cardio no fim (depois da musculação, para não roubar energia da força)
  if (cardioMin > 0) {
    const cands = candidates('cardio', ctx, new Set());
    if (cands.length) {
      const ex = cands.map((e) => ({ e, s: scoreExercise(e, ctx, false, recent) })).sort((a, b) => b.s - a.s)[0].e;
      exercises.push(newSessionExercise(ex, ctx.goal, ctx.nivel, cardioMin, exercises.length > 0));
    }
  }
  if (opts.commute) exercises.unshift(commuteExercise(opts.commute));

  return {
    id: uid(),
    date: new Date(now).toISOString(),
    plannedMin: minutes,
    cardioMin,
    focus: chosen.length ? (cardioMin > 0 ? `${split.nome} + cardio` : split.nome) : 'Cardio',
    skipped: [],
    chosenGroups: picked.length ? picked : undefined,
    exercises,
  };
}

/** Acha um substituto do mesmo grupo para o exercício `current`. */
export function findReplacement(current: Exercise, session: Checkin, ctx: GenContext): Exercise | null {
  const inSession = new Set(session.exercises.map((e) => e.exerciseId));
  const recent = recentIds(ctx.history);
  const pick = (exclude: Set<string>) => {
    const c = candidates(current.grupo, ctx, exclude);
    if (!c.length) return null;
    return c
      .map((e) => ({ e, s: scoreExercise(e, ctx, current.composto, recent) + (e.composto === current.composto ? 2 : 0) }))
      .sort((a, b) => b.s - a.s)[0].e;
  };
  // Primeiro tenta algo que ainda não apareceu nesta sessão; se acabar, volta a ciclar pelos já trocados.
  return pick(new Set([...inSession, ...session.skipped])) ?? pick(inSession);
}

/** Todas as opções de troca, em ordem: favoritos, mesmo tipo (composto/isolado), nível certo, nome. */
export function alternatives(current: Exercise, session: Checkin, ctx: GenContext): Exercise[] {
  const inSession = new Set(session.exercises.map((e) => e.exerciseId));
  const score = (e: Exercise) =>
    (ctx.favorites.includes(e.equip) ? 4 : 0) + (e.composto === current.composto ? 2 : 0) + (e.nivel === ctx.nivel ? 0.5 : 0);
  return candidates(current.grupo, ctx, inSession).sort((a, b) => score(b) - score(a) || a.nome.localeCompare(b.nome, 'pt-BR'));
}

export function newSessionExercise(ex: Exercise, goal: Goal, nivel: Nivel, cardioMin = 20, afterStrength = true, history: Checkin[] = []): SessionExercise {
  if (ex.grupo === 'cardio') return { uid: uid(), exerciseId: ex.id, done: false, ...prescribeCardio(ex, goal, nivel, cardioMin, afterStrength) };
  const p = prescribe(ex, goal, nivel);
  return { uid: uid(), exerciseId: ex.id, done: false, ...p, log: initLog(ex, p.sets, p.reps, history) };
}

/** Grupos de musculação presentes na sessão, na ordem padrão. */
export function sessionGroups(session: Checkin): Grupo[] {
  const set = new Set(session.exercises.map((e) => EXERCISE_BY_ID[e.exerciseId]?.grupo).filter((g): g is Grupo => !!g && g !== 'cardio'));
  return ALL_GROUPS.filter((g) => set.has(g));
}

/** Troca os exercícios ainda não começados do grupo `from` por exercícios do grupo `to`. */
export function replaceGroup(session: Checkin, from: Grupo, to: Grupo, ctx: GenContext): Checkin {
  const recent = recentIds(ctx.history);
  const used = new Set(session.exercises.map((e) => e.exerciseId));
  let first = !session.exercises.some((e) => EXERCISE_BY_ID[e.exerciseId]?.grupo === to);
  const exercises: SessionExercise[] = [];
  for (const se of session.exercises) {
    const ex = EXERCISE_BY_ID[se.exerciseId];
    if (!ex || ex.grupo !== from || se.done || se.log?.some((r) => r.done)) {
      exercises.push(se);
      continue;
    }
    const cands = candidates(to, ctx, used);
    if (!cands.length) continue; // acabaram as opções do grupo novo: sai do treino
    const pick = cands.map((e) => ({ e, s: scoreExercise(e, ctx, first, recent) })).sort((a, b) => b.s - a.s)[0].e;
    first = false;
    used.add(pick.id);
    exercises.push({ ...newSessionExercise(pick, ctx.goal, ctx.nivel, 0, true, ctx.history), uid: se.uid });
  }
  const next = { ...session, exercises };
  const grupos = sessionGroups(next);
  const hasCardio = exercises.some((e) => EXERCISE_BY_ID[e.exerciseId]?.grupo === 'cardio' && e.exerciseId !== 'caminhada-academia');
  const nome = grupos.length ? focusName(grupos) : 'Cardio';
  return { ...next, focus: hasCardio && grupos.length ? `${nome} + cardio` : nome };
}
