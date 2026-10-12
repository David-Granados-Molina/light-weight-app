import { Exercise, InputType } from './exercise.model';

export interface ProgressPoint {
  date: string;
  value: number;
  reps: number | null;
}

export interface ProgressStat {
  value: number;
  reps: number | null;
}

export interface ProgressSessionSet {
  setNumber: number;
  weight: number | null;
  reps: number | null;
  time: number | null;
}

/** Lo que se hizo un día concreto en ese ejercicio, detrás del punto de la gráfica. */
export interface ProgressSession {
  sessionId: string;
  date: string;
  inputTypeOverride: InputType | null;
  note: string | null;
  sets: ProgressSessionSet[];
  series: number;
  totalReps: number;
  totalTime: number;
  maxWeight: number;
  volume: number;
}

export interface ProgressData {
  exercise: Exercise;
  points: ProgressPoint[];
  pr: ProgressStat;
  actual: ProgressStat;
  cambio: number;
  /** Solo viene al pedir un ejercicio suelto; el progreso por rutina no lo incluye. */
  sessions?: ProgressSession[];
}

export type RoutineProgressItem = ProgressData;

export interface RoutineProgressData {
  routine: { id: string; name: string; category: Exercise['category'] };
  items: RoutineProgressItem[];
}
