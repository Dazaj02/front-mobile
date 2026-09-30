import React, { useEffect } from 'react';
import { View } from 'react-native';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';

import { AudioMiniDock } from '../design-system/organisms/AudioMiniDock';
import { BottomTabBar, type TabItem } from '../design-system/organisms/BottomTabBar';
import { haptic } from '../services/haptics';
import { usePlayerStore } from '../state/playerStore';
import { LibraryScreen } from '../features/library/LibraryScreen';
import { ProgressScreen } from '../features/progress/ProgressScreen';
import { SettingsScreen } from '../features/settings/SettingsScreen';
import { es } from '../i18n/es';
import { FocusedOnly } from './FocusedOnly';
import type { TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ITEMS: readonly (TabItem & { key: keyof TabParamList })[] = [
  { key: 'Library', label: es.tabs.library, icon: 'library-outline', iconActive: 'library' },
  { key: 'Progress', label: es.tabs.progress, icon: 'stats-chart-outline', iconActive: 'stats-chart' },
  { key: 'Settings', label: es.tabs.settings, icon: 'settings-outline', iconActive: 'settings' },
];

// Adaptador: el organismo BottomTabBar es presentacional; aquí se conecta con React Navigation.
export function NavTabBar({ state, navigation }: BottomTabBarProps) {
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

const inFocus = (Screen: React.ComponentType) =>
  function FocusedTab() {
    return (
      <FocusedOnly>
        <Screen />
      </FocusedOnly>
    );
  };

const LibraryTab = inFocus(LibraryScreen);
const ProgressTab = inFocus(ProgressScreen);
const SettingsTab = inFocus(SettingsScreen);

export function AppTabs() {
  const item = usePlayerStore((s) => s.item);
  const playing = usePlayerStore((s) => s.playing);
  const toggle = usePlayerStore((s) => s.toggle);
  const close = usePlayerStore((s) => s.close);

  // Al salir de la app (cerrar sesión, eliminar cuenta) la lectura en voz alta se detiene.
  useEffect(() => () => usePlayerStore.getState().close(), []);

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="Library"
        // Atrás desde Progreso/Ajustes vuelve a Biblioteca; desde Biblioteca sale de la app.
        backBehavior="firstRoute"
        tabBar={(props) => <NavTabBar {...props} />}
        // Sin swipe entre pestañas; las pestañas se montan al visitarlas y solo la visible queda montada.
        screenOptions={{ headerShown: false, lazy: true }}
      >
        <Tab.Screen name="Library" component={LibraryTab} />
        <Tab.Screen name="Progress" component={ProgressTab} />
        <Tab.Screen name="Settings" component={SettingsTab} />
      </Tab.Navigator>
      {/* Minireproductor: sobre la barra de pestañas, respetando el inset inferior. */}
      {item ? <AudioMiniDock title={item.title} playing={playing} onToggle={toggle} onClose={close} aboveTabBar /> : null}
    </View>
  );
}
