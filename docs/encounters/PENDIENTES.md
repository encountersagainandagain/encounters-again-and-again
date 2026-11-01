# Pendientes del lanzamiento

Tareas que esperan una decisión o un momento de Juani. Cada una dice qué falta, por qué espera y cómo se hace. Se
actualiza al resolver cada punto. Ninguna se hace sin el OK explícito de Juani en la conversación del momento.

## 1. Mover el dominio final de WordPress a este proyecto en Vercel

**Estado (2026-11-01):** el dominio final (`www`) ya existe pero apunta al WordPress actual (Hostinger). El sitio nuevo vive en
https://encounters-again-and-again-gamma.vercel.app, con `noindex`.

**Por qué espera:** el cambio de DNS deja de mostrar WordPress; se hace una sola vez, con todo lo de abajo listo y con Juani.

**Antes del cambio**
- Contenido real cargado y revisado; quitar o despublicar el contenido de ejemplo (`demo-*`, «Example»).
- Redirecciones de las URLs viejas de WordPress a las nuevas: inventario en `encounters-redirects-plan.json` (12 páginas/posts y
  50 imágenes); reglas en `routes-and-seo.md` (301/308 solo hacia destinos publicados que respondan 200, nunca todo a Home).
- Pruebas en Safari, iPhone, iPad, Android y red lenta; aligerar portadas pesadas (Crew 374 KB, Contact 220 KB).
- Retirar los parámetros de prueba `?scroll=native` y `?calc=a`.
- Respaldo de la base real (`node scripts/production-backup.mjs before-launch`).

**El cambio**
1. En Vercel, proyecto del cliente `encountersagainandagains-projects/encounters-again-and-again` → Settings → Domains: agregar el
   dominio con y sin `www` (uno redirige al otro).
2. En el proveedor de DNS: los registros que indique Vercel (A del dominio raíz y CNAME de `www`). Esto apaga WordPress para
   los visitantes; WordPress y Hostinger no se tocan ni se borran.
3. Actualizar la URL del sitio: `NEXT_PUBLIC_SITE_URL` en Vercel y Site URL / Redirect URLs en Supabase Auth (login del admin).
4. Quitar `noindex` (cabecera `X-Robots-Tag`, meta robots y `robots.txt`) y confirmar el sitemap.
5. Volver a desplegar `main` y verificar: Home, cada página, admin, redirecciones con `curl -I`, certificado HTTPS.
6. Google Search Console: verificar el dominio y enviar el sitemap.

## 2. Envío de emails con Resend (Contact y newsletter)

**Estado (2026-11-01):** el código está listo y desplegado. `/api/contact` envía cuando está configurado; si no, el formulario
abre el programa de correo del visitante, como hasta ahora. El newsletter ya guarda suscriptores; escribirles desde
Admin → Newsletter espera el envío.

**Por qué espera:** para enviar desde una dirección propia (y a cualquier destinatario, como hace el newsletter) Resend pide
verificar el dominio con registros DNS. Conviene hacerlo junto con el punto 1, cuando el dominio ya esté en manos de este
proyecto.

**Pasos**
1. Crear la cuenta de Resend (plan gratis alcanza para empezar), con un email del colectivo.
2. Resend → Domains: agregar el dominio final y cargar en el DNS los registros que indica (SPF, DKIM y, recomendado, DMARC).
   Esperar a que figure «Verified».
3. Resend → API Keys: crear una clave solo de envío.
4. Vercel → proyecto del cliente → Settings → Environment Variables (Production), cargadas por Juani (son secretas):
   - `RESEND_API_KEY` = la clave del paso 3;
   - `CONTACT_FROM_EMAIL` = por ejemplo `Encounters website <hello@dominio>` (remitente de los mensajes del formulario);
   - `NEWSLETTER_FROM_EMAIL` = por ejemplo `Encounters <news@dominio>`; `NEWSLETTER_REPLY_TO_EMAIL` = a dónde llegan las respuestas;
   - `ENCOUNTERS_EMAIL_ENABLED` = `true` (el interruptor general; sin él no sale ningún email).
5. Volver a desplegar `main` para que tome las variables.
6. Prueba real, con OK de Juani: un mensaje desde /contact que llegue al email de contacto de Settings (responder debe ir al
   visitante); luego un newsletter de prueba a una lista con solo el email de Juani.

**Atajo posible antes del dominio:** sin dominio verificado Resend solo envía desde `onboarding@resend.dev` al email dueño de
la cuenta. Sirve para Contact si la cuenta de Resend se crea con el mismo email de contacto de Settings; no sirve para el
newsletter.
