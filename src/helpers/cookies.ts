import { Request } from 'express';

/**
 * Extrai o valor de um cookie pelo nome, lendo o header `Cookie` cru da requisição.
 * Compartilhado entre o authController e o middleware requireAuth.
 */
export function extrairCookie(req: Request, nome: string): string | undefined {
  const cookies = req.headers.cookie;
  if (!cookies) return undefined;

  return cookies
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => cookie.includes('='))
    .map((cookie) => {
      const separador = cookie.indexOf('=');
      return {
        nome: cookie.slice(0, separador),
        valor: decodeURIComponent(cookie.slice(separador + 1)),
      };
    })
    .find((cookie) => cookie.nome === nome)?.valor;
}
