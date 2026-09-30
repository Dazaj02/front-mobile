import React from 'react';

import { EmptyState } from '../../design-system/organisms/EmptyState';
import { ScreenTemplate } from '../../design-system/templates/ScreenTemplate';
import { es } from '../../i18n/es';

// Esqueleto de F5: estadísticas reales (minutos, racha, retención, gráfico semanal) en F6.
export function ProgressScreen() {
  return (
    <ScreenTemplate header={{ title: es.progress.title }}>
      <EmptyState icon="stats-chart-outline" title={es.progress.title} message={es.common.comingSoon} />
    </ScreenTemplate>
  );
}
