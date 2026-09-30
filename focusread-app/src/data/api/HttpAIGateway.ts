import {
  ProcessArticleRequestSchema,
  ProcessArticleResponseSchema,
  ProvidersResponseSchema,
  TestProviderRequestSchema,
  TestProviderResponseSchema,
  UsageResponseSchema,
  type ProcessArticleRequest,
  type ProcessArticleResponse,
} from '../../domain/contract';
import type { AIGateway, ByokProviderId, ProviderInfo, UsageInfo } from '../../domain/ports';
import { AppError } from '../../lib/errors';
import type { HttpClient } from './httpClient';

const AI_KEY_HEADER = 'X-AI-Key';

// Único punto por donde la app habla con la IA: siempre a través de nuestra API.
// La key BYOK viaja solo en el header X-AI-Key (nunca en URL ni en el cuerpo).
export class HttpAIGateway implements AIGateway {
  constructor(private readonly http: HttpClient) {}

  async listProviders(): Promise<ProviderInfo[]> {
    const res = await this.http.request('/v1/providers', { schema: ProvidersResponseSchema });
    return res.providers;
  }

  async testProvider(provider: ByokProviderId, model: string | undefined, key: string): Promise<void> {
    const body = this.validate(TestProviderRequestSchema, { provider, model });
    if (!key.trim()) throw new AppError('PROVIDER_KEY_MISSING', 'Falta la API key del proveedor');
    await this.http.request('/v1/providers/test', {
      method: 'POST',
      body,
      headers: { [AI_KEY_HEADER]: key.trim() },
      schema: TestProviderResponseSchema,
    });
  }

  async process(req: ProcessArticleRequest, key?: string): Promise<ProcessArticleResponse> {
    const body = this.validate(ProcessArticleRequestSchema, req);
    const headers: Record<string, string> = {};
    if (body.provider !== 'focusread') {
      if (!key?.trim()) throw new AppError('PROVIDER_KEY_MISSING', 'Falta la API key del proveedor');
      headers[AI_KEY_HEADER] = key.trim();
    }
    return this.http.request('/v1/articles/process', {
      method: 'POST',
      body,
      headers,
      schema: ProcessArticleResponseSchema,
    });
  }

  async usage(): Promise<UsageInfo> {
    return this.http.request('/v1/usage', { schema: UsageResponseSchema });
  }

  // Valida antes de salir a la red y devuelve el valor con los defaults del contrato aplicados.
  private validate<T>(schema: { safeParse(v: unknown): { success: true; data: T } | { success: false; error: unknown } }, value: unknown): T {
    const parsed = schema.safeParse(value);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'La solicitud no es válida', { cause: parsed.error });
    return parsed.data;
  }
}
