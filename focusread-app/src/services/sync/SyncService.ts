import type { ProgressRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import type { Outbox } from '../../data/local/outbox';

export interface FlushResult {
  sent: number;
  failed: number;
  remaining: number;
  skipped: boolean; // true si no se intentó por estar sin conexión
}

export interface SyncServiceOptions {
  outbox: Outbox;
  remote: ProgressRepository; // el envío es idempotente por id de sesión
  isOnline: () => boolean;
  now?: () => number;
}

// Envía las sesiones pendientes de la outbox. Garantías:
//  - idempotente: reenviar una sesión ya guardada no la duplica (el servidor ignora el id repetido);
//  - una entrada solo se borra de la outbox si el servidor respondió OK;
//  - los fallos se reintentan con backoff exponencial (lo gestiona la outbox);
//  - nunca hay dos flush simultáneos.
export class SyncService {
  private inflight: Promise<FlushResult> | null = null;
  private readonly listeners = new Set<(result: FlushResult) => void>();
  private readonly now: () => number;

  constructor(private readonly options: SyncServiceOptions) {
    this.now = options.now ?? Date.now;
  }

  // `ignoreBackoff`: envío inmediato de todo (p. ej. al cerrar sesión).
  flush(opts: { ignoreBackoff?: boolean } = {}): Promise<FlushResult> {
    if (this.inflight) return this.inflight;
    this.inflight = this.run(opts.ignoreBackoff ?? false).finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  onFlushed(cb: (result: FlushResult) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  // Milisegundos hasta el siguiente reintento pendiente (null si no hay nada que reintentar).
  async nextRetryDelayMs(): Promise<number | null> {
    const entries = await this.options.outbox.all();
    if (entries.length === 0) return null;
    const next = Math.min(...entries.map((e) => e.nextAttemptAt));
    return Math.max(0, next - this.now());
  }

  private async run(ignoreBackoff: boolean): Promise<FlushResult> {
    const { outbox, remote, isOnline } = this.options;
    if (!isOnline()) return { sent: 0, failed: 0, remaining: await outbox.count(), skipped: true };

    const entries = ignoreBackoff ? await outbox.all() : await outbox.due();
    let sent = 0;
    let failed = 0;
    for (const entry of entries) {
      try {
        await remote.recordSession(entry.session);
        await outbox.remove(entry.session.id); // solo tras respuesta OK
        sent++;
      } catch (e) {
        failed++;
        logger.warn('No se pudo enviar la sesión, se reintentará', entry.session.id, e);
        await outbox.markFailed(entry.session.id);
      }
    }
    const result: FlushResult = { sent, failed, remaining: await outbox.count(), skipped: false };
    if (sent > 0) this.listeners.forEach((cb) => cb(result));
    return result;
  }
}
