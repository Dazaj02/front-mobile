// PROPUESTA (NO forma parte del contrato congelado de §3): voces de alta calidad vía el backend.
// Ver docs/PROPUESTA_TTS_NUBE.md. Hasta que el backend la apruebe e implemente, la app la trata
// como opcional: si el servidor no responde, se usa la voz del sistema.
import { z } from 'zod';

export const CloudVoiceSchema = z.object({
  id: z.string().min(1).max(120), // id del servidor, p. ej. "es-MX-JorgeNeural"
  name: z.string().min(1).max(80),
  language: z.string().min(2).max(20), // "es-MX"
  gender: z.enum(['male', 'female', 'neutral']),
});

export const CloudVoicesResponseSchema = z.object({ voices: z.array(CloudVoiceSchema).max(100) });

// POST /v1/tts → 200 audio/mpeg (binario). Errores: ApiError habitual (QUOTA_EXCEEDED, RATE_LIMITED,
// PROVIDER_UNAVAILABLE, VALIDATION_ERROR, UNAUTHORIZED).
export const TtsRequestSchema = z.object({
  text: z.string().min(1).max(4000),
  voiceId: z.string().min(1).max(120),
  rate: z.number().min(0.5).max(2).default(1),
});

export type CloudVoice = z.infer<typeof CloudVoiceSchema>;
export type TtsRequest = z.input<typeof TtsRequestSchema>;

// Las voces de la nube viajan en el `voiceId` de UserSettings (string ≤ 200) con este prefijo,
// así no hace falta cambiar el contrato de ajustes. Las del sistema no llevan prefijo.
export const CLOUD_VOICE_PREFIX = 'cloud:';
export const isCloudVoiceId = (id: string | null | undefined): id is string => typeof id === 'string' && id.startsWith(CLOUD_VOICE_PREFIX);
export const toCloudVoiceId = (serverId: string) => `${CLOUD_VOICE_PREFIX}${serverId}`;
export const fromCloudVoiceId = (id: string) => id.slice(CLOUD_VOICE_PREFIX.length);
