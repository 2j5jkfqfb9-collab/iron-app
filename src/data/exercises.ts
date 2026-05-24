import type { Exercise } from '@/types';

export const EXERCISES: Exercise[] = [
  // Lower
  { id: 'barbell-squat',      name: 'Barbell Squat',         startLetter: 'B', muscleGroup: 'lower' },
  { id: 'goblet-squat',       name: 'Goblet Squat',          startLetter: 'G', muscleGroup: 'lower' },
  { id: 'hack-squat',         name: 'Hack Squat',            startLetter: 'H', muscleGroup: 'lower' },
  { id: 'romanian-deadlift',  name: 'Romanian Deadlift',     startLetter: 'R', muscleGroup: 'lower' },
  { id: 'walking-lunge',      name: 'Walking Lunge',         startLetter: 'W', muscleGroup: 'lower' },
  { id: 'hip-thrust',         name: 'Hip Thrust',            startLetter: 'H', muscleGroup: 'lower' },
  { id: 'glute-bridge',       name: 'Glute Bridge',          startLetter: 'G', muscleGroup: 'lower' },
  { id: 'leg-press',          name: 'Leg Press',             startLetter: 'L', muscleGroup: 'lower' },
  { id: 'leg-curl',           name: 'Leg Curl',              startLetter: 'L', muscleGroup: 'lower' },
  { id: 'leg-extension',      name: 'Leg Extension',         startLetter: 'L', muscleGroup: 'lower' },
  { id: 'calf-raise',         name: 'Calf Raise',            startLetter: 'C', muscleGroup: 'lower' },
  { id: 'bulgarian-split',    name: 'Bulgarian Split Squat', startLetter: 'B', muscleGroup: 'lower' },
  { id: 'step-up',            name: 'Step Up',               startLetter: 'S', muscleGroup: 'lower' },

  // Push
  { id: 'bench-press',        name: 'Bench Press',           startLetter: 'B', muscleGroup: 'push' },
  { id: 'incline-press',      name: 'Incline Press',         startLetter: 'I', muscleGroup: 'push' },
  { id: 'close-grip-bench',   name: 'Close Grip Bench',      startLetter: 'C', muscleGroup: 'push' },
  { id: 'overhead-press',     name: 'Overhead Press',        startLetter: 'O', muscleGroup: 'push' },
  { id: 'lateral-raise',      name: 'Lateral Raise',         startLetter: 'L', muscleGroup: 'push' },
  { id: 'front-raise',        name: 'Front Raise',           startLetter: 'F', muscleGroup: 'push' },
  { id: 'tricep-dip',         name: 'Tricep Dip',            startLetter: 'T', muscleGroup: 'push' },
  { id: 'skull-crusher',      name: 'Skull Crusher',         startLetter: 'S', muscleGroup: 'push' },
  { id: 'tricep-pushdown',    name: 'Tricep Pushdown',       startLetter: 'T', muscleGroup: 'push' },
  { id: 'db-fly',             name: 'Dumbbell Fly',          startLetter: 'D', muscleGroup: 'push' },
  { id: 'cable-fly',          name: 'Cable Fly',             startLetter: 'C', muscleGroup: 'push' },
  { id: 'machine-chest-press',name: 'Machine Chest Press',   startLetter: 'M', muscleGroup: 'push' },

  // Pull
  { id: 'barbell-row',        name: 'Barbell Row',           startLetter: 'B', muscleGroup: 'pull' },
  { id: 'single-arm-row',     name: 'Single Arm Row',        startLetter: 'S', muscleGroup: 'pull' },
  { id: 'tbar-row',           name: 'T-Bar Row',             startLetter: 'T', muscleGroup: 'pull' },
  { id: 'lat-pulldown',       name: 'Lat Pulldown',          startLetter: 'L', muscleGroup: 'pull' },
  { id: 'seated-row',         name: 'Seated Cable Row',      startLetter: 'S', muscleGroup: 'pull' },
  { id: 'face-pull',          name: 'Face Pull',             startLetter: 'F', muscleGroup: 'pull' },
  { id: 'bicep-curl',         name: 'Bicep Curl',            startLetter: 'B', muscleGroup: 'pull' },
  { id: 'hammer-curl',        name: 'Hammer Curl',           startLetter: 'H', muscleGroup: 'pull' },
  { id: 'preacher-curl',      name: 'Preacher Curl',         startLetter: 'P', muscleGroup: 'pull' },
  { id: 'shrug',              name: 'Barbell Shrug',         startLetter: 'B', muscleGroup: 'pull' },

  // Upper (compound)
  { id: 'deadlift',           name: 'Deadlift',              startLetter: 'D', muscleGroup: 'upper' },
  { id: 'sumo-deadlift',      name: 'Sumo Deadlift',         startLetter: 'S', muscleGroup: 'upper' },
  { id: 'pull-up',            name: 'Pull Up',               startLetter: 'P', muscleGroup: 'upper' },
  { id: 'chin-up',            name: 'Chin Up',               startLetter: 'C', muscleGroup: 'upper' },
  { id: 'push-up',            name: 'Push Up',               startLetter: 'P', muscleGroup: 'upper' },
  { id: 'dip',                name: 'Dip',                   startLetter: 'D', muscleGroup: 'upper' },
  { id: 'power-clean',        name: 'Power Clean',           startLetter: 'P', muscleGroup: 'upper' },

  // Core
  { id: 'plank-hold',         name: 'Plank Hold',            startLetter: 'P', muscleGroup: 'core' },
  { id: 'side-plank',         name: 'Side Plank',            startLetter: 'S', muscleGroup: 'core' },
  { id: 'ab-wheel',           name: 'Ab Wheel',              startLetter: 'A', muscleGroup: 'core' },
  { id: 'hanging-leg-raise',  name: 'Hanging Leg Raise',     startLetter: 'H', muscleGroup: 'core' },
  { id: 'cable-crunch',       name: 'Cable Crunch',          startLetter: 'C', muscleGroup: 'core' },
  { id: 'russian-twist',      name: 'Russian Twist',         startLetter: 'R', muscleGroup: 'core' },
  { id: 'sit-up',             name: 'Sit Up',                startLetter: 'S', muscleGroup: 'core' },
  { id: 'bicycle-crunch',     name: 'Bicycle Crunch',        startLetter: 'B', muscleGroup: 'core' },

  // Mobility
  { id: 'hip-flexor-stretch', name: 'Hip Flexor Stretch',    startLetter: 'H', muscleGroup: 'mobility' },
  { id: 'thoracic-rotation',  name: 'Thoracic Rotation',     startLetter: 'T', muscleGroup: 'mobility' },
  { id: 'world-greatest',     name: 'World Greatest Stretch',startLetter: 'W', muscleGroup: 'mobility' },
  { id: 'couch-stretch',      name: 'Couch Stretch',         startLetter: 'C', muscleGroup: 'mobility' },
  { id: 'pigeon-pose',        name: 'Pigeon Pose',           startLetter: 'P', muscleGroup: 'mobility' },
];

export const exerciseById = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id);
