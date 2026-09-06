/**
 * Mueve la nota de cada ejercicio de rutina a su descripción.
 *
 *     npx tsx prisma/migrate-routine-notes-to-description.ts [--apply]
 *
 * Sin `--apply` solo enseña lo que haría. Es idempotente: al mover una nota la
 * deja a null, así que una segunda pasada no encuentra nada y no duplica texto.
 *
 * Existe porque las notas de rutina se han quitado de la interfaz. La idea era
 * separar dos cosas que se llamaban igual: la NOTA es lo que se apunta sobre la
 * marcha y vive en el entreno (`SessionExercise.note`), y la DESCRIPCIÓN es lo
 * permanente de ese ejercicio en esa rutina. Lo que había escrito en las notas
 * de rutina («3 seg excéntrico», «Barra: 20kg») es descripción por definición.
 *
 * Sin esta pasada ese texto no se pierde de golpe, que sería más fácil de ver:
 * se pierde de una rutina cada vez, la primera vez que se guarde, porque el
 * formulario ya no envía el campo y las filas se recrean en cada guardado.
 *
 * Cuando una fila ya tiene descripción, no se pisa: se añaden los dos textos
 * separados por una línea en blanco, con la nota al final.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');

async function main(): Promise<void> {
  const filas = await prisma.routineExercise.findMany({
    where: { note: { not: null } },
    select: {
      id: true,
      note: true,
      description: true,
      exercise: { select: { name: true } },
      routine: { select: { name: true, user: { select: { email: true } } } },
    },
    orderBy: { id: 'asc' },
  });

  const pendientes = filas.filter((f) => !!f.note?.trim());

  if (!pendientes.length) {
    console.log('No queda ninguna nota de rutina que mover.');
    return;
  }

  console.log(`${pendientes.length} nota(s) de rutina por mover a la descripción:\n`);

  for (const fila of pendientes) {
    const nota = fila.note!.trim();
    const previa = fila.description?.trim();
    const descripcion = previa ? `${previa}\n\n${nota}` : nota;

    console.log(`· ${fila.routine.user.email} — «${fila.routine.name}» — ${fila.exercise.name}`);
    console.log(`    nota:        ${JSON.stringify(nota)}`);
    console.log(`    descripción: ${previa ? `${JSON.stringify(previa)} + la nota detrás` : 'vacía, se queda la nota tal cual'}`);

    if (APPLY) {
      await prisma.routineExercise.update({
        where: { id: fila.id },
        data: { description: descripcion, note: null },
      });
    }
  }

  console.log(
    APPLY
      ? `\nHecho: ${pendientes.length} movida(s).`
      : '\nSimulación. Relanza con --apply para escribirlo en la base.',
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
