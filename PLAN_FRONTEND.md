# FocusRead AI — Plan del agente FRONTEND

> **Agente:** Claude Code · **Carpeta propia:** `focusread-app/`
> **Planes hermanos:** `PLAN_BACKEND.md` (carpeta `focusread-api/`) · `PLAN_DATABASE.md` (carpeta `supabase/`)
> **Auditoría:** al cierre de cada bloque de fases, Gemini revisa con la checklist de la sección 11.

---

## 0. Cómo usar este documento (léelo completo antes de empezar)

1. Eres el **agente de frontend**. Trabajas **solo** dentro de `focusread-app/`. No modificas `focusread-api/`, `supabase/`, `docs/plan/` ni `focusread_interactive.html`.
2. Trabajas por fases (**F0 → F9**) en orden. Al **inicio** de cada fase: relees la fase, exploras el código, presentas un plan corto y **esperas aprobación**. Al **final**: ejecutas las verificaciones y entregas el reporte con el formato de la sección 10.
3. Otros dos agentes trabajan **en paralelo**. Todo lo que compartes con ellos está en la **sección 3 (Contrato compartido)**. **El contrato está congelado**: si necesitas cambiarlo, te detienes y lo reportas; no lo cambias por tu cuenta.
4. Hasta el hito H3 trabajas en **modo `mock`** (sin backend ni Supabase reales). Por eso todo se programa contra **interfaces (puertos)** y los adaptadores reales se conectan en F8.
5. Commits: solo `git add focusread-app/` y mensajes `front(F#): descripción`. Si aparece `index.lock`, espera unos segundos y reintenta (otros agentes también hacen commit).

---

## 1. Contexto del proyecto

**FocusRead AI** es una app Android (Expo + React Native + TypeScript) que divide textos largos en **micro-dosis de lectura de 1.5 a 3.5 minutos**, con resumen y quiz generados por IA, lectura en voz alta (TTS) y seguimiento de progreso.

**Estado actual (prototipo monolítico):**

- `App.tsx` controla navegación, estado global, modales y dock.
- Las pantallas son archivos gigantes, sin componentes reutilizables.
- Los datos viven en AsyncStorage con escrituras no atómicas.
- La app llama directo a DeepSeek con una API key guardada en claro.
- El login es simulado.

**Objetivo:** rediseño completo, seguro y más simple, con:

- design system atómico y tokens en 3 niveles;
- responsive real para Android;
- login real (Supabase Auth);
- backend propio (Hono) como pasarela de IA;
- modo offline.

### Arquitectura destino

```
App Android (Expo)
 ├── supabase-js ──────────► Supabase Auth + Postgres (RLS)   ← login, artículos, progreso, ajustes
 └── fetch + JWT ──────────► API Hono (Node/TS)               ← procesar artículos con IA, proveedores, cuota, borrar cuenta
```

### Decisiones cerradas

| Tema | Decisión |
|---|---|
| Plataforma | **Solo Android**. Sin web ni iOS |
| Login | Email y contraseña con verificación de correo (Supabase Auth). **Sin modo invitado** |
| Crear artículos | **Solo vía API** (`POST /v1/articles/process`). La app nunca inserta artículos directamente |
| Key propia del usuario (BYOK) | Guardada **solo en el dispositivo** (SecureStore). Viaja en el header `X-AI-Key` en cada petición. Nunca va a Supabase |
| Offline | Online-first. Se pueden leer sin conexión los artículos ya abiertos (caché SQLite). El progreso se guarda en una **cola local (outbox)** y se sincroniza al recuperar la conexión |
| Navegación | **3 pestañas**: Biblioteca · Progreso · Ajustes. El **Lector** es pantalla completa. Sin swipe entre pestañas |
| Eliminado | Frecuencias binaurales, "personas" de voz falsas, karaoke, cuenta regresiva, métrica "fatiga cognitiva ahorrada", botón demo en release |

---

## 2. Preparación común (la hace David, una sola vez, antes de lanzar los agentes)

> Esta sección es idéntica en los tres planes.

**1. Estructura de carpetas** en `Proyecto mobil/`:

```
Proyecto mobil/
├── focusread_interactive.html   (referencia visual, no se toca)
├── focusread-app/               ← agente FRONTEND
├── focusread-api/               ← agente BACKEND (vacía al inicio)
├── supabase/sql/                ← agente BASE DE DATOS (vacía al inicio)
├── docs/plan/                   ← PLAN_FRONTEND.md, PLAN_BACKEND.md, PLAN_DATABASE.md
├── CLAUDE.md
└── .gitignore
```

**2. Git.**

- Ejecuta `git init` en `Proyecto mobil/` y crea la rama `rediseno`.
- Crea un remoto privado en GitHub y haz **push al cerrar cada fase**. El `.git` dentro de OneDrive puede corromperse con la sincronización; el remoto es tu respaldo.
- Los tres agentes trabajan en la misma rama. Cada uno toca **solo su carpeta** y hace commit solo de ella.

**3. Windows y OneDrive.**

- Activa las rutas largas (`LongPathsEnabled = 1` en el registro) y ejecuta `git config --global core.longpaths true`.
- Pausa la sincronización de OneDrive mientras corres `npm install` o builds.
- No se generan carpetas nativas `android/` en local: la APK se construye con **EAS Build** en la nube.

**4. `.gitignore` en la raíz:**

```
node_modules/
.expo/
dist/
web-build/
android/
ios/
coverage/
*.keystore
*.jks
*.p8
*.p12
*.pem
.env
.env.*
!.env.example
npm-debug.log*
.DS_Store
```

**5. `CLAUDE.md` en la raíz:**

```md
# FocusRead AI — reglas globales para agentes
Planes: docs/plan/PLAN_FRONTEND.md · PLAN_BACKEND.md · PLAN_DATABASE.md
Propiedad: frontend → focusread-app/ · backend → focusread-api/ · base de datos → supabase/
- Nunca edites fuera de tu carpeta. Nunca edites los planes.
- El contrato compartido (sección 3 de cada plan) está congelado. Si necesitas cambiarlo, detente y repórtalo.
- Ningún secreto en código ni en git. Solo en .env locales (ignorados) o en el hosting.
- En cada fase: plan corto → esperar aprobación → implementar → verificaciones → reporte.
- Commits: `git add <tu-carpeta>` únicamente. Mensajes: `front(F1): ...`, `api(B2): ...`, `db(D3): ...`.
- Textos de UI y mensajes al usuario en español; código e identificadores en inglés.
```

**6. Lanzamiento.** Abre tres sesiones de Claude Code en la raíz y dale a cada una esta instrucción (cambiando el nombre del plan):
`Lee docs/plan/PLAN_FRONTEND.md completo y CLAUDE.md. Eres el agente frontend. Empieza por la fase F0.`

**7. Hitos de sincronización.**

| Hito | Condición | Desbloquea |
|---|---|---|
| **H1** | Front F0–F7 · Backend B0–B5 · DB D0–D5 terminados (en paralelo, sin depender entre sí) | Auditoría Gemini #1 |
| **H2** | David ejecutó los SQL en el proyecto Supabase **dev** y `99_verify.sql` pasó | Backend B6 (modo live) |
| **H3** | Backend en modo live corriendo (local o desplegado) | Front F8 (integración) |
| **H4** | Front F9 · Backend B7–B8 · DB D6 terminados | Auditoría Gemini final + APK |

---

## 3. Contrato compartido (CONGELADO)

> Idéntico en `PLAN_FRONTEND.md` y `PLAN_BACKEND.md`. `PLAN_DATABASE.md` contiene el mapeo a columnas.
> El frontend lo copia **literal** en `focusread-app/src/domain/contract.ts`.

### 3.1 Tipos (zod)

```ts
import { z } from 'zod';

// ---------- Enumeraciones ----------
export const ThemeModeSchema = z.enum(['paper', 'sepia', 'dark']);
export const ProviderIdSchema = z.enum(['focusread', 'deepseek', 'openai', 'gemini', 'openrouter', 'groq']);
export const ByokProviderIdSchema = ProviderIdSchema.exclude(['focusread']);
export const TargetDoseMinutesSchema = z.union([z.literal(1.5), z.literal(2.5), z.literal(3.5)]);
export const SourceTypeSchema = z.enum(['text', 'url', 'demo']);
const IsoDate = z.string().datetime({ offset: true });

// ---------- Dominio ----------
export const QuizQuestionSchema = z
  .object({
    id: z.string().uuid(),
    question: z.string().min(1).max(500),
    options: z.array(z.string().min(1).max(200)).min(2).max(4),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().max(1000).nullable(),
  })
  .refine((q) => q.correctIndex < q.options.length, {
    message: 'correctIndex fuera de rango',
    path: ['correctIndex'],
  });

export const MicroDoseSchema = z.object({
  id: z.string().uuid(),
  articleId: z.string().uuid(),
  position: z.number().int().min(0).max(19),
  title: z.string().max(200).nullable(),
  content: z.string().min(1).max(20000),
  estMinutes: z.number().positive(),
  quiz: QuizQuestionSchema.nullable(),
});

export const ArticleSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(300),
  category: z.string().max(60).nullable(),
  sourceType: SourceTypeSchema,
  sourceUrl: z.string().url().nullable(),
  summaryPoints: z.array(z.string().max(300)).max(6),
  totalMinutes: z.number().positive(),
  doseCount: z.number().int().min(1).max(20),
  bookmarked: z.boolean(),
  aiProvider: z.string().nullable(),
  aiModel: z.string().nullable(),
  createdAt: IsoDate,
});

export const ArticleWithDosesSchema = ArticleSchema.extend({
  doses: z.array(MicroDoseSchema).min(1).max(20),
});

export const ReadingSessionSchema = z.object({
  id: z.string().uuid(),                 // generado en el cliente (idempotencia)
  articleId: z.string().uuid().nullable(),
  doseId: z.string().uuid().nullable(),
  startedAt: IsoDate,
  endedAt: IsoDate,
  activeSeconds: z.number().int().min(0).max(7200),
  completed: z.boolean(),
  quizCorrect: z.boolean().nullable(),
});

export const UserSettingsSchema = z.object({
  theme: ThemeModeSchema,
  readerFontScale: z.number().min(0.8).max(1.6),
  targetDoseMinutes: TargetDoseMinutesSchema,
  voiceId: z.string().max(200).nullable(),
  speechRate: z.number().min(0.5).max(2),
  speechPitch: z.number().min(0.5).max(2),
  hapticsEnabled: z.boolean(),
  quizEnabled: z.boolean(),
  aiProvider: ProviderIdSchema,
  aiModel: z.string().max(100).nullable(),
});

// ---------- API ----------
export const ProcessArticleRequestSchema = z.object({
  source: z.discriminatedUnion('type', [
    z.object({ type: z.literal('text'), text: z.string().min(300).max(50000), title: z.string().max(300).optional() }),
    z.object({ type: z.literal('url'), url: z.string().url().max(2048) }),
  ]),
  targetDoseMinutes: TargetDoseMinutesSchema,
  provider: ProviderIdSchema.default('focusread'),
  model: z.string().max(100).optional(),
  includeQuiz: z.boolean().default(true),
});

export const ProcessWarningSchema = z.enum(['AI_ENRICHMENT_DEGRADED']);
export const ProcessArticleResponseSchema = z.object({
  article: ArticleWithDosesSchema,
  warnings: z.array(ProcessWarningSchema).default([]),
});

export const ProviderInfoSchema = z.object({
  id: ProviderIdSchema,
  name: z.string(),
  requiresUserKey: z.boolean(),
  models: z.array(z.object({ id: z.string(), label: z.string() })),
  defaultModel: z.string(),
});
export const ProvidersResponseSchema = z.object({ providers: z.array(ProviderInfoSchema) });

export const TestProviderRequestSchema = z.object({
  provider: ByokProviderIdSchema,
  model: z.string().max(100).optional(),
});
export const TestProviderResponseSchema = z.object({ ok: z.literal(true) });

export const UsageResponseSchema = z.object({
  used: z.number().int().min(0),
  limit: z.number().int().min(0),
  resetsAt: IsoDate,
});

export const ApiErrorCodeSchema = z.enum([
  'UNAUTHORIZED', 'VALIDATION_ERROR', 'NOT_FOUND',
  'CONTENT_TOO_SHORT', 'CONTENT_TOO_LONG',
  'URL_BLOCKED', 'URL_FETCH_FAILED', 'URL_NO_CONTENT',
  'QUOTA_EXCEEDED', 'RATE_LIMITED',
  'PROVIDER_KEY_MISSING', 'PROVIDER_KEY_INVALID', 'PROVIDER_UNAVAILABLE', 'PROVIDER_TIMEOUT',
  'AI_OUTPUT_INVALID', 'INTERNAL',
]);
export const ApiErrorSchema = z.object({
  error: z.object({
    code: ApiErrorCodeSchema,
    message: z.string(),
    requestId: z.string().optional(),
  }),
});

export type Article = z.infer<typeof ArticleSchema>;
export type ArticleWithDoses = z.infer<typeof ArticleWithDosesSchema>;
export type MicroDose = z.infer<typeof MicroDoseSchema>;
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;
export type ReadingSession = z.infer<typeof ReadingSessionSchema>;
export type UserSettings = z.infer<typeof UserSettingsSchema>;
export type ProcessArticleRequest = z.input<typeof ProcessArticleRequestSchema>;
export type ProcessArticleResponse = z.infer<typeof ProcessArticleResponseSchema>;
export type ProviderId = z.infer<typeof ProviderIdSchema>;
export type ApiErrorCode = z.infer<typeof ApiErrorCodeSchema>;
```

> Si la versión de zod instalada es la 4, mantén exactamente la misma semántica usando su API equivalente.

### 3.2 API REST

- **URL base:** `EXPO_PUBLIC_API_URL`.
- **Autenticación:** todas las rutas `/v1/*` exigen `Authorization: Bearer <access_token de Supabase>`.
- **Key propia (BYOK):** header opcional `X-AI-Key` (solo cuando el proveedor no es `focusread`).
- **Respuestas:** siempre incluyen el header `X-Request-Id`.

| Método y ruta | Body / headers | Respuesta OK | Notas |
|---|---|---|---|
| `GET /health` | — | `200 {status:"ok", version}` | Sin autenticación |
| `GET /v1/providers` | — | `200 ProvidersResponse` | Lista blanca del servidor |
| `POST /v1/providers/test` | `TestProviderRequest` + `X-AI-Key` | `200 {ok:true}` | Llamada mínima al proveedor, timeout de 10 s |
| `POST /v1/articles/process` | `ProcessArticleRequest` (+ `X-AI-Key` si BYOK) | `201 ProcessArticleResponse` | Guarda el artículo en Supabase y lo devuelve completo |
| `GET /v1/usage` | — | `200 UsageResponse` | Cuota diaria del proveedor `focusread` |
| `DELETE /v1/account` | — | `204` | Borra el usuario en Supabase Auth; los datos se eliminan en cascada |

### 3.3 Errores → HTTP

| Código | HTTP | Código | HTTP |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | `QUOTA_EXCEEDED` | 429 (+ `Retry-After`) |
| `VALIDATION_ERROR` | 400 | `RATE_LIMITED` | 429 (+ `Retry-After`) |
| `NOT_FOUND` | 404 | `PROVIDER_KEY_MISSING` | 400 |
| `CONTENT_TOO_SHORT` | 422 | `PROVIDER_KEY_INVALID` | **422** (no 401, para no confundir con la sesión) |
| `CONTENT_TOO_LONG` | 413 | `PROVIDER_UNAVAILABLE` | 502 |
| `URL_BLOCKED` | 422 | `PROVIDER_TIMEOUT` | 504 |
| `URL_FETCH_FAILED` | 422 | `AI_OUTPUT_INVALID` | 502 |
| `URL_NO_CONTENT` | 422 | `INTERNAL` | 500 |

### 3.4 Acceso directo de la app a Supabase (con RLS)

| Tabla / vista | La app puede | Notas |
|---|---|---|
| `articles` | leer propios, `update(bookmarked)`, borrar propios | **No puede insertar** (solo la API) |
| `doses`, `quiz_questions` | leer propios | Solo lectura |
| `reading_sessions` | leer propios, **insertar** (sin enviar `user_id`) | Solo inserción: no se edita ni se borra |
| `user_settings` | leer y `update` de sus columnas | La fila la crea un trigger al registrarse |
| `profiles` | leer, `update(display_name)` | |
| `article_progress` (vista) | leer | `completed_doses`, `last_read_at` por artículo |

**Mapeo de nombres:** la base de datos usa `snake_case` y la app `camelCase`. El mapeo vive **solo** en `src/data/remote/mappers.ts` y cada fila se valida con zod después de mapearla.

### 3.5 Algoritmo de fragmentación (compartido con el backend)

- `targetWords = targetDoseMinutes × WORDS_PER_MINUTE` (valor por defecto: **180**).
- Normalizar: quitar caracteres de control, colapsar espacios y conservar los saltos de párrafo.
- Partir en párrafos. Si un párrafo supera `1.5 × targetWords`, partirlo por oraciones (`.`, `!`, `?`, `…` seguidos de espacio).
- Acumular de forma codiciosa hasta llegar a `≥ 0.85 × targetWords`, sin pasar de `1.3 × targetWords` salvo que sea una oración única.
- Si el último fragmento tiene menos de `0.4 × targetWords`, se fusiona con el anterior.
- Máximo **20** dosis. Si hay más, error `CONTENT_TOO_LONG`, sugiriendo una duración mayor.
- `estMinutes = round(words / WORDS_PER_MINUTE, 1)`.

---

## 4. Problemas que este plan corrige (trazabilidad para la auditoría)

| # | Problema del prototipo | Se corrige en |
|---|---|---|
| P1 | API key de DeepSeek en AsyncStorage y llamada directa a la IA desde la app | F4 (se elimina), F6 (BYOK en SecureStore), F8 (vía API) |
| P2 | Las URLs generan contenido inventado | F4 (el modo mock rechaza URLs), F8 (la extracción la hace la API) |
| P3 | JSON de la IA sin validar | F4 / F8 (zod en cada frontera) |
| P4 | Login simulado y posibles contraseñas en claro | F5 (UI), F8 (Supabase Auth) |
| P5 | AsyncStorage como "base de datos" con escrituras no atómicas | F4 (SQLite con transacciones), F8 (Supabase) |
| P6 | Estadísticas como contadores (bugs de día y semana) | F4 (se calculan desde `reading_sessions`) |
| P7 | Tema y tamaño de fuente no persisten | F1 |
| P8 | `App.tsx` como "god component" y prop drilling de `themeMode` | F1 (ThemeProvider), F5 (App.tsx < 60 líneas) |
| P9 | Sin design system: tokens solo de color, cero componentes | F1–F3 |
| P10 | Duplicados (botón Importar ×2, selector de tema ×2 con estados separados) | F6 |
| P11 | Swipe entre pestañas, sin manejo del botón atrás, 4 pantallas montadas | F5 |
| P12 | Responsive: `Dimensions` fijo, sin safe areas, sin ancho máximo de lectura, escala de fuente | F3, F6, F9 |
| P13 | Modo oscuro negro puro (halation) y contraste sin verificar | F1 |
| P14 | Fuentes del prototipo no cargadas | F1 |
| P15 | Accesibilidad: etiquetas, roles, áreas táctiles de 48 dp | F2, F9 |
| P16 | Voces falsas (Marcos y Mateo idénticas), switches sin función | F6 |
| P17 | Cuenta regresiva en modo "Zen", métricas inventadas | F6 |
| P18 | `console.log` en producción, `allowBackup`, permisos, botón demo | F0, F9 |

---

## 5. Arquitectura del frontend

### 5.1 Estructura de carpetas

```
focusread-app/
├── App.tsx                          (< 60 líneas: providers + RootNavigator)
├── app.json · eas.json · .env.example
└── src/
    ├── design-system/
    │   ├── tokens/        primitives.ts semantic.ts components.ts typography.ts layout.ts motion.ts index.ts
    │   ├── theme/         ThemeProvider.tsx useTheme.ts
    │   ├── layout/        useWindowClass.ts
    │   ├── atoms/
    │   ├── molecules/
    │   ├── organisms/
    │   ├── templates/
    │   └── catalog/       DevCatalogScreen.tsx   (solo __DEV__)
    ├── domain/            contract.ts ports.ts stats.ts chunker.ts
    ├── data/
    │   ├── local/         db.ts migrations/ LocalArticleRepository.ts LocalProgressRepository.ts outbox.ts settingsCache.ts
    │   ├── remote/        supabaseClient.ts mappers.ts SupabaseAuthRepository.ts SupabaseArticleRepository.ts
    │   │                  SupabaseProgressRepository.ts SupabaseSettingsRepository.ts         (F8)
    │   ├── api/           httpClient.ts HttpAIGateway.ts
    │   ├── mock/          MockAuthRepository.ts LocalChunkerGateway.ts demoArticles.ts
    │   ├── secure/        SecureSecretStore.ts LargeSecureStore.ts
    │   └── container.ts   (elige adaptadores según EXPO_PUBLIC_DATA_MODE = mock | live)
    ├── services/          tts/ haptics/ sync/ network/
    ├── state/             settingsStore.ts playerStore.ts sessionStore.ts   (Zustand)
    ├── navigation/        RootNavigator.tsx AuthStack.tsx AppTabs.tsx linking.ts types.ts
    ├── features/          auth/ library/ reader/ progress/ settings/        (pantallas + hooks)
    ├── i18n/              es.ts   (todos los textos + mensajes por ApiErrorCode)
    └── lib/               logger.ts ids.ts dates.ts errors.ts
```

### 5.2 Reglas de dependencia (se verifican con ESLint `no-restricted-imports`)

| Capa | Puede importar | NO puede importar |
|---|---|---|
| `tokens` | nada | todo lo demás |
| `atoms` | tokens, theme, lib | molecules y superiores, data, services, state, features |
| `molecules` | atoms, tokens, theme, lib | organisms y superiores, data, services, state |
| `organisms` | molecules, atoms, tokens, theme, layout, lib | templates, data, services, state, features |
| `templates` | organisms y capas inferiores | data, services, state, features |
| `features` (páginas) | todo | — |
| `domain` | zod y lib | React, React Native, Expo |

### 5.3 Librerías

| Uso | Librería |
|---|---|
| Navegación | `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/bottom-tabs` |
| Estado de UI y ajustes | `zustand` |
| Datos remotos y caché | `@tanstack/react-query` |
| Validación | `zod` |
| Base local | `expo-sqlite` |
| Secretos | `expo-secure-store` |
| Cifrado de la sesión | `aes-js`, `react-native-get-random-values` |
| Supabase | `@supabase/supabase-js`, `react-native-url-polyfill` |
| Red | `@react-native-community/netinfo` |
| Otros módulos Expo | `expo-font` (+ `@expo-google-fonts/newsreader`, `@expo-google-fonts/inter`), `expo-speech`, `expo-haptics`, `expo-crypto` (UUID), `expo-screen-capture`, `expo-linking` |
| Safe areas | `react-native-safe-area-context` |
| Pruebas | `jest-expo`, `@testing-library/react-native` |

Instala siempre con `npx expo install` para respetar las versiones compatibles con el SDK.

---

## 6. Design tokens (definición)

Hay tres niveles:

- **Primitivos:** valores crudos.
- **Semánticos:** significado por tema.
- **Componentes:** decisiones por componente.

Los componentes **solo** consumen tokens semánticos y de componente. Fuera de `tokens/` no puede aparecer ningún hex, px ni duración literal.

### 6.1 Primitivos (`primitives.ts`)

- **Colores:** cada hex de la tabla 6.2, con nombre crudo (`blue700 = '#1D4ED8'`, `amber800 = '#92400E'`, `gray950 = '#121212'`, etc.).
- **Espaciado (dp):** `none 0 · xxs 2 · xs 4 · sm 8 · md 12 · lg 16 · xl 24 · xxl 32 · xxxl 48`.
- **Radios:** `sm 8 · md 12 · lg 16 · xl 24 · pill 999`.
- **Elevación (Android):** `level0 0 · level1 1 · level2 3 · level3 6`.
- **Opacidad:** `disabled 0.38 · pressedOverlay 0.12 · scrim 0.4`.
- **Tamaños:** `touchMin 48 · iconSm 20 · iconMd 24 · iconLg 32`.

### 6.2 Semánticos por tema (`semantic.ts`)

Son valores iniciales. **El test de contraste es la autoridad:** si un par falla, se ajusta el valor.

| Token | paper | sepia | dark |
|---|---|---|---|
| `bg.base` | `#FBF8FF` | `#F5EEDB` | `#121212` |
| `bg.elevated` | `#FFFFFF` | `#FBF6E9` | `#1E1E1E` |
| `bg.sunken` | `#F1EEF6` | `#EDE3C9` | `#1A1A1A` |
| `text.primary` | `#1A1B20` | `#2B2118` | `#E6E6E6` |
| `text.secondary` | `#45464F` | `#5A4A38` | `#B8B8B8` |
| `text.muted` | `#6B6C75` | `#6E5C47` | `#8F8F8F` |
| `text.onAccent` | `#FFFFFF` | `#FFFFFF` | `#0B1B3A` |
| `accent.default` | `#1D4ED8` | `#92400E` | `#8AB4F8` |
| `accent.pressed` | `#1E40AF` | `#78350F` | `#AECBFA` |
| `accent.subtle` | `#E0E7FF` | `#F3E3C3` | `#1F2A40` |
| `border.subtle` (decorativo) | `#D9D8E0` | `#DCCFB0` | `#2E2E2E` |
| `border.strong` (inputs, ≥ 3:1) | `#7C7D86` | `#8A7760` | `#8F8F8F` |
| `border.focus` | `#1D4ED8` | `#92400E` | `#8AB4F8` |
| `state.success` | `#15803D` | `#166534` | `#6DD58C` |
| `state.warning` | `#A16207` | `#854D0E` | `#FDD663` |
| `state.danger` | `#B91C1C` | `#9F1239` | `#F2B8B5` |
| `overlay.scrim` | `rgba(0,0,0,0.4)` | `rgba(43,33,24,0.4)` | `rgba(0,0,0,0.6)` |

**Pares obligatorios en el test de contraste (en los 3 temas):**

- `text.primary`, `text.secondary` y `text.muted` sobre `bg.base`, `bg.elevated` y `bg.sunken` → ≥ **4.5:1**.
- `text.onAccent` sobre `accent.default` → ≥ 4.5:1.
- `accent.default` sobre `bg.base`, `bg.elevated` y `accent.subtle` → ≥ 4.5:1.
- `state.*` sobre `bg.base` y `bg.elevated` → ≥ 4.5:1.
- `border.strong` y `border.focus` sobre `bg.base` y `bg.elevated` → ≥ **3:1**.

### 6.3 Tipografía (`typography.ts`)

| Rol | Fuente | Tamaño / interlínea (dp) | Peso |
|---|---|---|---|
| `display` | Newsreader | 32 / 40 | 600 |
| `headline` | Newsreader | 24 / 32 | 600 |
| `title` | Inter | 20 / 28 | 600 |
| `bodyLarge` | Inter | 18 / 28 | 400 |
| `body` | Inter | 16 / 24 | 400 |
| `label` | Inter | 14 / 20 | 500 |
| `caption` | Inter | 12 / 16 | 400 |
| `reading` | Newsreader | 19 / 31 × `readerFontScale` | 400 |
| `readingTitle` | Newsreader | 26 / 34 × `readerFontScale` | 600 |

- `readerFontScale` va de **0.8 a 1.6** en pasos de 0.1 y se persiste.
- **Nunca** se desactiva `allowFontScaling`. Solo las etiquetas de la barra de pestañas usan `maxFontSizeMultiplier = 1.3`.
- Los layouts deben reacomodarse (wrap) cuando la fuente del sistema está al 200 %.

### 6.4 Layout y responsive (`layout.ts`)

| Token | Valor |
|---|---|
| Clases de ventana | `compact` < 600 dp · `medium` 600–839 dp · `expanded` ≥ 840 dp |
| `gutter` | compact 16 · medium 24 · expanded 32 |
| `readerMaxWidth` | 640 dp (columna de lectura centrada) |
| `contentMaxWidth` | 840 dp (Biblioteca, Progreso, Ajustes) |
| `authMaxWidth` | 480 dp |
| Grid de Biblioteca | compact 1 columna · medium 2 · expanded 2 (con `contentMaxWidth`) |
| `zIndex` | `base 0 · dock 10 · sheet 20 · toast 30` |

### 6.5 Movimiento (`motion.ts`)

- Duraciones: `instant 0 · fast 150 · normal 250 · slow 400` ms.
- Curva `standard`.
- Si el sistema tiene activo **"reducir movimiento"** (`AccessibilityInfo.isReduceMotionEnabled`), todas las duraciones pasan a 0.

### 6.6 Tokens de componente (`components.ts`)

| Componente | Tokens |
|---|---|
| `button` | height 48 · radius `md` · paddingX `lg` · primary: bg `accent.default`, fg `text.onAccent` · secondary: bg `bg.elevated`, border `border.strong`, fg `text.primary` · ghost: fg `accent.default` · disabled: opacity 0.38 |
| `iconButton` | size 48 · icon `iconMd` · radius `pill` |
| `chip` | height 36 (área táctil de 48 con `hitSlop`) · radius `pill` · activo: bg `accent.subtle`, fg `accent.default` |
| `card` | radius `lg` · padding `lg` · bg `bg.elevated` · elevation `level1` · border `border.subtle` |
| `input` | height 52 · radius `md` · border `border.strong` · foco: `border.focus` de 2 dp · error: `state.danger` |
| `progressBar` | height 6 · radius `pill` · track `bg.sunken` · fill `accent.default` |
| `tabBar` | height 64 + inset inferior · activo `accent.default` · inactivo `text.muted` |
| `dock` | height 64 · bg `bg.elevated` · elevation `level3` · se ubica sobre `tabBar` respetando el inset |
| `sheet` | radius superior `xl` · bg `bg.elevated` · scrim `overlay.scrim` |
| `badge` | height 24 · radius `pill` · `label` |

---

## 7. Inventario atómico (corregido)

### Átomos (`atoms/`)

| Componente | Props clave | Notas |
|---|---|---|
| `AppText` | `variant`, `color` (token), `numberOfLines` | Único componente que renderiza `Text` |
| `Icon` | `name`, `size` (token), `color` (token) | Envoltura de `@expo/vector-icons` |
| `Button` | `variant`, `label`, `onPress`, `loading`, `disabled`, `icon?` | `accessibilityRole="button"` |
| `IconButton` | `icon`, `accessibilityLabel` (**obligatorio en el tipo**), `onPress` | 48 × 48 |
| `Chip` | `label`, `selected`, `onPress` | `accessibilityState.selected` |
| `Badge` | `label`, `tone` | |
| `Switch` | `value`, `onValueChange`, `accessibilityLabel` | |
| `ProgressBar` | `value` 0–1, `accessibilityLabel` | `accessibilityValue` |
| `TextInputBase` | props de TextInput + estados | Sin label (lo agrega `FormField`) |
| `Divider` | — | |
| `Spinner` | `size` | |

### Moléculas (`molecules/`)

`FormField` (label + input + ayuda + error) · `PasswordField` (FormField + mostrar/ocultar) · `SearchBar` · `FilterChipGroup` · `SettingRow` (título + descripción + control) · `SectionHeader` · `StatTile` · `ThemeSwatch` · `VoiceOption` · `FontSizeStepper` · `DoseChecklistItem` · `Banner` (info / offline / error, con acción opcional)

### Organismos (`organisms/`)

`AppHeader` · `BottomTabBar` (vía la prop `tabBar` de React Navigation) · `ArticleCard` · `ContinueReadingCard` · `DailyProgressCard` · `WeeklyChart` · `DoseReader` (paginado de dosis) · `QuizSheet` · `ImportSheet` · `AudioMiniDock` · `ProviderKeyForm` · `AuthForm` (variantes login / registro / recuperar / nueva contraseña) · `EmptyState` · `ErrorState`

### Templates (`templates/`)

| Template | Qué resuelve |
|---|---|
| `ScreenTemplate` | Safe area, `AppHeader`, scroll, `gutter` por clase de ventana, `contentMaxWidth` |
| `ReaderTemplate` | Pantalla completa, columna centrada con `readerMaxWidth`, controles superiores e inferiores con insets |
| `AuthTemplate` | Centrado, `authMaxWidth`, `KeyboardAvoidingView` |
| `SheetTemplate` | Bottom sheet con scrim, respeta el teclado y el botón atrás |

### Páginas (`features/*`)

Son las únicas que usan hooks de datos (React Query, stores, servicios). Componen templates y organismos, **sin estilos propios**.

---

## 8. Pantallas y flujos

| Flujo | Pantallas |
|---|---|
| **Auth** (sin sesión) | Bienvenida → Iniciar sesión · Registro → "Verifica tu correo" · Recuperar contraseña → Nueva contraseña (desde el deep link) · `AuthCallback` |
| **Pestañas** | **Biblioteca** · **Progreso** · **Ajustes** |
| **Stack sobre pestañas** | Lector (pantalla completa) · Importar (sheet) · Ajustes › Motor de IA · Ajustes › Cuenta › Eliminar cuenta |
| **Solo `__DEV__`** | Catálogo de componentes |

**Deep links** (`scheme: focusread`):

- `focusread://auth/callback` para la verificación de correo (intercambio del código PKCE).
- `focusread://auth/reset` para abrir la pantalla de nueva contraseña.

---

## 9. Fases

### F0 — Base y limpieza (sin rediseño)

**Tareas:**

1. Ejecuta `npx expo-doctor` y `npx expo install --check`. Corrige incompatibilidades y **reporta la versión real del SDK y de React** (la auditoría original se contradecía).
2. Busca secretos en todo `focusread-app/` (`sk-`, `apiKey`, `api_key`, `Bearer`, `EXPO_PUBLIC_`, `deepseek`). Reporta lo encontrado y elimínalo del código.
3. Solo Android: elimina `react-native-web`, los scripts y la configuración web, y la configuración de iOS.
4. `app.json`:
   - `android.package` (por ejemplo `com.focusread.app`, confírmalo con David);
   - `scheme: "focusread"`;
   - `android.allowBackup: false`;
   - `userInterfaceStyle: "automatic"`.
5. Instala las dependencias de la sección 5.3 (todavía sin usarlas).
6. Configura:
   - `jest-expo` y `@testing-library/react-native`;
   - ESLint (`npx expo lint`) con las reglas de 5.2 (pueden quedar como `warn` hasta F3);
   - `babel-plugin-transform-remove-console` solo en producción;
   - `src/lib/logger.ts`, que no imprime nada en release.
7. Crea `.env.example` con: `EXPO_PUBLIC_DATA_MODE=mock`, `EXPO_PUBLIC_API_URL=`, `EXPO_PUBLIC_SUPABASE_URL=`, `EXPO_PUBLIC_SUPABASE_ANON_KEY=`. Documenta que **son valores públicos** y que ningún secreto puede llevar el prefijo `EXPO_PUBLIC_`.

**Verificación:**

- `npx expo-doctor` sin errores.
- `npx tsc --noEmit` y `npx jest` pasan.
- La app arranca en Android igual que antes.
- La búsqueda de secretos no encuentra nada.

### F1 — Tokens y tema

**Tareas:**

1. Implementa `tokens/` exactamente según la sección 6.
2. Implementa `ThemeProvider` y `useTheme()`, que exponen tokens semánticos y de componente del tema activo, `readerFontScale` y `reduceMotion`.
3. Implementa `settingsStore` (Zustand). En F1 persiste tema y `readerFontScale` detrás de la interfaz `SettingsRepository` (versión local); en F8 se sincroniza con Supabase.
4. Carga Newsreader e Inter con `expo-font`. Muestra una pantalla de carga mientras las fuentes cargan.
5. Escribe un **test de contraste** que calcule la relación WCAG de todos los pares de 6.2 en los 3 temas y falle si alguno no cumple.
6. Migra los usos de `src/theme/tokens.ts` y elimínalo al terminar.

**Verificación:**

- El test de contraste pasa.
- Tema y tamaño de fuente sobreviven a un reinicio.
- Se ve Newsreader/Inter, no Roboto.

### F2 — Átomos, moléculas y catálogo

**Tareas:**

1. Implementa los átomos y las moléculas de la sección 7, usando solo tokens.
2. Crea `DevCatalogScreen` (solo `__DEV__`): cada componente en todos sus estados (normal, presionado, deshabilitado, error, cargando), con un selector de tema.
3. Escribe tests de render y accesibilidad por átomo (rol, label y estado).
4. Activa como `error` las reglas ESLint de dependencias para `atoms/` y `molecules/`.

**Verificación:**

- `grep -rE "#[0-9a-fA-F]{3,8}|rgba?\(" src/design-system --include=*.tsx` → 0 resultados fuera de `tokens/`.
- El catálogo se ve bien en los 3 temas.
- TalkBack lee correctamente cada control.

### F3 — Organismos, templates y responsive

**Tareas:**

1. Implementa `useWindowClass()` basado en `useWindowDimensions` (nunca `Dimensions.get` en el render).
2. Implementa los organismos y templates de la sección 7 y agrégalos al catálogo con datos de ejemplo.
3. `ReaderTemplate`: columna centrada con `readerMaxWidth`. `ScreenTemplate`: `contentMaxWidth` y `gutter` por clase de ventana.
4. `AudioMiniDock`, `BottomTabBar` y `SheetTemplate` respetan los insets inferiores (edge-to-edge y navegación por gestos).
5. `AuthTemplate`, `ImportSheet` y `ProviderKeyForm` usan `KeyboardAvoidingView`.
6. `WeeklyChart` calcula la altura relativa de las barras y da a cada barra un `accessibilityLabel` ("Lunes, 12 minutos").
7. Activa como `error` todas las reglas ESLint de dependencias.

**Verificación (matriz responsive, documentada con capturas en el reporte):**

| Dispositivo | Fuente del sistema | Orientación |
|---|---|---|
| Emulador 360 × 800 dp | 100 %, 130 %, 200 % | Vertical y horizontal |
| Emulador 411 × 914 dp | 100 %, 200 % | Vertical y horizontal |
| Tablet o plegable 800 dp+ | 100 % | Vertical y horizontal |

Sin textos cortados ni solapados. El dock nunca queda bajo la barra de gestos. El lector no supera 640 dp de ancho.

### F4 — Dominio, datos locales y adaptadores

**Tareas:**

1. Copia literal la sección 3.1 en `src/domain/contract.ts`.
2. `src/domain/ports.ts`:

   ```ts
   interface AuthRepository {
     getSession(); onAuthChange(cb); signUp(email, password); signIn(email, password);
     signOut(); requestPasswordReset(email); updatePassword(newPassword);
     handleAuthCallback(url); deleteAccount();
   }
   interface ArticleRepository {
     list(filter); getWithDoses(id); setBookmarked(id, value); remove(id);
   }
   interface ProgressRepository {
     recordSession(session); listSessions(sinceIso); articleProgress();
   }
   interface SettingsRepository { get(); update(partial); }
   interface AIGateway {
     listProviders(); testProvider(provider, model?, key); process(req, key?); usage();
   }
   interface SecretStore {
     getAIKey(provider); setAIKey(provider, key); deleteAIKey(provider); clearAll();
   }
   ```

3. **SQLite (`data/local/`):**
   - tablas `articles`, `doses`, `quiz_questions`, `reading_sessions_outbox`, `settings`, `meta(schema_version)`;
   - migraciones versionadas;
   - toda operación compuesta dentro de `withTransactionAsync`.
4. `LocalArticleRepository` y `LocalProgressRepository` sobre SQLite (en modo mock son la fuente de verdad; en modo live pasan a ser caché).
5. `domain/stats.ts` calcula desde las sesiones (remotas + pendientes en la outbox), con la **zona horaria del dispositivo**:
   - minutos reales (`activeSeconds`);
   - dosis completadas;
   - **racha** (días locales consecutivos con al menos una sesión completada);
   - últimos 7 días;
   - retención del quiz (`quizCorrect = true` / sesiones con quiz).
6. `domain/chunker.ts` implementa la sección 3.5.
7. `LocalChunkerGateway` (modo mock):
   - acepta **solo texto**;
   - con URL lanza `URL_FETCH_FAILED` con el mensaje "La importación de enlaces requiere conexión con el servidor";
   - genera título con las primeras palabras, `summaryPoints: []` y `quiz: null`;
   - **nunca inventa contenido**.
8. `HttpAIGateway` (implementación real, probada con `fetch` simulado):
   - valida request y response con el contrato;
   - envía `Authorization` y, si aplica, `X-AI-Key`;
   - mapea `ApiError` a errores tipados;
   - timeout de 90 s con `AbortController`.
9. `SecureSecretStore` (`expo-secure-store`, una clave por proveedor) y `LargeSecureStore` (patrón de Supabase: la sesión se cifra con AES y una llave aleatoria en SecureStore; el blob cifrado va a AsyncStorage).
10. `MockAuthRepository`:
    - acepta cualquier email con formato válido y contraseña de 8 o más caracteres;
    - **no guarda contraseñas**;
    - simula la verificación de correo.
11. `container.ts`: con `EXPO_PUBLIC_DATA_MODE=mock` usa adaptadores mock/local; con `live` usa Supabase y la API (implementados en F8).
12. **Elimina** `deepSeekService.ts`, `storageService.ts` y `mockArticles.ts`. El contenido demo pasa a `data/mock/demoArticles.ts`, con textos originales.

**Verificación:**

- Tests del chunker (límites 0.85 / 1.3 / 0.4, máximo 20).
- Tests de stats (racha que cruza medianoche, cambio de semana, días sin lectura).
- Tests de migraciones (se aplican una sola vez).
- Test de `HttpAIGateway` con respuestas OK y cada código de error.
- Test de `SecureSecretStore`: la key **no** aparece en SQLite ni en AsyncStorage.
- `grep -ri "api.deepseek.com" src` → 0 resultados.

### F5 — Navegación y pantallas de autenticación

**Tareas:**

1. `RootNavigator`:
   - sin sesión → `AuthStack`;
   - con sesión → `AppStack` (`AppTabs` + Lector + Importar + Motor de IA + Cuenta).
2. `AppTabs` con `BottomTabBar` propio, **sin swipe** y montaje perezoso (`lazy`).
3. El botón atrás de Android cierra, en este orden: sheet → lector → pestaña distinta de Biblioteca → salir.
4. `linking.ts` con `focusread://auth/callback` y `focusread://auth/reset`.
5. Pantallas de auth (usando `AuthForm` y `AuthTemplate`):
   - validación zod (email válido; contraseña de 8 o más caracteres con letras y números);
   - estados de carga y error;
   - mensajes de `i18n/es.ts`.
6. Registro → pantalla "Verifica tu correo" (con reenvío limitado a una vez cada 60 s).
7. Botón "Entrar en modo demo" **solo en `__DEV__`**.
8. `App.tsx` queda en **menos de 60 líneas**: `GestureHandler`, `SafeAreaProvider`, `QueryClientProvider`, `ThemeProvider`, `NavigationContainer` y `RootNavigator`.

**Verificación:**

- El botón atrás se comporta según el punto 3.
- `wc -l App.tsx` < 60.
- Solo se monta la pestaña visible.
- El botón demo no existe en un build de producción.

### F6 — Rediseño de pantallas

**Tareas:**

1. **Biblioteca** (fusión de Explorar y Mi Dosis):
   - `ContinueReadingCard`, `SearchBar` y `FilterChipGroup` (Todos · En curso · Guardados · Completados · < 3 min);
   - lista de `ArticleCard` (grid según la clase de ventana);
   - **un solo** botón Importar;
   - `EmptyState` y `ErrorState`.
2. **Lector:**
   - `DoseReader` paginado y **barra de progreso** de la dosis (sin cuenta regresiva);
   - `FontSizeStepper` persistente;
   - cambio rápido de tema, que escribe en **el mismo** `settingsStore`;
   - botón de audio y `QuizSheet` al final de la dosis (si el quiz está activo).
   - Mide el **tiempo activo real**: se pausa cuando el `AppState` no es `active` y se limita a 7200 s.
   - Al terminar, registra un `ReadingSession` con UUID de `expo-crypto`.
3. **Importar (sheet):**
   - pestañas Texto / Enlace;
   - selector de duración (1.5 · 2.5 · 3.5);
   - muestra el proveedor activo;
   - estados de procesando, error (mensajes por `ApiErrorCode`) y advertencia si llega `AI_ENRICHMENT_DEGRADED`.
4. **Progreso:** `StatTile` (minutos reales, dosis completadas, racha, retención) y `WeeklyChart`. Se **elimina** "fatiga cognitiva ahorrada".
5. **Ajustes:**
   - **Apariencia:** tema y tamaño de fuente.
   - **Lectura:** duración objetivo y quiz on/off.
   - **Voz:** voces **reales** de `Speech.getAvailableVoicesAsync()` filtradas por `es-*` (reintentar si llegan vacías al inicio), deslizadores de velocidad (0.5–2) y tono (0.5–2), y botón "Probar".
   - **Accesibilidad:** vibración on/off; se respeta "reducir movimiento" del sistema.
   - **Motor de IA:** fila "FocusRead (incluido)"; al tocarla se abre la pantalla con selector de proveedor y modelo (desde `listProviders`), `ProviderKeyForm` (campo enmascarado → `SecureSecretStore`), "Probar conexión" y "Borrar key". En modo mock, "Probar conexión" muestra "Disponible con el servidor". Esta pantalla activa `expo-screen-capture` para impedir capturas.
   - **Cuenta:** email, cerrar sesión, eliminar cuenta (doble confirmación escribiendo "ELIMINAR").
6. Servicios separados: `services/tts` y `services/haptics`. Haptics respeta el ajuste del usuario.
7. **Elimina:** frecuencias binaurales, voces "persona" (Elena, Marcos, Lucía, Mateo, Sofía), karaoke y cualquier switch sin función.

**Verificación:**

- Ninguna pantalla contiene `StyleSheet.create` con valores literales. Solo composición de templates y organismos (se permiten estilos de layout que usen tokens).
- Todos los switches tienen efecto comprobable.
- La key BYOK solo existe en SecureStore.

### F7 — Offline y sincronización (en modo mock, contra un remoto simulado)

**Tareas:**

1. `services/network`: `useIsOnline()` con NetInfo y un `Banner` "Sin conexión" en `ScreenTemplate`.
2. **Artículos:** con conexión se leen del remoto y se guardan en caché; sin conexión se leen de la caché. La caché guarda hasta 50 artículos (LRU), cada uno con sus dosis y quiz.
3. **Sesiones de lectura:** siempre se escriben primero en `reading_sessions_outbox` y luego se ejecuta `flush()`:
   - envío idempotente por `id`;
   - se borra de la outbox solo si la respuesta es OK;
   - reintentos con backoff exponencial;
   - `flush` se dispara al volver al primer plano, al reconectar y al completar una dosis.
4. **Ajustes:** se guardan en local al instante y se suben al reconectar (gana la última escritura, por `updatedAt`).
5. **Requieren conexión** (deshabilitados con mensaje si no hay red): importar, favorito, borrar artículo, probar key y eliminar cuenta.
6. **Cerrar sesión:**
   - `flush` de la outbox; si falla, se advierte al usuario;
   - se limpian la caché SQLite, la outbox, la sesión y las keys BYOK.
7. Crea un `FakeRemote` para tests: simula fallos de red y duplicados.

**Verificación:**

- Test: 3 sesiones offline → reconectar → 3 filas remotas, 0 en la outbox; si se reenvían, siguen siendo 3.
- Test: un artículo abierto se lee sin conexión.
- Prueba manual en modo avión.

> **🔶 HITO H1** → reporte consolidado de F0–F7 y **Auditoría Gemini #1** (sección 11). F8 empieza solo después de **H3**.

### F8 — Integración live (requiere H3)

**Tareas:**

1. `supabaseClient.ts`:
   - `import 'react-native-url-polyfill/auto'`;
   - `createClient(URL, ANON_KEY, { auth: { storage: LargeSecureStore, autoRefreshToken: true, persistSession: true, detectSessionInUrl: false, flowType: 'pkce' } })`;
   - `startAutoRefresh()` y `stopAutoRefresh()` según el `AppState`.
2. `SupabaseAuthRepository`:
   - `signUp` con `emailRedirectTo: 'focusread://auth/callback'`;
   - `signInWithPassword`, `signOut`;
   - `resetPasswordForEmail` con `redirectTo: 'focusread://auth/reset'`;
   - `updateUser({ password })`;
   - `exchangeCodeForSession(code)` en `AuthCallback`;
   - `deleteAccount` → `DELETE /v1/account`, después `signOut` y limpieza.
3. Repositorios Supabase según la tabla 3.4, con `mappers.ts` y validación zod por fila.
   - Las sesiones se envían con `upsert(..., { onConflict: 'id', ignoreDuplicates: true })` **sin** `user_id`.
   - Los artículos se leen con relaciones: `articles` → `doses` → `quiz_questions`. El mapper debe tolerar que `quiz_questions` llegue como objeto o como arreglo.
4. `HttpAIGateway` en modo live:
   - token de `supabase.auth.getSession()`;
   - ante un 401, un solo intento de refresh; si vuelve a fallar, logout;
   - ante un 429, se muestra el tiempo de `Retry-After`.
5. Ajustes › Motor de IA en modo live:
   - proveedores reales;
   - "Probar conexión" real;
   - uso diario visible (`GET /v1/usage`) cuando el proveedor es FocusRead.
6. Configuración de red en desarrollo:
   - emulador → `http://10.0.2.2:8787`;
   - dispositivo físico → `http://<IP-LAN-del-PC>:8787`;
   - en **release, solo HTTPS**.

**Verificación (manual, documentada):**

- Registro → correo → deep link → sesión.
- Login y logout.
- Recuperar contraseña de extremo a extremo.
- Importar texto e importar URL.
- BYOK con key válida e inválida (`PROVIDER_KEY_INVALID`).
- Cuota agotada (`QUOTA_EXCEEDED`).
- Sesiones offline que se sincronizan.
- Eliminar cuenta: los datos desaparecen en Supabase.
- **Aislamiento:** con dos cuentas, ninguna ve datos de la otra.

### F9 — Hardening y APK

**Tareas:**

1. `eas.json` con perfiles:
   - `development` (dev client);
   - `preview` (`buildType: apk`, distribución interna);
   - `production` (`aab`).
   Las variables `EXPO_PUBLIC_*` se definen en EAS por entorno.
2. `expo-build-properties`: `enableProguardInReleaseBuilds: true`, `enableShrinkResourcesInReleaseBuilds: true`.
3. **Permisos:**
   - revisa el APK generado (APK Analyzer de Android Studio o `aapt dump permissions`);
   - agrega a `android.blockedPermissions` todo lo que no se use;
   - justifica cada permiso restante en el reporte.
4. Verifica en release:
   - cero `console.*`;
   - `allowBackup=false`;
   - sin tráfico en texto plano;
   - `__DEV__` es `false` (sin catálogo ni botón demo).
5. **Pase final de accesibilidad** con TalkBack en todas las pantallas y repetición de la matriz responsive de F3.
6. `versionCode` y `version` iniciales. Nombre e ícono finales.
7. Construye el APK con el perfil `preview` y ejecuta el smoke test en un dispositivo físico.

**Verificación:** checklist de F8 repetida sobre el APK, más los puntos 3 y 4.

> **🔶 HITO H4** → **Auditoría Gemini final**.

---

## 10. Formato del reporte de fin de fase

```md
## Reporte F# — <nombre>
- Estado: completa | parcial (explicar)
- Archivos creados / modificados / eliminados
- Verificaciones ejecutadas (comando → resultado resumido)
- Criterios de aceptación: ✅/❌ por ítem
- Problemas de la tabla §4 cerrados en esta fase (P#)
- Desviaciones del plan y por qué
- Riesgos / pendientes
- Cambios de contrato solicitados (si aplica — NO aplicados)
```

---

## 11. Checklist de auditoría Gemini (frontend)

Para cada ítem, Gemini responde **Cumple / No cumple / Parcial**, con **evidencia `archivo:línea`**.

| # | Ítem | Cómo verificar |
|---|---|---|
| A1 | No hay secretos en el código ni llamadas directas a proveedores de IA | grep `sk-`, `api.deepseek.com`, `openai.com`, `generativelanguage` |
| A2 | La key BYOK solo se usa vía `SecureSecretStore` y solo viaja en el header `X-AI-Key` | Revisar `SecureSecretStore`, `HttpAIGateway` y cualquier uso de AsyncStorage |
| A3 | La sesión de Supabase se guarda cifrada (`LargeSecureStore`) | `supabaseClient.ts` |
| A4 | Toda frontera externa se valida con zod (API, filas de Supabase, SQLite) | `HttpAIGateway`, `mappers.ts`, repositorios |
| A5 | La app nunca inserta en `articles`, `doses` ni `quiz_questions` | grep `.from('articles').insert` y similares |
| A6 | Tokens en 3 niveles; cero literales de color o tamaño fuera de `tokens/` | grep de hex y números en `design-system` y `features` |
| A7 | Reglas de dependencia atómica activas y sin violaciones | Config de ESLint + `npx expo lint` |
| A8 | Test de contraste presente y aprobado en los 3 temas | Test + salida |
| A9 | Responsive: `useWindowDimensions`, safe areas, `readerMaxWidth`, escala de fuente sin bloquear | `layout/`, templates |
| A10 | Accesibilidad: roles, labels, 48 dp, "reducir movimiento" | Átomos + muestra de pantallas |
| A11 | Navegación: sin swipe, botón atrás correcto, montaje perezoso, `App.tsx` < 60 líneas | `navigation/`, `App.tsx` |
| A12 | Stats calculadas desde sesiones, con tests de racha y semana | `domain/stats.ts` + tests |
| A13 | Outbox idempotente, limpieza de datos al cerrar sesión | `services/sync`, tests |
| A14 | Eliminados: binaural, voces falsas, karaoke, cuenta regresiva, "fatiga ahorrada", demo en release | grep + revisión de pantallas |
| A15 | Release: sin `console`, `allowBackup=false`, permisos mínimos justificados, R8 activo | `app.json`, `eas.json`, babel, reporte F9 |
| A16 | Contrato copiado literal (sin divergencias frente a la sección 3.1) | diff contra el plan |

---

## 12. Definición de terminado (frontend)

- F0–F9 con reportes y criterios en ✅.
- Auditoría Gemini sin ítems "No cumple" abiertos.
- APK `preview` instalada en un dispositivo físico, con el smoke test aprobado.
- `npx tsc --noEmit`, `npx jest`, `npx expo lint` y `npx expo-doctor` en verde.
