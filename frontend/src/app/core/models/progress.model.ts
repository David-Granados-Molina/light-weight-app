import { Exercise } from './exercise.model';

export interface ProgressPoint {
  date: string;
  value: number;
  reps: number | null;
}

export interface ProgressStat {
  value: number;
  reps: number | null;
}

export interface ProgressData {
  exercise: Exercise;
  points: ProgressPoint[];
  pr: ProgressStat;
  actual: ProgressStat;
  cambio: number;
}

export type RoutineProgressItem = ProgressData;

export interface RoutineProgressData {
  routine: { id: string; name: string; category: Exercise['category'] };
  items: RoutineProgressItem[];
}
