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
  { name: 'Elevación de piernas colgado', category: 'calistenia', type: 'core', inputType: 'peso', muscleGroup: 'Core' },
  { name: 'Rueda abdominal', category: 'calistenia', type: 'core', inputType: 'peso', muscleGroup: 'Core' },
  { name: 'Hollow body', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Core' },
  { name: 'Superman', category: 'calistenia', type: 'core', inputType: 'tiempo', muscleGroup: 'Espalda baja' },
  { name: 'Burpees', category: 'calistenia', type: 'core', inputType: 'peso', muscleGroup: 'Full body' },

  // Cardio (gym)
  { name: 'Bici estática', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
  { name: 'Cinta de correr', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
  { name: 'Elíptica', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
  { name: 'Remo ergómetro', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
  { name: 'Escaladora', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
  { name: 'Carrera exterior', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
  { name: 'HIIT', category: 'gym', type: 'cardio', inputType: 'min', muscleGroup: 'Cardio' },
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

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function roundTo(value: number, step: number): number {
  return Math.round(value / step) * step;
}

/** Progresión de peso casi lineal a lo largo del año, con variación aleatoria y una semana de descarga cada 6. */
function weightFor(name: string, week: number): number {
  const cfg = WEIGHT_PROGRESSION[name];
  const deload = week % 6 === 5 ? -cfg.start * 0.05 : 0;
  const value = cfg.start + cfg.weekly * week + deload + rand(-1, 1);
  return Math.max(cfg.step, roundTo(value, cfg.step));
}

/** Progresión de repeticiones/segundos a lo largo del año, con variación aleatoria. */
function repsFor(name: string, week: number): number {
  const cfg = REPS_PROGRESSION[name];
  const value = cfg.start + cfg.weekly * week + rand(-1, 1);
  return Math.min(cfg.max, Math.max(1, Math.round(value)));
}

const WEIGHT_PROGRESSION: Record<string, { start: number; weekly: number; step: number }> = {
  'Press banca': { start: 65, weekly: 0.4, step: 0.5 },
  Sentadilla: { start: 85, weekly: 0.5, step: 0.5 },
  'Peso muerto': { start: 100, weekly: 0.7, step: 0.5 },
  'Hip thrust': { start: 70, weekly: 1.35, step: 1.25 },
  'Remo con barra': { start: 45, weekly: 0.3, step: 0.5 },
  'Jalón al pecho': { start: 40, weekly: 0.25, step: 0.5 },
  'Curl de bíceps': { start: 12, weekly: 0.08, step: 1 },
  'Press militar': { start: 28, weekly: 0.2, step: 0.5 },
  'Fondos lastrados': { start: 5, weekly: 0.25, step: 1.25 },
  Prensa: { start: 80, weekly: 0.6, step: 1.25 },
};

const REPS_PROGRESSION: Record<string, { start: number; weekly: number; max: number }> = {
  Flexiones: { start: 14, weekly: 0.18, max: 28 },
  Fondos: { start: 6, weekly: 0.14, max: 16 },
  Plancha: { start: 35, weekly: 0.5, max: 90 },
};

/** Probabilidad de que un entreno planificado se salte, como ocurre en la vida real. */
const SKIP_CHANCE = 0.12;

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

  const routineIdByName = new Map<string, string>();
  for (const routine of routinesData) {
    let created = await prisma.routine.findFirst({
      where: { userId: user.id, name: routine.name },
    });
    if (!created) {
      created = await prisma.routine.create({
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
    routineIdByName.set(routine.name, created.id);
  }

  const existingSessions = await prisma.workoutSession.count({ where: { userId: user.id } });
  if (existingSessions > 0) {
    console.log('Seed: borrando histórico anterior...');
    await prisma.workoutSession.deleteMany({ where: { userId: user.id } });
  }

  console.log('Seed: generando histórico de entrenos (1 año)...');
  const WEEKS = 52;
  const thisMonday = startOfWeek(new Date());

  type PlanExercise = { name: string; sets: { reps: number; weight?: number; time?: number }[] };
  type PlanSession = {
    offsetDays: number;
    category: Category;
    type: ExerciseType;
    routineName: string;
    exercises: PlanExercise[];
  };

  for (let week = 0; week < WEEKS; week++) {
    const weekStart = addDays(thisMonday, (week - (WEEKS - 1)) * 7); // semana -(WEEKS-1) (más antigua) a 0 (actual)

    const plan: PlanSession[] = [
      {
        offsetDays: 0, // lunes
        category: 'gym',
        type: 'tiron',
        routineName: 'Tirón',
        exercises: [
          { name: 'Peso muerto', sets: [6, 6, 5, 5].map((reps) => ({ reps, weight: weightFor('Peso muerto', week) })) },
          { name: 'Remo con barra', sets: [8, 8, 8].map((reps) => ({ reps, weight: weightFor('Remo con barra', week) })) },
          { name: 'Jalón al pecho', sets: [10, 10, 10].map((reps) => ({ reps, weight: weightFor('Jalón al pecho', week) })) },
          { name: 'Curl de bíceps', sets: [12, 12, 10].map((reps) => ({ reps, weight: weightFor('Curl de bíceps', week) })) },
        ],
      },
      {
        offsetDays: 1, // martes
        category: 'calistenia',
        type: 'empuje',
        routineName: 'Full body calistenia',
        exercises: [
          {
            name: 'Flexiones',
            sets: [0, -2, -3].map((delta) => ({ reps: Math.max(1, repsFor('Flexiones', week) + delta) })),
          },
          {
            name: 'Fondos',
            sets: [0, -1, -2].map((delta) => ({ reps: Math.max(1, repsFor('Fondos', week) + delta) })),
          },
          {
            name: 'Plancha',
            sets: [0, 0, -5].map((delta) => ({ reps: 0, time: Math.max(10, repsFor('Plancha', week) + delta) })),
          },
        ],
      },
      {
        offsetDays: 3, // jueves
        category: 'gym',
        type: 'empuje',
        routineName: 'Empuje',
        exercises: [
          { name: 'Press banca', sets: [8, 8, 7, 6].map((reps) => ({ reps, weight: weightFor('Press banca', week) })) },
          { name: 'Press militar', sets: [10, 10, 8].map((reps) => ({ reps, weight: weightFor('Press militar', week) })) },
          { name: 'Fondos lastrados', sets: [8, 8, 6].map((reps) => ({ reps, weight: weightFor('Fondos lastrados', week) })) },
        ],
      },
      {
        offsetDays: 4, // viernes
        category: 'gym',
        type: 'pierna',
        routineName: 'Pierna',
        exercises: [
          { name: 'Sentadilla', sets: [8, 8, 6, 6].map((reps) => ({ reps, weight: weightFor('Sentadilla', week) })) },
          { name: 'Hip thrust', sets: [10, 10, 8].map((reps) => ({ reps, weight: weightFor('Hip thrust', week) })) },
          { name: 'Prensa', sets: [10, 10, 10].map((reps) => ({ reps, weight: weightFor('Prensa', week) })) },
        ],
      },
    ];

    for (const session of plan) {
      const date = addDays(weekStart, session.offsetDays);
      // No registrar entrenos en el futuro, y simular días saltados al azar
      if (date.getTime() > Date.now()) continue;
      if (Math.random() < SKIP_CHANCE) continue;

      await prisma.workoutSession.create({
        data: {
          userId: user.id,
          date,
          category: session.category,
          type: session.type,
          source: 'manual',
          routineId: routineIdByName.get(session.routineName) ?? null,
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
