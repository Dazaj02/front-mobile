import { useCallback, useEffect, useRef, useState } from 'react';

// Cuenta regresiva para limitar acciones repetibles (p. ej. reenviar el correo una vez cada 60 s).
export function useCooldown(seconds: number, startActive = true) {
  const [remaining, setRemaining] = useState(startActive ? seconds : 0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  const run = useCallback(() => {
    stop();
    timer.current = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          stop();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
  }, [stop]);

  const start = useCallback(() => {
    setRemaining(seconds);
    run();
  }, [seconds, run]);

  // El estado inicial ya vale `seconds`: aquí solo se arranca el reloj.
  useEffect(() => {
    if (startActive) run();
    return stop;
  }, [startActive, run, stop]);

  return { remaining, canAct: remaining === 0, start };
}
