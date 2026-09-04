import { NextFunction, Request, RequestHandler, Response } from 'express';

/**
 * Envuelve un handler `async` para que sus rechazos lleguen al middleware de error.
 *
 * Express 4 no hace `await` de los handlers: si un `async (req, res) => {…}`
 * rechaza, la promesa nunca vuelve a Express. La petición se queda sin respuesta
 * —el cliente espera hasta agotar su tiempo— y el rechazo acaba en el
 * `unhandledRejection` de `index.ts`, que evita que el proceso muera pero no
 * puede contestar por ella.
 *
 * Con esto el rechazo pasa por `next(error)` y el middleware de error devuelve un
 * 500 en JSON. Las guardas de proceso siguen ahí como última red, para lo que se
 * escape (un `setTimeout` que rechaza, por ejemplo).
 *
 * El tipo de retorno es `Promise<unknown>` a propósito: los handlers hacen
 * `return res.status(404).json(…)` como atajo para salir, y eso devuelve un
 * `Response`, no `void`. Aquí se descarta.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}
