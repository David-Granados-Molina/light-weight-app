import { computed, effect, Injectable, signal } from '@angular/core';
import { Exercise, InputType } from '../models/exercise.model';

export interface SetEntry {
  weight?: number;
  reps?: number;
  time?: number;
}

export interface AddedExercise {
  exercise: Exercise;
  sets: SetEntry[];
  targetRepsMin?: number;
  targetRepsMax?: number;
  targetRIR?: number;
  note?: string;
  /** Si no es null, sustituye al inputType del ejercicio solo para este entreno (ver EMOM puntual). */
  inputTypeOverride?: InputType | null;
}

interface DraftSnapshot {
  selectedDate: string | null;
  added: AddedExercise[];
  selectedRoutineId: string | null;
  editingSessionId: string | null;
}

const STORAGE_KEY = 'lw_workout_draft';

/**
 * Mantiene el entreno que se está registrando para que no se pierda si el
 * usuario navega a otra pantalla (p. ej. a Rutinas para consultar una rutina)
 * y vuelve a Registrar, ni si recarga la página por accidente: cada cambio se
 * persiste en localStorage y se recupera al volver a abrir la app.
 */
@Injectable({ providedIn: 'root' })
export class WorkoutDraftStore {
  readonly selectedDate = signal<string | null>(null);
  readonly added = signal<AddedExercise[]>([]);
  readonly selectedRoutineId = signal<string | null>(null);
  readonly editingSessionId = signal<string | null>(null);

  /** Hay ejercicios añadidos sin guardar: el registro de un entreno está a medias. */
  readonly hasInProgress = computed(() => this.added().length > 0);

  constructor() {
    this.hydrate();

    effect(() => {
      this.persist({
        selectedDate: this.selectedDate(),
        added: this.added(),
        selectedRoutineId: this.selectedRoutineId(),
        editingSessionId: this.editingSessionId(),
      });
    });
  }

  reset(): void {
    this.added.set([]);
    this.selectedRoutineId.set(null);
    this.editingSessionId.set(null);
  }

  private hydrate(): void {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const snapshot: DraftSnapshot = JSON.parse(raw);
      this.selectedDate.set(snapshot.selectedDate ?? null);
      this.added.set(snapshot.added ?? []);
      this.selectedRoutineId.set(snapshot.selectedRoutineId ?? null);
      this.editingSessionId.set(snapshot.editingSessionId ?? null);
    } catch {
      // localStorage no disponible o datos corruptos: se ignora y se parte de cero
    }
  }

  private persist(snapshot: DraftSnapshot): void {
    try {
      if (!snapshot.added.length) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch {
      // almacenamiento lleno o no disponible: se pierde el borrador, no es crítico
    }
  }
}
