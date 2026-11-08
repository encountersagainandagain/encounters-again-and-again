# Migración del dominio encountersagainandagain.com a este proyecto (plan del 2026-11-08)

Objetivo: que `encountersagainandagain.com` deje de mostrar el WordPress de Hostinger y muestre este sitio (Vercel), **sin
romper nada**: ni las direcciones que Google y la gente ya tienen, ni el login del admin, ni los emails. Después, activar
Resend para el formulario de Contact y el newsletter.

Reglas: el cambio de DNS lo hace Juani en Hostinger (o lo hacemos juntos), con este plan delante. WordPress y Hostinger no
se borran: quedan como respaldo hasta que el sitio nuevo esté estable. Cada paso dice cómo se verifica y cómo se vuelve atrás.

## 0. Cómo está hoy (inventario del 2026-11-08, consultas públicas)

| Qué | Valor | Qué significa |
|---|---|---|
| Registrador | Hostinger, vence **2027-01-11** | Renovar antes; el registro sigue en Hostinger, no hace falta transferirlo |
| Nameservers | `ns1/ns2.dns-parking.com` (los de Hostinger) | El DNS se edita en Hostinger → Domains → DNS / Nameservers. No se cambian los nameservers |
| `A` del dominio | `88.223.87.147`, `147.79.72.241` (Hostinger, TTL ~60 s) | Es lo que se cambia a Vercel |
| `AAAA` del dominio | dos direcciones IPv6 de Hostinger | **Se borran**: si quedan, quien entra por IPv6 sigue viendo WordPress |
| `www` | `CNAME` a `…cdn.hstgr.net` (TTL ~300 s) | Se cambia al CNAME de Vercel |
| Correo | **No hay registros MX** (usan Gmail) | El cambio no corta ningún email |
| `ftp` | `A` 145.223.108.162 | Es del hosting; se deja como está |
| Dirección principal | sin `www` (`https://encountersagainandagain.com/`) | Se mantiene: el sitio nuevo también va sin `www` y `www` redirige |
| WordPress | PHP 8.3, Elementor, indexado, `sitemap_index.xml` | 15 páginas en el sitemap (más 4 plantillas internas de Elementor) |
| Otro dominio | `encountersagainandagain.org` (el libro) | No se toca |
| CDN de Hostinger | Activo (`server: hcdn`) | El día del cambio, apagarlo en hPanel (Websites → CDN) para que no siga sirviendo WordPress |
| Google en el WordPress | Sin etiqueta de Search Console ni Google Analytics ni píxeles (revisado el 2026-11-08) | No hay nada que trasladar; Search Console se verifica por DNS (`TXT`) |
| WordPress en sí | No se toca | Todo el cambio es en Hostinger (DNS), Vercel y Supabase; el WordPress sigue en el hosting, solo deja de verse por el dominio |

TTL bajos (60–300 s): el cambio se ve en minutos y, si algo sale mal, volver atrás también.

### Direcciones del WordPress y dónde tienen que llegar

Probado contra el sitio nuevo (`curl -L`). Desde el 2026-11-08 (commit `517d723`) todas llegan a su página:

| Dirección vieja | Debe ir a | Hoy en el sitio nuevo |
|---|---|---|
| `/` | `/` | ✅ 200 |
| `/about/` | `/about` | ✅ 308 → 200 |
| `/elementor-page-3462/` (Meet The Team) | `/crew` | ✅ |
| `/elementor-2907/` (Wild Wonders) | `/crew/wild-wonders` | ✅ |
| `/you-never-know-what-encounter-could-change-your-life/` | su mensaje en `/meaningful-messages` | ✅ |
| `/elementor-3062/` (Expeditions) | `/expeditions` | ✅ (redirige) |
| `/elementor-page-3107/` (Artsy Animals) | `/workshops` | ✅ (redirige) |
| `/contact-3/` | `/contact` | ✅ (redirige) |
| `/form/`, `/form/simple-contact-form/` | `/contact` | ✅ (redirige) |
| `/category/you-never-know-what-encounter-could-change-your-life/` | `/meaningful-messages` | ✅ (redirige) |
| `/services-3/` | `/` (no tiene equivalente) | ✅ (redirige) |
| `/shop/`, `/checkout/`, `/customer-dashboard/` | `/art` (la tienda no existe; lo más cercano son las obras) | ✅ (redirige) |
| `/wp-content/uploads/…` (imágenes indexadas) | 410 Gone (no vuelven) | ✅ 410 |
| `/feed/`, `/wp-json/…`, `/wp-admin/`, `/wp-login.php` | 410 Gone | ✅ 410 |

## 1. Preparar el sitio nuevo (lo hago yo; no cambia nada para los visitantes de hoy)

- [x] **1.1 Redirecciones completas.** Que todas las direcciones de la tabla lleguen a su página: migración que suma las que
  faltan a `route_history` y deja que el resolvedor redirija también a las páginas fijas (`/expeditions`, `/workshops`,
  `/contact`, `/meaningful-messages`, `/art`, `/`). Las de WordPress que no vuelven (`wp-content`, `wp-json`, `wp-admin`,
  feeds) responden **410 Gone**, que le dice a Google que las saque rápido. Verificación: la tabla de arriba, todo en ✅.
  Hecho (2026-11-08): las que faltaban están en `src/config/legacy-wordpress.ts` (se aplica en `proxy.ts`, antes que todo, sin depender de la base; probado en `scripts/check-legacy-wordpress.mjs`); las que ya estaban en `route_history` siguen igual. Verificado en producción: las 15 direcciones del sitemap del WordPress llegan a su página y `wp-content`, `wp-admin` y `feed` responden 410.
- [ ] **1.2 `www` y barra final.** (barra final ✅; `www` se configura el día del cambio, paso 3.1) En el sitio nuevo, `www` redirige a la dirección sin `www` (se configura en Vercel al
  agregar el dominio) y `/about/` → `/about` (ya funciona).
- [x] **1.3 Ensayo completo en la URL de revisión.** Correr el chequeo de todas las direcciones viejas, el sitemap, el admin,
  Contact y una muestra de páginas, y dejar el resultado anotado acá.
  Hecho (2026-11-08): direcciones viejas ✅ (arriba); sitemap 23 páginas con fecha; SEO y datos estructurados verificados (`seo-plan.md`). Repetir el día del cambio contra el dominio real.

## 2. Antes del día del cambio (Juani)

- [ ] **2.1 Contenido listo** y el de ejemplo retirado (`demo-*`, «Example»), textos de SEO revisados (`seo-plan.md` C).
- [ ] **2.2 Respaldo del WordPress** desde Hostinger (hPanel → Backups: archivos + base de datos) y descargarlo. Respaldo de la
  base del sitio nuevo: `node scripts/production-backup.mjs before-launch`.
- [ ] **2.3 Anotar los valores actuales del DNS** (la tabla de la sección 0): son la vuelta atrás.
- [ ] **2.4 Search Console:** si ya existe la propiedad del dominio, mirar «Páginas» y las búsquedas que traen visitas, para
  compararlas después. Si no existe, crearla como **Domain property** (pide un registro `TXT` en Hostinger; no afecta nada).
- [ ] **2.5 Elegir el momento:** un día y hora con poco tráfico (de noche en Australia), con Juani disponible una hora.

## 3. El día del cambio (Juani en Hostinger y Vercel; yo verificando)

Orden pensado para que el sitio nunca quede caído.

1. **Vercel → proyecto `encountersagainandagains-projects/encounters-again-and-again` → Settings → Domains:** agregar
   `encountersagainandagain.com` y `www.encountersagainandagain.com`, con **www redirigiendo** a la dirección sin www.
   Vercel muestra los valores exactos que pide (un `A` para el dominio y un `CNAME` para www). Todavía no cambia nada.
2. **Vercel → Settings → Environment Variables (Production):**
   - `NEXT_PUBLIC_SITE_URL` = `https://encountersagainandagain.com` (canonicals, sitemap y datos estructurados).
   - `ENCOUNTERS_INDEXABLE` = `true` (abre el sitio a buscadores; `seo-plan.md` A8).
3. **Supabase → Authentication → URL Configuration:** Site URL `https://encountersagainandagain.com` y sumar
   `https://encountersagainandagain.com/**` a Redirect URLs (sin sacar la de revisión hasta el final).
4. **Hostinger → Domains → encountersagainandagain.com → DNS / Nameservers → DNS records:**
   - `A` `@`: borrar `88.223.87.147` y `147.79.72.241`; crear el `A` que dio Vercel.
   - `AAAA` `@`: **borrar los dos**.
   - `CNAME` `www`: cambiar `…cdn.hstgr.net` por el `CNAME` que dio Vercel.
   - No tocar `ftp`, `TXT` ni nada más. Si Hostinger tiene activado su **CDN** para el dominio, apagarlo (si no, sigue
     sirviendo WordPress).
5. **Vercel → Deployments → volver a desplegar `main`** para que tome las variables. Esperar a que Domains muestre el dominio
   como válido y con certificado (HTTPS automático, minutos).
6. **Verificación (yo):**
   - `https://encountersagainandagain.com` y `https://www…` (redirige) muestran el sitio nuevo, con HTTPS.
   - `dig` del dominio: solo el `A` de Vercel, sin `AAAA` de Hostinger.
   - Las 15 direcciones viejas llegan a su página (sección 0).
   - `robots.txt` abierto con el sitemap; `/sitemap.xml` con el dominio nuevo; canonicals con el dominio nuevo.
   - Admin: login, guardar algo, la página pública se actualiza.
   - Contact, Home, Art, una obra, Expeditions, Workshops y Messages en teléfono y escritorio.

**Volver atrás** (si algo grave falla): en Hostinger, poner de nuevo los `A`, `AAAA` y el `CNAME` de www anotados en 2.3.
En unos minutos vuelve WordPress. Las variables de Vercel se pueden dejar: no afectan a WordPress.

## 4. Después del cambio

- [ ] **4.1 Search Console:** enviar `https://encountersagainandagain.com/sitemap.xml`; mirar «Páginas» y «Sin encontrar (404)»
  durante 2–4 semanas y sumar redirecciones si aparece alguna dirección vieja que se escapó.
- [ ] **4.2 Prueba de resultados enriquecidos** (obra, expedición, workshop, historia) y **PageSpeed** móvil.
- [ ] **4.3 Sacar la URL de revisión** de Supabase → Redirect URLs y dejar `-gamma.vercel.app` solo como alias (Vercel la
  marca `noindex` sola).
- [ ] **4.4 Hosting de WordPress:** mantenerlo 1–2 meses como respaldo y después decidir si se da de baja el plan de hosting
  (el dominio se sigue renovando en Hostinger igual).
- [ ] **4.5 Renovar el dominio** antes del 2027-01-11 (activar la renovación automática).

## 5. Emails con Resend (Contact y newsletter), con el dominio ya funcionando

Detalle en `PENDIENTES.md` §2. Con el dominio en este proyecto:

1. **Cuenta de Resend** con `encountersagainandagain@gmail.com`.
2. **Resend → Domains → Add domain:** `encountersagainandagain.com`, región Tokio o Sídney si la ofrece. Resend pide registros
   en un subdominio de envío (`send.…`): un `MX` y un `TXT` (SPF) en `send`, y un `TXT` de DKIM en `resend._domainkey`.
   Como el dominio **no tiene correo propio**, no chocan con nada. Sumar también `TXT` `_dmarc` = `v=DMARC1; p=none;
   rua=mailto:encountersagainandagain@gmail.com` (recomendado, mejora la entrega). Esperar «Verified».
3. **Vercel → Environment Variables (Production):**
   - `RESEND_API_KEY` (clave solo de envío, la carga Juani);
   - `CONTACT_FROM_EMAIL` = `Encounters website <website@encountersagainandagain.com>`;
   - `NEWSLETTER_FROM_EMAIL` = `Encounters <news@encountersagainandagain.com>`;
   - `NEWSLETTER_REPLY_TO_EMAIL` = `encountersagainandagain@gmail.com`;
   - `ENCOUNTERS_EMAIL_ENABLED` = `true`. Volver a desplegar.
4. **Prueba de Contact** (con OK de Juani): un mensaje desde `/contact` llega a `encountersagainandagain@gmail.com` (el email
   de Settings), con el tema como asunto, y al responder le contesta al visitante. Revisar que no caiga en Spam.
5. **Prueba de newsletter:** un envío a una lista con solo el email de Juani; revisar remitente, enlaces y la baja
   (`/unsubscribe/…`). Recién después, el primer envío real.

`news@` y `website@` no necesitan existir como casillas: solo envían. Las respuestas al newsletter van al Gmail
(`NEWSLETTER_REPLY_TO_EMAIL`); las de Contact, al visitante.
