import React from 'react';

import { Banner } from '../../design-system/molecules/Banner';
import { ScreenTemplate, type ScreenTemplateProps } from '../../design-system/templates/ScreenTemplate';
import { es } from '../../i18n/es';
import { useIsOnline } from '../../services/network';

// ScreenTemplate de las pantallas de la app: añade el banner "Sin conexión" cuando no hay red.
export function AppScreen({ banner, ...props }: ScreenTemplateProps) {
  const online = useIsOnline();
  return (
    <ScreenTemplate
      {...props}
      banner={
        <>
          {online ? null : <Banner tone="offline" message={es.offline.banner} />}
          {banner}
        </>
      }
    />
  );
}
