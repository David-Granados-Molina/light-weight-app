import { PrismaClient } from '@prisma/client';
import { CATALOG } from './seed';

const prisma = new PrismaClient();

/**
 * Sincroniza el catálogo de ejercicios sin tocar rutinas ni el histórico de entrenos.
 *
 * Los músculos implicados sí se actualizan en los ejercicios que ya existen: la
 * migración solo puede rellenar los principales partiendo de `muscleGroup`, y es
 * este script el que trae los secundarios. El resto de campos (categoría, tipo,
 * forma de medir) no se pisan, porque el usuario puede haberlos ajustado.
 */
async function main() {
  console.log(`Sincronizando ${CATALOG.length} ejercicios...`);
  for (const ex of CATALOG) {
    await prisma.exercise.upsert({
      where: { name: ex.name },
      update: { primaryMuscles: ex.primaryMuscles, secondaryMuscles: ex.secondaryMuscles },
      create: ex,
    });
  }
  console.log('Listo.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
