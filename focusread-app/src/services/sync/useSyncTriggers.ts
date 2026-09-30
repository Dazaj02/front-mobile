import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';

import { getContainer } from '../../data/container';
import { logger } from '../../lib/logger';
import { subscribeOnline } from '../network';

const PROGRESS_KEYS = [['articleProgress'], ['articles'], ['readingStats']] as const;

// Dispara la sincronización: al volver al primer plano, al recuperar la conexión y al programar
// el siguiente reintento con backoff. (También se dispara al completar una dosis: recordReadingSession.)
// En modo mock no hay servidor y no hace nada.
export function useSyncTriggers() {
  const qc = useQueryClient();

  useEffect(() => {
    const { sync, settingsSync } = getContainer();
    if (!sync) return;

    let retry: ReturnType<typeof setTimeout> | null = null;
    let active = true;

    const scheduleRetry = async () => {
      if (retry) clearTimeout(retry);
      const delay = await sync.nextRetryDelayMs();
      if (!active || delay === null) return;
      retry = setTimeout(() => void run(), Math.max(delay, 1000));
    };

    const run = async () => {
      try {
        await sync.flush();
        await settingsSync?.sync();
      } catch (e) {
        logger.warn('Sincronización fallida', e);
      }
      await scheduleRetry();
    };

    void run(); // al abrir la app
    const appState = AppState.addEventListener('change', (s) => s === 'active' && void run());
    const offNet = subscribeOnline((online) => online && void run());
    const offFlushed = sync.onFlushed(() => PROGRESS_KEYS.forEach((k) => void qc.invalidateQueries({ queryKey: [...k] })));

    return () => {
      active = false;
      if (retry) clearTimeout(retry);
      appState.remove();
      offNet();
      offFlushed();
    };
  }, [qc]);
}
