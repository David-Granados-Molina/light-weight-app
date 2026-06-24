import { Resend } from 'resend';

// Render bloquea/no permite tráfico SMTP saliente de forma fiable, lo que dejaba la conexión a
// Gmail colgada. Resend envía por HTTPS (puerto 443), que nunca está bloqueado.
const FROM_ADDRESS = 'LIGHT WEIGHT <onboarding@resend.dev>';

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const client = getClient();
  if (!client) {
    console.warn(`[mailer] RESEND_API_KEY no configurada. Enlace de recuperación para ${to}: ${resetUrl}`);
    return;
  }

  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to,
    subject: 'Recupera tu contraseña — LIGHT WEIGHT',
    html: `
      <div style="background:#0B0B0B;color:#fff;padding:32px;font-family:sans-serif;">
        <h2 style="color:#FF6B00;margin-top:0;">LIGHT WEIGHT</h2>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;background:#FF6B00;color:#0B0B0B;
            text-decoration:none;font-weight:700;padding:14px 24px;border-radius:12px;">
            Restablecer contraseña
          </a>
        </p>
        <p style="color:#9E9E9E;font-size:13px;">
          Si no has solicitado esto, puedes ignorar este email. El enlace caduca en 1 hora.
        </p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend: ${error.message}`);
}
