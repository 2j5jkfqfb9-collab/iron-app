export type MuscleGroup = 'lower' | 'upper' | 'push' | 'pull' | 'core' | 'mobility';

export type Exercise = {
  id: string;
  name: string;
  startLetter: string;
  muscleGroup: MuscleGroup;
};

export type SetLog = {
  reps: number;
  weightKg: number;
  rpe: number; // 1..10
  completedAt: string; // ISO
};

export type WorkoutExercise = {
  exerciseId: string;
  sets: SetLog[];
  targetSets: number;
  targetReps: number;
  targetWeightKg: number;
  note?: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  muscleGroup: MuscleGroup;
  estimatedMinutes: number;
  exercises: {
    exerciseId: string;
    targetSets: number;
    targetReps: number;
    startWeightKg: number;
  }[];
};

export type WorkoutSession = {
  id: string;
  templateId: string;
  templateName?: string;
  startedAt: string;
  endedAt?: string;
  note?: string;
  exercises: WorkoutExercise[];
};

export type DeltaKind = 'up' | 'down' | 'same' | 'pr';

export type Comparison = {
  exerciseId: string;
  exerciseName: string;
  delta: DeltaKind;
  text: string; // e.g. "+ 2 KG", "= EQUAL", "↑ PR · + 2 KG"
};

// Active workout state (not yet saved to history)
export type ActiveSet = {
  reps: number;
  weightKg: number;
  rpe: number;
  state: 'pending' | 'active' | 'done';
};

export type ActiveExercise = {
  exerciseId: string;
  sets: ActiveSet[];
};

export type WorkoutPhase = 'active' | 'rest' | 'done';
