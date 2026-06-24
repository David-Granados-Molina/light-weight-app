import nodemailer from 'nodemailer';

function getTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST ?? 'smtp.gmail.com',
    port: Number(SMTP_PORT ?? 465),
    secure: true,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Sin esto, una conexión SMTP bloqueada/lenta (p. ej. salida bloqueada en el host) deja la
    // petición HTTP entera colgada para siempre en vez de fallar rápido.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<void> {
  const transporter = getTransporter();
  if (!transporter) {
    console.warn(`[mailer] SMTP no configurado. Enlace de recuperación para ${to}: ${resetUrl}`);
    return;
  }

  await transporter.sendMail({
    from: `LIGHT WEIGHT <${process.env.SMTP_USER}>`,
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
}
