import type { ProgressRepository } from '../../domain/ports';
import { isAppError } from '../../lib/errors';
import { logger } from '../../lib/logger';
import type { Outbox } from '../../data/local/outbox';

// VALIDATION_ERROR = el servidor dijo "esto no es válido" (violación de restricciones o RLS).
function isPermanentRejection(e: unknown): boolean {
  return isAppError(e) && e.code === 'VALIDATION_ERROR';
}

export interface FlushResult {
  sent: number;
  failed: number;
  dropped: number; // rechazadas de forma permanente por el servidor
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
    if (!isOnline()) return { sent: 0, failed: 0, dropped: 0, remaining: await outbox.count(), skipped: true };

    const entries = ignoreBackoff ? await outbox.all() : await outbox.due();
    let sent = 0;
    let failed = 0;
    let dropped = 0;
    for (const entry of entries) {
      try {
        await remote.recordSession(entry.session);
        await outbox.remove(entry.session.id); // solo tras respuesta OK
        sent++;
      } catch (e) {
        if (isPermanentRejection(e)) {
          // El servidor rechazó la sesión por una restricción (check, FK, RLS): reintentar nunca
          // funcionará y bloquearía la cola para siempre. Se descarta y se deja constancia.
          logger.error('Sesión rechazada por el servidor, se descarta', entry.session.id, e);
          await outbox.remove(entry.session.id);
          dropped++;
          continue;
        }
        failed++;
        logger.warn('No se pudo enviar la sesión, se reintentará', entry.session.id, e);
        await outbox.markFailed(entry.session.id);
        if (isAppError(e) && e.code === 'UNAUTHORIZED') break; // sin sesión válida no tiene sentido seguir
      }
    }
    const result: FlushResult = { sent, failed, dropped, remaining: await outbox.count(), skipped: false };
    if (sent > 0) this.listeners.forEach((cb) => cb(result));
    return result;
  }
}
