import { QueryClient } from '@tanstack/react-query';

// Offline-first: las lecturas salen de SQLite; no se reintenta a ciegas ni se refresca al enfocar.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 30_000 },
    mutations: { retry: 0 },
  },
});
