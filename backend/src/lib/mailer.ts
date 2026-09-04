import { Resend } from 'resend';

// Render bloquea/no permite tráfico SMTP saliente de forma fiable, lo que dejaba la conexión a
// Gmail colgada. Resend envía por HTTPS (puerto 443), que nunca está bloqueado.
const FROM_ADDRESS = 'LIGHT WEIGHT <onboarding@resend.dev>';

/**
 * Qué ha pasado de verdad con el código.
 *
 * - `user`   — ha salido al buzón de quien va a entrar. Es el destino final, y
 *              solo funciona con un dominio propio verificado en Resend.
 * - `relay`  — ha salido al buzón de quien administra, porque el remitente de
 *              pruebas de Resend solo entrega al dueño de la cuenta. El código
 *              se pasa a mano.
 * - `log`    — no hay `RESEND_API_KEY`: no se ha enviado nada y el código está
 *              en el log del servidor. Es lo que permite desarrollar en local.
 *
 * Para el usuario, `relay` y `log` son lo mismo (tiene que pedir el código); la
 * diferencia es solo dónde lo encuentra quien administra.
 */
export type CodeDelivery = 'user' | 'relay' | 'log';

/**
 * Envía el código de acceso de un solo uso.
 *
 * Con `LOGIN_CODE_RELAY_TO` puesto, TODOS los códigos van a esa dirección en vez
 * de a la de cada usuario. Es el apaño mientras no haya dominio verificado: el
 * correo sale de verdad y llega a un buzón, en vez de quedarse en un log.
 *
 * En cuanto el dominio esté verificado, se borra esa variable y los códigos
 * empiezan a ir a su destinatario real sin tocar código.
 */
export async function sendLoginCodeEmail(userEmail: string, code: string): Promise<CodeDelivery> {
  const client = getClient();
  if (!client) {
    // Una sola línea y con una marca fácil de buscar en el visor de logs.
    console.warn(`[CODIGO-ACCESO] ${userEmail} -> ${code}`);
    return 'log';
  }

  const relayTo = process.env.LOGIN_CODE_RELAY_TO?.trim();
  const mode: CodeDelivery = relayTo ? 'relay' : 'user';
  const message = mode === 'relay' ? relayMessage(userEmail, code) : userMessage(code);

  const { error } = await client.emails.send({
    from: FROM_ADDRESS,
    to: relayTo || userEmail,
    ...message,
  });

  if (error) throw new Error(`Resend: ${error.message}`);

  // También al log: si el correo tarda o se pierde, el código sigue estando a mano.
  if (mode === 'relay') console.warn(`[CODIGO-ACCESO] ${userEmail} -> ${code}`);

  return mode;
}

/** El correo que recibe quien va a entrar. */
function userMessage(code: string) {
  return {
    subject: 'Tu código de acceso — LIGHT WEIGHT',
    html: shell(
      'Tu código de acceso',
      'Introduce este código en Light Weight App para iniciar sesión:',
      code,
      'Si no has solicitado este código, puedes ignorar este correo.',
    ),
    text:
      `Tu código de acceso\n\nIntroduce este código en Light Weight App para iniciar sesión:\n\n${code}\n\n` +
      'Si no has solicitado este código, puedes ignorar este correo.',
  };
}

/**
 * El correo que recibe quien administra cuando los códigos se reencaminan.
 *
 * El email de quien lo pidió va en el asunto y en grande en el cuerpo: llegando
 * varios seguidos, saber de quién es cada uno es lo primero que hace falta.
 */
function relayMessage(userEmail: string, code: string) {
  return {
    subject: `Código de acceso para ${userEmail} — LIGHT WEIGHT`,
    html: shell(
      `Código para ${userEmail}`,
      'Alguien ha pedido entrar con ese email. Pásale este código; caduca en 10 minutos y solo sirve una vez:',
      code,
      'Si no esperabas esta petición, no hagas nada: sin el código nadie entra.',
    ),
    text:
      `Código de acceso para ${userEmail}\n\n` +
      `Alguien ha pedido entrar con ese email. Pásale este código; caduca en 10 minutos y solo sirve una vez:\n\n${code}\n\n` +
      'Si no esperabas esta petición, no hagas nada: sin el código nadie entra.',
  };
}

/**
 * La misma caja para los dos correos.
 *
 * El código va en texto plano y con espaciado de letras: es lo único que hay que
 * copiar, y muchos clientes de correo convierten en enlace cualquier cosa que se
 * le parezca, así que no se envuelve en nada.
 */
function shell(title: string, intro: string, code: string, footer: string): string {
  return `
      <div style="background:#0a0b0d;color:#f1f3f7;padding:32px;font-family:Archivo,system-ui,sans-serif;">
        <h2 style="color:#ffbf00;margin:0 0 16px;font-size:20px;">${title}</h2>
        <p style="margin:0 0 20px;color:#98a0ae;font-size:15px;line-height:1.5;">${intro}</p>
        <p style="margin:0 0 24px;font-size:32px;font-weight:700;letter-spacing:0.16em;color:#f1f3f7;">
          ${code}
        </p>
        <p style="margin:0;color:#666e7c;font-size:13px;line-height:1.5;">${footer}</p>
      </div>
    `;
}

function getClient(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  return apiKey ? new Resend(apiKey) : null;
}

/**
 * Una línea al arrancar diciendo cómo va a entregar los códigos.
 *
 * Existe porque «no me llega el correo» tiene tres causas posibles —falta la API
 * key, falta el reenvío, o el dominio no está verificado— y desde fuera las tres
 * se ven igual. Con esto, el log del servidor lo dice sin tener que adivinar.
 * Nunca imprime la API key, solo si está o no.
 */
export function describeMailConfig(): string {
  const hasKey = !!process.env.RESEND_API_KEY?.trim();
  const relayTo = process.env.LOGIN_CODE_RELAY_TO?.trim();

  if (!hasKey) {
    return '[mailer] SIN RESEND_API_KEY: los códigos no se envían, solo se escriben aquí como [CODIGO-ACCESO].';
  }
  if (relayTo) {
    return `[mailer] API key OK · reenvío activo: TODOS los códigos van a ${relayTo}.`;
  }
  return (
    '[mailer] API key OK · SIN reenvío: cada código se envía al email de su usuario. ' +
    `Con el remitente ${FROM_ADDRESS} esto solo funciona si el dominio está verificado en Resend; ` +
    'si no, fallará para todo el mundo menos para el dueño de la cuenta. ' +
    'Define LOGIN_CODE_RELAY_TO para que lleguen todos a un buzón.'
  );
}
