import { ApiErrorSchema, type ApiErrorCode } from '../../domain/contract';
import { AppError } from '../../lib/errors';
import type { z } from 'zod';

export interface HttpClientOptions {
  baseUrl: string;
  getToken: () => Promise<string | null>;
  fetchImpl?: typeof fetch;
  timeoutMs?: number; // 90 s por defecto (procesar con IA puede tardar)
}

export interface RequestOptions<S extends z.ZodType | undefined> {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  schema?: S; // si se omite, se espera 204 sin cuerpo
}

// Si el servidor no devolvió un ApiError válido, se deduce del estado HTTP.
const STATUS_TO_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION_ERROR',
  401: 'UNAUTHORIZED',
  404: 'NOT_FOUND',
  413: 'CONTENT_TOO_LONG',
  422: 'VALIDATION_ERROR',
  429: 'RATE_LIMITED',
  502: 'PROVIDER_UNAVAILABLE',
  504: 'PROVIDER_TIMEOUT',
};

export function createHttpClient(options: HttpClientOptions) {
  const { baseUrl, getToken, timeoutMs = 90_000 } = options;
  const fetchImpl = options.fetchImpl ?? fetch;

  // Envía la solicitud autenticada y devuelve la respuesta OK; convierte todo fallo en AppError.
  async function send(
    path: string,
    opts: { method?: string; body?: unknown; headers?: Record<string, string>; accept: string },
  ): Promise<{ response: Response; requestId?: string }> {
    const token = await getToken();
    if (!token) throw new AppError('UNAUTHORIZED', 'No hay sesión activa');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(`${baseUrl.replace(/\/+$/, '')}${path}`, {
        method: opts.method ?? 'GET',
        headers: {
          Accept: opts.accept,
          ...(opts.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
          ...opts.headers,
          Authorization: `Bearer ${token}`,
        },
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
        signal: controller.signal,
      });
    } catch (e) {
      if (controller.signal.aborted) {
        throw new AppError('CLIENT_TIMEOUT', 'La solicitud tardó demasiado', { cause: e });
      }
      throw new AppError('NETWORK_ERROR', 'No se pudo conectar con el servidor', { cause: e });
    } finally {
      clearTimeout(timer);
    }

    const requestId = response.headers.get('X-Request-Id') ?? undefined;

    if (!response.ok) {
      const retryAfter = Number(response.headers.get('Retry-After'));
      const retryAfterSeconds = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined;
      let json: unknown = null;
      try {
        json = await response.json();
      } catch {
        // cuerpo no JSON
      }
      const parsed = ApiErrorSchema.safeParse(json);
      if (parsed.success) {
        const { code, message, requestId: bodyRequestId } = parsed.data.error;
        throw new AppError(code, message, { status: response.status, retryAfterSeconds, requestId: bodyRequestId ?? requestId });
      }
      const code = STATUS_TO_CODE[response.status] ?? 'INTERNAL';
      throw new AppError(code, `Error del servidor (${response.status})`, { status: response.status, retryAfterSeconds, requestId });
    }
    return { response, requestId };
  }

  async function request<S extends z.ZodType | undefined = undefined>(
    path: string,
    opts: RequestOptions<S> = {},
  ): Promise<S extends z.ZodType ? z.infer<S> : void> {
    const { response, requestId } = await send(path, { ...opts, accept: 'application/json' });
    if (!opts.schema) return undefined as never;
    let json: unknown;
    try {
      json = await response.json();
    } catch (e) {
      throw new AppError('INVALID_RESPONSE', 'Respuesta del servidor no válida', { status: response.status, requestId, cause: e });
    }
    const parsed = opts.schema.safeParse(json);
    if (!parsed.success) {
      throw new AppError('INVALID_RESPONSE', 'Respuesta del servidor no válida', { status: response.status, requestId, cause: parsed.error });
    }
    return parsed.data as never;
  }

  // Respuestas binarias (audio). Los errores siguen llegando como ApiError JSON.
  async function requestBytes(path: string, opts: { method?: 'GET' | 'POST'; body?: unknown; accept?: string } = {}): Promise<Uint8Array> {
    const { response, requestId } = await send(path, { ...opts, accept: opts.accept ?? 'audio/mpeg' });
    try {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length === 0) throw new Error('vacío');
      return bytes;
    } catch (e) {
      throw new AppError('INVALID_RESPONSE', 'Audio del servidor no válido', { status: response.status, requestId, cause: e });
    }
  }

  return { request, requestBytes };
}

export type HttpClient = ReturnType<typeof createHttpClient>;
