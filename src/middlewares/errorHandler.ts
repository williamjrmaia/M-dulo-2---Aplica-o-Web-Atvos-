import { Request, Response, NextFunction } from 'express';
import { AppError } from '../errors/AppError';

// Erros de rede (DNS/socket) que indicam banco/serviço indisponível.
const NETWORK_ERROR_CODES = new Set([
  'ECONNREFUSED',
  'ENOTFOUND',
  'ETIMEDOUT',
  'EAI_AGAIN',
  'ECONNRESET',
  'EPIPE',
]);

// Códigos SQLSTATE de indisponibilidade/cancelamento do PostgreSQL.
const PG_UNAVAILABLE_CODES = new Set([
  '57014', // query_canceled (statement/query timeout)
  '57P01', // admin_shutdown
  '57P02', // crash_shutdown
  '57P03', // cannot_connect_now
  '08000', // connection_exception
  '08001', // sqlclient_unable_to_establish_sqlconnection
  '08003', // connection_does_not_exist
  '08004', // sqlserver_rejected_establishment_of_sqlconnection
  '08006', // connection_failure
  '53300', // too_many_connections
]);

// Detecta falhas transitórias de banco/conexão que merecem 503 (e não 500),
// permitindo que clientes e balanceadores tentem novamente.
function isBancoIndisponivel(err: unknown): boolean {
  if (!err || typeof err !== 'object') {
    return false;
  }
  const code = (err as { code?: unknown }).code;
  if (typeof code === 'string' && (NETWORK_ERROR_CODES.has(code) || PG_UNAVAILABLE_CODES.has(code))) {
    return true;
  }
  const message = err instanceof Error ? err.message : '';
  return /connection terminated|terminating connection|getaddrinfo|timeout exceeded|connection timeout/i.test(
    message,
  );
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // Se outra etapa (ex.: timeout) já respondeu, não tenta escrever de novo.
  if (res.headersSent) {
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (isBancoIndisponivel(err)) {
    console.error('[errorHandler] Banco indisponível:', err);
    res.setHeader('Retry-After', '5');
    res.status(503).json({ error: 'Serviço temporariamente indisponível. Tente novamente em instantes.' });
    return;
  }

  console.error(err);
  res.status(500).json({ error: 'Erro interno do servidor' });
}
