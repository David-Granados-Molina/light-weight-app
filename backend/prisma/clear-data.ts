import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // El borrado de User cae en cascada sobre Routine/RoutineExercise y
  // WorkoutSession/SessionExercise/SessionSet. Exercise se borra aparte
  // porque no depende de User.
  await prisma.user.deleteMany();
  await prisma.exercise.deleteMany();
  console.log('Base de datos vaciada. El próximo arranque del backend creará un usuario nuevo automáticamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
