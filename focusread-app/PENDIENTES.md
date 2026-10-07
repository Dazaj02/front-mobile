# FocusRead AI — Desviaciones y pendientes (frontend)

> Registro vivo del agente frontend. Se recuerda al inicio de cada fase. Última actualización: F2 cerrada / F3 en curso.

## 1. Desviaciones del plan

| # | Fase | Desviación | Estado |
|---|---|---|---|
| D1 | F0 | `orientation: "default"` (el plan no lo pedía; F3 exige horizontal) | Aceptada |
| D2 | F0 | `tsconfig` con `"types": ["jest"]` (TS 6 ya no incluye `@types/*`) | Aceptada |
| D3 | F0 | `babel-preset-expo` instalado explícito (lo necesita el `babel.config.js` propio) | Aceptada |
| D4 | F0 | `!.env.example` en `.gitignore` (`.env.*` lo ignoraba) | Resuelta |
| D5 | F0 | Bug en `eslint.config.js` (formato de `group`), descubierto en F1 | Resuelta |
| D6 | F0 | `docs/plan/` y `CLAUDE.md` raíz no existen; el plan está en `Front/PLAN_FRONTEND.md` | Informativa |
| D7 | F1 | `src/legacy/useLegacyColors.ts`: puente para que las pantallas viejas usen tokens nuevos | **Resuelta en F5** (borrado) |
| D8 | F1 | `contract.ts`, `defaults.ts` y `SettingsRepository` adelantados desde F4 | Aceptada (F4 completa `ports.ts`) |
| D9 | F1 | Ajustes persistidos en AsyncStorage (`settingsCache.ts`) | **Resuelta en F4** (SQLite) |
| D10 | F1 | `settingsStore` no revertía si fallaba el guardado | Resuelta en F2 |
| D11 | F2 | Estado "presionado" del catálogo solo se ve tocando el control | Aceptada |
| D12 | F2 | `DevCatalogHost` (botón flotante DEV) es transitorio | **Resuelta en F5** (ahora es la ruta `DevCatalog`, Ajustes › Catálogo, solo `__DEV__`) |
| D13 | F2 | `TextInputBase` con `insetLeft/insetRight` para iconos superpuestos | Aceptada |
| D14 | F2 | `Banner`: solo el mensaje es `alert`, no todo el contenedor | Aceptada |
| D15 | F2 | `testTimeout` global de 30 s (primer render en frío) | Aceptada |
| D16 | F3 | Revisión de desviaciones: fallback si fallan las fuentes (`fontError`), quitar `radiogroup` de `FilterChipGroup` (hijos eran `button`), pares de contraste de fondos presionados | Resuelta |

| D17 | F3 | Los organismos son presentacionales y definen sus propios tipos de props (la regla §5.2 les prohíbe importar `domain`); `features/` mapea el dominio a props | Aceptada |
| D18 | F3 | `QuizSheet`/`ImportSheet`/`ProviderKeyForm` son contenido; el contenedor modal (scrim, botón atrás, insets) es `SheetTemplate` | Aceptada |
| D19 | F3 | `DailyProgressCard`: el contrato no define meta diaria, así que la barra solo aparece si se pasa `goalMinutes` | Pendiente → decidir en F6 si se elimina o se añade ajuste (cambio de contrato = reportar) |
| D20 | F3 | Filas presionadas usan `bg.sunken` (no `accent.subtle`): el test de contraste mostró que `text.muted` no cumple 4.5:1 sobre `accent.subtle` en paper/dark | Resuelta |
| D21 | F3 | `TextInputBase.minLines` para multilínea (ImportSheet) | Aceptada |
| D22 | F3 | Scrim de `SheetTemplate` oculto a TalkBack (`accessibilityViewIsModal`); el cierre accesible es el botón "Cerrar" | Aceptada |
| D23 | F3 | `contract.ts` verificado contra el plan: 0 diferencias (A16) | Resuelta |

| D24 | F4 | **No se eliminaron `storageService.ts` ni `mockArticles.ts`** (el plan pide borrarlos en F4): las pantallas viejas dependen de ellos y de su modelo `Article`. Sí se eliminó `deepSeekService.ts`, el campo `deepSeekApiKey` y su UI; `StorageService.getSettings` borra la key en claro de instalaciones previas | **Resuelta en F5**: se borraron `storageService`, `mockArticles`, `types`, `audioService` y todas las pantallas viejas |
| D25 | F4 | Tabla extra `reading_sessions` (sesiones locales). El plan solo listaba la outbox, pero en modo mock las sesiones necesitan fuente de verdad local y en live serán caché | Aceptada |
| D26 | F4 | Importar en la app vieja pasa por `src/legacy/legacyImport.ts` (fragmentador local, solo texto) | **Resuelta en F5** (borrado; el importador real llega en F6) |
| D27 | F4 | Puertos con `AuthSession {userId,email}`, `AuthCallbackResult` y `ArticleFilter` definidos por mí (el plan solo daba los nombres de métodos). `LocalArticleRepository.save()` existe fuera del puerto (la app nunca inserta artículos; lo usan el mock y la caché) | Aceptada |
| D28 | F4 | `AppError` con códigos de cliente extra: `NETWORK_ERROR`, `CLIENT_TIMEOUT`, `INVALID_RESPONSE`, `INVALID_CREDENTIALS`, `EMAIL_NOT_CONFIRMED`, `NOT_AVAILABLE_OFFLINE`. No tocan el contrato: no viajan por la API | Aceptada |
| D29 | F4 | Chunker: un párrafo de 1.3–1.5 × objetivo se trata como unidad atómica y puede superar 1.3 × (el plan solo exime a "oración única"). Con > 20 dosis sugiere la menor duración mayor que sí cabe | **Resuelta:** el agente backend confirmó (ejecutándolo) las mismas reglas: párrafo de 1.3×–1.5× atómico, fusión final < 0.4× aunque pase de 1.3×, `estMinutes = max(0.1, round(w/180,1))`. Sus ejemplos están como tests en `chunker.test.ts` |
| D30 | F4 | Racha: si hoy aún no hay sesión completada, cuenta desde ayer (no se rompe hasta pasar un día entero sin leer) | Aceptada (decisión de producto) |
| D31 | F4 | `sql.js` como devDependency para probar SQLite/migraciones en Jest; `jest.setup.js` fija `TZ=America/Mexico_City` | Aceptada |
| D32 | F4 | Los timeouts/reintentos de 401 (refresh) no están en `httpClient`: se añaden en F8 | Pendiente F8 |

| D33 | F5 | **Se eliminó toda la app vieja** (Home, MyDoses, Progress, Settings, ZenReader, Login, audioService). Entre F5 y F6 las pantallas son esqueletos: no hay biblioteca real, lector, importar ni progreso hasta F6 | Aceptada (el plan reescribe estas pantallas en F6) |
| D34 | F5 | Puerto `AuthRepository.resendVerification(email)` añadido (el plan no lo listaba; hace falta para el reenvío de 60 s). F8 lo implementa con `supabase.auth.resend` | Aceptada |
| D35 | F5 | Pestañas: `lazy` + `FocusedOnly` (desmonta la pestaña al perder el foco) para cumplir "solo se monta la pestaña visible" | Aceptada |
| D36 | F5 | Los esqueletos de Ajustes incluyen Apariencia (tema y tamaño), cerrar sesión y, en `__DEV__`, el catálogo. El resto de Ajustes llega en F6 | Aceptada |
| D37 | F5 | Cerrar sesión solo llama a `auth.signOut()`; el `flush` de la outbox y la limpieza de caché/keys son de F7 | Pendiente F7 |
| D38 | F5 | En Expo Go el scheme `focusread://` no existe (usa `exp://…/--/`). Las pruebas de deep link en desarrollo usan los botones "Simular enlace" (solo `__DEV__`); el scheme real se prueba en el APK (F9) | Pendiente F9 |
| D39 | F5 | `jest.setup.js` ahora simula `BackHandler` (con `mockPressBack`), `expo-linking` y gesture-handler | Aceptada |
| D40 | F5 | `DailyProgressCard`, `ArticleCard`, etc. aún no se usan en pantallas reales (F6) | Informativa |

| D41 | F6 | **Se cierra D19 por defecto:** sin meta diaria (el contrato no la tiene). Progreso muestra lo leído hoy, sin barra de meta. Si David quiere una meta, hay que pedir un cambio de contrato (`UserSettings.dailyGoalMinutes`) | Resuelta por defecto (David puede vetar) |
| D42 | F6 | En modo mock, la Biblioteca vacía ofrece "Cargar artículos de ejemplo" (3 textos originales con quiz). No está en el plan: sin ello no se puede probar el lector sin pegar 300+ caracteres. Los textos demo se ampliaron para que den ≥ 2 dosis a 2.5 min | Aceptada |
| D43 | F6 | Teclado (P11): `KeyboardAvoidingView behavior="padding"` en Android + scroll al final al abrirse el teclado (`useScrollToEndOnKeyboard`). `ImportSheet` ya no tiene su propio KAV (lo tiene `SheetTemplate`; dos se sumaban) y `ProviderKeyForm` no anida un ScrollView | Resuelta (verificar en teléfono) |
| D44 | F6 | Dependencia nueva `@react-native-community/slider` para los deslizadores de velocidad y tono | Aceptada |
| D45 | F6 | El mock lista los 6 proveedores para poder probar la pantalla Motor de IA; los que requieren key fallan con `PROVIDER_UNAVAILABLE` al importar (solo funcionan con el servidor) | Aceptada |
| D46 | F6 | Android no puede pausar el TTS a mitad: "pausar" detiene y "reanudar" lee la dosis desde el inicio. El minireproductor (`AudioMiniDock`) vive en `AppTabs` y la lectura continúa al salir del lector | Aceptada |
| D47 | F6 | Decisiones de sesión de lectura no escritas en el plan: al salir de una dosis con ≥ 5 s activos se guarda una sesión parcial (`completed: false`); la barra de progreso de la dosis = tiempo activo / `estMinutes`; `includeQuiz` siempre `true` al importar (el ajuste de quiz solo decide si se muestra) | Aceptada |
| D48 | F6 | `recordReadingSession` centraliza el guardado de sesiones para que F7 lo cambie a "outbox + flush" sin tocar pantallas | Pendiente F7 |
| D49 | F6 | `clearUserData()` ya existe (SQLite + keys) y lo usa Eliminar cuenta. **Cerrar sesión NO lo usa:** en modo mock no hay servidor, así que borrar al cerrar sesión destruiría el progreso | **Decisión de David para F7** (ver P15) |
| D50 | F6 | Existe `.env` en `focusread-app/` (creado por David, ignorado por git, `EXPO_PUBLIC_DATA_MODE=mock`, con URL y anon key de Supabase para F8). No se leyeron ni se usan sus valores aún | Informativa |

| D51 | F7 | **P15 resuelto (decisión de David):** en modo mock cerrar sesión CONSERVA los datos. En live: se envía la outbox (`flush` sin backoff); si quedan sesiones pendientes se advierte con una alerta; después se limpian caché SQLite, outbox y keys BYOK | Resuelta |
| D52 | F7 | Las acciones "requieren conexión" (favorito, importar, probar key, eliminar cuenta) solo se bloquean en **modo live** (`useNetworkGate`). En mock todo es local y funciona sin red; el banner "Sin conexión" sí aparece en ambos modos | Aceptada |
| D53 | F7 | "Borrar artículo" no tiene UI en el plan; `CachedArticleRepository.remove` ya exige conexión y está probado | Informativa |
| D54 | F7 | Al no existir aún el remoto (Supabase = F8), `composeOffline()` recibe los adaptadores remotos; en pruebas se usa `FakeRemote` (red caída, fallos temporales y reenvío de duplicados). El contenedor live (`sync`, `settingsSync`) se cablea en F8 | Pendiente F8 |
| D55 | F7 | El banner "Sin conexión" vive en `features/shared/AppScreen` (que envuelve a `ScreenTemplate`) y no dentro del template, porque la regla §5.2 prohíbe que los templates importen servicios | Aceptada |
| D56 | F7 | `useSyncTriggers` agenda además un reintento temporizado con el backoff de la outbox (el plan solo pedía disparadores de primer plano, reconexión y dosis completada) | Aceptada |
| D57 | F7 | Falta la **prueba manual en modo avión** (plan F7): David debe verificarla | Pendiente David |

| D58 | F7+ | **Voces en la nube (opción 3), temporal.** Implementado en el frontend y desactivado hasta que exista el backend: `ttsProposal.ts`, `HttpTtsGateway`, `cloud.ts`, `expoAudioPlayer.ts`, enrutador `speakAny` con caída automática a la voz del sistema, sección en Ajustes › Voz. Deps nuevas: `expo-audio`, `expo-file-system`. Propuesta completa en `docs/PROPUESTA_TTS_NUBE.md` | Aceptada (temporal) |
| D59 | F7+ | **Solicitud de cambio de contrato NO aplicada:** endpoints `GET /v1/tts/voices` y `POST /v1/tts`. El contrato está congelado: hay que llevar la propuesta al agente backend (y que la apruebe David). Se evitó tocar `UserSettings` usando el prefijo `cloud:` en `voiceId` | **Pendiente: David → agente backend** |
| D60 | F7+ | `container.tts` y `enableCloudTts()` los debe cablear F8 (contenedor live) | Pendiente F8 |

| D61 | F8 | **Conflictos de ajustes rediseñados.** El trigger de Supabase pone `updated_at = now()` (reloj del servidor) en cada update, así que comparar con la hora del teléfono podía hacer perder ediciones (reloj atrasado). Ahora cada dispositivo guarda la fecha remota de su última sincronización (`settings_remote_at`); solo si el remoto cambió después se compara con la edición local. Probado, incluido reloj desfasado | Aceptada |
| D62 | F8 | `SyncService` **descarta** las sesiones que el servidor rechaza de forma permanente (`VALIDATION_ERROR`: check, FK o RLS) en vez de reintentar para siempre (el plan decía "solo se borra si OK"). Queda registrado en el log y en `FlushResult.dropped`. Un 401 detiene el envío sin descartar nada | Aceptada |
| D63 | F8 | El lector limita `activeSeconds` a `(endedAt − startedAt)`: la base exige `active_seconds ≤ duración + 5 s` y una violación bloquearía la sesión | Aceptada |
| D64 | F8 | Recuperación de contraseña con Supabase: canjear el código crea una sesión; `SupabaseAuthRepository` la oculta (`recovering`) hasta cambiar la contraseña para que la app no salte la pantalla de nueva contraseña; después cierra la sesión y vuelve al login | Aceptada |
| D65 | F8 | Aislamiento entre usuarios: al cerrar sesión se vacía la caché de React Query, `clearLocalData` también borra el estado de sincronización (`meta`), y al iniciar sesión se recargan los ajustes | Aceptada |
| D66 | F8 | `AppBootstrap` muestra los errores de configuración (variables del modo live ausentes, API no HTTPS en release) en vez de un spinner infinito, y despierta el servidor con `GET /health` al abrir (Render gratis duerme) | Aceptada |
| D67 | F8 | `EXPO_PUBLIC_CLOUD_TTS=1` activa las voces en la nube; apagado por defecto porque el backend aún no tiene `/v1/tts` | Aceptada |
| D68 | F8 | **Falta la verificación manual extremo a extremo** (registro, correo, deep link, recuperación, importar texto y URL, BYOK válida e inválida, cuota, offline, eliminar cuenta, aislamiento con 2 cuentas). Guía en `docs/F8_PRUEBA_LIVE.md`. Requiere backend en live (o Render), `.env` en `live` y las Redirect URLs en el panel de Supabase | **Pendiente David** |
| D69 | F8 | Del backend (`NOTAS_BACKEND.md`): **C1** (warning `CONTENT_TRUNCATED` para artículos largos por URL) es un cambio de contrato pendiente de decisión de David; **P13** (la service_role se pegó una vez en un archivo versionado de `back-mobile`, no llegó al historial): se recomienda rotarla | **Decisión/acción de David** |
| D70 | F8 | **TTS en la nube, respuesta del backend:** viable con Azure Neural (nomenclatura `es-MX-JorgeNeural`, género nativo, SSML, MP3). Requiere decidir proveedor y presupuesto (free tier F0: 0,5 M caracteres/mes ≈ 160 dosis/mes en total: poco para varios usuarios), una cuota por caracteres en la base de datos (`consume_tts_quota`, pedir al agente de BD) y un límite propio para `/v1/tts` (el actual de 10/min se queda corto con prefetch). Mientras no se apruebe, el frontend usa la voz del sistema | **Decisión de David** |

| D71 | F9 | **Hallazgo al exportar el bundle de producción:** el código del catálogo DEV estaba dentro del bundle de release (el `import` estático lo arrastraba aunque la ruta estuviera bajo `__DEV__`). Corregido con un `require` condicional (`DevCatalogRoute`); verificado: sus textos ya no aparecen en el `.hbc` | Resuelta |
| D72 | F9 | Permisos bloqueados vía `blockedPermissions`; `expo-audio` configurado sin micrófono ni segundo plano. Se conserva `ACCESS_WIFI_STATE` porque NetInfo lo declara y su código consulta el wifi (riesgo de excepción si faltara). `MODIFY_AUDIO_SETTINGS` bloqueado: si el audio fallara en el APK es el primer sospechoso | Verificar con el APK |
| D73 | F9 | `app.json` se completó sin ejecutar `expo prebuild` (falla en este entorno: no encuentra `MainApplication`); la verificación definitiva del manifiesto es sobre el APK real con `scripts/apk-check.cjs` (nuevo, sin probar aún con un APK) | Pendiente APK |
| D74 | F9 | `.env.example` tenía una clave `sb_publishable_…` en el campo de la URL y luego una URL real de Supabase (cambios hechos fuera de mis commits; la clave ya estaba en el historial de GitHub). Se restauró a plantilla vacía y hay un test que lo vigila. Las claves publishable/anon son públicas por diseño, pero conviene no versionarlas | **David: confirmar; opcional rotar la publishable key** |
| D75 | F9 | `eas.json` define `development`/`preview`/`production`; la URL y anon key de Supabase NO van en git: se suben a EAS con `scripts/eas-set-env.ps1`. API en HTTPS (`https://focusread-api.onrender.com`) | Hecho |
| D76 | F9 | El APK `preview` y el smoke test requieren tu cuenta de EAS y tu teléfono (guía `docs/F9_APK.md`). Nombre "FocusRead" provisional; íconos aún los de plantilla de Expo | **Pendiente David** |

| D77 | Diseño | **Se vuelve al diseño visual de `main` por indicación del profesor** (el diseño con tokens del plan §6: acento azul `#1D4ED8`, tipografía Inter + Newsreader, tarjetas con borde y el resto de componentes de F2/F3). Se hizo con `git revert` del commit editorial `26dd6b9`, que era puramente visual (tokens, tipografía, variantes de componentes y estilos de pantallas): **todo lo funcional de F8 y F9 se conserva**. El rediseño editorial no se pierde: sigue en la rama local `rediseno-editorial` y en el historial de `rediseno` | Hecho |
| D78 | Diseño | Con la reversión, el desvío del plan §6 (tipografía) desaparece: vuelven Inter + Newsreader y los tokens del plan; los tests de contraste y de componentes son los de F2/F3 | Resuelta |
| D79 | Diseño | Tema papel adaptado a la paleta del prototipo original (surface #FBF8FF, on-surface #1A1B22, on-surface-variant #434655, outline-variant #C4C5D7, surface-container #EEEDF7, primary-container #1D4ED8 como azul primario, primary #0037B0 al presionar, primary-fixed #DCE1FF, error #BA1A1A). El texto atenuado queda en #5E6070 (el outline original #747686 no pasa 4.5:1 como texto; se usa solo en bordes). Contraste y 135 tests de design-system en verde | Resuelta; pendiente que David valide visualmente |
| D80 | Diseño/Datos | Botón Importar azul relleno (pastilla con texto) en la cabecera de Biblioteca; fila de filtros por categoría; selector de categoría al importar. El servidor solo permite actualizar `bookmarked` en `articles` y el contrato está congelado, así que la categoría elegida se guarda solo en el dispositivo (AsyncStorage `focusread.categories.v1`) y prevalece sobre la del servidor. No se sincroniza entre dispositivos | Abierta: si se quiere sincronizar, el agente de BD/API debe añadir `category` a la petición o conceder el UPDATE |
| D81 | Funcionalidad | Eliminar artículo (con todas sus dosis) desde la tarjeta de Biblioteca, con confirmación. En live requiere conexión (usa el puerto `remove` ya existente; sin cambios de contrato). La categoría local del artículo borrado queda huérfana en AsyncStorage (inocua) | Resuelta |
| D82 | Marca | Logo hecho con Claude Design integrado: icono de la app y adaptativo (fondo `#FBF8FF`), favicon y marca (`assets/brand/`, variantes claro/oscuro/monocromo y horizontal) usada en la pantalla de bienvenida. Parte de P5 (ícono) queda resuelta; sigue pendiente confirmar el nombre final de la app | Resuelta; falta verlo en el teléfono/APK |

## 2. Pendientes por resolver

| # | Tema | Cuándo | Necesita |
|---|---|---|---|
| P1 | `expo lint`: errores de las pantallas viejas | ~~F5/F6~~ **Resuelto en F5**: lint en 0 problemas | — |
| P2 | `npm audit`: 11 vulnerabilidades moderadas transitivas | Revisar en F9 | — |
| P3 | Git: `main` va por delante de `origin`; el plan pide rama `rediseno` y push al cerrar cada fase | Ahora | **Decisión de David** |
| P4 | El proyecto vive en OneDrive: riesgo de corrupción de `.git` y rutas largas | Ahora | **David**: `LongPathsEnabled=1`, `git config --global core.longpaths true`, pausar OneDrive en `npm install`/builds |
| P5 | Nombre final de la app, ícono adaptativo (fondo `#E6F4FE` del template) y `version`/`versionCode` | F9 | Nombre/ícono finales de David |
| P6 | `expo-build-properties` sin configurar (R8/shrink) y `eas.json` | F9 | Cuenta Expo/EAS de David |
| P7 | `predictiveBackGestureEnabled: false`: se deja en `false` (back clásico, probado con tests); reconsiderar solo si se quiere el gesto predictivo de Android 14+ | F9 | **David**: probar el botón atrás en el teléfono (sección 3) |
| P8 | Ports restantes (Auth, Article, Progress, AIGateway, SecretStore) | ~~F4~~ Resuelto | — |
| P12 | Bordes del chunker (D29) | ~~Antes de H1~~ **Resuelto** (confirmado por el backend) | — |
| P13 | `DailyProgressCard` sin meta diaria (D19) | ~~F6~~ Resuelto por defecto (D41) | David puede vetar |
| P15 | Cerrar sesión en modo mock | ~~F7~~ Resuelto: se conservan los datos (D51) | — |
| P16 | Verificar en teléfono la pantalla Motor de IA con `usePreventScreenCapture` (Expo Go): debe impedir capturas | F6 (verificación) | **David** |
| P14 | Verificar en Expo Go que la app arranca con SQLite (los ajustes ahora viven en `focusread.db`) | Ahora | **David** |
| P9 | Reglas ESLint de dependencia atómica | ~~F3~~ Resuelto: todas en `error` | — |
| P10 | `BottomTabBar` y `SheetTemplate`: comportamiento real con barra de gestos y teclado en Android edge-to-edge | F3 (verificación) / F5 | **David**: matriz responsive (sección 3) |
| P11 | Teclado que tapaba el botón de Registro | ~~F5~~ Corregido (D43); confirmar en teléfono | **David** |

## 3. Verificaciones manuales que necesito de David (no puedo abrir emulador)

**Ya disponibles (F0–F2):**
1. `cd focusread-app && npm run android` (o Expo Go): la app arranca como antes.
2. Ajustes → cambiar tema y tamaño, cerrar la app del todo y reabrir: se conservan.
3. Botón flotante de paleta (solo debug) → catálogo: revisar los 3 temas, todos los estados y que las fuentes sean Newsreader/Inter (no Roboto).
4. TalkBack activado sobre el catálogo: cada control se anuncia con nombre, rol y estado.

**Para cerrar F3 (matriz responsive):**
- Emulador 360×800 (fuente 100/130/200 %), 411×914 (100/200 %) y tablet/plegable ≥ 800 dp, en vertical y horizontal.
- Comprobar: sin textos cortados ni solapados, dock/tab bar fuera de la barra de gestos, lector ≤ 640 dp de ancho.
- Capturas para el reporte (yo no puedo tomarlas).
