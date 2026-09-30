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
| D7 | F1 | `src/legacy/useLegacyColors.ts`: puente para que las pantallas viejas usen tokens nuevos | Pendiente → se borra en F5/F6 |
| D8 | F1 | `contract.ts`, `defaults.ts` y `SettingsRepository` adelantados desde F4 | Aceptada (F4 completa `ports.ts`) |
| D9 | F1 | Ajustes persistidos en AsyncStorage (`settingsCache.ts`) | Pendiente → SQLite en F4 |
| D10 | F1 | `settingsStore` no revertía si fallaba el guardado | Resuelta en F2 |
| D11 | F2 | Estado "presionado" del catálogo solo se ve tocando el control | Aceptada |
| D12 | F2 | `DevCatalogHost` (botón flotante DEV) es transitorio | Pendiente → pantalla del navegador en F5 |
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

## 2. Pendientes por resolver

| # | Tema | Cuándo | Necesita |
|---|---|---|---|
| P1 | `expo lint`: 4 errores + 1 warning en pantallas viejas (`SettingsScreen`, `ZenReaderScreen`, `HomeScreen`) | F5/F6 (se reescriben) | — |
| P2 | `npm audit`: 11 vulnerabilidades moderadas transitivas | Revisar en F9 | — |
| P3 | Git: `main` va por delante de `origin`; el plan pide rama `rediseno` y push al cerrar cada fase | Ahora | **Decisión de David** |
| P4 | El proyecto vive en OneDrive: riesgo de corrupción de `.git` y rutas largas | Ahora | **David**: `LongPathsEnabled=1`, `git config --global core.longpaths true`, pausar OneDrive en `npm install`/builds |
| P5 | Nombre final de la app, ícono adaptativo (fondo `#E6F4FE` del template) y `version`/`versionCode` | F9 | Nombre/ícono finales de David |
| P6 | `expo-build-properties` sin configurar (R8/shrink) y `eas.json` | F9 | Cuenta Expo/EAS de David |
| P7 | `predictiveBackGestureEnabled: false`: revisar junto al manejo del botón atrás | F5 | — |
| P8 | Ports restantes (Auth, Article, Progress, AIGateway, SecretStore) | F4 | — |
| P9 | Reglas ESLint de dependencia atómica | ~~F3~~ Resuelto: todas en `error` | — |
| P10 | `BottomTabBar` y `SheetTemplate`: comportamiento real con barra de gestos y teclado en Android edge-to-edge | F3 (verificación) / F5 | **David**: matriz responsive (sección 3) |
| P11 | `KeyboardAvoidingView` usa `behavior="height"` en Android; ajustar si el teclado tapa campos | F5 (auth) | **David**: probar en dispositivo |

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
