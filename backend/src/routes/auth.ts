import { randomBytes } from 'crypto';
import { Router } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { comparePassword, hashPassword, signToken } from '../lib/auth';
import { sendPasswordResetEmail } from '../lib/mailer';
import { prisma } from '../lib/prisma';
import { requireAuth } from '../middleware/requireAuth';

export const authRouter = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

function toPublicUser(user: {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string | null;
  themeColor?: string | null;
  passwordHash?: string | null;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl ?? null,
    themeColor: user.themeColor ?? null,
    isAdmin: !!process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL,
    hasPassword: !!user.passwordHash,
  };
}

const THEME_COLORS = ['#ffbf00', '#ba5a6e', '#9d1d1d', '#32673d', '#005492', '#69418b', '#9c9c9c', '#5fa990'];

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
});

authRouter.post('/register', async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findUnique({ where: { email } });

  let user;
  if (existing) {
    if (existing.passwordHash) {
      return res.status(409).json({ error: 'Ya existe una cuenta con ese email' });
    }
    user = await prisma.user.update({ where: { id: existing.id }, data: { name, passwordHash } });
  } else {
    user = await prisma.user.create({ data: { name, email, passwordHash } });
  }

  const token = signToken(user.id);
  res.status(201).json({ token, user: toPublicUser(user) });
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Email o contraseña no válidos.' });

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

  if (!user.passwordHash) {
    return res.status(400).json({ error: 'Esta cuenta usa Google. Inicia sesión con Google.' });
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Email o contraseña incorrectos' });

  const token = signToken(user.id);
  res.json({ token, user: toPublicUser(user) });
});

const googleSchema = z.object({ idToken: z.string().min(10) });

authRouter.post('/google', async (req, res) => {
  const parsed = googleSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    return res.status(401).json({ error: 'Token de Google inválido' });
  }

  if (!payload?.sub || !payload.email) {
    return res.status(401).json({ error: 'Token de Google inválido' });
  }

  const { sub: googleId, email, name } = payload;

  let user = await prisma.user.findUnique({ where: { googleId } });

  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      user = await prisma.user.update({ where: { id: existing.id }, data: { googleId } });
    } else {
      user = await prisma.user.create({ data: { name: name ?? email, email, googleId } });
    }
  }

  const token = signToken(user.id);
  res.json({ token, user: toPublicUser(user) });
});

const forgotPasswordSchema = z.object({ email: z.string().email() });

authRouter.post('/forgot-password', async (req, res) => {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email } });

  if (user) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });

    const resetUrl = `${process.env.FRONTEND_URL ?? 'http://localhost:4200'}/restablecer?token=${token}`;
    try {
      await sendPasswordResetEmail(user.email, resetUrl);
    } catch (err) {
      console.error('[forgot-password] No se ha podido enviar el email:', err);
    }
  }

  res.json({ message: 'Si existe una cuenta con ese email, recibirás un enlace para restablecer tu contraseña.' });
});

const resetPasswordSchema = z.object({
  token: z.string().min(10),
  password: z.string().min(8),
});

authRouter.post('/reset-password', async (req, res) => {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const { token, password } = parsed.data;
  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
    return res.status(400).json({ error: 'El enlace no es válido o ha caducado.' });
  }

  const passwordHash = await hashPassword(password);
  await prisma.$transaction([
    prisma.user.update({ where: { id: resetToken.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
  ]);

  res.json({ message: 'Contraseña actualizada correctamente.' });
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId! } });
  if (!user) return res.status(401).json({ error: 'No autenticado' });
  res.json(toPublicUser(user));
});

const updateMeSchema = z.object({
  name: z.string().min(2).max(60).optional(),
  avatarUrl: z
    .string()
    .regex(/^avatar:[1-9]$/)
    .nullable()
    .optional(),
  themeColor: z.enum(THEME_COLORS as [string, ...string[]]).nullable().optional(),
});

authRouter.patch('/me', requireAuth, async (req, res) => {
  const parsed = updateMeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

  const user = await prisma.user.update({ where: { id: req.userId! }, data: parsed.data });
  res.json(toPublicUser(user));
});
