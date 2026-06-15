import { Exercise } from './exercise.model';

export type ProgressMetric = 'peso' | 'volumen';

export interface ProgressPoint {
  date: string;
  value: number;
}

export interface ProgressData {
  exercise: Exercise;
  metric: ProgressMetric;
  points: ProgressPoint[];
  pr: number;
  actual: number;
  cambio: number;
}

export type RoutineProgressItem = ProgressData;

export interface RoutineProgressData {
  routine: { id: string; name: string; category: Exercise['category'] };
  items: RoutineProgressItem[];
}
