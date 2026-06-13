import { Injectable, signal } from '@angular/core';
import { Category, Exercise } from '../models/exercise.model';

export interface SetEntry {
  weight?: number;
  reps?: number;
  time?: number;
}

export interface AddedExercise {
  exercise: Exercise;
  sets: SetEntry[];
}

/**
 * Mantiene el entreno que se está registrando para que no se pierda si el
 * usuario navega a otra pantalla (p. ej. a Rutinas para consultar una rutina)
 * y vuelve a Registrar.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutDraftStore {
  readonly category = signal<Category>('gym');
  readonly selectedDate = signal<string | null>(null);
  readonly search = signal('');
  readonly added = signal<AddedExercise[]>([]);

  reset(): void {
    this.added.set([]);
    this.search.set('');
  }
}
