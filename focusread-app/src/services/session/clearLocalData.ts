import { getContainer } from '../../data/container';
import { clearLocalData, getDb } from '../../data/local/db';

// Borra todo lo que la app guarda del usuario en el dispositivo: artículos, sesiones, outbox,
// ajustes (SQLite) y las API keys propias (SecureStore). La sesión la cierra el AuthRepository.
export async function clearUserData(): Promise<void> {
  const container = getContainer();
  await clearLocalData(await getDb());
  await container.secrets.clearAll();
}
