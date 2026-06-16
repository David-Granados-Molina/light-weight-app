export type Category = 'gym' | 'calistenia';
export type ExerciseType = 'empuje' | 'tiron' | 'pierna' | 'core' | 'cardio';
export type InputType = 'peso' | 'reps' | 'tiempo' | 'emom' | 'min';

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  type: ExerciseType;
  inputType: InputType;
  muscleGroup: string | null;
  createdAt: string;
}

export interface ExerciseInput {
  name: string;
  category: Category;
  type: ExerciseType;
  inputType: InputType;
  muscleGroup?: string | null;
}
