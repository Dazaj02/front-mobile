import { UserSettingsSchema, type UserSettings } from '../../domain/contract';
import { DEFAULT_SETTINGS } from '../../domain/defaults';
import type { SettingsRepository } from '../../domain/ports';
import type { SqlDb } from './db';

// Ajustes en la tabla `settings` de SQLite (fila única). `updated_at` permite
// resolver conflictos por última escritura al sincronizar (F7).
export class LocalSettingsRepository implements SettingsRepository {
  constructor(
    private readonly getDb: () => Promise<SqlDb>,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async get(): Promise<UserSettings> {
    return (await this.read()).settings;
  }

  async getUpdatedAt(): Promise<string | null> {
    return (await this.read()).updatedAt;
  }

  async update(partial: Partial<UserSettings>): Promise<UserSettings> {
    const next = UserSettingsSchema.parse({ ...(await this.get()), ...partial });
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO settings (id, data, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [JSON.stringify(next), this.now().toISOString()],
    );
    return next;
  }

  // Sobrescribe con lo recibido del remoto conservando SU fecha (gana la última escritura).
  async replace(settings: UserSettings, updatedAt: string): Promise<void> {
    const valid = UserSettingsSchema.parse(settings);
    const db = await this.getDb();
    await db.runAsync(
      `INSERT INTO settings (id, data, updated_at) VALUES (1, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at`,
      [JSON.stringify(valid), updatedAt],
    );
  }

  // "Sucio" = hay cambios locales aún no subidos al remoto.
  async markDirty(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("INSERT OR REPLACE INTO meta (key, value) VALUES ('settings_dirty', '1')");
  }

  async clearDirty(): Promise<void> {
    const db = await this.getDb();
    await db.runAsync("DELETE FROM meta WHERE key = 'settings_dirty'");
  }

  async isDirty(): Promise<boolean> {
    const db = await this.getDb();
    return (await db.getFirstAsync("SELECT 1 AS d FROM meta WHERE key = 'settings_dirty'")) !== null;
  }

  private async read(): Promise<{ settings: UserSettings; updatedAt: string | null }> {
    const db = await this.getDb();
    const row = await db.getFirstAsync<{ data: string; updated_at: string }>('SELECT data, updated_at FROM settings WHERE id = 1');
    if (!row) return { settings: { ...DEFAULT_SETTINGS }, updatedAt: null };
    try {
      const parsed = UserSettingsSchema.safeParse({ ...DEFAULT_SETTINGS, ...JSON.parse(row.data) });
      if (parsed.success) return { settings: parsed.data, updatedAt: row.updated_at };
    } catch {
      // datos corruptos: se vuelve a los valores por defecto
    }
    return { settings: { ...DEFAULT_SETTINGS }, updatedAt: null };
  }
}
