# Correos de FocusRead con remitente propio (SMTP + plantillas)

Los correos de registro y de recuperar contraseña los sigue enviando Supabase, pero a través de tu proveedor de correo y con
el remitente y el texto de FocusRead. Todo es configuración en el panel de Supabase: no cambia la app ni hace falta un APK nuevo.

## 1. Proveedor de correo (Brevo, plan gratuito, sin dominio propio)
1. Crea una cuenta en https://www.brevo.com y confirma tu correo.
2. **Senders, Domains & Dedicated IPs › Senders › Add a sender**: nombre `FocusRead`, correo = uno tuyo real (Brevo te envía un código para verificarlo).
3. **SMTP & API › SMTP › Generate a new SMTP key**. Copia la clave (solo se muestra una vez). **No la pegues en el chat ni en el repo.**
   - Servidor: `smtp-relay.brevo.com` · Puerto: `587`
   - Usuario (login SMTP): el que muestra esa misma página (no es tu correo personal).

Alternativa: Resend (https://resend.com). Necesita verificar un dominio propio para enviar a cualquier destinatario.
Sin dominio verificado los correos pueden ir a spam; en pruebas, revisa la carpeta de spam.

## 2. Conectarlo en Supabase
Authentication › **SMTP Settings** › activa *Enable custom SMTP*:
- Sender email: el correo verificado en Brevo · Sender name: `FocusRead`
- Host `smtp-relay.brevo.com` · Port `587` · Username: login SMTP · Password: la clave SMTP
- Guarda. Después, en Authentication › **Rate Limits** puedes subir *Rate limit for sending emails* (con SMTP propio ya se permite).

## 3. Plantillas en español
Authentication › **Email Templates**. Pega asunto y cuerpo en cada una. No cambies las variables `{{ ... }}`.

### Confirm signup
Asunto: `Confirma tu cuenta de FocusRead`
```html
<div style="font-family:Arial,Helvetica,sans-serif;background:#FBF8FF;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #C4C5D7;border-radius:16px;padding:32px;color:#1A1B22;">
    <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#1D4ED8;">FocusRead AI</p>
    <h1 style="margin:0 0 16px;font-size:22px;">Confirma tu cuenta</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#434655;">
      Gracias por registrarte. Toca el botón para activar tu cuenta y empezar a leer en dosis cortas.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1D4ED8;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:999px;">
      Confirmar mi cuenta
    </a>
    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#5E6070;">
      Abre este correo en el teléfono donde instalaste FocusRead. Si no creaste esta cuenta, ignora este mensaje.
    </p>
  </div>
</div>
```

### Reset password
Asunto: `Recupera tu contraseña de FocusRead`
```html
<div style="font-family:Arial,Helvetica,sans-serif;background:#FBF8FF;padding:24px;">
  <div style="max-width:480px;margin:0 auto;background:#FFFFFF;border:1px solid #C4C5D7;border-radius:16px;padding:32px;color:#1A1B22;">
    <p style="margin:0 0 4px;font-size:14px;font-weight:bold;color:#1D4ED8;">FocusRead AI</p>
    <h1 style="margin:0 0 16px;font-size:22px;">Crea una contraseña nueva</h1>
    <p style="margin:0 0 24px;font-size:16px;line-height:24px;color:#434655;">
      Recibimos una solicitud para cambiar la contraseña de tu cuenta. Toca el botón para elegir una nueva.
    </p>
    <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#1D4ED8;color:#FFFFFF;text-decoration:none;font-weight:bold;font-size:16px;padding:14px 28px;border-radius:999px;">
      Cambiar mi contraseña
    </a>
    <p style="margin:24px 0 0;font-size:13px;line-height:20px;color:#5E6070;">
      Si no lo pediste, ignora este mensaje: tu contraseña no cambia.
    </p>
  </div>
</div>
```

Las demás plantillas (Magic link, Invite, Change email) la app no las usa; puedes dejarlas como están.

## 4. Comprobación
1. Con la app instalada, crea una cuenta con otro correo tuyo. El correo debe llegar de "FocusRead" con el diseño de arriba.
2. Toca el botón desde el teléfono: debe abrir la app (requiere `focusread://auth/callback` en Authentication › URL Configuration › Redirect URLs).
3. Repite con "¿Olvidaste tu contraseña?" (`focusread://auth/reset`).
4. Si no llega, revisa spam y el registro de envíos de Brevo (Transactional › Logs).
