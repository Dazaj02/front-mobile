import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';

import { ActiveTimer } from '../../lib/activeTimer';

// Tiempo de lectura activo de la dosis actual. Se reinicia al cambiar `resetKey`, se pausa cuando
// la app deja de estar en primer plano y nunca supera los 7200 s.
export function useActiveTime(resetKey: string) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const current = useMemo(() => ({ timer: new ActiveTimer(), startedAt: new Date() }), [resetKey]);
  const [, setTick] = useState(0);

  useEffect(() => {
    // Solo se descarta el estado explícito de fondo: en algunos arranques currentState aún no está definido.
    if (AppState.currentState !== 'background' && AppState.currentState !== 'inactive') current.timer.start();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') current.timer.start();
      else current.timer.pause();
    });
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      sub.remove();
      clearInterval(interval);
      current.timer.pause();
    };
  }, [current]);

  return {
    seconds: current.timer.elapsedSeconds(),
    getSeconds: () => current.timer.elapsedSeconds(),
    startedAt: current.startedAt,
  };
}
