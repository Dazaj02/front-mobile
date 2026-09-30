import { getContainer } from '../../data/container';
import { logger } from '../../lib/logger';
import { clearUserData } from './clearLocalData';

// Antes de cerrar sesión (live) se intenta enviar lo pendiente. Devuelve cuántas sesiones
// quedaron sin sincronizar para poder advertir al usuario.
export async function syncBeforeSignOut(): Promise<{ pending: number }> {
  const { sync, outbox } = getContainer();
  if (!sync) return { pending: 0 };
  try {
    await sync.flush({ ignoreBackoff: true });
  } catch (e) {
    logger.warn('No se pudo sincronizar antes de cerrar sesión', e);
  }
  return { pending: await outbox.count() };
}

// Cerrar sesión. En modo live se limpian la caché SQLite, la outbox y las keys BYOK (los datos
// viven en el servidor). En modo mock NO se borra nada: no hay otra copia del progreso.
export async function performSignOut(): Promise<void> {
  const { auth, mode } = getContainer();
  await auth.signOut();
  if (mode === 'live') await clearUserData();
}
