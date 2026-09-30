import { getContainer } from '../../data/container';
import type { ReadingSession } from '../../domain/contract';
import { logger } from '../../lib/logger';

// Único punto por donde el lector guarda sesiones.
//  - live: SIEMPRE se escribe primero en la outbox (local) y luego se intenta enviar; así funciona
//    sin conexión y una caída no pierde la sesión.
//  - mock: no hay servidor; la base local es la fuente de verdad.
export async function recordReadingSession(session: ReadingSession): Promise<void> {
  try {
    const { sync, outbox, progress } = getContainer();
    if (sync) {
      await outbox.enqueue(session);
      void sync.flush();
    } else {
      await progress.recordSession(session);
    }
  } catch (e) {
    logger.warn('No se pudo guardar la sesión de lectura', e);
  }
}
