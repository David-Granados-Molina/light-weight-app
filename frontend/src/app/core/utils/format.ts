export function formatNumber(value: number): string {
  return value.toLocaleString('es-ES', { maximumFractionDigits: 1 });
}

/** Formatea kg, pasando a toneladas cuando es >= 1000 (ej. "12,4 t"). */
export function formatVolume(kg: number): string {
  if (kg >= 1000) {
    return (kg / 1000).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + ' t';
  }
  return formatNumber(Math.round(kg)) + ' kg';
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
