import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EXERCISE_BY_ID, type Equip, type Grupo } from '@/data/exercises';
import { initialsOf } from '@/components/avatar';
import {
  alternatives,
  commuteExercise,
  findReplacement,
  generateCheckin,
  levelInfo,
  newSessionExercise,
  offsetForLevel,
  replaceGroup,
  syncFromLog,
  type Nivel,
  type Checkin,
  type CheckinRating,
  type GenContext,
  type Goal,
  type SessionExercise,
} from '@/lib/training';
import { DEFAULT_THEME, type ThemePrefs } from '@/lib/theme';
import { newId, type ActivityEntry, type MealEntry } from '@/lib/diary';

export type AvatarPattern = 'solido' | 'degrade' | 'listras' | 'bolinhas' | 'raios' | 'xadrez';

export type Avatar =
  | {
      kind: 'custom';
      /** id do ícone, ou 'iniciais' */
      icon: string;
      initials: string;
      color: string;
      pattern: AvatarPattern;
      fg: 'claro' | 'escuro';
    }
  | { kind: 'upload'; dataUrl: string };

export interface Commute {
  km: number;
  minutes: number;
}

export interface Profile {
  name: string;
  avatar: Avatar;
  goal: Goal;
  weightKg: number;
  /** Altura em cm (opcional para perfis antigos) */
  heightCm?: number;
  equipment: Equip[];
  /** Somado à contagem de checkins para calcular o nível (permite começar acima de Iniciante). */
  levelOffset: number;
  createdAt: string;
  /** Trajeto a pé até a academia (ida e volta) */
  commute?: Commute;
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export type ReplaceResult = 'replaced' | 'removed' | 'none';

export interface StartOptions {
  groups?: Grupo[];
  walked?: boolean;
}

export interface AppData {
  profile: Profile | null;
  checkins: Checkin[];
  active: Checkin | null;
  blocked: string[];
  weights: WeightEntry[];
  /** Última escolha no diálogo de checkin */
  checkinPrefs: { minutes: number; cardio: number; walked?: boolean } | null;
  theme: ThemePrefs;
  activities: ActivityEntry[];
  meals: MealEntry[];
}

interface AppState extends AppData {
  saveProfile: (p: Omit<Profile, 'createdAt' | 'levelOffset'>) => void;
  setLevel: (nivel: Nivel) => void;
  setCommute: (c: Commute | undefined) => void;
  setTheme: (t: Partial<ThemePrefs>) => void;
  startCheckin: (minutes: number, cardio: number, opts?: StartOptions) => void;
  /** Marca/desmarca um exercício inteiro (todas as séries); no cardio pode registrar a distância. */
  setDone: (uid: string, done: boolean, extra?: { weightKg?: number; distanceKm?: number }) => void;
  /** Soma uma série feita (cronômetro de descanso). Devolve o novo total. */
  countSet: (uid: string) => number;
  /** Conclui a musculação com o que foi feito: nº de séries, reps e carga (iguais em todas). */
  completeSets: (uid: string, r: { sets: number; reps?: number; kg?: number }) => void;
  refreshExercise: (uid: string) => ReplaceResult;
  /** Opções de troca para o exercício da sessão. */
  swapOptions: (uid: string) => string[];
  /** Troca pelo exercício escolhido. */
  swapTo: (uid: string, exerciseId: string) => void;
  /** Troca todo o grupo muscular (exercícios ainda não começados). */
  swapGroup: (from: Grupo, to: Grupo) => void;
  /** Liga/desliga a caminhada até a academia no treino em andamento. */
  toggleCommute: (on: boolean) => void;
  markUnavailable: (uid: string) => ReplaceResult;
  /** Encerra o treino e devolve o id do checkin salvo (para desfazer). */
  finishCheckin: (rating?: CheckinRating) => string | null;
  /** Volta um checkin encerrado para treino em andamento. */
  reopenCheckin: (id: string) => boolean;
  deleteCheckin: (id: string) => void;
  cancelCheckin: () => void;
  addWeight: (kg: number) => void;
  unblock: (exerciseId: string) => void;
  saveActivity: (a: Omit<ActivityEntry, 'id'> & { id?: string }) => void;
  deleteActivity: (id: string) => void;
  saveMeal: (m: Omit<MealEntry, 'id'> & { id?: string }) => void;
  deleteMeal: (id: string) => void;
  /** Substitui todos os dados (restauração de backup). */
  restore: (data: Partial<AppData>) => void;
  resetAll: () => void;
}

/** Contagem usada para o nível: checkins feitos + ponto de partida escolhido. */
export const levelCount = (s: Pick<AppState, 'profile' | 'checkins'>) => Math.max(0, s.checkins.length + (s.profile?.levelOffset ?? 0));

export const useLevel = () => levelInfo(useApp(levelCount));

function ctxOf(s: AppState): GenContext {
  const p = s.profile!;
  return {
    goal: p.goal,
    nivel: levelInfo(levelCount(s)).nivel,
    favorites: p.equipment,
    blocked: s.blocked,
    history: s.checkins,
  };
}

export const DATA_KEYS: (keyof AppData)[] = ['profile', 'checkins', 'active', 'blocked', 'weights', 'checkinPrefs', 'theme', 'activities', 'meals'];

const initial: AppData = {
  profile: null,
  checkins: [],
  active: null,
  blocked: [],
  weights: [],
  checkinPrefs: null,
  theme: DEFAULT_THEME,
  activities: [],
  meals: [],
};

const upsert = <T extends { id: string }>(list: T[], item: T) =>
  list.some((x) => x.id === item.id) ? list.map((x) => (x.id === item.id ? item : x)) : [...list, item];

export const useApp = create<AppState>()(
  persist(
    (set, get) => {
      /** Troca o exercício `uid` por um semelhante. Se `block`, ele vai pra lista de indisponíveis. */
      const replace = (uid: string, block: boolean, chosenId?: string): ReplaceResult => {
        const s = get();
        const session = s.active;
        if (!session) return 'none';
        const se = session.exercises.find((e) => e.uid === uid);
        const ex = se && EXERCISE_BY_ID[se.exerciseId];
        if (!se || !ex) return 'none';

        const blocked = block && !s.blocked.includes(ex.id) ? [...s.blocked, ex.id] : s.blocked;
        const ctx = { ...ctxOf(s), blocked };
        const alt = chosenId ? (EXERCISE_BY_ID[chosenId] ?? null) : findReplacement(ex, session, ctx);

        if (!alt) {
          if (!block) return 'none';
          set({ blocked, active: { ...session, exercises: session.exercises.filter((e) => e.uid !== uid) } });
          return 'removed';
        }
        const afterStrength = session.exercises.some((e) => EXERCISE_BY_ID[e.exerciseId]?.grupo !== 'cardio');
        const next = { ...newSessionExercise(alt, ctx.goal, ctx.nivel, se.minutes, afterStrength, s.checkins), uid: se.uid };
        set({
          blocked,
          active: {
            ...session,
            skipped: session.skipped.includes(ex.id) ? session.skipped : [...session.skipped, ex.id],
            exercises: session.exercises.map((e) => (e.uid === uid ? next : e)),
          },
        });
        return 'replaced';
      };

      /** Altera um exercício do treino em andamento. */
      const edit = (uid: string, fn: (se: SessionExercise) => SessionExercise) =>
        set((s) => (s.active ? { active: { ...s.active, exercises: s.active.exercises.map((e) => (e.uid === uid ? fn(e) : e)) } } : {}));

      return {
        ...initial,

        saveProfile: (p) =>
          set((s) => {
            const createdAt = s.profile?.createdAt ?? new Date().toISOString();
            const weights =
              s.profile?.weightKg === p.weightKg && s.weights.length
                ? s.weights
                : [...s.weights, { date: new Date().toISOString(), kg: p.weightKg }];
            const levelOffset = s.profile?.levelOffset ?? 0;
            const avatar = p.avatar.kind === 'custom' ? { ...p.avatar, initials: initialsOf(p.name) } : p.avatar;
            return { profile: { ...s.profile, ...p, avatar, createdAt, levelOffset }, weights };
          }),

        setLevel: (nivel) =>
          set((s) => (s.profile ? { profile: { ...s.profile, levelOffset: offsetForLevel(nivel, s.checkins.length) } } : {})),

        setCommute: (commute) => set((s) => (s.profile ? { profile: { ...s.profile, commute } } : {})),

        setTheme: (t) => set((s) => ({ theme: { ...s.theme, ...t } })),

        startCheckin: (minutes, cardio, opts = {}) =>
          set((s) => {
            const commute = opts.walked ? s.profile?.commute : undefined;
            return {
              active: generateCheckin(ctxOf(s), minutes, cardio, { groups: opts.groups, commute }),
              checkinPrefs: { minutes, cardio, walked: !!opts.walked },
            };
          }),

        setDone: (uid, done, extra) =>
          edit(uid, (e) =>
            e.log
              ? syncFromLog({ ...e, log: e.log.map((r) => ({ ...r, done })) })
              : { ...e, done, weightKg: done ? extra?.weightKg : undefined, distanceKm: done ? extra?.distanceKm : undefined },
          ),

        countSet: (uid) => {
          let n = 0;
          edit(uid, (se) => {
            n = (se.setsDone ?? 0) + 1;
            return { ...se, setsDone: n };
          });
          return n;
        },

        completeSets: (uid, { sets, reps, kg }) =>
          edit(uid, (se) =>
            syncFromLog({ ...se, setsDone: sets, log: Array.from({ length: Math.max(1, sets) }, () => ({ reps, kg, done: true })) }),
          ),

        refreshExercise: (uid) => replace(uid, false),
        swapOptions: (uid) => {
          const s = get();
          const se = s.active?.exercises.find((e) => e.uid === uid);
          const ex = se && EXERCISE_BY_ID[se.exerciseId];
          if (!s.active || !ex) return [];
          return alternatives(ex, s.active, ctxOf(s)).map((e) => e.id);
        },
        swapTo: (uid, exerciseId) => {
          replace(uid, false, exerciseId);
        },
        swapGroup: (from, to) => {
          const s = get();
          if (!s.active) return;
          set({ active: replaceGroup(s.active, from, to, ctxOf(s)) });
        },
        toggleCommute: (on) => {
          const s = get();
          const c = s.profile?.commute;
          if (!s.active) return;
          const rest = s.active.exercises.filter((e) => e.exerciseId !== 'caminhada-academia');
          set({ active: { ...s.active, exercises: on && c ? [commuteExercise(c), ...rest] : rest } });
        },
        markUnavailable: (uid) => replace(uid, true),

        finishCheckin: (rating) => {
          const a = get().active;
          if (!a) return null;
          const r = rating && (rating.effort || rating.note?.trim()) ? { ...rating, note: rating.note?.trim() || undefined } : undefined;
          set((s) => ({ checkins: [...s.checkins, { ...a, rating: r, finishedAt: new Date().toISOString() }], active: null }));
          return a.id;
        },

        reopenCheckin: (id) => {
          const s = get();
          const c = s.checkins.find((x) => x.id === id);
          if (!c || s.active) return false;
          set({ active: { ...c, finishedAt: undefined }, checkins: s.checkins.filter((x) => x.id !== id) });
          return true;
        },

        deleteCheckin: (id) => set((s) => ({ checkins: s.checkins.filter((x) => x.id !== id) })),

        cancelCheckin: () => set({ active: null }),

        addWeight: (kg) =>
          set((s) => ({
            weights: [...s.weights, { date: new Date().toISOString(), kg }],
            profile: s.profile ? { ...s.profile, weightKg: kg } : s.profile,
          })),

        unblock: (id) => set((s) => ({ blocked: s.blocked.filter((b) => b !== id) })),

        saveActivity: (a) => set((s) => ({ activities: upsert(s.activities, { ...a, id: a.id ?? newId() }) })),
        deleteActivity: (id) => set((s) => ({ activities: s.activities.filter((x) => x.id !== id) })),
        saveMeal: (m) => set((s) => ({ meals: upsert(s.meals, { ...m, id: m.id ?? newId() }) })),
        deleteMeal: (id) => set((s) => ({ meals: s.meals.filter((x) => x.id !== id) })),

        restore: (data) => set({ ...initial, ...data, theme: { ...DEFAULT_THEME, ...data.theme } }),

        resetAll: () => set((s) => ({ ...initial, theme: s.theme })),
      };
    },
    {
      name: 'top-fit-app',
      version: 2,
      migrate: (persisted, version) => {
        const st = persisted as { profile?: (Omit<Profile, 'avatar'> & { avatar: Avatar | { kind: 'preset' } }) | null };
        if (version < 2 && st.profile) {
          st.profile.levelOffset ??= 0;
          if (st.profile.avatar.kind === 'preset') {
            st.profile.avatar = { kind: 'custom', icon: 'dumbbell', initials: '', color: 'lima', pattern: 'degrade', fg: 'escuro' };
          }
        }
        return persisted as AppState;
      },
    },
  ),
);
