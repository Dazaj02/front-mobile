import { ApiErrorCodeSchema, ProcessArticleResponseSchema, type ApiErrorCode } from '../../domain/contract';
import { AppError } from '../../lib/errors';
import { makeArticle } from '../../test/fixtures';
import { HttpAIGateway } from './HttpAIGateway';
import { createHttpClient } from './httpClient';

const BASE = 'https://api.test';
const TOKEN = 'jwt-token-abc';
const SECRET = 'sk-super-secreta-123';
const LONG_TEXT = 'palabra '.repeat(60).trim() + '.';

type FetchMock = jest.Mock<Promise<Response>, [string, RequestInit]>;

function json(status: number, body: unknown, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

function setup(fetchImpl: FetchMock, opts: { token?: string | null; timeoutMs?: number } = {}) {
  const http = createHttpClient({
    baseUrl: BASE,
    getToken: async () => (opts.token === undefined ? TOKEN : opts.token),
    fetchImpl: fetchImpl as unknown as typeof fetch,
    timeoutMs: opts.timeoutMs,
  });
  return new HttpAIGateway(http);
}

const processBody = () => ({ article: makeArticle(), warnings: [] });
const textReq = { source: { type: 'text' as const, text: LONG_TEXT }, targetDoseMinutes: 2.5 as const };

describe('HttpAIGateway.process', () => {
  it('envía Authorization y no envía X-AI-Key con el proveedor incluido', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(json(201, processBody(), { 'X-Request-Id': 'r1' }));
    const res = await setup(fetchMock).process(textReq);
    expect(ProcessArticleResponseSchema.safeParse(res).success).toBe(true);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/v1/articles/process`);
    expect(init.method).toBe('POST');
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Bearer ${TOKEN}`);
    expect(headers['X-AI-Key']).toBeUndefined();
    // los defaults del contrato se aplican antes de enviar
    expect(JSON.parse(init.body as string)).toMatchObject({ provider: 'focusread', includeQuiz: true });
  });

  it('la key BYOK viaja solo en el header X-AI-Key (nunca en URL ni cuerpo)', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(json(201, processBody()));
    await setup(fetchMock).process({ ...textReq, provider: 'openai' }, SECRET);
    const [url, init] = fetchMock.mock.calls[0];
    expect((init.headers as Record<string, string>)['X-AI-Key']).toBe(SECRET);
    expect(url).not.toContain(SECRET);
    expect(init.body as string).not.toContain(SECRET);
  });

  it('exige key para proveedores BYOK antes de salir a la red', async () => {
    const fetchMock: FetchMock = jest.fn();
    await expect(setup(fetchMock).process({ ...textReq, provider: 'groq' })).rejects.toMatchObject({ code: 'PROVIDER_KEY_MISSING' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('valida la solicitud con el contrato antes de enviarla', async () => {
    const fetchMock: FetchMock = jest.fn();
    const gw = setup(fetchMock);
    await expect(gw.process({ source: { type: 'text', text: 'muy corto' }, targetDoseMinutes: 2.5 })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    await expect(gw.process({ ...textReq, targetDoseMinutes: 9 as never })).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rechaza respuestas que no cumplen el contrato (INVALID_RESPONSE)', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(json(201, { article: { id: 'x' } }));
    await expect(setup(fetchMock).process(textReq)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('sin sesión lanza UNAUTHORIZED sin llamar a la red', async () => {
    const fetchMock: FetchMock = jest.fn();
    await expect(setup(fetchMock, { token: null }).process(textReq)).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mapeo de errores ApiError → AppError (§3.3)', () => {
  const STATUS: Record<ApiErrorCode, number> = {
    UNAUTHORIZED: 401,
    VALIDATION_ERROR: 400,
    NOT_FOUND: 404,
    CONTENT_TOO_SHORT: 422,
    CONTENT_TOO_LONG: 413,
    URL_BLOCKED: 422,
    URL_FETCH_FAILED: 422,
    URL_NO_CONTENT: 422,
    QUOTA_EXCEEDED: 429,
    RATE_LIMITED: 429,
    PROVIDER_KEY_MISSING: 400,
    PROVIDER_KEY_INVALID: 422,
    PROVIDER_UNAVAILABLE: 502,
    PROVIDER_TIMEOUT: 504,
    AI_OUTPUT_INVALID: 502,
    INTERNAL: 500,
  };

  it.each(ApiErrorCodeSchema.options)('%s', async (code) => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValue(json(STATUS[code], { error: { code, message: `msg ${code}`, requestId: 'req-9' } }, { 'Retry-After': '30' }));
    const err = await setup(fetchMock).process(textReq).catch((e) => e);
    expect(err).toBeInstanceOf(AppError);
    expect(err).toMatchObject({ code, message: `msg ${code}`, status: STATUS[code], requestId: 'req-9', retryAfterSeconds: 30 });
  });

  it('PROVIDER_KEY_INVALID es 422 (no 401) para no confundirlo con la sesión', async () => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValue(json(422, { error: { code: 'PROVIDER_KEY_INVALID', message: 'Key inválida' } }));
    const err = await setup(fetchMock).testProvider('openai', undefined, SECRET).catch((e) => e);
    expect(err.code).toBe('PROVIDER_KEY_INVALID');
    expect(err.status).toBe(422);
  });

  it('deduce el código del estado HTTP si el cuerpo no es un ApiError', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }));
    await expect(setup(fetchMock).usage()).rejects.toMatchObject({ code: 'PROVIDER_UNAVAILABLE', status: 502 });
  });

  it('toma el X-Request-Id del header si el cuerpo no lo trae', async () => {
    const fetchMock: FetchMock = jest
      .fn()
      .mockResolvedValue(json(500, { error: { code: 'INTERNAL', message: 'x' } }, { 'X-Request-Id': 'hdr-1' }));
    await expect(setup(fetchMock).usage()).rejects.toMatchObject({ requestId: 'hdr-1' });
  });
});

describe('red y timeout', () => {
  it('un fallo de red se convierte en NETWORK_ERROR', async () => {
    const fetchMock: FetchMock = jest.fn().mockRejectedValue(new TypeError('Network request failed'));
    await expect(setup(fetchMock).usage()).rejects.toMatchObject({ code: 'NETWORK_ERROR' });
  });

  it('aborta con AbortController y lanza CLIENT_TIMEOUT', async () => {
    const fetchMock: FetchMock = jest.fn(
      (_url, init) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        }),
    );
    await expect(setup(fetchMock, { timeoutMs: 30 }).usage()).rejects.toMatchObject({ code: 'CLIENT_TIMEOUT' });
  });

  it('el timeout por defecto es de 90 s', async () => {
    jest.useFakeTimers();
    try {
      let aborted = false;
      const fetchMock: FetchMock = jest.fn(
        (_url, init) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal?.addEventListener('abort', () => {
              aborted = true;
              reject(new DOMException('Aborted', 'AbortError'));
            });
          }),
      );
      const pending = setup(fetchMock).usage().catch((e) => e);
      await jest.advanceTimersByTimeAsync(89_000);
      expect(aborted).toBe(false);
      await jest.advanceTimersByTimeAsync(1_500);
      expect(aborted).toBe(true);
      expect(await pending).toMatchObject({ code: 'CLIENT_TIMEOUT' });
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('otros endpoints', () => {
  it('listProviders valida la respuesta', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(
      json(200, { providers: [{ id: 'focusread', name: 'FocusRead', requiresUserKey: false, models: [{ id: 'm', label: 'M' }], defaultModel: 'm' }] }),
    );
    const providers = await setup(fetchMock).listProviders();
    expect(providers[0].id).toBe('focusread');
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/v1/providers`);
  });

  it('testProvider envía la key solo por header y exige que exista', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(json(200, { ok: true }));
    const gw = setup(fetchMock);
    await gw.testProvider('deepseek', 'deepseek-chat', SECRET);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE}/v1/providers/test`);
    expect((init.headers as Record<string, string>)['X-AI-Key']).toBe(SECRET);
    expect(init.body as string).not.toContain(SECRET);
    await expect(gw.testProvider('deepseek', undefined, '  ')).rejects.toMatchObject({ code: 'PROVIDER_KEY_MISSING' });
  });

  it('usage valida la respuesta', async () => {
    const fetchMock: FetchMock = jest.fn().mockResolvedValue(json(200, { used: 3, limit: 20, resetsAt: '2026-10-01T00:00:00.000Z' }));
    expect(await setup(fetchMock).usage()).toEqual({ used: 3, limit: 20, resetsAt: '2026-10-01T00:00:00.000Z' });
  });
});
