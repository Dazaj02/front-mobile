// Revisa un APK ya construido (sin necesitar el Android SDK): permisos, allowBackup, tráfico en
// texto plano y debuggable. Uso:  node scripts/apk-check.cjs ruta\al\app.apk
// Falla (exit 1) si hay algo fuera de lo esperado para release.
const AppInfoParser = require('app-info-parser');

const ALLOWED = new Set([
  'android.permission.INTERNET',
  'android.permission.ACCESS_NETWORK_STATE',
  'android.permission.ACCESS_WIFI_STATE',
  'android.permission.VIBRATE',
]);

const FORBIDDEN_HINTS = ['STORAGE', 'MEDIA', 'RECORD_AUDIO', 'MODIFY_AUDIO', 'SYSTEM_ALERT', 'FOREGROUND_SERVICE', 'SCREEN_CAPTURE', 'NOTIFICATIONS', 'CAMERA', 'LOCATION', 'CONTACTS'];

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Uso: node scripts/apk-check.cjs <archivo.apk>');
    process.exit(2);
  }
  const info = await new AppInfoParser(file).parse();
  const manifest = info.manifest ?? info;
  const permissions = (info.usesPermissions ?? manifest.usesPermissions ?? []).map((p) => (typeof p === 'string' ? p : p.name));
  const app = Array.isArray(manifest.application) ? manifest.application[0] : manifest.application ?? {};

  console.log(`Paquete:     ${info.package ?? manifest.package}`);
  console.log(`Versión:     ${info.versionName} (versionCode ${info.versionCode})`);
  console.log(`Permisos (${permissions.length}):`);
  permissions.forEach((p) => console.log(`  - ${p}${ALLOWED.has(p) ? '' : '   <-- NO esperado'}`));
  console.log(`allowBackup: ${app.allowBackup}`);
  console.log(`debuggable:  ${app.debuggable}`);
  console.log(`cleartext:   ${app.usesCleartextTraffic}`);

  const problems = [];
  for (const p of permissions) if (!ALLOWED.has(p)) problems.push(`permiso inesperado: ${p}`);
  for (const p of permissions) if (FORBIDDEN_HINTS.some((h) => p.includes(h))) problems.push(`permiso sensible: ${p}`);
  if (app.allowBackup !== false) problems.push('allowBackup debería ser false');
  if (app.debuggable === true) problems.push('la app es debuggable (no es un build de release)');
  if (app.usesCleartextTraffic === true) problems.push('permite tráfico en texto plano');

  if (problems.length > 0) {
    console.error('\nPROBLEMAS:\n' + [...new Set(problems)].map((p) => ` - ${p}`).join('\n'));
    process.exit(1);
  }
  console.log('\nOK: permisos mínimos, sin backup, sin texto plano, no debuggable.');
}

main().catch((e) => {
  console.error('No se pudo leer el APK:', e.message);
  process.exit(2);
});
