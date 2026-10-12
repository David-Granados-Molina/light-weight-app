import { ExerciseType, InputType } from '../models/exercise.model';
import { sessionTypeLabel } from '../models/labels';
import { effectiveInputType, formatSets } from './format';

interface ShareExercise {
  exercise: { name: string; type: ExerciseType; inputType: InputType };
  sets: { weight?: number | null; reps?: number | null; time?: number | null }[];
  inputTypeOverride?: InputType | null;
}

export function workoutShareText(isoDate: string, exercises: ShareExercise[]): string {
  if (!exercises.length) return '';

  const date = new Date(isoDate.length > 10 ? isoDate : `${isoDate}T00:00:00`);
  const label = date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  const capitalized = label.charAt(0).toUpperCase() + label.slice(1);
  const type = sessionTypeLabel(exercises.map((e) => e.exercise.type));
  const lines = exercises.map((e) => `${e.exercise.name}: ${formatSets(e.sets, effectiveInputType(e))}`);

  return `💪 Entreno · ${capitalized} (${type})\n\n${lines.join('\n')}\n\n— Light Weight`;
}

interface ShareRoutine {
  name: string;
  category: 'gym' | 'calistenia';
  warmupDescription?: string | null;
  exercises: {
    exercise: { name: string; inputType: InputType };
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    targetWeight?: number | null;
    targetRIR?: number | null;
    restSeconds?: number | null;
    description?: string | null;
  }[];
}

export function routineShareText(routine: ShareRoutine): string {
  const lines = routine.exercises.map((e) => {
    const partes = [e.targetSets === 1 ? '1 serie' : `${e.targetSets} series`];

    if (e.exercise.inputType === 'min') {
      const h = Math.floor(e.targetRepsMin / 60);
      const m = e.targetRepsMin % 60;
      partes.push(h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`);
    } else {
      if (e.targetWeight) partes.push(`${e.targetWeight}kg`);
      const unidad = e.exercise.inputType === 'tiempo' ? 'seg' : e.exercise.inputType === 'emom' ? 'rondas' : 'reps';
      partes.push(
        e.targetRepsMin === e.targetRepsMax
          ? `${e.targetRepsMin} ${unidad}`
          : `${e.targetRepsMin}-${e.targetRepsMax} ${unidad}`,
      );
      if (e.targetRIR !== null && e.targetRIR !== undefined) partes.push(`RIR ${e.targetRIR}`);
    }

    if (e.restSeconds) {
      const min = Math.floor(e.restSeconds / 60);
      const seg = e.restSeconds % 60;
      partes.push(`descanso ${min ? (seg ? `${min} min ${seg} s` : `${min} min`) : `${seg} s`}`);
    }

    const cabecera = `${e.exercise.name}: ${partes.join(' · ')}`;
    return e.description?.trim() ? `${cabecera}\n   ${e.description.trim()}` : cabecera;
  });

  const categoria = routine.category === 'gym' ? 'Gym' : 'Calistenia';
  const calentamiento = routine.warmupDescription?.trim() ? `\n\nCalentamiento: ${routine.warmupDescription.trim()}` : '';

  return `🏋️ ${routine.name} (${categoria})${calentamiento}\n\n${lines.join('\n')}\n\n— Light Weight`;
}
