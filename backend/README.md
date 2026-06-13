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
- `ANTHROPIC_API_KEY` — opcional, activa el registro de entrenos por WhatsApp/Claude (ver abajo)

Para reiniciar la base de datos desde cero (borra todo y vuelve a sembrar):

```bash
npm run db:reset
```

## Modelo de datos (Prisma)

- `User` — usuario único del MVP (se crea/recupera automáticamente con `getCurrentUserId()`)
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
- `POST /api/whatsapp/parse` — prueba el parser de Claude sin guardar nada
- `POST /api/whatsapp/webhook` — webhook estilo Twilio para WhatsApp

## Registro de entrenos por WhatsApp + Claude

El stub ya está implementado en `src/services/claudeParser.ts` y `src/routes/whatsapp.ts`. Para activarlo:

1. **Obtén una API key de Anthropic** en https://console.anthropic.com/ y añádela como `ANTHROPIC_API_KEY` en `.env`.
2. **Prueba el parser** sin necesidad de WhatsApp:
   ```bash
   curl -X POST http://localhost:3000/api/whatsapp/parse \
     -H "Content-Type: application/json" \
     -d '{"message": "Hoy pecho: press banca 80x8, 80x8, 82.5x6"}'
   ```
   Devuelve el entreno interpretado (categoría, tipo, ejercicios con sus series), resolviendo cada ejercicio contra el catálogo existente. Si un ejercicio no se reconoce, aparece en `warnings` — créalo primero desde la app (pantalla Rutinas → buscar ejercicio → "Crear ejercicio").
3. **Conecta WhatsApp con Twilio** (sandbox gratuito):
   - Crea una cuenta en https://www.twilio.com/whatsapp y activa el sandbox de WhatsApp.
   - Expón este backend a internet, por ejemplo con `ngrok http 3000` o Cloudflare Tunnel.
   - En la consola de Twilio, configura el webhook "When a message comes in" apuntando a `https://<tu-url-publica>/api/whatsapp/webhook`.
4. **Envía un mensaje por WhatsApp** al número del sandbox describiendo tu entreno (ej. "Hoy pierna: sentadilla 100x5, 100x5, 90x8; prensa 120x10x3"). El backend interpretará el mensaje con Claude, guardará la sesión y responderá con un resumen.

Si `ANTHROPIC_API_KEY` no está configurada, ambos endpoints responden con un mensaje explicando que falta la clave (no rompen el resto de la app).
