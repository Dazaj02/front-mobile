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
| D29 | F4 | Chunker: un párrafo de 1.3–1.5 × objetivo se trata como unidad atómica y puede superar 1.3 × (el plan solo exime a "oración única"). Con > 20 dosis sugiere la menor duración mayor que sí cabe | **Confirmar con el agente backend** que su implementación coincide en estos bordes (riesgo de divergencia) |
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
| P12 | Confirmar con el agente backend los bordes del chunker (D29) y el mensaje/código de errores | Antes de H1 | **David**: pasar D29 al agente backend |
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
