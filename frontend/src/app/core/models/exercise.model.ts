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

export type Difficulty = 'iniciacion' | 'intermedio' | 'avanzado';

/** Lo que cada usuario apunta sobre un ejercicio del catálogo compartido. */
export interface ExerciseProfile {
  id: string;
  exerciseId: string;
  /** Imagen subida, como data URL ya reducida en el navegador. */
  imageData: string | null;
  /** Imagen del catálogo libre: se guarda el enlace, no una copia. */
  imageUrl: string | null;
  /** Autoría de esa imagen: las de wger son CC-BY-SA y hay que citarla. */
  imageAuthor: string | null;
  imageLicense: string | null;
  videoUrl: string | null;
  description: string | null;
  tips: string | null;
  equipment: string | null;
  difficulty: Difficulty | null;
}

export type ExerciseProfileInput = Omit<ExerciseProfile, 'id' | 'exerciseId'>;

/** Candidato del catálogo libre de wger, con su autoría. */
export interface FreeExerciseImage {
  id: string;
  name: string;
  nameEn: string | null;
  image: string;
  thumbnail: string;
  author: string | null;
  license: string;
}
