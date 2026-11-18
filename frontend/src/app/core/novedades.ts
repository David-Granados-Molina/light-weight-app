/**
 * Lo que cambia en cada versión, contado para quien usa la aplicación y no
 * para quien la programa. Al entrar, se enseña una sola vez lo que haya salido
 * desde la última vez que esa persona abrió la aplicación.
 *
 * La versión es la fecha en `AAAA.MM.DD`, que ordena sola. La más reciente va
 * la primera. Añadir una entrada aquí es lo único que hay que hacer al
 * desplegar algo que se note.
 */
export interface Novedad {
  version: string;
  puntos: string[];
}

export const NOVEDADES: Novedad[] = [
  {
    version: '2026.11.18',
    puntos: [
      'Ya no se cierra la sesión sola. Antes, un fallo de cobertura o un servidor lento bastaban para echarte.',
      'El entreno a medias no se pierde aunque se cierre la sesión: sigue donde lo dejaste al volver a entrar.',
      'Si la sesión se cierra de verdad, la pantalla de entrada te dice por qué.',
      'Las imágenes de los ejercicios se cargan desde la propia aplicación, así que entran antes.',
    ],
  },
];

/** Las que esa persona todavía no ha visto, de la más reciente a la más antigua. */
export function novedadesPendientes(ultimaVista: string | null): Novedad[] {
  const ordenadas = [...NOVEDADES].sort((a, b) => b.version.localeCompare(a.version));
  if (!ultimaVista) return ordenadas;

  return ordenadas.filter((novedad) => novedad.version.localeCompare(ultimaVista) > 0);
}

export function versionActual(): string {
  return [...NOVEDADES].sort((a, b) => b.version.localeCompare(a.version))[0]?.version ?? '';
}
