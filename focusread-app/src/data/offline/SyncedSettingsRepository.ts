import type { UserSettings } from '../../domain/contract';
import type { SettingsRepository } from '../../domain/ports';
import { logger } from '../../lib/logger';
import type { LocalSettingsRepository } from '../local/settingsCache';

export interface RemoteSettings {
  get(): Promise<{ settings: UserSettings; updatedAt: string } | null>;
  put(settings: UserSettings, updatedAt: string): Promise<void>;
}

export interface SettingsSyncResult {
  direction: 'none' | 'pushed' | 'pulled' | 'offline';
}

// Los ajustes se guardan en local AL INSTANTE y se suben cuando hay conexión.
// Conflictos: gana la última escritura (por `updatedAt`).
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

  // Reconcilia con el remoto: sube lo local si es más nuevo o pendiente; baja lo remoto si es más nuevo.
  async sync(): Promise<SettingsSyncResult> {
    if (!this.isOnline()) return { direction: 'offline' };
    const remote = await this.remote.get();
    const localUpdatedAt = await this.local.getUpdatedAt();
    const dirty = await this.local.isDirty();

    if (!remote) {
      if (!localUpdatedAt) return { direction: 'none' };
      await this.remote.put(await this.local.get(), localUpdatedAt);
      await this.local.clearDirty();
      return { direction: 'pushed' };
    }

    const remoteTime = Date.parse(remote.updatedAt);
    const localTime = localUpdatedAt ? Date.parse(localUpdatedAt) : -Infinity;

    if (remoteTime > localTime) {
      await this.local.replace(remote.settings, remote.updatedAt);
      await this.local.clearDirty();
      return { direction: 'pulled' };
    }
    if (localTime > remoteTime || dirty) {
      await this.remote.put(await this.local.get(), localUpdatedAt as string);
      await this.local.clearDirty();
      return { direction: 'pushed' };
    }
    return { direction: 'none' };
  }
}
