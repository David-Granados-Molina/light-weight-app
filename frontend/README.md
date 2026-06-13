# frontend — FitnessApp MVP

App web mobile-first para registrar entrenos de gimnasio y calistenia, llevar el histórico y ver la progresión por ejercicio. Frontend en Angular 21 (standalone, signals, zoneless) + PrimeNG/Chart.js; backend en Express + Prisma + SQLite.

## Estructura

- `frontend/` (este proyecto) — frontend Angular
- `../backend/` — backend Express + Prisma + SQLite (ver su propio `README.md`)

## Puesta en marcha

### 1. Backend

```bash
cd ../backend
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev        # http://localhost:3000
```

### 2. Frontend

```bash
cd frontend
npm install
npm start          # http://localhost:4200 (ng serve)
```

Abre `http://localhost:4200` en el navegador (o desde el móvil en la misma red, usando la IP del PC).

## Pantallas

- **Inicio** (`/inicio`) — resumen semanal, volumen entrenado y últimas sesiones
- **Registrar** (`/registrar`) — registrar el entreno del día (gym o calistenia), añadir ejercicios y series
- **Historial** (`/historial`) — listado de entrenos pasados, filtrable por categoría y búsqueda
- **Progreso** (`/progreso`) — gráficos de evolución (peso/volumen) por ejercicio
- **Rutinas** (`/rutinas`) — CRUD de rutinas (días) y sus ejercicios objetivo (series/reps)

## Registro por WhatsApp + Claude

Además de la entrada manual, el backend incluye un stub funcional para registrar entrenos enviando un mensaje de WhatsApp en lenguaje natural (p. ej. "Hoy pecho: press banca 80x8, 80x8, 82.5x6"), que Claude interpreta y guarda automáticamente.

Para activarlo, sigue la sección "Registro de entrenos por WhatsApp + Claude" en `../backend/README.md`:

1. Añade tu `ANTHROPIC_API_KEY` al `.env` de `backend`.
2. Prueba `POST /api/whatsapp/parse` para verificar que Claude interpreta bien tus mensajes.
3. Configura un sandbox de Twilio WhatsApp y expón el backend (ngrok/Cloudflare Tunnel) apuntando su webhook a `/api/whatsapp/webhook`.

## Comandos útiles

```bash
npm start    # servidor de desarrollo (ng serve)
npm run build  # build de producción
npm test     # tests unitarios (Vitest)
```
