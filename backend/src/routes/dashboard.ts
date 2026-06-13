import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { addDays, isSameDay, startOfWeek } from '../lib/dateUtils';

export const dashboardRouter = Router();

function setVolume(set: { weight: number | null; reps: number | null }): number {
  return (set.weight ?? 0) * (set.reps ?? 0);
}

// GET /api/dashboard
dashboardRouter.get('/', async (req, res) => {
  const userId = req.userId!;
  const today = new Date();
  const weekStart = startOfWeek(today);
  const weekEnd = addDays(weekStart, 7);

  const weekSessions = await prisma.workoutSession.findMany({
    where: { userId, date: { gte: weekStart, lt: weekEnd } },
    include: { exercises: { include: { sets: true } } },
  });

  const weekVolumeKg = weekSessions.reduce(
    (total, session) =>
      total + session.exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + setVolume(set), 0), 0),
    0,
  );

  const weekBars = Array.from({ length: 7 }, (_, i) => {
    const day = addDays(weekStart, i);
    const sessionsOfDay = weekSessions.filter((s) => isSameDay(s.date, day));
    const volumeKg = sessionsOfDay.reduce(
      (total, session) =>
        total + session.exercises.reduce((s, ex) => s + ex.sets.reduce((ss, set) => ss + setVolume(set), 0), 0),
      0,
    );
    return {
      date: day.toISOString(),
      volumeKg,
      category: sessionsOfDay[0]?.category ?? null,
      isToday: isSameDay(day, today),
    };
  });

  const recentSessions = await prisma.workoutSession.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    take: 3,
    include: { exercises: true },
  });

  const recent = recentSessions.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    category: s.category,
    type: s.type,
    exerciseCount: s.exercises.length,
  }));

  res.json({
    weekEntrenos: weekSessions.length,
    weekVolumeKg,
    weekBars,
    recent,
  });
});
