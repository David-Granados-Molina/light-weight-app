import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { exercisesRouter } from './routes/exercises';
import { routinesRouter } from './routes/routines';
import { sessionsRouter } from './routes/sessions';
import { dashboardRouter } from './routes/dashboard';
import { progressRouter } from './routes/progress';
import { adminRouter } from './routes/admin';
import { dietRouter } from './routes/diet';
import { requireAuth } from './middleware/requireAuth';
import { requireAdmin } from './middleware/requireAdmin';

/**
 * Red de seguridad del proceso.
 *
 * Express 4 no reenvía al middleware de error las promesas rechazadas dentro de
 * un handler `async`: se convierten en `unhandledRejection` y Node ≥15 mata el
 * proceso. Basta un error de base de datos en una petición para dejar la API
 * entera fuera de servicio para todo el mundo, que es justo lo que pasaba al
 * consultar el catálogo con una columna sin migrar.
 *
 * Aquí se registra y se sigue vivo. La petición que falló se queda sin respuesta
 * —el cliente verá un tiempo de espera agotado—, pero el resto de la API sigue
 * funcionando, que es la diferencia entre un endpoint roto y una caída total.
 */
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});

process.on('uncaughtException', (error) => {
  console.error('[uncaughtException]', error);
});

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRouter);

app.use('/api/exercises', requireAuth, exercisesRouter);
app.use('/api/routines', requireAuth, routinesRouter);
app.use('/api/sessions', requireAuth, sessionsRouter);
app.use('/api/dashboard', requireAuth, dashboardRouter);
app.use('/api/progress', requireAuth, progressRouter);
app.use('/api/diet', requireAuth, dietRouter);
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

// Cierra la cadena: cualquier error que llegue por next(err) sale como 500 con
// cuerpo JSON, en vez de como el HTML por defecto de Express.
app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', error);
  if (res.headersSent) return;
  res.status(500).json({ error: 'Error interno del servidor' });
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`fitness-api escuchando en http://localhost:${port}`));
