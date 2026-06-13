import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { getCurrentUserId } from '../lib/currentUser';
import { NoApiKeyError, parseWorkoutMessage } from '../services/claudeParser';

export const whatsappRouter = Router();

/**
 * Endpoint de prueba: envía un texto describiendo el entreno y devuelve
 * cómo lo interpretaría Claude, SIN guardarlo. Útil para probar el prompt
 * desde Postman/Insomnia antes de conectar WhatsApp.
 *
 * POST /api/whatsapp/parse { "message": "Hoy pecho: press banca 80x8, 80x8, 82.5x6" }
 */
whatsappRouter.post('/parse', async (req, res) => {
  const parsed = z.object({ message: z.string().min(3) }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  try {
    const draft = await parseWorkoutMessage(parsed.data.message);
    res.json(draft);
  } catch (err) {
    if (err instanceof NoApiKeyError) return res.status(501).json({ error: err.message });
    console.error(err);
    res.status(500).json({ error: 'No se ha podido interpretar el mensaje' });
  }
});

/**
 * Webhook estilo Twilio WhatsApp. Twilio hace POST x-www-form-urlencoded
 * con los campos "Body" (texto del mensaje) y "From" (remitente).
 *
 * Configuración pendiente por el usuario:
 * 1. Crear cuenta en Twilio y activar el sandbox de WhatsApp.
 * 2. Exponer este backend con una URL pública (ngrok/Cloudflare Tunnel).
 * 3. Apuntar el webhook de Twilio a https://tu-dominio/api/whatsapp/webhook
 * 4. Añadir ANTHROPIC_API_KEY al .env de backend.
 */
whatsappRouter.post('/webhook', async (req, res) => {
  const message = String(req.body?.Body ?? '');
  res.set('Content-Type', 'text/xml');

  if (!message.trim()) {
    return res.send(twiml('No he recibido ningún texto. Cuéntame qué entreno has hecho hoy.'));
  }

  try {
    const draft = await parseWorkoutMessage(message);
    if (!draft.exercises.length) {
      return res.send(twiml('No he entendido ningún ejercicio. ¿Puedes describirlo de otra forma?'));
    }

    const unresolved = draft.exercises.filter((e) => !e.exerciseId);
    if (unresolved.length) {
      const names = unresolved.map((e) => e.name).join(', ');
      return res.send(
        twiml(`No reconozco estos ejercicios: ${names}. Crealos primero en la app y vuelve a intentarlo.`),
      );
    }

    const userId = await getCurrentUserId();
    const session = await prisma.workoutSession.create({
      data: {
        userId,
        date: new Date(),
        category: draft.category,
        type: draft.type,
        source: 'whatsapp',
        exercises: {
          create: draft.exercises.map((e, i) => ({
            exerciseId: e.exerciseId!,
            order: i,
            sets: {
              create: e.sets.map((s, idx) => ({
                setNumber: idx + 1,
                weight: s.weight ?? null,
                reps: s.reps ?? null,
                time: s.time ?? null,
              })),
            },
          })),
        },
      },
      include: { exercises: { include: { exercise: true, sets: true } } },
    });

    const resumen = session.exercises.map((e) => `${e.exercise.name} (${e.sets.length} series)`).join(', ');
    return res.send(twiml(`Entreno guardado: ${resumen}. ¡Buen trabajo!`));
  } catch (err) {
    if (err instanceof NoApiKeyError) return res.send(twiml(err.message));
    console.error(err);
    return res.send(twiml('Ha habido un error guardando el entreno. Inténtalo de nuevo más tarde.'));
  }
});

function twiml(message: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escapeXml(message)}</Message></Response>`;
}

function escapeXml(text: string): string {
  return text.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);
}
