import { z } from 'zod';

import { assertSecureApiUrl, createHttpClient } from './httpClient';

const ok = (body: unknown = { ok: true }) => new Response(JSON.stringify(body), { status: 200 });
const unauthorized = () => new Response(JSON.stringify({ error: { code: 'UNAUTHORIZED', message: 'x' } }), { status: 401 });
const schema = z.object({ ok: z.literal(true) });

function setup(responses: Response[], hooks: { onUnauthorized?: () => Promise<string | null>; onSessionExpired?: () => void } = {}) {
  const fetchMock = jest.fn();
  responses.forEach((r) => fetchMock.mockResolvedValueOnce(r));
  const http = createHttpClient({ baseUrl: 'https://api.test', getToken: async () => 'viejo', fetchImpl: fetchMock as never, ...hooks });
  const tokens = () => fetchMock.mock.calls.map((c) => (c[1].headers as Record<string, string>).Authorization);
  return { http, fetchMock, tokens };
}

describe('refresco de sesión ante un 401', () => {
  it('hace UN solo intento de refrescar y repite la solicitud con el token nuevo', async () => {
    const onUnauthorized = jest.fn(async () => 'nuevo');
    const { http, tokens } = setup([unauthorized(), ok()], { onUnauthorized });
    await expect(http.request('/v1/usage', { schema })).resolves.toEqual({ ok: true });
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(tokens()).toEqual(['Bearer viejo', 'Bearer nuevo']);
  });

  it('si tras refrescar vuelve a dar 401: error UNAUTHORIZED y se cierra la sesión (sin más reintentos)', async () => {
    const onSessionExpired = jest.fn();
    const onUnauthorized = jest.fn(async () => 'nuevo');
    const { http, fetchMock } = setup([unauthorized(), unauthorized()], { onUnauthorized, onSessionExpired });
    await expect(http.request('/v1/usage', { schema })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(onUnauthorized).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('si no se puede refrescar (null) se cierra la sesión sin repetir la solicitud', async () => {
    const onSessionExpired = jest.fn();
    const { http, fetchMock } = setup([unauthorized()], { onUnauthorized: async () => null, onSessionExpired });
    await expect(http.request('/v1/usage', { schema })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('sin hook, un 401 es simplemente un error', async () => {
    const { http } = setup([unauthorized()]);
    await expect(http.request('/v1/usage', { schema })).rejects.toMatchObject({ code: 'UNAUTHORIZED', status: 401 });
  });

  it('otros errores no disparan el refresco', async () => {
    const onUnauthorized = jest.fn(async () => 'x');
    const { http } = setup([new Response(JSON.stringify({ error: { code: 'QUOTA_EXCEEDED', message: 'x' } }), { status: 429, headers: { 'Retry-After': '90' } })], { onUnauthorized });
    await expect(http.request('/v1/usage', { schema })).rejects.toMatchObject({ code: 'QUOTA_EXCEEDED', retryAfterSeconds: 90 });
    expect(onUnauthorized).not.toHaveBeenCalled();
  });

  it('también funciona para respuestas binarias', async () => {
    const { http, tokens } = setup([unauthorized(), new Response(new Uint8Array([1, 2]), { status: 200 })], { onUnauthorized: async () => 'nuevo' });
    expect(Array.from(await http.requestBytes('/v1/tts', { method: 'POST', body: {} }))).toEqual([1, 2]);
    expect(tokens()).toEqual(['Bearer viejo', 'Bearer nuevo']);
  });
});

describe('assertSecureApiUrl', () => {
  it('en release solo HTTPS', () => {
    expect(assertSecureApiUrl('https://api.focusread.app/', false)).toBe('https://api.focusread.app');
    expect(() => assertSecureApiUrl('http://api.focusread.app', false)).toThrow(/HTTPS/);
    expect(() => assertSecureApiUrl('http://10.0.2.2:8787', false)).toThrow(/HTTPS/);
  });

  it('en desarrollo admite http (emulador 10.0.2.2 y IP de la LAN)', () => {
    expect(assertSecureApiUrl('http://10.0.2.2:8787', true)).toBe('http://10.0.2.2:8787');
    expect(assertSecureApiUrl('http://192.168.1.20:8787/', true)).toBe('http://192.168.1.20:8787');
  });

  it('rechaza valores que no son URL', () => {
    expect(() => assertSecureApiUrl('', true)).toThrow();
    expect(() => assertSecureApiUrl('localhost:8787', true)).toThrow();
  });
});
