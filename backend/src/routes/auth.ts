import { randomInt } from 'crypto';
import { Router } from 'express';
import { z } from 'zod';
import { isAdminEmail, TEST_USER_EMAIL } from '../lib/accounts';
import { asyncHandler } from '../lib/async-handler';
import { compareLoginCode, hashLoginCode, signToken } from '../lib/auth';
import { CodeDelivery, sendLoginCodeEmail } from '../lib/mailer';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

export const authRouter = Router();

/** Cuánto vive un código antes de caducar. */
const CODE_TTL_MS = 10 * 60 * 1000;

/** Intentos fallidos antes de quemar el código. Ocho dígitos no aguantan fuerza bruta libre. */
const MAX_ATTEMPTS = 5;

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  themeColor?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    themeColor: user.themeColor ?? null,
    isAdmin: isAdminEmail(user.email),
  };
}

const THEME_COLORS = ['#ffbf00', '#ba5a6e', '#9d1d1d', '#32673d', '#005492', '#69418b', '#9c9c9c', '#5fa990'];

/** Ocho dígitos, con `randomInt` (CSPRNG) y no `Math.random`. */
function generateCode(): string {
  return String(randomInt(0, 100_000_000)).padStart(8, '0');
}

/** El email se normaliza siempre igual, para que "David@X.com " encuentre la fila. */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const requestCodeSchema = z.object({ email: z.string().email() });

/**
 * Paso 1: el usuario escribe su email y, si tiene cuenta, recibe un código.
 *
 * No hay registro: las cuentas se dan de alta a mano en la base de datos. Por eso
 * un email desconocido recibe un 404 explícito en vez de la respuesta genérica de
 * "si existe, te llega un email": aquí no hay nada que enumerar que no sea la
 * lista de invitados, y decirle a alguien que espere un correo que no va a llegar
 * es peor que decirle que no tiene acceso.
 */
authRouter.post('/request-code', asyncHandler(async (req, res) => {
  const parsed = requestCodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Escribe un email válido.' });

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Ese email no tiene acceso a Light Weight.' });

  const code = generateCode();

  // Los códigos anteriores del usuario se queman: pedir uno nuevo debe invalidar
  // el viejo, o quedan varios vivos a la vez.
  await prisma.$transaction([
    prisma.loginCode.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    }),
    prisma.loginCode.create({
      data: {
        userId: user.id,
        codeHash: await hashLoginCode(code),
        expiresAt: new Date(Date.now() + CODE_TTL_MS),
      },
    }),
  ]);

  // Si el envío falla, el usuario tiene que enterarse: un 200 aquí lo dejaría
  // esperando un correo que nunca llegó.
  let delivery: CodeDelivery;
  try {
    delivery = await sendLoginCodeEmail(user.email, code);
  } catch (err) {
    console.error('[request-code] No se ha podido enviar el email:', err);
    return res.status(502).json({ error: 'No se ha podido enviar el email. Inténtalo de nuevo.' });
  }

  // Al usuario solo le importa una cosa: si el código va a llegarle a él o tiene
  // que pedirlo. Que el código esté en el buzón del administrador o en el log del
  // servidor es asunto de quien administra, no suyo.
  res.json(
    delivery === 'user'
      ? { delivered: true, message: 'Te hemos enviado un código a tu email.' }
      : {
          delivered: false,
          message: 'Pídele tu código de acceso al administrador.',
        },
  );
}));

const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().regex(/^\d{8}$/),
});

/** Paso 2: el código correcto, dentro de su ventana y sin gastar, abre la sesión. */
authRouter.post('/verify-code', asyncHandler(async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'El código son 8 dígitos.' });

  const email = normalizeEmail(parsed.data.email);
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: 'Ese email no tiene acceso a Light Weight.' });

  const loginCode = await prisma.loginCode.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });

  if (!loginCode || loginCode.expiresAt < new Date()) {
    return res.status(400).json({ error: 'El código ha caducado. Pide uno nuevo.' });
  }

  if (loginCode.attempts >= MAX_ATTEMPTS) {
    await prisma.loginCode.update({ where: { id: loginCode.id }, data: { usedAt: new Date() } });
    return res.status(429).json({ error: 'Demasiados intentos. Pide un código nuevo.' });
  }

  if (!(await compareLoginCode(parsed.data.code, loginCode.codeHash))) {
    await prisma.loginCode.update({
      where: { id: loginCode.id },
      data: { attempts: { increment: 1 } },
    });
    return res.status(401).json({ error: 'El código no es correcto.' });
  }

  // Un solo uso: se gasta en cuanto acierta.
  await prisma.loginCode.update({ where: { id: loginCode.id }, data: { usedAt: new Date() } });

  res.json({ token: signToken(user.id), user: toPublicUser(user) });
}));

/**
 * Acceso directo a la cuenta de demostración, sin email ni código.
 *
 * Es deliberadamente público: sirve para que cualquiera pueda ver la aplicación
 * sin pedir acceso, igual que hacía el botón anterior.
 */
authRouter.post('/test-login', asyncHandler(async (_req, res) => {
  const user = await prisma.user.findUnique({ where: { email: TEST_USER_EMAIL } });
  if (!user) return res.status(404).json({ error: 'La cuenta de prueba no está disponible.' });

  res.json({ token: signToken(user.id), user: toPublicUser(user) });
}));

authRouter.get('/me', requireAuth, asyncHandler(async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  res.json(toPublicUser(user));
}));

const updateMeSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  avatarUrl: z
    .string()
    .regex(/^avatar:[1-9]$/)
    .nullable()
    .optional(),
  themeColor: z.enum(THEME_COLORS as [string, ...string[]]).nullable().optional(),
});

authRouter.patch('/me', requireAuth, asyncHandler(async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({ where: { id: req.userId! }, data: parsed.data });
  res.json(toPublicUser(user));
}));
