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
  /**
   * VESTIGIAL. La nota de un ejercicio de rutina se quitó: una nota es lo que se
   * apunta en el momento de hacer la serie y vive en el entreno (`SessionExercise.note`).
   * Lo permanente de este ejercicio en esta rutina es `description`. La API la
   * sigue devolviendo mientras la columna exista; nadie la lee.
   */
  note?: string | null;
  /* Opcionales a propósito: una API todavía sin migrar no los envía. */
  /** Consejos escritos al montar la rutina, para quien la va a seguir. */
  description?: string | null;
  /** Enlace a un vídeo que muestra la ejecución. */
  videoUrl?: string | null;
  /** Descanso recomendado entre series, en segundos. */
  restSeconds?: number | null;
  order: number;
}

export interface Routine {
  id: string;
  name: string;
  category: Category;
  notes: string | null;
  createdAt: string;
  /* Opcionales a propósito: una API todavía sin migrar no los envía. */
  /** Qué hacer antes de empezar la rutina. */
  warmupDescription?: string | null;
  /** Vídeo del calentamiento, normalmente de YouTube. */
  warmupVideoUrl?: string | null;
  exercises: RoutineExercise[];
}

export interface RoutineExerciseInput {
  exerciseId: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  targetWeight?: number | null;
  targetRIR?: number | null;
  description?: string | null;
  videoUrl?: string | null;
  restSeconds?: number | null;
}

export interface RoutineInput {
  name: string;
  category: Category;
  notes?: string | null;
  warmupDescription?: string | null;
  warmupVideoUrl?: string | null;
  exercises: RoutineExerciseInput[];
}
