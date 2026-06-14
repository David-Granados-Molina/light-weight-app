import { Category, ExerciseType } from './exercise.model';
import { SessionExercise } from './session.model';

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
  exercises: SessionExercise[];
}

export interface DashboardSummary {
  weekEntrenos: number;
  weekSets: number;
  weekBars: WeekBar[];
  recent: RecentSession[];
}
