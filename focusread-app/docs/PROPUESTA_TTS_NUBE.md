# Propuesta: voces de alta calidad (TTS en la nube) — SOLICITUD DE CAMBIO DE CONTRATO

> Estado: **propuesta, NO aprobada.** El contrato compartido (§3 de los planes) está congelado.
> Esto lo solicita David como solución **temporal y sujeta a cambios**. El frontend ya está
> preparado y funciona sin esto (usa las voces del sistema). No se aplica en `contract.ts`.

## Motivo
Las voces del sistema dependen del teléfono, no hay garantía de voces masculinas y no se puede
saber el género de cada una. Se propone sintetizar audio en el backend con voces neuronales.

## Endpoints propuestos (requieren Bearer, igual que el resto de `/v1/*`)

### `GET /v1/tts/voices` → `200`
```json
{ "voices": [ { "id": "es-MX-JorgeNeural", "name": "Jorge", "language": "es-MX", "gender": "male" } ] }
```
- `gender`: `"male" | "female" | "neutral"`. Máx. 100 voces. Lista blanca del servidor.

### `POST /v1/tts` → `200 audio/mpeg` (binario, no JSON)
```json
{ "text": "…", "voiceId": "es-MX-JorgeNeural", "rate": 1.0 }
```
- `text`: 1–4000 caracteres. `voiceId`: debe estar en la lista del servidor. `rate`: 0.5–2 (por defecto 1).
- Audio MP3 completo del texto recibido. Cabecera `X-Request-Id` como siempre.
- **Errores** con el `ApiError` habitual y códigos YA existentes: `UNAUTHORIZED`(401), `VALIDATION_ERROR`(400),
  `QUOTA_EXCEEDED`(429 + `Retry-After`), `RATE_LIMITED`(429), `PROVIDER_UNAVAILABLE`(502), `PROVIDER_TIMEOUT`(504), `INTERNAL`(500).
  No se añaden códigos nuevos.

## Decisiones que quedan para el backend
- Proveedor de síntesis (Azure Neural, Google Cloud TTS, OpenAI TTS, ElevenLabs…) y su costo.
- Cuota propia de TTS (sugerido: contar por caracteres al día, separada de la cuota de procesar artículos).
- Caché de audio por `(texto, voz, velocidad)` para no pagar dos veces lo mismo.

## Qué hace el frontend (ya implementado, desactivado hasta que exista el backend)
- `src/domain/ttsProposal.ts`: esquemas zod de la propuesta (fuera de `contract.ts`).
- `src/data/api/HttpTtsGateway.ts`: cliente de ambos endpoints (valida antes de enviar y al recibir).
- `src/services/tts/cloud.ts` + `expoAudioPlayer.ts`: parte el texto en segmentos ≤ 4000, sintetiza el
  siguiente mientras suena el actual y reproduce con `expo-audio`.
- La voz elegida viaja en `UserSettings.voiceId` con el prefijo `cloud:` (p. ej. `cloud:es-MX-JorgeNeural`):
  **no cambia el contrato de ajustes** (`voiceId` ya es un string de hasta 200).
- Si la nube falla (sin red, cuota, servidor caído) la lectura continúa automáticamente con la voz del
  sistema. Sin conexión o en modo mock, la sección "Voces de alta calidad" indica que depende del servidor.
- El contenedor live (F8) debe rellenar `container.tts = new HttpTtsGateway(http)` y llamar a
  `enableCloudTts(container.tts)` al iniciar sesión.

## Limitaciones conocidas
- Requiere conexión: no hay audio en la nube sin red (el sistema lo reemplaza).
- Android no permite pausar a mitad: "pausar" detiene y "reanudar" vuelve a leer la dosis.
- Cada reproducción consume cuota del servidor.
