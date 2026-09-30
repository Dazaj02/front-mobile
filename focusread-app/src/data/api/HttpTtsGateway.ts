import {
  CloudVoicesResponseSchema,
  TtsRequestSchema,
  type CloudVoice,
  type TtsRequest,
} from '../../domain/ttsProposal';
import { AppError } from '../../lib/errors';
import type { HttpClient } from './httpClient';

export interface CloudTtsGateway {
  listVoices(): Promise<CloudVoice[]>;
  synthesize(req: TtsRequest): Promise<Uint8Array>;
}

// Voces de alta calidad a través del backend (endpoints propuestos: GET /v1/tts/voices y POST /v1/tts).
export class HttpTtsGateway implements CloudTtsGateway {
  constructor(private readonly http: HttpClient) {}

  async listVoices(): Promise<CloudVoice[]> {
    const res = await this.http.request('/v1/tts/voices', { schema: CloudVoicesResponseSchema });
    return res.voices;
  }

  async synthesize(req: TtsRequest): Promise<Uint8Array> {
    const parsed = TtsRequestSchema.safeParse(req);
    if (!parsed.success) throw new AppError('VALIDATION_ERROR', 'La solicitud de audio no es válida', { cause: parsed.error });
    return this.http.requestBytes('/v1/tts', { method: 'POST', body: parsed.data });
  }
}
