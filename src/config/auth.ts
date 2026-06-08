const OITO_HORAS_EM_MS = 8 * 60 * 60 * 1000;

export const AUTH_TOKEN_COOKIE = 'auth_token';
export const AUTH_SESSION_COOKIE = 'auth_session_id';
export const AUTH_COOKIE_MAX_AGE_MS = OITO_HORAS_EM_MS;

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET nao configurado');
  }

  return secret;
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    maxAge: AUTH_COOKIE_MAX_AGE_MS,
  };
}
