import { prisma } from './prisma';

// Usado solo por el webhook de WhatsApp (src/routes/whatsapp.ts), que no
// puede llevar un JWT: los entrenos recibidos por WhatsApp se asignan
// siempre al primer usuario de la BBDD.
let cachedUserId: string | null = null;

export async function getCurrentUserId(): Promise<string> {
  if (cachedUserId) return cachedUserId;

  let user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    user = await prisma.user.create({ data: { name: 'David', email: 'davidgranadosmolina@gmail.com' } });
  }

  cachedUserId = user.id;
  return cachedUserId;
}
