# backend — fitness-api

Backend del MVP de la app de fitness: Express + TypeScript + Prisma + SQLite.

## Puesta en marcha

```bash
npm install
npm run prisma:migrate   # crea prisma/dev.db con el esquema
npm run prisma:seed      # carga el catálogo de ejercicios y datos de ejemplo
npm run dev               # arranca en http://localhost:3000 con recarga automática
```

Variables de entorno (`.env`, ver `.env.example`):

- `DATABASE_URL` — ruta del fichero SQLite (por defecto `file:./dev.db`)
- `PORT` — puerto del servidor (por defecto `3000`)
- `CORS_ORIGIN` — origen permitido para el frontend (por defecto `http://localhost:4200`)

Para reiniciar la base de datos desde cero (borra todo y vuelve a sembrar):

```bash
npm run db:reset
```

## Modelo de datos (Prisma)

- `User` — cuenta de usuario (registro con email+contraseña o login con Google)
- `Exercise` — catálogo de ejercicios: `category` (gym/calistenia), `type` (empuje/tiron/pierna/core), `inputType` (peso/reps/tiempo), `muscleGroup`
- `Routine` / `RoutineExercise` — rutinas planificadas con `targetSets`/`targetReps` por ejercicio
- `WorkoutSession` / `SessionExercise` / `SessionSet` — entrenos realizados, con series reales (peso/reps/tiempo)

## Endpoints principales

- `GET /api/health`
- `GET/POST/PUT/DELETE /api/exercises`
- `GET/POST/PUT/DELETE /api/routines`
- `GET/POST /api/sessions` (filtros `category`, `q`, `limit`)
- `GET /api/dashboard`
- `GET /api/progress/exercises`, `GET /api/progress/:exerciseId`
