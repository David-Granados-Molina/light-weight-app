export type Category = 'gym' | 'calistenia';
export type ExerciseType = 'empuje' | 'tiron' | 'pierna' | 'core';
export type InputType = 'peso' | 'reps' | 'tiempo' | 'emom';

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
