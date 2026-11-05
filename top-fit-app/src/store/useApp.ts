import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { EXERCISE_BY_ID, type Equip } from '@/data/exercises';
import { initialsOf } from '@/components/avatar';
import {
  alternatives,
  findReplacement,
  generateCheckin,
  levelInfo,
  newSessionExercise,
  offsetForLevel,
  type Nivel,
  type Checkin,
  type GenContext,
  type Goal,
} from '@/lib/training';

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
}

export interface WeightEntry {
  date: string;
  kg: number;
}

export type ReplaceResult = 'replaced' | 'removed' | 'none';

interface AppState {
  profile: Profile | null;
  checkins: Checkin[];
  active: Checkin | null;
  blocked: string[];
  weights: WeightEntry[];
  /** Última escolha no diálogo de checkin */
  checkinPrefs: { minutes: number; cardio: number } | null;

  saveProfile: (p: Omit<Profile, 'createdAt' | 'levelOffset'>) => void;
  setLevel: (nivel: Nivel) => void;
  startCheckin: (minutes: number, cardio: number) => void;
  /** Marca/desmarca um exercício; ao marcar pode registrar a carga. */
  setDone: (uid: string, done: boolean, extra?: { weightKg?: number; distanceKm?: number }) => void;
  refreshExercise: (uid: string) => ReplaceResult;
  /** Opções de troca para o exercício da sessão. */
  swapOptions: (uid: string) => string[];
  /** Troca pelo exercício escolhido. */
  swapTo: (uid: string, exerciseId: string) => void;
  markUnavailable: (uid: string) => ReplaceResult;
  /** Encerra o treino e devolve o id do checkin salvo (para desfazer). */
  finishCheckin: () => string | null;
  /** Volta um checkin encerrado para treino em andamento. */
  reopenCheckin: (id: string) => boolean;
  deleteCheckin: (id: string) => void;
  cancelCheckin: () => void;
  addWeight: (kg: number) => void;
  unblock: (exerciseId: string) => void;
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

const initial = { profile: null, checkins: [], active: null, blocked: [], weights: [], checkinPrefs: null };

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
        const next = { ...newSessionExercise(alt, ctx.goal, ctx.nivel, se.minutes, afterStrength), uid: se.uid };
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
            return { profile: { ...p, avatar, createdAt, levelOffset }, weights };
          }),

        setLevel: (nivel) =>
          set((s) => (s.profile ? { profile: { ...s.profile, levelOffset: offsetForLevel(nivel, s.checkins.length) } } : {})),

        startCheckin: (minutes, cardio) =>
          set((s) => ({ active: generateCheckin(ctxOf(s), minutes, cardio), checkinPrefs: { minutes, cardio } })),

        setDone: (uid, done, extra) =>
          set((s) =>
            s.active
              ? {
                  active: {
                    ...s.active,
                    exercises: s.active.exercises.map((e) => (e.uid === uid ? { ...e, done, weightKg: done ? extra?.weightKg : undefined, distanceKm: done ? extra?.distanceKm : undefined } : e)),
                  },
                }
              : {},
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
        markUnavailable: (uid) => replace(uid, true),

        finishCheckin: () => {
          const a = get().active;
          if (!a) return null;
          set((s) => ({ checkins: [...s.checkins, { ...a, finishedAt: new Date().toISOString() }], active: null }));
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

        resetAll: () => set({ ...initial }),
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
