import { AppError, isAppError } from '../../lib/errors';

interface PostgrestLikeError {
  code?: string;
  message?: string;
  status?: number;
  name?: string;
}

// Traduce errores de PostgREST / Supabase Auth a AppError tipado. Nunca propaga texto técnico a la UI.
export function toAppError(e: unknown, fallbackMessage = 'Error del servidor'): AppError {
  if (isAppError(e)) return e;
  const err = (e ?? {}) as PostgrestLikeError;
  const message = err.message ?? fallbackMessage;

  // Sin red (fetch de RN lanza TypeError "Network request failed")
  if (err.name === 'TypeError' || /network request failed|failed to fetch|fetch failed/i.test(message)) {
    return new AppError('NETWORK_ERROR', 'No se pudo conectar con el servidor', { cause: e });
  }
  // Sesión inválida o expirada
  if (err.status === 401 || err.code === 'PGRST301' || err.code === 'PGRST303' || /jwt expired|invalid jwt/i.test(message)) {
    return new AppError('UNAUTHORIZED', 'La sesión expiró', { status: 401, cause: e });
  }
  // Restricciones (check, FK, únicos) y RLS: la solicitud es inválida y reintentar no ayudará
  if (err.code && (err.code.startsWith('23') || err.code === '42501' || err.code === 'PGRST116')) {
    return new AppError(err.code === 'PGRST116' ? 'NOT_FOUND' : 'VALIDATION_ERROR', message, { cause: e });
  }
  if (err.status === 429) return new AppError('RATE_LIMITED', message, { status: 429, cause: e });
  return new AppError('INTERNAL', message, { status: err.status, cause: e });
}

// Supabase Auth → códigos de la app
export function toAuthError(e: unknown): AppError {
  if (isAppError(e)) return e;
  const err = (e ?? {}) as PostgrestLikeError & { code?: string };
  const code = err.code ?? '';
  const msg = err.message ?? '';
  if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
    return new AppError('INVALID_CREDENTIALS', 'Credenciales incorrectas', { cause: e });
  }
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
    return new AppError('EMAIL_NOT_CONFIRMED', 'Correo sin verificar', { cause: e });
  }
  if (code === 'over_email_send_rate_limit' || code === 'over_request_rate_limit' || err.status === 429) {
    return new AppError('RATE_LIMITED', 'Demasiados intentos', { status: 429, cause: e });
  }
  if (code === 'weak_password' || code === 'validation_failed' || code === 'email_address_invalid') {
    return new AppError('VALIDATION_ERROR', msg || 'Datos no válidos', { cause: e });
  }
  return toAppError(e, 'No se pudo completar la operación de cuenta');
}
