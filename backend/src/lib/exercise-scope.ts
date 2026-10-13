import { prisma } from './prisma';
import { isAdminEmail } from './accounts';

/**
 * Qué ejercicios ve un usuario: los del catálogo base, que son de todos, y los
 * que ha creado él. Los que crea otra persona no existen para él.
 */
export function visiblePara(userId: string) {
  return { OR: [{ createdById: null }, { createdById: userId }] };
}

export async function ejercicioVisible(userId: string, exerciseId: string) {
  return prisma.exercise.findFirst({ where: { id: exerciseId, ...visiblePara(userId) } });
}

/**
 * Quién puede cambiar o borrar un ejercicio: su autor, y en los del catálogo
 * base —que no tienen autor— quien administra.
 */
export async function puedeGestionar(userId: string, exercise: { createdById: string | null }): Promise<boolean> {
  if (exercise.createdById) return exercise.createdById === userId;
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  return !!user && isAdminEmail(user.email);
}

/** `true` si todos esos ejercicios existen para ese usuario. */
export async function ejerciciosVisibles(userId: string, exerciseIds: string[]): Promise<boolean> {
  const ids = [...new Set(exerciseIds)];
  if (!ids.length) return true;

  const encontrados = await prisma.exercise.count({ where: { id: { in: ids }, ...visiblePara(userId) } });
  return encontrados === ids.length;
}

/**
 * El mismo ejercicio pero en la galería de otro usuario, para cuando una rutina
 * cambia de dueño: si es del catálogo base o ya es suyo se devuelve tal cual, y
 * si es privado de otra persona se le hace una copia a su nombre. Sin esto la
 * rutina copiada apuntaría a un ejercicio que el destinatario no ve.
 */
export async function ejercicioParaUsuario(userId: string, exerciseId: string): Promise<string> {
  const origen = await prisma.exercise.findUnique({ where: { id: exerciseId } });
  if (!origen || !origen.createdById || origen.createdById === userId) return exerciseId;

  const suyo = await prisma.exercise.findFirst({
    where: { name: origen.name, ...visiblePara(userId) },
    select: { id: true },
  });
  if (suyo) return suyo.id;

  const copia = await prisma.exercise.create({
    data: {
      name: origen.name,
      category: origen.category,
      type: origen.type,
      inputType: origen.inputType,
      muscleGroup: origen.muscleGroup,
      primaryMuscles: origen.primaryMuscles,
      secondaryMuscles: origen.secondaryMuscles,
      createdById: userId,
    },
    select: { id: true },
  });
  return copia.id;
}
