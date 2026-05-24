import type { WorkoutTemplate } from '@/types';

export const TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'strength-compound',
    name: 'Strength',
    muscleGroup: 'upper',
    estimatedMinutes: 55,
    exercises: [
      { exerciseId: 'barbell-squat',    targetSets: 5, targetReps: 5, startWeightKg: 80  },
      { exerciseId: 'bench-press',      targetSets: 5, targetReps: 5, startWeightKg: 60  },
      { exerciseId: 'barbell-row',      targetSets: 5, targetReps: 5, startWeightKg: 60  },
      { exerciseId: 'overhead-press',   targetSets: 3, targetReps: 5, startWeightKg: 40  },
      { exerciseId: 'deadlift',         targetSets: 1, targetReps: 5, startWeightKg: 100 },
    ],
  },
  {
    id: 'lower-body-hypertrophy',
    name: 'Lower Body',
    muscleGroup: 'lower',
    estimatedMinutes: 42,
    exercises: [
      { exerciseId: 'goblet-squat',      targetSets: 4, targetReps: 12, startWeightKg: 14 },
      { exerciseId: 'romanian-deadlift', targetSets: 4, targetReps: 10, startWeightKg: 20 },
      { exerciseId: 'walking-lunge',     targetSets: 3, targetReps: 12, startWeightKg: 10 },
      { exerciseId: 'glute-bridge',      targetSets: 3, targetReps: 15, startWeightKg: 20 },
      { exerciseId: 'calf-raise',        targetSets: 4, targetReps: 15, startWeightKg: 0  },
      { exerciseId: 'plank-hold',        targetSets: 3, targetReps: 1,  startWeightKg: 0  },
    ],
  },
  {
    id: 'push-chest-shoulder',
    name: 'Push · Chest & Shoulder',
    muscleGroup: 'push',
    estimatedMinutes: 38,
    exercises: [
      { exerciseId: 'bench-press',    targetSets: 4, targetReps: 8,  startWeightKg: 60 },
      { exerciseId: 'incline-press',  targetSets: 3, targetReps: 10, startWeightKg: 40 },
      { exerciseId: 'overhead-press', targetSets: 3, targetReps: 10, startWeightKg: 40 },
      { exerciseId: 'lateral-raise',  targetSets: 4, targetReps: 15, startWeightKg: 8  },
      { exerciseId: 'tricep-dip',     targetSets: 3, targetReps: 12, startWeightKg: 0  },
    ],
  },
  {
    id: 'pull-back-bicep',
    name: 'Pull · Back & Bicep',
    muscleGroup: 'pull',
    estimatedMinutes: 40,
    exercises: [
      { exerciseId: 'barbell-row',   targetSets: 4, targetReps: 8,  startWeightKg: 60 },
      { exerciseId: 'lat-pulldown',  targetSets: 3, targetReps: 10, startWeightKg: 50 },
      { exerciseId: 'seated-row',    targetSets: 3, targetReps: 12, startWeightKg: 45 },
      { exerciseId: 'face-pull',     targetSets: 3, targetReps: 15, startWeightKg: 15 },
      { exerciseId: 'bicep-curl',    targetSets: 3, targetReps: 12, startWeightKg: 12 },
    ],
  },
  {
    id: 'core-mobility',
    name: 'Core & Mobility',
    muscleGroup: 'core',
    estimatedMinutes: 22,
    exercises: [
      { exerciseId: 'plank-hold',         targetSets: 4, targetReps: 1,  startWeightKg: 0 },
      { exerciseId: 'ab-wheel',           targetSets: 3, targetReps: 10, startWeightKg: 0 },
      { exerciseId: 'hanging-leg-raise',  targetSets: 3, targetReps: 12, startWeightKg: 0 },
      { exerciseId: 'cable-crunch',       targetSets: 3, targetReps: 15, startWeightKg: 20 },
      { exerciseId: 'hip-flexor-stretch', targetSets: 2, targetReps: 1,  startWeightKg: 0 },
      { exerciseId: 'thoracic-rotation',  targetSets: 2, targetReps: 1,  startWeightKg: 0 },
      { exerciseId: 'world-greatest',     targetSets: 2, targetReps: 1,  startWeightKg: 0 },
      { exerciseId: 'deadlift',           targetSets: 3, targetReps: 8,  startWeightKg: 60 },
    ],
  },
];
