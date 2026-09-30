import { getContainer } from '../../data/container';
import type { ReadingSession } from '../../domain/contract';
import { logger } from '../../lib/logger';

// Único punto por donde el lector guarda sesiones. F7 lo cambia a "outbox primero + flush"
// para que funcione sin conexión; las pantallas no cambian.
export async function recordReadingSession(session: ReadingSession): Promise<void> {
  try {
    await getContainer().progress.recordSession(session);
  } catch (e) {
    logger.warn('No se pudo guardar la sesión de lectura', e);
  }
}
