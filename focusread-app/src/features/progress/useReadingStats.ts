import { useQuery } from '@tanstack/react-query';

import { getContainer } from '../../data/container';
import { computeStats, mergeSessions } from '../../domain/stats';

export const readingStatsKey = ['readingStats'] as const;
const WINDOW_DAYS = 365;

// Las estadísticas se calculan desde las sesiones (remotas o locales + las pendientes en la outbox).
export function useReadingStats() {
  return useQuery({
    queryKey: readingStatsKey,
    queryFn: async () => {
      const { progress, outbox } = getContainer();
      const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
      const [sessions, pending] = await Promise.all([progress.listSessions(since), outbox.all()]);
      return computeStats(mergeSessions(sessions, pending.map((e) => e.session)), new Date());
    },
  });
}
