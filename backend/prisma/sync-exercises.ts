import { PrismaClient } from '@prisma/client';
import { CATALOG } from './seed';

const prisma = new PrismaClient();

/** Sincroniza el catálogo de ejercicios sin tocar rutinas ni el histórico de entrenos. */
async function main() {
  console.log(`Sincronizando ${CATALOG.length} ejercicios...`);
  for (const ex of CATALOG) {
    await prisma.exercise.upsert({ where: { name: ex.name }, update: {}, create: ex });
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
