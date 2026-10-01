# F8 — Cómo probar el modo live (guía para David)

El código de F8 está hecho y probado con pruebas automáticas (Supabase y backend simulados). Lo que falta
es la **verificación manual de extremo a extremo**, que necesita tu backend, tu proyecto Supabase y tu teléfono.

## 1. Backend
**Ya está desplegado y verificado en producción (según el agente backend): `https://focusread-api.onrender.com`**
(HTTPS forzado). Úsalo como `EXPO_PUBLIC_API_URL` y no necesitas correr nada en tu PC.
Notas: Render gratis duerme tras 15 min sin tráfico y tarda ≈1 min en despertar (la app llama a `/health` al
abrir; el primer procesamiento puede tardar más). Límites: 10 solicitudes/min por usuario (`RATE_LIMITED`) y
10 artículos/día con la key del servidor (`QUOTA_EXCEEDED`); con tu propia key (BYOK) no consume cuota.
Alternativa local: en `back-mobile/.env` `DATA_MODE=live` y `npm run dev` (puerto 8787).

## 2. Panel de Supabase (Authentication → URL Configuration)
Agrega en **Redirect URLs** (los enlaces del correo solo funcionan si están en la lista):
- `focusread://auth/callback` y `focusread://auth/reset` (APK / dev build)
- Para **Expo Go** el enlace tiene la forma `exp://<IP-del-PC>:8081/--/auth/callback` y `.../--/auth/reset`.
  Usa un patrón, por ejemplo `exp://192.168.*.*:8081/--/**` (o la IP exacta que veas en la terminal de Expo).
Además: **Confirm email** activado (flujo con verificación). Nota: el correo gratuito de Supabase tiene un límite
bajo de envíos por hora; si falla un registro, espera o configura un SMTP propio.

## 3. `.env` del frontend (`focusread-app/.env`, ignorado por git)
```
EXPO_PUBLIC_DATA_MODE=live
EXPO_PUBLIC_API_URL=https://focusread-api.onrender.com   # producción (recomendado). Local: http://<IP-LAN-de-tu-PC>:8787 · emulador: http://10.0.2.2:8787
EXPO_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon key>               # pública por diseño; NUNCA la service_role
# EXPO_PUBLIC_CLOUD_TTS=1                              # solo cuando el backend tenga /v1/tts
```
- En **release** la API debe ser HTTPS (la app lo exige y falla al iniciar con un mensaje claro si no).
- Si falta alguna variable, la app muestra "No se pudo iniciar FocusRead" con el detalle.
- Reinicia Expo con caché limpia: `npx expo start -c`.
- Tu PC y el teléfono deben estar en la misma red y el firewall de Windows debe permitir el puerto 8787.

## 4. Checklist de verificación (plan F8)
1. Registro → llega el correo → tocar el enlace → vuelve a la app con la sesión iniciada.
   (En Expo Go el enlace abre `exp://…`; en el APK, `focusread://…`.)
2. Cerrar sesión e iniciar sesión de nuevo.
3. Recuperar contraseña de extremo a extremo (correo → enlace → nueva contraseña → login).
4. Importar **texto** (≥ 300 caracteres) e importar una **URL**.
5. BYOK: Ajustes › Motor de IA › DeepSeek con una key válida y con una inválida (`PROVIDER_KEY_INVALID`).
6. Cuota agotada (`QUOTA_EXCEEDED`) — mensaje con el tiempo de espera.
7. Leer sin conexión (modo avión): las sesiones se guardan y se sincronizan al reconectar.
8. Eliminar cuenta: los datos desaparecen en Supabase (revisa tablas `articles`, `reading_sessions`).
9. **Aislamiento:** con dos cuentas distintas, ninguna ve los datos de la otra (artículos, progreso, ajustes).
   Cambia de cuenta en el mismo teléfono: no debe verse nada de la anterior.

## 5. Qué esperar
- Al registrarse la base crea 3 artículos `demo` por usuario (lo hace el esquema).
- Render gratis duerme tras 15 min: la app llama a `/health` al abrir para despertarlo (el primer
  procesamiento puede tardar ≈1 min).
- Los artículos largos por URL se recortan en silencio (contrato congelado; ver C1 en `back-mobile/NOTAS_BACKEND.md`).
