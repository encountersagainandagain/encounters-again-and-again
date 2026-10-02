# PASO 2 — servicios y configuración

Cuenta administradora de servicios: encounters.services@outlook.com. No es automáticamente contacto público, remitente ni admin del CMS. No se conectó ningún servicio en PASO 1. `.env.example` contiene exactamente las ocho variables usadas por el código activo (cinco en la tabla Supabase/configuración y tres de Resend).

## Supabase nuevo: DB + Auth + Storage

Crear proyecto Encounters separado de Katie. Juani aporta valores en .env.local (ignorado), nunca chat/commits. Antes de usarlo confirmar URL y project ref propio. No copiar tablas, usuarios, medios ni suscriptores de Katie.

| Variable | Origen | Visibilidad | Necesaria para |
|---|---|---|---|
| NEXT_PUBLIC_SUPABASE_URL | Supabase proyecto nuevo → Connect / Project URL | Pública | Cliente DB/Auth/Storage |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | API keys del proyecto nuevo: anon o publishable compatible con supabase-js | Pública | Cliente protegido mediante RLS |
| SUPABASE_SERVICE_ROLE_KEY | API keys → service_role del nuevo proyecto | Exclusiva servidor, secreta | Operaciones servidor autorizadas; nunca navegador |
| NEXT_PUBLIC_ADMIN_EMAILS | Juani confirma 3 emails de Fabri, Flaco y Georgie | Pública; no es seguridad por sí sola | UI heredada y allowlist API; coincidir con admin_users |
| NEXT_PUBLIC_SITE_URL | Configuración de entorno | Pública | Origen de links/canonical/bajas; local http://localhost:3000, producción https://encountersagainandagain.com |

Auth: desactivar signup público; cuentas soportadas por Auth una vez confirmados emails; callbacks/recuperación de localhost ahora, preview/producción cuando existan. Crew no implica usuario Auth. Storage bucket media y RLS se preparan en PASO 3. Método SQL: acordar CLI con historial o SQL Editor ordenado; credencial de conexión/token CLI adicional solo si el método lo usa, no inventar DATABASE_URL de otro ORM.

## Resend nuevo

Crear cuenta/proyecto para Encounters; dominio o subdominio propio verificado. Recibir correo sigue en proveedor actual. Preparar registros de envío sin alterar DNS web/MX en PASO 1. Confirmar remitente y destinatarios antes de cualquier prueba.

| Variable | Origen | Visibilidad | Uso |
|---|---|---|---|
| RESEND_API_KEY | Resend → API keys de Encounters | Servidor, secreta | Envío manual de newsletter y pruebas posteriores |
| NEWSLETTER_FROM_EMAIL | Remitente elegido sobre dominio verificado | Servidor; aparece en correo | Encounters Again and Again <dirección confirmada> |
| NEWSLETTER_REPLY_TO_EMAIL | Email principal confirmado por equipo | Servidor; aparece en correo | Respuestas de lectores |

Newsletter sigue en alcance con alta/baja, deduplicación, exclusión de bajas, prueba al destinatario indicado y envío manual. No automatizar al publicar. Mantener idempotencia por envío. El límite heredado de 150 palabras no es requisito editorial de Encounters. No probar envíos reales en PASO 1.

## Google, dominio y despliegue posterior

- GA4: verificar propiedad existente y propietario antes de crear otra; NEXT_PUBLIC_GA_MEASUREMENT_ID es pública y opcional, sin valor Katie; no está aún en .env.example porque el tracking está apagado. Activación y consentimiento se validan antes de lanzamiento.
- Search Console: confirmar acceso y método de verificación existente; no inventar token ni exigir una variable hasta saber el método.
- Vercel: pendiente por instrucción. Nuevo proyecto y repo correctos cuando se autorice etapa de despliegue; ninguna variable o ID de proyecto Katie.
- Dominio/DNS/Hostinger: confirmar responsables y backup restaurable, conservar WordPress y registros de correo. No cambiar DNS.

No se requieren Stripe, Printful, Tapstitch, Meta Pixel, Travelpayouts, cron comercial ni proveedor extra de Auth/archivos para v1.

Bloqueos por dato: Supabase impide probar login/CRUD/RLS/storage/alta-baja; los 3 emails impiden aprovisionar admins; Resend y dominio verificado impiden validar entrega; email público impide cerrar Contact/Reply-To; decisión formulario afecta solo esa interfaz/persistencia. Ninguno impide auditoría y preparación local.

## Contacto y opciones todavía no activadas

Confirmar el correo público y guardarlo en site_settings.email durante PASO 3. Ese dato y NEWSLETTER_REPLY_TO_EMAIL pueden coincidir, sin asumir que son encounters.services@outlook.com. El email del prototipo no se considera confirmado.

Solo si se aprueba formulario: añadir CONTACT_TO_EMAIL (destinatario confirmado) y CONTACT_FROM_EMAIL (remitente Resend verificado), ambas exclusivas de servidor, y reactivar su endpoint. Solo si se conserva aviso de alta: añadir NEWSLETTER_NOTIFICATION_EMAIL (opcional servidor) y su envío. Estas tres variables NO son requisitos del arranque actual y se omitieron de .env.example para evitar configuración falsa.

Para probar entrega en PASO 2/3 hace falta además un destinatario de prueba indicado por Juani. El envío manual por lotes se conserva, pero el flujo de prueba y las garantías persistentes de reenvío requieren validación con el nuevo esquema. No probar contra listas reales al conectar por primera vez.
