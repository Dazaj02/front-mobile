# Reporte consolidado H1 — Frontend F0–F7 (para la Auditoría Gemini #1)

- Rama: `rediseno` (publicada en origin). Último commit del frontend al momento de este reporte: ver `git log`.
- Modo de datos: `mock` (sin backend ni Supabase). **F8 (live) y F9 (hardening/APK) no se han hecho**, por eso A3/A4 (parte Supabase) y A15 figuran parciales o pendientes.
- Verificación automática al cierre: `tsc --noEmit` OK · `jest` **31 suites / 468 tests** en verde · `expo lint` **0 problemas** · `expo-doctor` **21/21** · `App.tsx` 25 líneas.
- Registro completo de desviaciones y pendientes: `focusread-app/PENDIENTES.md` (D1–D60, P1–P16).

## Fases entregadas

| Fase | Contenido | Commit |
|---|---|---|
| F0 | Base y limpieza, solo Android, deps, jest/eslint/logger/.env.example | `front(F0)` |
| F1 | Tokens en 3 niveles, ThemeProvider, settingsStore, fuentes, test de contraste | `front(F1)` |
| F2 | 11 átomos, 12 moléculas, catálogo DEV, tests de accesibilidad | `front(F2)` |
| F3 | 14 organismos, 4 templates, `useWindowClass`, insets, reglas ESLint en `error` | `front(F3)` |
| F4 | Dominio, SQLite + migraciones, chunker, stats, `HttpAIGateway`, SecretStore, mock | `front(F4)` |
| F5 | Navegación, auth UI, sesión, `App.tsx` mínimo, se elimina la app legada | `front(F5)` |
| F6 | Biblioteca, lector con sesiones, importar, progreso, ajustes, motor de IA, cuenta | `front(F6)` |
| F7 | Offline, caché LRU 50, outbox idempotente, ajustes LWW, acciones que requieren red | `front(F7)` |
| extra | Voces en la nube (temporal, desactivadas) + `docs/PROPUESTA_TTS_NUBE.md` | `front(F7)` |

## Checklist §11 con evidencia

Leyenda: **Cumple** / **Parcial** / **Pendiente (fase futura)**.

| # | Ítem | Estado | Evidencia |
|---|---|---|---|
| A1 | Sin secretos ni llamadas directas a proveedores de IA | **Cumple** | Test de política `src/test/policy.test.ts:32` (prohíbe `api.deepseek.com`, `api.openai.com`, `generativelanguage`, `sk-…`). `grep api.deepseek.com src` = 0. Se eliminó `deepSeekService.ts`; `storageService.getSettings` borraba la key vieja (archivo luego eliminado en F5). |
| A2 | Key BYOK solo en `SecureSecretStore`, viaja solo en `X-AI-Key` | **Cumple** | `src/data/secure/SecureSecretStore.ts:9` · header `src/data/api/HttpAIGateway.ts:15,43` · `AsyncStorage` solo lo importan la sesión cifrada y la mock (`policy.test.ts:57`) · test "la key no aparece en SQLite ni AsyncStorage" (`src/data/secure/secure.test.ts`, `src/features/settings/aiEngine.test.tsx`) |
| A3 | Sesión Supabase cifrada (`LargeSecureStore`) | **Parcial** | Implementado y probado: `src/data/secure/LargeSecureStore.ts:25,42` (AES-256-CTR, llave aleatoria en SecureStore, blob en AsyncStorage). **`supabaseClient.ts` es F8.** |
| A4 | Fronteras externas validadas con zod | **Parcial** | API: `src/data/api/httpClient.ts:78` y `HttpAIGateway.ts:58` (request y response). SQLite: `LocalArticleRepository.ts:143`, `LocalProgressRepository.ts:24`, `settingsCache.ts:1` (filas inválidas se omiten). **Filas de Supabase (`mappers.ts`): F8.** |
| A5 | La app nunca inserta en `articles`/`doses`/`quiz_questions` | **Cumple** | `policy.test.ts:40`: los únicos `.save(` permitidos son el gateway mock, la siembra de ejemplos del mock y la caché local de lo que devuelve el servidor (`CachedArticleRepository`). No existe ningún `.from('articles').insert`. |
| A6 | Tokens en 3 niveles; cero literales de color fuera de `tokens/` | **Cumple** | `src/design-system/tokens/` (`primitives`, `semantic:16`, `components`). Test `policy.test.ts` ("no hay colores literales fuera de tokens/") sobre `design-system`, `features`, `navigation`, `app`. Las pantallas no usan `StyleSheet.create` (mismo archivo). |
| A7 | Reglas de dependencia atómica activas y sin violaciones | **Cumple** | `eslint.config.js:6,9` (`DEP_LEVEL = 'error'`, `no-restricted-imports` por capa) · `npx expo lint` = 0 problemas |
| A8 | Test de contraste en los 3 temas | **Cumple** | `src/design-system/tokens/contrast.test.ts:61` (todos los pares de §6.2 + fondos presionados). Detectó un fallo real (`text.muted` sobre `accent.subtle`) que se corrigió usando `bg.sunken`. |
| A9 | Responsive real | **Parcial** | `useWindowDimensions`: `src/design-system/layout/useWindowClass.ts:1,15` · columna de lectura 640 dp: `ReaderTemplate.tsx` · safe areas en `BottomTabBar`, `AudioMiniDock`, `SheetTemplate` · fuente del sistema nunca bloqueada. **La matriz responsive manual (3 dispositivos × fuentes × orientaciones, con capturas) NO se ha hecho** (no hay emulador); solo se probó en un teléfono vía Expo Go. |
| A10 | Accesibilidad: roles, labels, 48 dp, reducir movimiento | **Cumple** (tests) / TalkBack manual pendiente | `touchMin: 48` `primitives.ts:76` · `reduceMotionChanged` `ThemeProvider.tsx:51` · `IconButton.accessibilityLabel` obligatorio en el tipo · tests de rol/etiqueta/estado en `atoms.test.tsx`, `molecules.test.tsx`, `organisms.test.tsx`. **Pase con TalkBack: F9.** |
| A11 | Navegación: sin swipe, atrás correcto, montaje perezoso, `App.tsx` < 60 | **Cumple** | `src/navigation/AppTabs.tsx:69` (`backBehavior="firstRoute"`, `lazy`) · `FocusedOnly.tsx:2` (solo monta la pestaña visible) · `App.tsx` = 25 líneas · tests `src/navigation/navigation.test.tsx` (orden del atrás: hoja → lector → pestaña → salir) |
| A12 | Stats desde sesiones, con tests de racha y semana | **Cumple** | `src/domain/stats.ts:41,69` · `stats.test.ts` (racha que cruza medianoche con día local ≠ día UTC, cambio de semana y mes, días vacíos). Retención = `quizCorrect` / sesiones con quiz. |
| A13 | Outbox idempotente; limpieza al cerrar sesión | **Cumple** (modo mock; live en F8) | `src/data/local/outbox.ts:27,37` · `src/services/sync/SyncService.ts:64-65` (solo borra tras OK) · `performSignOut` `src/services/session/signOut.ts:20` · test "3 sesiones offline → 3 filas remotas, 0 en la outbox; reenviar sigue en 3" (`src/data/offline/offline.test.ts`). En mock cerrar sesión conserva datos por decisión de David (D51). |
| A14 | Eliminados: binaural, voces falsas, karaoke, cuenta regresiva, "fatiga ahorrada", demo en release | **Cumple** | `policy.test.ts:47` · demo solo con `__DEV__`: `src/features/auth/WelcomeScreen.tsx:35` y test "no existe en release" (`navigation.test.tsx`) · sin cuenta regresiva: `reader.test.tsx` |
| A15 | Release: sin `console`, `allowBackup=false`, permisos mínimos, R8 | **Pendiente (F9)** | Hecho: `allowBackup: false`, `package`, `scheme` en `app.json`; `transform-remove-console` en `babel.config.js`; `policy.test.ts` (sin `console.` fuera de `logger`). Falta: R8/shrink, `blockedPermissions`, `eas.json`, APK, revisión de permisos. |
| A16 | Contrato copiado literal | **Cumple** | `src/domain/contract.ts` = líneas 148–289 de `PLAN_FRONTEND.md`: diferencia **0 líneas** (verificado con `Compare-Object`). Lo nuevo (TTS) vive aparte en `src/domain/ttsProposal.ts` y NO modifica el contrato. |

## Lo que Gemini debe saber (desviaciones relevantes)
1. **Contrato intacto.** La única solicitud de cambio es la de voces en la nube (`docs/PROPUESTA_TTS_NUBE.md`), no aplicada y ya enviada al agente backend.
2. **Se eliminó por completo la app legada en F5** (no solo `deepSeekService`): ya no hay `storageService` ni `mockArticles`.
3. **Sin emulador:** nada de la matriz responsive ni TalkBack se ha verificado en los 3 dispositivos del plan.
4. **D29 (chunker):** un párrafo de 1.3–1.5 × objetivo se trata como unidad atómica (el plan solo exime a "oración única"); hay que comprobar que backend corta igual.
5. **D50:** existe `focusread-app/.env` (ignorado por git) con URL y anon key de Supabase para F8; no se han usado.

## Cómo reproducir
```
cd focusread-app
npm install
npx tsc --noEmit && npx jest && npx expo lint && npx expo-doctor
npm start        # Expo Go; modo mock (EXPO_PUBLIC_DATA_MODE=mock)
```
