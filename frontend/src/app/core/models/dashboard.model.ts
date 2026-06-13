import { Category, ExerciseType } from './exercise.model';

export interface WeekBar {
  date: string;
  volumeKg: number;
  category: Category | null;
  isToday: boolean;
}

export interface RecentSession {
  id: string;
  date: string;
  category: Category;
  type: ExerciseType;
  exerciseCount: number;
}

export interface DashboardSummary {
  weekEntrenos: number;
  weekVolumeKg: number;
  weekBars: WeekBar[];
  recent: RecentSession[];
}
