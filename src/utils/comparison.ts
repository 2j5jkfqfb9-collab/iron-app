import type { WorkoutSession, Comparison, DeltaKind } from '@/types';
import { exerciseById } from '@/data/exercises';

type TopSet = { weightKg: number; reps: number };

function topSet(session: WorkoutSession, exerciseId: string): TopSet | null {
  const ex = session.exercises.find((e) => e.exerciseId === exerciseId);
  if (!ex || ex.sets.length === 0) return null;
  return ex.sets.reduce((best, s) => {
    const score = s.weightKg * s.reps;
    const bestScore = best.weightKg * best.reps;
    return score > bestScore ? { weightKg: s.weightKg, reps: s.reps } : best;
  }, { weightKg: ex.sets[0].weightKg, reps: ex.sets[0].reps });
}

export function buildComparisons(
  current: WorkoutSession,
  previous: WorkoutSession | null,
): Comparison[] {
  return current.exercises.map((ex) => {
    const exercise = exerciseById(ex.exerciseId);
    const name = exercise?.name ?? ex.exerciseId;
    const cur = topSet(current, ex.exerciseId);

    if (!previous || !cur) {
      return { exerciseId: ex.exerciseId, exerciseName: name, delta: 'same', text: '— FIRST TIME' };
    }

    const prev = topSet(previous, ex.exerciseId);
    if (!prev) {
      return { exerciseId: ex.exerciseId, exerciseName: name, delta: 'same', text: '— FIRST TIME' };
    }

    const curScore = cur.weightKg * cur.reps;
    const prevScore = prev.weightKg * prev.reps;

    if (curScore > prevScore) {
      // Check if it's a true PR (never achieved this top-set combination before)
      const isPR = cur.weightKg > prev.weightKg || cur.reps > prev.reps;
      const kgDiff = cur.weightKg - prev.weightKg;
      const repDiff = cur.reps - prev.reps;

      if (isPR) {
        const detail = kgDiff > 0 ? `+ ${kgDiff} KG` : repDiff > 0 ? `+ ${repDiff} REPS` : '';
        const text = detail ? `↑ PR · ${detail}` : '↑ PR';
        return { exerciseId: ex.exerciseId, exerciseName: name, delta: 'pr' as DeltaKind, text };
      }

      const text = kgDiff > 0 ? `+ ${kgDiff} KG` : `+ ${repDiff} REPS`;
      return { exerciseId: ex.exerciseId, exerciseName: name, delta: 'up', text };
    }

    if (curScore < prevScore) {
      const kgDiff = prev.weightKg - cur.weightKg;
      const repDiff = prev.reps - cur.reps;
      const text = kgDiff > 0 ? `− ${kgDiff} KG` : `− ${repDiff} REPS`;
      return { exerciseId: ex.exerciseId, exerciseName: name, delta: 'down', text };
    }

    return { exerciseId: ex.exerciseId, exerciseName: name, delta: 'same', text: '= EQUAL' };
  });
}
