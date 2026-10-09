import fs from 'fs';
import path from 'path';

// Configuración de release (F9). La verificación definitiva de permisos es con el APK real (aapt),
// pero estas pruebas impiden que la configuración se degrade sin que nadie lo note.
const ROOT = path.join(__dirname, '..', '..');
const readJson = (f: string) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const readText = (f: string) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const app = readJson('app.json').expo;
const eas = readJson('eas.json');

describe('app.json', () => {
  it('identidad: nombre, paquete, esquema y versión inicial', () => {
    expect(app.name).toBe('FocusRead');
    expect(app.android.package).toBe('com.focusread.app');
    expect(app.scheme).toBe('focusread');
    expect(app.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(app.android.versionCode).toBeGreaterThanOrEqual(1);
  });

  it('allowBackup desactivado y solo Android', () => {
    expect(app.android.allowBackup).toBe(false);
    expect(app.ios).toBeUndefined();
    expect(app.web).toBeUndefined();
  });

  it('bloquea los permisos que la app no usa', () => {
    const blocked: string[] = app.android.blockedPermissions;
    for (const p of [
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'READ_MEDIA_IMAGES',
      'RECORD_AUDIO', // expo-audio lo añade por defecto; la app solo reproduce
      'MODIFY_AUDIO_SETTINGS',
      'SYSTEM_ALERT_WINDOW',
      'FOREGROUND_SERVICE',
      'DETECT_SCREEN_CAPTURE', // solo se usa usePreventScreenCapture, no la detección
      'POST_NOTIFICATIONS',
      'USE_BIOMETRIC', // expo-secure-store lo añade por defecto; la app no pide biometría
      'USE_FINGERPRINT',
    ]) {
      expect(blocked).toContain(`android.permission.${p}`);
    }
  });

  it('NO bloquea los permisos que sí hacen falta (red, estado de red, vibración)', () => {
    const blocked: string[] = app.android.blockedPermissions;
    for (const p of ['INTERNET', 'ACCESS_NETWORK_STATE', 'ACCESS_WIFI_STATE', 'VIBRATE']) {
      expect(blocked).not.toContain(`android.permission.${p}`);
    }
  });

  const plugin = (name: string) => {
    const found = app.plugins.find((p: unknown) => (Array.isArray(p) ? p[0] : p) === name);
    return Array.isArray(found) ? found[1] : undefined;
  };

  it('expo-audio no pide micrófono ni reproducción en segundo plano', () => {
    expect(plugin('expo-audio')).toMatchObject({ recordAudioAndroid: false, enableBackgroundPlayback: false, enableBackgroundRecording: false });
  });

  it('R8 (minificado), reducción de recursos y sin tráfico en texto plano', () => {
    expect(plugin('expo-build-properties').android).toMatchObject({
      enableProguardInReleaseBuilds: true,
      enableShrinkResourcesInReleaseBuilds: true,
      usesCleartextTraffic: false,
    });
  });
});

describe('eas.json', () => {
  it('tiene los 3 perfiles del plan: development (dev client), preview (APK), production (AAB)', () => {
    expect(eas.build.development.developmentClient).toBe(true);
    expect(eas.build.preview.android.buildType).toBe('apk');
    expect(eas.build.preview.distribution).toBe('internal');
    expect(eas.build.production.android.buildType).toBe('app-bundle');
    expect(eas.build.production.autoIncrement).toBe(true);
  });

  it.each(['development', 'preview', 'production'])('%s: modo live y API por HTTPS', (profile) => {
    const env = eas.build[profile].env;
    expect(env.EXPO_PUBLIC_DATA_MODE).toBe('live');
    expect(env.EXPO_PUBLIC_API_URL).toMatch(/^https:\/\//);
  });

  it('no contiene secretos ni claves (la URL y la anon key de Supabase van como variables de EAS)', () => {
    const text = readText('eas.json');
    expect(text).not.toMatch(/service_role|sb_secret|sb_publishable|eyJ[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|supabase\.co/i);
  });
});

describe('higiene de archivos de entorno', () => {
  it('.env.example solo trae plantillas: sin URL ni claves reales', () => {
    const text = readText('.env.example');
    expect(text).not.toMatch(/supabase\.co|sb_publishable|sb_secret|eyJ[A-Za-z0-9_-]{20,}|sk-[A-Za-z0-9]{20,}|onrender\.com/i);
    for (const line of text.split(/\r?\n/)) {
      const m = /^(EXPO_PUBLIC_(?:API_URL|SUPABASE_URL|SUPABASE_ANON_KEY))=(.*)$/.exec(line);
      if (m) expect(m[2].trim()).toBe('');
    }
  });

  it('.env no se versiona (.gitignore)', () => {
    const ignore = readText('.gitignore');
    expect(ignore).toMatch(/^\.env$/m);
    expect(ignore).toMatch(/^!\.env\.example$/m);
  });
});

describe('babel (producción)', () => {
  it('elimina console.* solo en producción', () => {
    const babel = readText('babel.config.js');
    expect(babel).toMatch(/production:\s*\{[\s\S]*transform-remove-console/);
  });
});

describe('scripts de EAS', () => {
  it('eas-set-env.ps1 solo sube variables públicas y rechaza una service_role', () => {
    const script = readText('scripts/eas-set-env.ps1');
    expect(script).toContain('EXPO_PUBLIC_SUPABASE_URL');
    expect(script).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY');
    expect(script).toMatch(/service_role/);
    expect(script).toContain('--visibility plaintext');
  });
});
