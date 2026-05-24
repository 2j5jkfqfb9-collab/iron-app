import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WorkoutTemplate, ActiveSet, WorkoutPhase } from '@/types';

type ActiveExerciseState = {
  exerciseId: string;
  sets: ActiveSet[];
};

type WorkoutState = {
  sessionId: string | null;
  template: WorkoutTemplate | null;
  startedAt: string | null;

  exerciseIndex: number;
  currentSetIndex: number;
  phase: WorkoutPhase;

  exercises: ActiveExerciseState[];
  elapsedSeconds: number;

  restTarget: number;
  setRestTarget: (seconds: number) => void;

  isPaused: boolean;
  togglePause: () => void;

  exerciseNotes: Record<string, string>;
  setExerciseNote: (exerciseId: string, note: string) => void;

  startWorkout: (template: WorkoutTemplate) => void;
  adjustReps: (delta: number) => void;
  adjustWeight: (delta: number) => void;
  setRPE: (rpe: number) => void;
  completeSet: () => void;
  startNextSet: () => void;
  undoLastSet: () => void;
  swapExercise: (index: number, newExerciseId: string) => void;
  addSet: (exerciseIndex: number) => void;
  addExercise: (exerciseId: string) => void;
  goToExercise: (index: number) => void;
  tickTimer: () => void;
  resetTimer: () => void;
  endWorkout: () => void;
};

// During rest, adjustments target the upcoming set, not the just-completed one
function resolveTargetSet(
  state: Pick<WorkoutState, 'phase' | 'exerciseIndex' | 'currentSetIndex'>,
  exs: ActiveExerciseState[],
): { exIdx: number; setIdx: number } {
  const { exerciseIndex, currentSetIndex, phase } = state;
  if (phase === 'rest') {
    const ex = exs[exerciseIndex];
    if (ex && currentSetIndex + 1 < ex.sets.length) {
      return { exIdx: exerciseIndex, setIdx: currentSetIndex + 1 };
    }
    if (exerciseIndex + 1 < exs.length) {
      return { exIdx: exerciseIndex + 1, setIdx: 0 };
    }
  }
  return { exIdx: exerciseIndex, setIdx: currentSetIndex };
}

function buildInitialExercises(template: WorkoutTemplate): ActiveExerciseState[] {
  return template.exercises.map((te) => ({
    exerciseId: te.exerciseId,
    sets: Array.from({ length: te.targetSets }, () => ({
      reps: te.targetReps,
      weightKg: te.startWeightKg,
      rpe: 7,
      state: 'pending' as const,
    })),
  }));
}

export const useWorkoutStore = create<WorkoutState>()(
  persist(
    (set) => ({
  sessionId: null,
  template: null,
  startedAt: null,
  exerciseIndex: 0,
  currentSetIndex: 0,
  phase: 'active',
  exercises: [],
  elapsedSeconds: 0,
  restTarget: 90,
  setRestTarget: (seconds) => set({ restTarget: seconds }),

  isPaused: false,
  togglePause: () => set((s) => ({ isPaused: !s.isPaused })),

  exerciseNotes: {},
  setExerciseNote: (exerciseId, note) =>
    set((s) => ({ exerciseNotes: { ...s.exerciseNotes, [exerciseId]: note } })),

  startWorkout: (template) => {
    const exercises = buildInitialExercises(template);
    if (exercises[0]) {
      exercises[0].sets[0] = { ...exercises[0].sets[0], state: 'active' };
    }
    set({
      sessionId: `session-${Date.now()}`,
      template,
      startedAt: new Date().toISOString(),
      exerciseIndex: 0,
      currentSetIndex: 0,
      phase: 'active',
      exercises,
      elapsedSeconds: 0,
      isPaused: false,
      exerciseNotes: {},
    });
  },

  adjustReps: (delta) =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const { exIdx, setIdx } = resolveTargetSet(state, exs);
      const s = exs[exIdx]?.sets[setIdx];
      if (!s) return {};
      s.reps = Math.max(0, s.reps + delta);
      return { exercises: exs };
    }),

  adjustWeight: (delta) =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const { exIdx, setIdx } = resolveTargetSet(state, exs);
      const s = exs[exIdx]?.sets[setIdx];
      if (!s) return {};
      s.weightKg = Math.max(0, s.weightKg + delta);
      return { exercises: exs };
    }),

  setRPE: (rpe) =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const ex = exs[state.exerciseIndex];
      if (!ex) return {};
      const s = ex.sets[state.currentSetIndex];
      if (!s) return {};
      s.rpe = rpe;
      return { exercises: exs };
    }),

  // Mark current set done → enter rest phase (or done if last set of last exercise)
  completeSet: () =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const ex = exs[state.exerciseIndex];
      if (!ex) return {};

      ex.sets[state.currentSetIndex] = {
        ...ex.sets[state.currentSetIndex],
        state: 'done',
      };

      const hasNextSet = state.currentSetIndex + 1 < ex.sets.length;
      const hasNextExercise = state.exerciseIndex + 1 < exs.length;

      if (!hasNextSet && !hasNextExercise) {
        return { exercises: exs, phase: 'done' };
      }

      return { exercises: exs, phase: 'rest', elapsedSeconds: 0 };
    }),

  // Advance to next set/exercise and resume active phase
  startNextSet: () =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const ex = exs[state.exerciseIndex];
      if (!ex) return {};

      const nextSet = state.currentSetIndex + 1;
      if (nextSet < ex.sets.length) {
        ex.sets[nextSet] = { ...ex.sets[nextSet], state: 'active' };
        return { exercises: exs, currentSetIndex: nextSet, phase: 'active', elapsedSeconds: 0 };
      }

      const nextEx = state.exerciseIndex + 1;
      if (nextEx < exs.length) {
        exs[nextEx].sets[0] = { ...exs[nextEx].sets[0], state: 'active' };
        return { exercises: exs, exerciseIndex: nextEx, currentSetIndex: 0, phase: 'active', elapsedSeconds: 0 };
      }

      return {};
    }),

  undoLastSet: () =>
    set((state) => {
      if (state.phase !== 'rest') return {};
      const exs = structuredClone(state.exercises);
      const ex = exs[state.exerciseIndex];
      if (!ex) return {};
      const s = ex.sets[state.currentSetIndex];
      if (s?.state !== 'done') return {};
      ex.sets[state.currentSetIndex] = { ...s, state: 'active' };
      return { exercises: exs, phase: 'active', elapsedSeconds: 0 };
    }),

  swapExercise: (index, newExerciseId) =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      if (index < 0 || index >= exs.length) return {};
      const ex = exs[index];
      exs[index] = {
        exerciseId: newExerciseId,
        sets: ex.sets.map((s, i) => ({
          ...s,
          state: i === 0 ? 'active' as const : 'pending' as const,
        })),
      };
      if (index === state.exerciseIndex) {
        return { exercises: exs, currentSetIndex: 0, phase: 'active', elapsedSeconds: 0 };
      }
      return { exercises: exs };
    }),

  addSet: (exerciseIndex) =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const ex = exs[exerciseIndex];
      if (!ex || ex.sets.length === 0) return {};
      const last = ex.sets[ex.sets.length - 1];
      ex.sets.push({ reps: last.reps, weightKg: last.weightKg, rpe: 7, state: 'pending' });
      return { exercises: exs };
    }),

  addExercise: (exerciseId) =>
    set((state) => {
      const exs = structuredClone(state.exercises);
      const ref = exs[exs.length - 1]?.sets[0];
      exs.push({
        exerciseId,
        sets: Array.from({ length: 3 }, () => ({
          reps: ref?.reps ?? 10,
          weightKg: 40,
          rpe: 7,
          state: 'pending' as const,
        })),
      });
      return { exercises: exs };
    }),

  goToExercise: (index) =>
    set((state) => {
      if (index < 0 || index >= state.exercises.length) return {};
      const ex = state.exercises[index];
      const setIdx = ex.sets.findIndex((s) => s.state !== 'done');
      return {
        exerciseIndex: index,
        currentSetIndex: setIdx >= 0 ? setIdx : ex.sets.length - 1,
        phase: 'active',
        elapsedSeconds: 0,
      };
    }),

  tickTimer: () => set((state) => ({ elapsedSeconds: state.elapsedSeconds + 1 })),
  resetTimer: () => set({ elapsedSeconds: 0 }),

  endWorkout: () =>
    set({
      sessionId: null,
      template: null,
      startedAt: null,
      exerciseIndex: 0,
      currentSetIndex: 0,
      phase: 'active',
      exercises: [],
      elapsedSeconds: 0,
      isPaused: false,
      exerciseNotes: {},
    }),
  }),
  {
    name: 'iron-active-workout',
    storage: createJSONStorage(() => AsyncStorage),
  },
));
