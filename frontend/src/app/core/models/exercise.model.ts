export type Category = 'gym' | 'calistenia';
export type ExerciseType = 'empuje' | 'tiron' | 'pierna' | 'core' | 'cardio';
export type InputType = 'peso' | 'reps' | 'tiempo' | 'emom' | 'min';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  type: ExerciseType;
  inputType: InputType;
  /** Etiqueta corta heredada ("Pecho/Tríceps"). Los músculos reales van en los arrays. */
  muscleGroup: string | null;
  /* Opcionales a propósito: una API todavía sin migrar no los envía, y la
     interfaz tiene que aguantarlo sin romperse. */
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  createdAt: string;
}

export interface ExerciseInput {
  name: string;
  category: Category;
  type: ExerciseType;
  inputType: InputType;
  muscleGroup?: string | null;
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
}
