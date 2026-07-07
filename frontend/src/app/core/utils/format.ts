import { InputType } from '../models/exercise.model';

export function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

interface HasInputTypeOverride {
  inputTypeOverride?: InputType | null;
  exercise: { inputType: InputType };
}

/** Modo real con el que se registró este ejercicio: el override puntual de la sesión, o si no el del catálogo. */
export function effectiveInputType(e: HasInputTypeOverride): InputType {
  return e.inputTypeOverride ?? e.exercise.inputType;
}

interface SetLike {
  weight?: number | null;
  reps?: number | null;
  time?: number | null;
}

/** "20kg×8", "12 reps", "45s", "30min" o "8'· 4 reps" según el tipo de serie. */
export function formatSet(s: SetLike, inputType?: InputType): string {
  if (inputType === 'emom') return `${s.time ?? 0}' · ${s.reps ?? 0} reps`;
  if (inputType === 'min') {
    const total = s.time ?? 0;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? (m > 0 ? `${h}h ${m}min` : `${h}h`) : `${m}min`;
  }
  if (s.time !== null && s.time !== undefined) {
    const weightPrefix = s.weight !== null && s.weight !== undefined && s.weight > 0 ? `${s.weight}kg×` : '';
    return `${weightPrefix}${s.time}s`;
  }
  if (s.weight !== null && s.weight !== undefined && s.weight > 0) return `${s.weight}kg×${s.reps ?? 0}`;
  return `${s.reps ?? 0}`;
}

/**
 * Une las series de un ejercicio, ej. "20kg×8 · 20kg×8 · 18kg×6".
 * Para EMOM con más de un bloque, antepone la duración total, ej.
 * "12' TOTAL: 8'· 4 reps - 4'· 3 reps".
 */
export function formatSets(sets: SetLike[], inputType?: InputType): string {
  if (inputType === 'emom' && sets.length > 1) {
    const total = sets.reduce((sum, s) => sum + (s.time ?? 0), 0);
    const blocks = sets.map((s) => formatSet(s, inputType)).join(' - ');
    return `${total}' TOTAL: ${blocks}`;
  }
  return sets.map((s) => formatSet(s, inputType)).join(' · ');
}

const DAY_LETTERS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

/** Lunes=0 ... Domingo=6 -> letra del día */
export function dayLetter(mondayIndex: number): string {
  return DAY_LETTERS[mondayIndex];
}

const WEEKDAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const WEEKDAY_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** "Hoy", "Ayer", "Mar" o "10/04/26" según lo cerca que esté la fecha. */
export function relativeDayLabel(isoDate: string): string {
  const date = new Date(isoDate);
  const today = new Date();
  const diffDays = Math.round((startOfDay(today).getTime() - startOfDay(date).getTime()) / 86_400_000);

  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  if (diffDays > 1 && diffDays < 7) return WEEKDAY_SHORT[date.getDay()];

  return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function todayLabel(): string {
  const today = new Date();
  const weekday = WEEKDAY_LABELS[today.getDay()];
  const day = today.getDate();
  const month = today.toLocaleDateString('es-ES', { month: 'short' }).replace('.', '');
  return `${weekday}, ${day} ${month}`;
}

export function shortDateLabel(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' }).replace('.', '');
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
