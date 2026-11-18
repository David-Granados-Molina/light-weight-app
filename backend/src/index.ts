import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authRouter } from './routes/auth';
import { exerciseImagesRouter } from './routes/exercise-images';
import { exerciseProfilesRouter } from './routes/exercise-profiles';
import { exercisesRouter } from './routes/exercises';
import { routinesRouter } from './routes/routines';
import { sessionsRouter } from './routes/sessions';
import { dashboardRouter } from './routes/dashboard';
import { progressRouter } from './routes/progress';
import { adminRouter } from './routes/admin';
import { dietRouter } from './routes/diet';
import { requireAuth } from './middleware/requireAuth';
import { describeMailConfig } from './lib/mailer';
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

// Render termina el TLS en su proxy: sin esto todas las peticiones llegarían
// con la misma IP y los límites de abajo echarían a todo el mundo a la vez.
app.set('trust proxy', 1);

app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ ok: true }));

/**
 * Las rutas de entrada son las únicas sin autenticar, y cada código cuesta un
 * bcrypt y un correo. Sin tope, cualquiera puede dejar sin acceso a los de
 * casa —cada código nuevo quema el anterior—, agotar la cuota de correo y
 * tumbar la API a base de hashes. Los topes son holgados: entrar un par de
 * veces seguidas nunca los roza.
 */
const limite = (minutos: number, maximo: number) =>
  rateLimit({
    windowMs: minutos * 60 * 1000,
    limit: maximo,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.' },
  });

// El token renovado viaja en la respuesta de GET /me: que no se quede en
// ninguna caché por el camino, ni se sirva la de un usuario a otro.
app.use('/api/auth', (_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  res.set('Vary', 'Authorization');
  next();
});

app.use('/api/auth/request-code', limite(15, 10));
app.use('/api/auth/verify-code', limite(15, 30));
app.use('/api/auth/test-login', limite(60, 30));

app.use('/api/auth', authRouter);

app.use('/api/exercises', requireAuth, exercisesRouter);
app.use('/api/exercise-profiles', requireAuth, exerciseProfilesRouter);
app.use('/api/exercise-images', requireAuth, exerciseImagesRouter);
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
app.listen(port, () => {
  console.log(`fitness-api escuchando en http://localhost:${port}`);
  // Cómo se van a entregar los códigos de acceso, dicho en el arranque: es la
  // primera pregunta cuando alguien no puede entrar.
  console.log(describeMailConfig());
});
