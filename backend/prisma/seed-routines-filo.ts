/**
 * Carga las tres rutinas de la hoja 3 de «RUTINA MAMA.xlsx» en el usuario Filo.
 *
 *     npx tsx prisma/seed-routines-filo.ts [--apply]
 *
 * Sin `--apply` solo enseña lo que haría. Es idempotente: sustituye las rutinas
 * por su nombre, así que se puede relanzar sin duplicar nada.
 *
 * Dos cosas que traía el Excel y no se pierden:
 *
 * - Las repeticiones venían como `2026-12-08` porque Excel interpretó «8-12»
 *   como una fecha (el formato de la celda es `d-m`, día-mes). Son 8-12 reps.
 * - La columna «Goma» es la carga real de los ejercicios con banda elástica, y
 *   los «8kg» del nombre son el peso de los de pierna. Lo primero va en la
 *   descripción del ejercicio; lo segundo, en el peso objetivo.
 *
 * Las filas «Calentamiento» de cada día no son un ejercicio: son el
 * calentamiento de la rutina, con su vídeo.
 */
import { Category, ExerciseType, InputType, PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const APPLY = process.argv.includes('--apply');
const USER_NAME = 'Filo';

/** Todas las filas de la hoja comparten objetivo. */
const SETS = 3;
const REPS_MIN = 8;
const REPS_MAX = 12;

interface ExerciseSeed {
  /** Nombre en el catálogo. Debe coincidir exactamente con el que ya existe. */
  catalog: string;
  /** Se crea si no existe; si existe, se reutiliza tal cual. */
  create?: { category: Category; type: ExerciseType; inputType: InputType; muscleGroup: string };
  /** La columna «Goma» del Excel, o el peso cuando no lleva banda. */
  description: string;
  targetWeight?: number;
  videoUrl?: string;
}

interface RoutineSeed {
  name: string;
  category: Category;
  warmupVideoUrl: string;
  warmupDescription: string;
  exercises: ExerciseSeed[];
}

const ROUTINES: RoutineSeed[] = [
  {
    name: 'Rutina Empuje 2',
    category: 'gym',
    warmupVideoUrl: 'https://www.youtube.com/shorts/mRkKzkTKviQ',
    warmupDescription: 'Calentamiento con goma roja antes de empezar.',
    exercises: [
      {
        catalog: 'Press de pecho con goma',
        create: { category: 'gym', type: 'empuje', inputType: 'reps', muscleGroup: 'Pecho' },
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/shorts/kpaucpwDghg',
      },
      {
        catalog: 'Extensión de tríceps con goma',
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/shorts/ftlzixXL-vw',
      },
      {
        catalog: 'Press de hombro vertical con goma',
        create: { category: 'gym', type: 'empuje', inputType: 'reps', muscleGroup: 'Hombro' },
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/shorts/KNdkA6UZA6Y',
      },
    ],
  },
  {
    name: 'Rutina Tirón 2',
    category: 'gym',
    warmupVideoUrl: 'https://www.youtube.com/shorts/zwlzU6o9Kio',
    warmupDescription: 'Calentamiento antes de empezar.',
    exercises: [
      {
        catalog: 'Remo con goma',
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/shorts/sliW8mscuok',
      },
      {
        catalog: 'Jalón al pecho',
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/shorts/LiEAr4J0Fvg',
      },
      {
        catalog: 'Curl de bíceps con goma',
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/shorts/UTSgVtVjPKw',
      },
    ],
  },
  {
    name: 'Rutina Pierna 2',
    category: 'gym',
    warmupVideoUrl: 'https://www.youtube.com/shorts/oGDQpmWM1pI',
    warmupDescription: 'Calentamiento antes de empezar.',
    exercises: [
      { catalog: 'Sentadilla', description: 'Sin goma, con 8 kg.', targetWeight: 8 },
      {
        catalog: 'Peso muerto rumano',
        description: 'Goma roja.',
        videoUrl: 'https://www.youtube.com/watch?v=1TYlJvH_HeU',
      },
      { catalog: 'Subir escalón', description: 'Sin goma, con 8 kg.', targetWeight: 8 },
      {
        catalog: 'Gemelo de pie',
        description: 'Sin goma, con 8 kg.',
        targetWeight: 8,
        videoUrl: 'https://www.youtube.com/shorts/g7k7dg7RADI',
      },
    ],
  },
];

async function main() {
  const user = await prisma.user.findFirst({
    where: { name: { contains: USER_NAME, mode: 'insensitive' } },
    select: { id: true, name: true, email: true },
  });
  if (!user) throw new Error(`No existe ningún usuario cuyo nombre contenga "${USER_NAME}"`);
  console.log(`Usuario: ${user.name} <${user.email}>\n`);

  for (const routine of ROUTINES) {
    console.log(`== ${routine.name}`);
    console.log(`   calentamiento: ${routine.warmupVideoUrl}`);

    const exerciseIds: string[] = [];
    for (const item of routine.exercises) {
      let exercise = await prisma.exercise.findUnique({ where: { name: item.catalog }, select: { id: true } });

      if (!exercise) {
        if (!item.create) throw new Error(`"${item.catalog}" no está en el catálogo y no se indicó cómo crearlo`);
        console.log(`   + CREA en el catálogo: ${item.catalog} [${item.create.category}/${item.create.type}/${item.create.inputType}]`);
        if (APPLY) {
          exercise = await prisma.exercise.create({ data: { name: item.catalog, ...item.create }, select: { id: true } });
        }
      } else {
        console.log(`   · reutiliza: ${item.catalog}`);
      }

      if (exercise) exerciseIds.push(exercise.id);
    }

    if (!APPLY) {
      console.log('');
      continue;
    }

    // Sustituye por nombre: relanzar el script no duplica rutinas.
    const existing = await prisma.routine.findFirst({
      where: { userId: user.id, name: routine.name },
      select: { id: true },
    });
    if (existing) await prisma.routine.delete({ where: { id: existing.id } });

    await prisma.routine.create({
      data: {
        userId: user.id,
        name: routine.name,
        category: routine.category,
        warmupDescription: routine.warmupDescription,
        warmupVideoUrl: routine.warmupVideoUrl,
        exercises: {
          create: routine.exercises.map((item, i) => ({
            exerciseId: exerciseIds[i],
            targetSets: SETS,
            targetRepsMin: REPS_MIN,
            targetRepsMax: REPS_MAX,
            targetWeight: item.targetWeight ?? null,
            description: item.description,
            videoUrl: item.videoUrl ?? null,
            order: i,
          })),
        },
      },
    });
    console.log(`   guardada con ${routine.exercises.length} ejercicios, ${SETS}x${REPS_MIN}-${REPS_MAX}\n`);
  }

  console.log(APPLY ? 'Hecho.' : 'Simulación. Relanza con --apply para escribir.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
