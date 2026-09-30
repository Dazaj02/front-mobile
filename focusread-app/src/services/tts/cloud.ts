import type { CloudTtsGateway } from '../../data/api/HttpTtsGateway';
import { logger } from '../../lib/logger';
import { splitForSpeech } from './split';

// Reproduce audio ya sintetizado; resuelve cuando termina (o al detenerse).
export interface AudioPlayerPort {
  play(bytes: Uint8Array): Promise<void>;
  stop(): void;
}

export interface CloudSpeakOptions {
  voiceId: string; // id del SERVIDOR (sin el prefijo "cloud:")
  rate?: number;
  onDone?: () => void;
  onError?: (error: unknown) => void;
}

export const CLOUD_MAX_CHARS = 4000;

// Sintetiza por segmentos y los reproduce en orden. Mientras suena uno, ya se pide el siguiente
// para que entre ellos no haya silencios largos.
export function createCloudSpeaker(deps: { gateway: Pick<CloudTtsGateway, 'synthesize'>; player: AudioPlayerPort }) {
  let session = 0;

  function speak(text: string, opts: CloudSpeakOptions): void {
    const token = ++session;
    deps.player.stop();
    const segments = splitForSpeech(text, CLOUD_MAX_CHARS);
    if (segments.length === 0) return opts.onDone?.();

    const synth = (i: number) => deps.gateway.synthesize({ text: segments[i], voiceId: opts.voiceId, rate: opts.rate ?? 1 });

    void (async () => {
      try {
        let next: Promise<Uint8Array> | null = synth(0);
        for (let i = 0; i < segments.length; i++) {
          const current = next as Promise<Uint8Array>;
          next = i + 1 < segments.length ? synth(i + 1) : null; // prefetch
          next?.catch(() => undefined); // un fallo se maneja cuando le toque
          const bytes = await current;
          if (token !== session) return;
          await deps.player.play(bytes);
          if (token !== session) return;
        }
        opts.onDone?.();
      } catch (e) {
        if (token !== session) return;
        logger.warn('Falló la voz en la nube', e);
        opts.onError?.(e);
      }
    })();
  }

  function stop(): void {
    session++;
    deps.player.stop();
  }

  return { speak, stop };
}

export type CloudSpeaker = ReturnType<typeof createCloudSpeaker>;
