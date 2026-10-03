import React from 'react';
import { View } from 'react-native';

import { Spinner } from '../../design-system/atoms/Spinner';
import { SectionHeader } from '../../design-system/molecules/SectionHeader';
import { StatTile } from '../../design-system/molecules/StatTile';
import { DailyProgressCard } from '../../design-system/organisms/DailyProgressCard';
import { ErrorState } from '../../design-system/organisms/ErrorState';
import { WeeklyChart } from '../../design-system/organisms/WeeklyChart';
import { AppScreen } from '../shared/AppScreen';
import { useTheme } from '../../design-system/theme/useTheme';
import type { ReadingStats } from '../../domain/stats';
import { es } from '../../i18n/es';
import { useReadingStats } from './useReadingStats';

// "2026-09-30" → día de la semana local (0 = domingo)
export function weekdayOf(dateKey: string): number {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

export function toChartData(stats: ReadingStats) {
  return stats.last7Days.map((d) => {
    const day = weekdayOf(d.date);
    return { label: es.progress.weekdaysShort[day], fullLabel: es.progress.weekdays[day], minutes: d.minutes };
  });
}

function StatRow({ children }: { children: React.ReactNode }) {
  const { spacing } = useTheme();
  return <View style={{ flexDirection: 'row', gap: spacing.xl }}>{children}</View>;
}

export function ProgressScreen() {
  const { spacing } = useTheme();
  const query = useReadingStats();
  const stats = query.data;

  let body: React.ReactNode;
  if (query.isLoading) {
    body = <Spinner size="lg" />;
  } else if (query.isError || !stats) {
    body = <ErrorState title={es.progress.loadFailedTitle} onRetry={() => void query.refetch()} />;
  } else {
    body = (
      <>
        {/* El contrato no define una meta diaria: se muestra lo leído hoy, sin barra de meta. */}
        <DailyProgressCard minutesToday={stats.minutesToday} dosesToday={stats.dosesToday} />
        {/* Rejilla editorial 2×2: sin cajas, con un filete entre filas. */}
        <View>
          <StatRow>
            <StatTile label={es.progress.minutes} value={String(stats.totalMinutes)} icon="time-outline" divider />
            <StatTile label={es.progress.doses} value={String(stats.completedDoses)} icon="checkmark-done-outline" divider />
          </StatRow>
          <StatRow>
            <StatTile label={es.progress.streak} value={es.progress.streakValue(stats.streakDays)} icon="flame-outline" />
            <StatTile
              label={es.progress.retention}
              value={stats.retention === null ? '—' : `${Math.round(stats.retention * 100)} %`}
              icon="bulb-outline"
              hint={stats.retention === null ? es.progress.retentionNone : undefined}
            />
          </StatRow>
        </View>
        <View style={{ gap: spacing.md }}>
          <SectionHeader
            title={es.progress.weekTitle}
            meta={es.progress.weekTotal(stats.last7Days.reduce((n, d) => n + d.minutes, 0))}
          />
          <WeeklyChart data={toChartData(stats)} />
        </View>
      </>
    );
  }

  return <AppScreen header={{ title: es.progress.title, size: 'large' }}>{body}</AppScreen>;
}
