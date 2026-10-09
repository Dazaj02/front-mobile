# F9 — Construir y probar el APK (guía para David)

Todo lo que se puede preparar sin tu cuenta de Expo ya está hecho. Lo que sigue necesita tu sesión de EAS y tu teléfono.

## 1. Construir el APK (una sola vez, ≈15–25 min la primera vez)
En una terminal, dentro de `focusread-app` (si usas Claude Code, antepón `!` a cada comando):
```
npx eas-cli login                                    # tu cuenta de Expo (https://expo.dev)
npx eas-cli init                                     # crea el proyecto y escribe su id en app.json (queda en git)
powershell -ExecutionPolicy Bypass -File scripts/eas-set-env.ps1   # sube URL y anon key de Supabase (públicas) desde tu .env
npx eas-cli build --platform android --profile preview             # APK
```
- Al terminar, EAS te da un enlace/QR para descargar el `.apk` e instalarlo en tu teléfono
  (permite "instalar apps de fuentes desconocidas" para el navegador).
- El perfil `preview` usa **modo live** contra `https://focusread-api.onrender.com` (HTTPS) y es el que se prueba.
- Antes de compilar: pausa la sincronización de OneDrive (P4).
- Android pedirá confirmar la firma: deja que EAS genere el keystore (se guarda en tu cuenta de Expo).

## 2. Revisar el APK (permisos, backup, texto plano)
Descarga el `.apk` a tu PC y ejecuta (no requiere el Android SDK):
```
node scripts/apk-check.cjs C:\ruta\al\app.apk
```
Debe terminar en `OK`. Esperado (solo estos 4 permisos): `INTERNET`, `ACCESS_NETWORK_STATE`, `ACCESS_WIFI_STATE`, `VIBRATE`;
`allowBackup=false`; no debuggable; sin tráfico en texto plano. Si aparece algún permiso extra, dímelo y lo bloqueo.
(El script aún no se ha probado con un APK real; si falla al leerlo, el mismo dato se ve en el teléfono:
Ajustes › Aplicaciones › FocusRead › Permisos — debe decir "ningún permiso solicitado" salvo los normales.)

## 3. Justificación de permisos
| Permiso | Para qué | Quién lo trae |
|---|---|---|
| `INTERNET` | Hablar con la API y Supabase | núcleo / expo-file-system |
| `ACCESS_NETWORK_STATE` | Detectar sin conexión (banner, sincronización) | @react-native-community/netinfo |
| `ACCESS_WIFI_STATE` | Lo declara NetInfo (su código consulta el wifi) | @react-native-community/netinfo |
| `VIBRATE` | Respuesta háptica (se puede apagar en Ajustes) | expo-haptics |

**Bloqueados** (`android.blockedPermissions`): almacenamiento y medios (READ/WRITE_EXTERNAL_STORAGE, READ_MEDIA_*; la app usa
solo su carpeta privada), `RECORD_AUDIO` (expo-audio lo añade por defecto; la app solo reproduce), `MODIFY_AUDIO_SETTINGS`,
`SYSTEM_ALERT_WINDOW`, `FOREGROUND_SERVICE*`, `DETECT_SCREEN_CAPTURE` (solo se *impide* capturar la pantalla de la key),
`POST_NOTIFICATIONS`, `WAKE_LOCK`, `USE_BIOMETRIC`/`USE_FINGERPRINT` (los añade expo-secure-store; la app no usa biometría).
El permiso `<paquete>.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION` lo declara AndroidX para el propio paquete (nivel firma); el verificador lo acepta. Si algo del audio dejara de funcionar tras compilar, el candidato es `MODIFY_AUDIO_SETTINGS`.

## 4. Lo que ya está verificado en el bundle de producción (exportado con `expo export`)
- El **catálogo de componentes (DEV) no está en el bundle de release** (se encontró dentro y se corrigió con un `require` bajo
  `__DEV__`; antes/después: 4,60 MB → 4,57 MB).
- No hay `service_role`, ni `api.deepseek.com`, ni claves `sk-…` en el bundle.
- `console.*` se elimina en producción (babel) y el `logger` no imprime nada en release.
- Con `__DEV__ = false`: sin botón de modo demo ni de "simular enlace" (pruebas automáticas).
- API solo por HTTPS en release (la app falla al iniciar con un mensaje claro si no lo es).
- R8 + reducción de recursos activados y `usesCleartextTraffic=false` (verificado en la configuración).

## 5. Smoke test en tu teléfono (el APK real)
1. Instalar y abrir. Nombre "FocusRead".
2. Toda la checklist de `docs/F8_PRUEBA_LIVE.md` **sobre el APK** (registro → correo → enlace `focusread://…`, login, recuperar contraseña,
   importar texto y URL, BYOK válida e inválida, cuota, sin conexión, eliminar cuenta, dos cuentas).
   En el APK el deep link usa el esquema real `focusread://` (en Expo Go era `exp://`): añádelo en Supabase › Redirect URLs.
3. **TalkBack** (Ajustes › Accesibilidad) en todas las pantallas: Bienvenida, Login, Registro, Verifica tu correo, Recuperar,
   Biblioteca, Lector (quiz incluido), Importar, Progreso (gráfico), Ajustes, Motor de IA, Cuenta. Cada control debe leerse con nombre,
   rol y estado, y el orden de foco debe ser lógico.
4. **Matriz responsive** (con el teléfono; el resto necesita emulador o tablet): fuente del sistema al 100 %, 130 % y 200 %
   (Ajustes › Pantalla), vertical y horizontal. Comprueba: sin textos cortados ni solapados, la barra de pestañas y el minireproductor
   no quedan bajo la barra de gestos, el lector no pasa de 640 dp de ancho. Envíame capturas o dime qué ves.
5. Modo avión: banner "Sin conexión", leer un artículo ya abierto, completar una dosis y reconectar (la sesión se sincroniza).
6. Matar la app y reabrir: la sesión y los ajustes se conservan.
7. Imprimir/capturar pantalla en **Ajustes › Motor de IA**: debe estar bloqueado.

## 6. Pendientes de identidad (no bloquean la prueba)
- **Nombre final:** hoy "FocusRead" (`app.json › name`). Cámbialo si quieres otro.
- **Ícono final:** hoy son los iconos de plantilla de Expo (`assets/icon.png`, `android-icon-*.png`, fondo `#E6F4FE`). Pásame los
  PNG definitivos (icono 1024×1024, adaptativo foreground/background 1024×1024, monocromo) y los sustituyo.
- **Versión:** `1.0.0` / `versionCode 1`. EAS incrementa `versionCode` solo en el perfil `production`.
