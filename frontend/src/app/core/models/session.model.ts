import { Category, Exercise, ExerciseType } from './exercise.model';

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
  order: number;
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
