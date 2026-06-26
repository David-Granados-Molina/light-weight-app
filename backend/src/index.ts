import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { exercisesRouter } from './routes/exercises';
import { routinesRouter } from './routes/routines';
import { sessionsRouter } from './routes/sessions';
import { dashboardRouter } from './routes/dashboard';
import { progressRouter } from './routes/progress';
import { adminRouter } from './routes/admin';
import { requireAuth } from './middleware/requireAuth';
import { requireAdmin } from './middleware/requireAdmin';

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
app.use('/api/admin', requireAuth, requireAdmin, adminRouter);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`fitness-api escuchando en http://localhost:${port}`));
