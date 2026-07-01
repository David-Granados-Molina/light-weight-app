import { Category, Exercise } from './exercise.model';

export interface RoutineExercise {
  id: string;
  exerciseId: string;
  exercise: Exercise;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight: number | null;
  targetRIR: number | null;
  note: string | null;
  order: number;
}

export interface Routine {
  id: string;
  name: string;
  category: Category;
  notes: string | null;
  createdAt: string;
  exercises: RoutineExercise[];
}

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight?: number | null;
  targetRIR?: number | null;
  note?: string | null;
}

export interface RoutineInput {
  name: string;
  category: Category;
  notes?: string | null;
  exercises: RoutineExerciseInput[];
}
