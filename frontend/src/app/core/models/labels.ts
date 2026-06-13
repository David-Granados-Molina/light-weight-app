import { Category, ExerciseType, InputType } from './exercise.model';

export const CATEGORY_LABEL: Record<Category, string> = {
  gym: 'Gym',
  calistenia: 'Calistenia',
};

export const CATEGORY_COLOR: Record<Category, string> = {
  gym: 'var(--color-gym)',
  calistenia: 'var(--color-cali)',
};

export const TYPE_LABEL: Record<ExerciseType, string> = {
  empuje: 'Empuje',
  tiron: 'Tirón',
  pierna: 'Pierna',
  core: 'Core',
};

export const INPUT_TYPE_LABEL: Record<InputType, string> = {
  peso: 'Peso',
  reps: 'Repeticiones',
  tiempo: 'Tiempo',
};

export const INPUT_TYPE_UNIT: Record<InputType, string> = {
  peso: 'kg',
  reps: 'reps',
  tiempo: 'seg',
};
