import { PrismaClient, Category, ExerciseType, InputType } from '@prisma/client';

const prisma = new PrismaClient();

const CATALOG: {
  name: string;
  category: Category;
  type: ExerciseType;
  inputType: InputType;
  muscleGroup: string;
}[] = [
  { name: 'Press banca', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Pecho' },
  { name: 'Press militar', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Hombro' },
  { name: 'Press inclinado', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Pecho' },
  { name: 'Fondos lastrados', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Pecho/Tríceps' },
  { name: 'Extensión tríceps', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Tríceps' },
  { name: 'Sentadilla', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Pierna' },
  { name: 'Hip thrust', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Glúteo' },
  { name: 'Prensa', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Pierna' },
  { name: 'Gemelo de pie', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Gemelo' },
  { name: 'Peso muerto', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Espalda/Pierna' },
  { name: 'Remo con barra', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Espalda' },
  { name: 'Jalón al pecho', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Espalda' },
  { name: 'Curl de bíceps', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Bíceps' },
  { name: 'Dominadas', category: 'calistenia', type: 'tiron', inputType: 'reps', muscleGroup: 'Espalda' },
  { name: 'Fondos', category: 'calistenia', type: 'empuje', inputType: 'reps', muscleGroup: 'Pecho/Tríceps' },
  { name: 'Flexiones', category: 'calistenia', type: 'empuje', inputType: 'reps', muscleGroup: 'Pecho' },
  { name: 'Muscle-up', category: 'calistenia', type: 'tiron', inputType: 'reps', muscleGroup: 'Espalda/Pecho' },
  { name: 'Remo invertido', category: 'calistenia', type: 'tiron', inputType: 'reps', muscleGroup: 'Espalda' },
  { name: 'Sentadilla pistol', category: 'calistenia', type: 'pierna', inputType: 'reps', muscleGroup: 'Pierna' },
  { name: 'Sentadilla búlgara', category: 'calistenia', type: 'pierna', inputType: 'reps', muscleGroup: 'Pierna' },
  { name: 'Zancadas', category: 'calistenia', type: 'pierna', inputType: 'reps', muscleGroup: 'Pierna' },
  { name: 'Pino', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Core/Hombro' },
  { name: 'L-sit', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Core' },
  { name: 'Plancha', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Core' },

  // Ampliación del catálogo
  { name: 'Press banca con mancuernas', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Pecho' },
  { name: 'Aperturas con mancuernas', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Pecho' },
  { name: 'Press Arnold', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Hombro' },
  { name: 'Elevaciones laterales', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Hombro' },
  { name: 'Press francés', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Tríceps' },
  { name: 'Contractora (pec deck)', category: 'gym', type: 'empuje', inputType: 'peso', muscleGroup: 'Pecho' },
  { name: 'Peso muerto rumano', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Femoral/Glúteo' },
  { name: 'Curl femoral', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Femoral' },
  { name: 'Extensión de cuádriceps', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Cuádriceps' },
  { name: 'Zancadas con mancuernas', category: 'gym', type: 'pierna', inputType: 'peso', muscleGroup: 'Pierna' },
  { name: 'Remo con mancuerna', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Espalda' },
  { name: 'Remo en polea', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Espalda' },
  { name: 'Curl martillo', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Bíceps' },
  { name: 'Curl en polea', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Bíceps' },
  { name: 'Face pull', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Hombro/Espalda' },
  { name: 'Pull-over', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Espalda/Pecho' },
  { name: 'Encogimientos', category: 'gym', type: 'tiron', inputType: 'peso', muscleGroup: 'Trapecio' },
  { name: 'Hiperextensiones', category: 'gym', type: 'core', inputType: 'peso', muscleGroup: 'Espalda baja/Glúteo' },
  { name: 'Crunch en polea', category: 'gym', type: 'core', inputType: 'peso', muscleGroup: 'Core' },
  { name: 'Fondos en banco', category: 'calistenia', type: 'empuje', inputType: 'reps', muscleGroup: 'Tríceps' },
  { name: 'Flexiones diamante', category: 'calistenia', type: 'empuje', inputType: 'reps', muscleGroup: 'Tríceps' },
  { name: 'Flexiones declinadas', category: 'calistenia', type: 'empuje', inputType: 'reps', muscleGroup: 'Pecho/Hombro' },
  { name: 'Dominadas agarre supino', category: 'calistenia', type: 'tiron', inputType: 'reps', muscleGroup: 'Bíceps/Espalda' },
  { name: 'Puente de glúteo', category: 'calistenia', type: 'pierna', inputType: 'reps', muscleGroup: 'Glúteo' },
  { name: 'Salto al cajón', category: 'calistenia', type: 'pierna', inputType: 'reps', muscleGroup: 'Pierna' },
  { name: 'Front lever', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Espalda/Core' },
  { name: 'Elevación de piernas colgado', category: 'calistenia', type: 'core', inputType: 'reps', muscleGroup: 'Core' },
  { name: 'Rueda abdominal', category: 'calistenia', type: 'core', inputType: 'reps', muscleGroup: 'Core' },
  { name: 'Hollow body', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Core' },
  { name: 'Superman', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Espalda baja' },
  { name: 'Burpees', category: 'calistenia', type: 'core', inputType: 'reps', muscleGroup: 'Full body' },
];

// Lunes=1 ... Domingo=0
function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // retrocede hasta el lunes
  d.setDate(d.getDate() + diff);
  d.setHours(10, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

async function main() {
  console.log('Seed: creando usuario demo...');
  const user = await prisma.user.upsert({
    where: { email: 'alvaro@demo.local' },
    update: {},
    create: { name: 'Álvaro', email: 'alvaro@demo.local' },
  });

  console.log('Seed: creando catálogo de ejercicios...');
  const exerciseByName = new Map<string, string>();
  for (const ex of CATALOG) {
    const created = await prisma.exercise.upsert({
      where: { name: ex.name },
      update: {},
      create: ex,
    });
    exerciseByName.set(ex.name, created.id);
  }

  console.log('Seed: creando rutinas...');
  const routinesData: {
    name: string;
    category: Category;
    exercises: { name: string; targetSets: number; targetReps: number }[];
  }[] = [
    {
      name: 'Empuje',
      category: 'gym',
      exercises: [
        { name: 'Press banca', targetSets: 4, targetReps: 8 },
        { name: 'Press militar', targetSets: 3, targetReps: 10 },
        { name: 'Press inclinado', targetSets: 3, targetReps: 10 },
        { name: 'Fondos lastrados', targetSets: 3, targetReps: 8 },
        { name: 'Extensión tríceps', targetSets: 3, targetReps: 12 },
      ],
    },
    {
      name: 'Tirón',
      category: 'gym',
      exercises: [
        { name: 'Peso muerto', targetSets: 4, targetReps: 6 },
        { name: 'Remo con barra', targetSets: 4, targetReps: 8 },
        { name: 'Jalón al pecho', targetSets: 3, targetReps: 10 },
        { name: 'Curl de bíceps', targetSets: 3, targetReps: 12 },
      ],
    },
    {
      name: 'Pierna',
      category: 'gym',
      exercises: [
        { name: 'Sentadilla', targetSets: 4, targetReps: 8 },
        { name: 'Hip thrust', targetSets: 3, targetReps: 10 },
        { name: 'Prensa', targetSets: 3, targetReps: 10 },
        { name: 'Gemelo de pie', targetSets: 4, targetReps: 15 },
      ],
    },
    {
      name: 'Full body calistenia',
      category: 'calistenia',
      exercises: [
        { name: 'Dominadas', targetSets: 4, targetReps: 6 },
        { name: 'Fondos', targetSets: 4, targetReps: 10 },
        { name: 'Flexiones', targetSets: 3, targetReps: 15 },
        { name: 'Plancha', targetSets: 3, targetReps: 45 },
      ],
    },
  ];

  for (const routine of routinesData) {
    const existing = await prisma.routine.findFirst({
      where: { userId: user.id, name: routine.name },
    });
    if (existing) continue;
    await prisma.routine.create({
      data: {
        userId: user.id,
        name: routine.name,
        category: routine.category,
        exercises: {
          create: routine.exercises.map((e, i) => ({
            exerciseId: exerciseByName.get(e.name)!,
            targetSets: e.targetSets,
            targetRepsMin: e.targetReps,
            targetRepsMax: e.targetReps,
            order: i,
          })),
        },
      },
    });
  }

  const existingSessions = await prisma.workoutSession.count({ where: { userId: user.id } });
  if (existingSessions > 0) {
    console.log('Seed: ya existen sesiones, omitiendo histórico.');
    await prisma.$disconnect();
    return;
  }

  console.log('Seed: generando histórico de entrenos (8 semanas)...');
  const thisMonday = startOfWeek(new Date());

  // Progresión de peso (kg) de las semanas más antiguas a las más recientes
  const progression = {
    'Press banca': [70, 70, 72.5, 72.5, 75, 77.5, 80, 82.5],
    Sentadilla: [90, 92.5, 95, 97.5, 100, 105, 107.5, 110],
    'Peso muerto': [105, 107.5, 110, 115, 117.5, 122.5, 127.5, 130],
    'Hip thrust': [80, 85, 90, 100, 108, 118, 130, 140],
  };

  type PlanExercise = { name: string; sets: { reps: number; weight?: number; time?: number }[] };
  type PlanSession = { offsetDays: number; category: Category; type: ExerciseType; exercises: PlanExercise[] };

  for (let week = 0; week < 8; week++) {
    const weekStart = addDays(thisMonday, (week - 7) * 7); // semana -7 (más antigua) a 0 (actual)
    const w = (name: keyof typeof progression) => progression[name][week];

    const plan: PlanSession[] = [
      {
        offsetDays: 0, // lunes
        category: 'gym',
        type: 'tiron',
        exercises: [
          { name: 'Peso muerto', sets: [6, 6, 5, 5].map((reps) => ({ reps, weight: w('Peso muerto') })) },
          { name: 'Remo con barra', sets: [8, 8, 8].map((reps) => ({ reps, weight: 50 + week })) },
          { name: 'Jalón al pecho', sets: [10, 10, 10].map((reps) => ({ reps, weight: 45 + week * 0.5 })) },
          { name: 'Curl de bíceps', sets: [12, 12, 10].map((reps) => ({ reps, weight: 14 })) },
        ],
      },
      {
        offsetDays: 1, // martes
        category: 'calistenia',
        type: 'empuje',
        exercises: [
          { name: 'Flexiones', sets: [18, 16, 15].map((reps) => ({ reps })) },
          { name: 'Fondos', sets: [10, 9, 8].map((reps) => ({ reps })) },
          { name: 'Plancha', sets: [{ reps: 0, time: 45 }, { reps: 0, time: 45 }, { reps: 0, time: 40 }].map((s) => s) },
        ],
      },
      {
        offsetDays: 3, // jueves
        category: 'gym',
        type: 'empuje',
        exercises: [
          { name: 'Press banca', sets: [8, 8, 7, 6].map((reps) => ({ reps, weight: w('Press banca') })) },
          { name: 'Press militar', sets: [10, 10, 8].map((reps) => ({ reps, weight: 30 + week * 0.5 })) },
          { name: 'Fondos lastrados', sets: [8, 8, 6].map((reps) => ({ reps, weight: 10 + week })) },
        ],
      },
      {
        offsetDays: 4, // viernes
        category: 'gym',
        type: 'pierna',
        exercises: [
          { name: 'Sentadilla', sets: [8, 8, 6, 6].map((reps) => ({ reps, weight: w('Sentadilla') })) },
          { name: 'Hip thrust', sets: [10, 10, 8].map((reps) => ({ reps, weight: w('Hip thrust') })) },
          { name: 'Prensa', sets: [10, 10, 10].map((reps) => ({ reps, weight: 90 + week * 2 })) },
        ],
      },
    ];

    // No registrar entrenos en el futuro (la semana actual puede estar incompleta)
    for (const session of plan) {
      const date = addDays(weekStart, session.offsetDays);
      if (date.getTime() > Date.now()) continue;

      await prisma.workoutSession.create({
        data: {
          userId: user.id,
          date,
          category: session.category,
          type: session.type,
          source: 'manual',
          exercises: {
            create: session.exercises.map((ex, i) => ({
              exerciseId: exerciseByName.get(ex.name)!,
              order: i,
              sets: {
                create: ex.sets.map((s, idx) => ({
                  setNumber: idx + 1,
                  weight: s.weight ?? null,
                  reps: s.time ? null : s.reps,
                  time: s.time ?? null,
                })),
              },
            })),
          },
        },
      });
    }
  }

  console.log('Seed: completado.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
