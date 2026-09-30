import type { ApiErrorCode } from '../domain/contract';

// Errores que nacen en el cliente (no vienen del contrato de la API).
export type ClientErrorCode =
  | 'NETWORK_ERROR'
  | 'CLIENT_TIMEOUT'
  | 'INVALID_RESPONSE'
  | 'INVALID_CREDENTIALS'
  | 'EMAIL_NOT_CONFIRMED'
  | 'NOT_AVAILABLE_OFFLINE';

export type AppErrorCode = ApiErrorCode | ClientErrorCode;

export interface AppErrorOptions {
  status?: number;
  retryAfterSeconds?: number;
  requestId?: string;
  cause?: unknown;
}

// Error tipado único para toda la app: la UI traduce `code` con i18n/es.ts.
export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly status?: number;
  readonly retryAfterSeconds?: number;
  readonly requestId?: string;

  constructor(code: AppErrorCode, message: string, options: AppErrorOptions = {}) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = options.status;
    this.retryAfterSeconds = options.retryAfterSeconds;
    this.requestId = options.requestId;
    if (options.cause !== undefined) (this as { cause?: unknown }).cause = options.cause;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}
