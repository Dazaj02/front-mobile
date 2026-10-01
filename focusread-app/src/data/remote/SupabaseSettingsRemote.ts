import type { UserSettings } from '../../domain/contract';
import type { RemoteSettings } from '../offline/SyncedSettingsRepository';
import { settingsRowToSettings, settingsToRow } from './mappers';
import type { FocusReadSupabaseClient } from './supabaseClient';
import { toAppError } from './supabaseErrors';

const COLUMNS =
  'theme, reader_font_scale, target_dose_minutes, voice_id, speech_rate, speech_pitch, haptics_enabled, quiz_enabled, ai_provider, ai_model, updated_at';

// La fila la crea un trigger al registrarse: aquí solo se lee y se actualiza (nunca insert).
// `updated_at` lo fija el trigger del servidor en cada update; se devuelve para usarlo como referencia.
export class SupabaseSettingsRemote implements RemoteSettings {
  constructor(private readonly client: FocusReadSupabaseClient) {}

  async get() {
    const { data, error } = await this.client.from('user_settings').select(COLUMNS).maybeSingle();
    if (error) throw toAppError(error);
    return data ? settingsRowToSettings(data as Record<string, unknown>) : null;
  }

  async put(settings: UserSettings): Promise<string> {
    const userId = (await this.client.auth.getUser()).data.user?.id;
    let query = this.client.from('user_settings').update(settingsToRow(settings));
    if (userId) query = query.eq('user_id', userId); // RLS ya limita a la fila propia; el filtro lo hace explícito
    const { data, error } = await query.select('updated_at').single();
    if (error) throw toAppError(error);
    return (data as { updated_at: string }).updated_at;
  }
}
