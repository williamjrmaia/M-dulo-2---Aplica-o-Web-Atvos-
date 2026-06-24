import { Request, Response, NextFunction, RequestHandler } from 'express';

// Tempo máximo (ms) que uma requisição pode levar antes de ser encerrada com 503.
// Configurável por ambiente; default de 15s cobre a latência do banco remoto com folga.
const DEFAULT_TIMEOUT_MS = Number(process.env.REQUEST_TIMEOUT_MS) || 15000;

/**
 * Middleware de resiliência: limita o tempo de vida de uma requisição.
 *
 * Sob carga ou com o banco lento/indisponível, uma requisição pode ficar pendurada
 * indefinidamente, segurando conexões e degradando todo o servidor. Este middleware
 * responde 503 (Service Unavailable) com Retry-After caso a resposta não tenha sido
 * enviada dentro do limite, garantindo degradação controlada em vez de travamento.
 */
export function requestTimeout(timeoutMs: number = DEFAULT_TIMEOUT_MS): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction): void => {
    const timer = setTimeout(() => {
      if (res.headersSent) {
        return;
      }
      res.setHeader('Retry-After', '5');
      res.status(503).json({
        error: 'Tempo de resposta excedido. Tente novamente em instantes.',
      });
    }, timeoutMs);

    // Não segura o event loop só por causa do timer.
    if (typeof timer.unref === 'function') {
      timer.unref();
    }

    const limpar = () => clearTimeout(timer);
    res.on('finish', limpar);
    res.on('close', limpar);

    next();
  };
}

export default requestTimeout;
