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
  cardio: 'Cardio',
};

/** Etiqueta del tipo de entreno; si combina empuje y tirón, los muestra juntos. */
export function sessionTypeLabel(types: ExerciseType[]): string {
  const set = new Set(types);
  if (set.has('empuje') && set.has('tiron')) return 'Empuje y tirón';
  return types[0] ? TYPE_LABEL[types[0]] : '';
}

export const INPUT_TYPE_LABEL: Record<InputType, string> = {
  peso: 'Peso',
  reps: 'Repeticiones',
  tiempo: 'Tiempo',
  emom: 'EMOM',
  min: 'Minutos',
};

export const INPUT_TYPE_UNIT: Record<InputType, string> = {
  peso: 'kg',
  reps: 'reps',
  tiempo: 'seg',
  emom: 'rondas',
  min: 'min',
};
