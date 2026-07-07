import { Category, Exercise, ExerciseType, InputType } from './exercise.model';

export interface SessionSet {
  id: string;
  setNumber: number;
  weight: number | null;
  reps: number | null;
  time: number | null;
}

export interface SessionExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  note: string | null;
  order: number;
  /** Si no es null, sustituye al inputType del ejercicio solo para este entreno (ver EMOM puntual). */
  inputTypeOverride: InputType | null;
  sets: SessionSet[];
}

export interface WorkoutSession {
  id: string;
  date: string;
  category: Category;
  type: ExerciseType;
  source: string;
  notes: string | null;
  routineId: string | null;
  createdAt: string;
  exercises: SessionExercise[];
}

export interface SessionSetInput {
  setNumber: number;
  weight?: number | null;
  reps?: number | null;
  time?: number | null;
}

export interface SessionExerciseInput {
  exerciseId: string;
  note?: string | null;
  inputTypeOverride?: InputType | null;
  sets: SessionSetInput[];
}

export interface SessionInput {
  date?: string;
  category: Category;
  type: ExerciseType;
  notes?: string | null;
  routineId?: string | null;
  exercises: SessionExerciseInput[];
}
