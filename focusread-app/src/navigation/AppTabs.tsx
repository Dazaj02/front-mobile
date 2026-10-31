import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createMaterialTopTabNavigator, type MaterialTopTabBarProps } from '@react-navigation/material-top-tabs';

import { AudioMiniDock } from '../design-system/organisms/AudioMiniDock';
import { BottomTabBar, type TabItem } from '../design-system/organisms/BottomTabBar';
import { useTheme } from '../design-system/theme/useTheme';
import { haptic } from '../services/haptics';
import { usePlayerStore } from '../state/playerStore';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { es } from '../i18n/es';
import type { TabParamList } from './types';

const Tab = createMaterialTopTabNavigator<TabParamList>();

const TAB_ITEMS: readonly (TabItem & { key: keyof TabParamList })[] = [
  { key: 'Library', label: es.tabs.library, icon: 'library-outline', iconActive: 'library' },
  { key: 'Progress', label: es.tabs.progress, icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'Settings', label: es.tabs.settings, icon: 'settings-outline', iconActive: 'settings' },
];

// Adaptador: el organismo BottomTabBar es presentacional; aquí se conecta con React Navigation.
export function NavTabBar({ state, navigation }: MaterialTopTabBarProps) {
  const activeName = state.routes[state.index].name;
  return (
    <BottomTabBar
      tabs={TAB_ITEMS}
      activeKey={activeName}
      onSelect={(name) => {
        const route = state.routes.find((r) => r.name === name);
        if (!route) return;
        void haptic('selection');
        const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
        if (!event.defaultPrevented) navigation.navigate(route.name);
      }}
    />
  );
}

export function AppTabs() {
  const item = usePlayerStore((s) => s.item);
  const playing = usePlayerStore((s) => s.playing);
  const toggle = usePlayerStore((s) => s.toggle);
  const close = usePlayerStore((s) => s.close);
  const { colors, reduceMotion } = useTheme();

  // Al salir de la app (cerrar sesión, eliminar cuenta) la lectura en voz alta se detiene.
  useEffect(() => () => usePlayerStore.getState().close(), []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Library"
        // Atrás desde Progreso/Ajustes vuelve a Biblioteca; desde Biblioteca sale de la app.
        backBehavior="firstRoute"
        tabBar={(props) => <NavTabBar {...props} />}
        // Pager nativo: se desliza entre pestañas siguiendo el dedo (sin trabajo en el hilo de JS). La barra inferior
        // propia sigue siendo el control accesible. Cada pestaña se monta al estar a una página de distancia (sin
        // páginas en blanco al deslizar) y se queda montada; con "reducir movimiento" el cambio es inmediato.
        tabBarPosition="bottom"
        screenOptions={{
          lazy: true,
          lazyPreloadDistance: 1,
          swipeEnabled: true,
          animationEnabled: !reduceMotion,
          sceneStyle: { backgroundColor: colors.bg.base },
        }}
      >
        <Tab.Screen name="Library" component={LibraryScreen} />
        <Tab.Screen name="Progress" component={ProgressScreen} />
        <Tab.Screen name="Settings" component={SettingsScreen} />
      </Tab.Navigator>
      {/* Minireproductor: sobre la barra de pestañas, respetando el inset inferior. */}
      {item ? <AudioMiniDock title={item.title} playing={playing} onToggle={toggle} onClose={close} aboveTabBar /> : null}
    </View>
  );
}
