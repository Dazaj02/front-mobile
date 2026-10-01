import type { UserSettings } from '../../domain/contract';
import type { SettingsRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import type { LocalSettingsRepository } from '../local/settingsCache';

export interface RemoteSettings {
  get(): Promise<{ settings: UserSettings; updatedAt: string } | null>;
  // Devuelve la fecha con la que el servidor guardó el cambio (su trigger pone `updated_at = now()`).
  put(settings: UserSettings, localUpdatedAt: string): Promise<string | void>;
}

export interface SettingsSyncResult {
  direction: 'none' | 'pushed' | 'pulled' | 'offline';
}

// Los ajustes se guardan en local AL INSTANTE y se suben cuando hay conexión.
// Conflictos: gana la última escritura. Como el servidor fija `updated_at` con SU reloj, cada
// dispositivo recuerda la fecha remota de su última sincronización (`baseline`): solo si el remoto
// cambió DESPUÉS de esa referencia (otro dispositivo) se comparan las fechas; si no, los cambios
// locales se suben siempre. Así un reloj del teléfono atrasado no hace perder ediciones propias.
export class SyncedSettingsRepository implements SettingsRepository {
  constructor(
    private readonly local: LocalSettingsRepository,
    private readonly remote: RemoteSettings,
    private readonly isOnline: () => boolean,
  ) {}

  get(): Promise<UserSettings> {
    return this.local.get();
  }

  async update(partial: Partial<UserSettings>): Promise<UserSettings> {
    const next = await this.local.update(partial); // inmediato, funciona sin red
    await this.local.markDirty();
    void this.sync().catch((e) => logger.warn('No se pudieron subir los ajustes', e));
    return next;
  }

  async sync(): Promise<SettingsSyncResult> {
    if (!this.isOnline()) return { direction: 'offline' };
    const remote = await this.remote.get();
    const localAt = await this.local.getUpdatedAt();
    const dirty = await this.local.isDirty();

    if (!remote) {
      if (!localAt) return { direction: 'none' };
      await this.push(localAt);
      return { direction: 'pushed' };
    }

    const baseline = await this.local.getRemoteBaseline();
    const remoteTime = Date.parse(remote.updatedAt);
    const remoteChanged = remoteTime > (baseline ? Date.parse(baseline) : -Infinity);
    const localTime = localAt ? Date.parse(localAt) : -Infinity;

    if (!dirty) {
      if (!remoteChanged) return { direction: 'none' };
      await this.pull(remote);
      return { direction: 'pulled' };
    }
    // Hay cambios locales sin subir: solo ceden si otro dispositivo escribió después.
    if (remoteChanged && remoteTime > localTime) {
      await this.pull(remote);
      return { direction: 'pulled' };
    }
    await this.push(localAt as string);
    return { direction: 'pushed' };
  }

  private async push(localUpdatedAt: string): Promise<void> {
    const serverAt = await this.remote.put(await this.local.get(), localUpdatedAt);
    await this.local.setRemoteBaseline(serverAt ?? localUpdatedAt);
    await this.local.clearDirty();
  }

  private async pull(remote: { settings: UserSettings; updatedAt: string }): Promise<void> {
    await this.local.replace(remote.settings, remote.updatedAt);
    await this.local.setRemoteBaseline(remote.updatedAt);
    await this.local.clearDirty();
  }
}
