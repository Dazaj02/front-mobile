import * as Haptics from 'expo-haptics';

import { useSettingsStore } from '../../state/settingsStore';

export type HapticKind = 'selection' | 'light' | 'medium' | 'success' | 'warning';

// Respeta el ajuste "Vibración" del usuario: con el switch apagado no hace nada.
export async function haptic(kind: HapticKind = 'light', enabled: boolean = useSettingsStore.getState().hapticsEnabled): Promise<void> {
  if (!enabled) return;
  try {
    if (kind === 'selection') await Haptics.selectionAsync();
    else if (kind === 'light') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    else if (kind === 'medium') await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    else if (kind === 'success') await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    else await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // dispositivos sin vibración: se ignora
  }
}
