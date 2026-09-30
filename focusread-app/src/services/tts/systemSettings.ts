import { Linking } from 'react-native';

// Acciones reales de Android, de la más directa a la más general:
//  1. instalar datos de voz del motor de texto a voz predeterminado (Google TTS);
//  2. ajustes de "Salida de texto a voz" del sistema.
// NO se cae a los ajustes de la app (en Expo Go serían los de Expo Go y no sirven para instalar voces).
const INTENTS = ['android.speech.tts.engine.INSTALL_TTS_DATA', 'com.android.settings.TTS_SETTINGS'] as const;

export type VoiceSettingsResult = 'opened' | 'unavailable';

export async function openSystemVoiceSettings(): Promise<VoiceSettingsResult> {
  for (const action of INTENTS) {
    try {
      await Linking.sendIntent(action);
      return 'opened';
    } catch {
      // esa pantalla no existe en este teléfono: se prueba la siguiente
    }
  }
  return 'unavailable';
}
