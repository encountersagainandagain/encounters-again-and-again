# Instrucciones para Astra — inicio de Encounters Again and Again

Versión 1 · 30 de septiembre de 2026.

Este archivo es el instructivo principal para el agente de programación que trabaja con Juani en su terminal local/VS Code. Contiene decisiones actuales, orden de ejecución, materiales, entregables y criterios para continuar. La preparación de este documento no significa que ya se hayan creado código, SQL o servicios del nuevo proyecto.

## 0. Objetivo, repositorios y estado confirmado

Vamos a construir **Encounters Again and Again**, un colectivo de arte, océano, educación y conservación. Se migra su web WordPress a Next.js usando What Katie Seas como base técnica reutilizable.

- Fuente: `https://github.com/juanimolfino/katie-blog`.
- Destino privado: `https://github.com/encountersagainandagain/encounters-again-and-again`.
- Dominio público existente: `https://encountersagainandagain.com`.
- Marca visible: **Encounters Again and Again**. Identificador técnico: `encounters-again-and-again` o `encountersagainandagain`, según contexto.
- Cuenta de servicios confirmada: `encounters.services@outlook.com`.
- Contacto público: correo principal del colectivo, dirección todavía pendiente de confirmar. No confundirlo con la cuenta de servicios ni con el email administrativo de WordPress.
- Tres administradores fundadores: Fabri, Flaco y Georgie. Faltan sus emails de acceso definitivos; no inventarlos ni dar permisos a una cuenta por su nombre público.
- WordPress y Hostinger: Juani confirmó acceso a ambos el 30/09. Backup, configuración, propiedad de dominio/DNS, Analytics y Search Console aún por revisar.
- Repositorio destino: creado y vacío según Juani. Desde la conexión GitHub del análisis devuelve 404; acceso local todavía no probado. Un 404 de un repo privado no demuestra que no exista.
- Supabase y Resend nuevos: aún no creados/conectados según el último estado informado.
- Vercel: despliegue posterior, cuando el proyecto esté avanzado. No hace falta crearlo ni desplegar en este inicio.
- Diseño: el handoff recibido el 23/09 es **una versión anterior, orientativa**. Juani lo sigue actualizando. Faltan aquí prototipos HTML y assets del diseño vigente.

La fuente se volvió a revisar parcialmente el 30/09 en `main`, commit `102fc91acd4dd312dc15436e8e3de22643b84ce7` (29/09). Usar esta referencia como punto reproducible de partida; comprobar si cambió `main` y registrar qué commit se copia. No asumir que la auditoría de septiembre anterior describe todo el código actual.

Stack comprobado: Next.js `^16.2.6`, React 19, TypeScript, Tailwind 3, Supabase JS, Zod. Conservar el lockfile y el stack; no introducir Drizzle, otro CMS o una actualización mayor como parte de la adaptación.

## 1. Cómo trabajar y resolver instrucciones

1. Leer este documento completo antes de modificar código. Leer las instrucciones aplicables del repositorio (`AGENTS.md` si existe), estado Git y scripts.
2. Prioridad: instrucciones actuales de Juani → este instructivo → alcance funcional del plan → handoff visual vigente para diseño → referencias antiguas. Si un diseño nuevo cambia funcionalidad, señalar la diferencia concreta; no eliminar requisitos silenciosamente.
3. Este proyecto reutiliza Katie, pero el resultado es Encounters. La interfaz pública, admin, defaults, emails, SEO y contenido inicial no deben mostrar identidad, enlaces ni tracking de Katie.
4. Conservar licencias, atribuciones obligatorias y procedencia técnica en documentación. Una mención de la fuente en `source-provenance.md` es correcta; una biografía o un canonical de Katie en la web nueva no lo es.
5. No modificar, hacer push ni ejecutar migraciones contra Katie. No copiar su base de datos, usuarios, suscriptores, pedidos, secretos o servicios.
6. Conservar código de módulos fuera de alcance, aislado y documentado. “Apagar” debe impedir rutas, consultas y efectos; no basta con ocultar el menú.
7. Mantener trabajo existente de Juani. Si la carpeta destino ya tiene archivos o commits, inspeccionarlos antes de copiar; no sobrescribir ni usar reset/force-push para resolver diferencias.
8. Avanzar de forma autónoma dentro de la etapa activa. No detenerse después de entregar solamente un plan si esa etapa ya tiene lo necesario para ejecutarse.
9. Si faltan credenciales, acceso o el diseño de una página, completar las tareas independientes y señalar exactamente qué falta. No conectar servicios de Katie, inventar contenido ni ocultar errores para simular avances.
10. Trabajar por etapas con entregas verificables. El arranque solicitado inicialmente es **Paso 1**; Juani conecta servicios en Paso 2 y después se ejecutan Pasos 3 y 4. No saltar a rediseñar toda la web con el handoff viejo.

No publicar el sitio, cambiar DNS web, cancelar Hostinger, enviar newsletters a una lista real ni operar pagos durante este arranque. Las pruebas de email se realizan solo con destinatarios de prueba indicados por Juani.

## 2. Materiales y documentación del proyecto

El paquete entregado contiene este instructivo y:

- `contexto/encounters-arquitectura-y-plan.md`: alcance anterior, útil para entender entidades y relaciones.
- `contexto/encounters-handoff-review-y-arranque.md`: revisión del handoff anterior y riesgos identificados.
- `contexto/encounters-checklist-seguimiento.md`: estado actualizado de los 22 pasos.
- `contexto/encounters-redirects-plan.json`: mapa inicial de migración, todavía no ejecutado.
- `referencia-diseno-2026-09-23/`: 16 Markdown antiguos. No son la referencia visual final.
- `migracion/encounters-content-snapshot.zip`: snapshot editorial con 11 páginas, 1 publicación, 161 bloques y 50 imágenes; no es un backup completo de WordPress.

Al preparar el repositorio, integrar los documentos útiles bajo `docs/encounters/` y mantener **un seguimiento activo**. Conservar la versión antigua de diseño como referencia fechada y crear `docs/encounters/handoff-current/` para la entrega vigente cuando Juani la aporte. Identificar versión y archivos fuente usados en cada página.

Crear o mantener, sin duplicar documentos equivalentes:

| Documento | Contenido mínimo |
|---|---|
| `source-provenance.md` | Repo/commit copiado, fecha, stack y política de actualización de la base. |
| `bootstrap-status.md` | Etapa activa, hecho, validado, bloqueado, siguiente acción. |
| `services-setup.md` | Servicios nuevos, variables por entorno y quién aporta cada dato; sin secretos. |
| `schema-map.md` | Tablas/campos reales de Katie, qué se reutiliza, qué se agrega y dependencias. |
| `sql-runbook.md` | Orden de migraciones, comprobación del proyecto destino, ejecución y recuperación. |
| `modules.md` | Activos/apagados, rutas, APIs, tareas, tablas, servicios y reactivación. |
| `routes-and-seo.md` | Nuevas rutas, antiguas, canonical, sitemap y resultados de pruebas. |
| `page-progress.md` | Diseño, datos, admin, frontend, SEO y validación por página. |

No hace falta un framework documental. Documentos breves y enlazados desde un único índice; actualizar los existentes al avanzar.

## PASO 1 — Duplicar, aislar y preparar el proyecto

### 1A. Comprobar accesos y carpeta

- Verificar usuario GitHub local y acceso de lectura al repo fuente y escritura al destino. Usar las credenciales locales habituales; no pedir tokens en el chat ni imprimirlos.
- Verificar que el repositorio destino corresponde exactamente a `encountersagainandagain/encounters-again-and-again` y que está vacío como informó Juani. Si no lo está, conservar lo que haya.
- Si falta acceso, indicar si falla lectura de fuente o escritura de destino. No volver público un repo ni cambiar permisos sin una indicación específica.
- Crear/trabajar en una carpeta local independiente. Preferencia para este cliente: historial nuevo con el código versionado de la referencia fuente y su procedencia documentada; no necesita replicar todas las ramas o historial comercial de Katie.
- Copiar desde una exportación del código versionado o checkout temporal. No copiar `.git` de Katie a ciegas ni dejar su remoto como destino de push. Revisar exclusiones antes de importar archivos.
- Excluir secretos, `.env.local`, otras variables reales, `.vercel`, `.next`, dependencias instaladas, caches y volcados privados. Rehacer `.env.example` con nombres y valores seguros. Respetar atribuciones y archivos de licencia.
- Verificar que el único remoto de escritura del proyecto nuevo es Encounters antes de un push. Crear commits por etapa y hacer push únicamente al repo nuevo como parte de la configuración inicial, después de revisar los archivos incluidos. No usar force-push.

### 1B. Inventario real antes de adaptar

Leer fuente, lockfile, scripts, rutas, Auth, API, SQL y dependencias. Entregar una matriz corta: reutilizar / adaptar / apagar / nuevo. No asumir el modelo de Alex and the Sea; la fuente aquí es `katie-blog`.

Referencias concretas comprobadas en la fuente:

- `docs/supabase-posts.sql`: `posts`, `post_blocks`, `set_updated_at` y políticas iniciales.
- `docs/supabase-post-meta-description.sql` y otros incrementos de posts/bloques: reconciliar con la base y tipos actuales.
- `docs/supabase-site-settings.sql`: `site_settings(key, value jsonb, updated_at)`, fila `key = 'site'`; contiene defaults de Katie que deben sustituirse.
- `docs/supabase-admin-security.sql`: `admin_users(email)`, `is_admin()` y endurecimiento; incluye email de Katie y depende de `gallery_items` y Storage. No ejecutar íntegro sin adaptar dependencias.
- `docs/supabase-newsletter.sql`: suscriptores y RPCs de alta/baja.
- `docs/supabase-storage.sql` y `docs/supabase-gallery.sql`: bucket `media` y medios/galería; determinar qué parte requiere el CMS activo.
- `src/lib/adminPosts.ts`: contratos y operaciones actuales. Los bloques usan **`position` y `content`**, no `sort` y `data` del handoff.
- `src/components/admin/AdminPostForm.tsx`: editor base a reutilizar y separar gradualmente.
- `src/lib/siteSettings.ts`, `src/lib/adminMedia.ts`, `src/lib/email.ts`, Auth/admin y fetchers públicos.
- `app/api/newsletter/subscribe/route.ts` y `app/api/admin/newsletter/send/route.ts`: funcionalidades existentes a adaptar.
- `next.config.ts`, `vercel.json`, sitemap, robots, layout y metadata: dominio, campañas, tareas y defaults heredados.

Hallazgos para comprobar en el checkout elegido:

- Los SQL iniciales permiten escrituras amplias a autenticados, y el endurecimiento aparece en otro script. La base nueva debe terminar segura desde su primera aplicación.
- La allowlist SQL trae un email de Katie. No importarlo como administrador de Encounters.
- `replaceAdminPostBlocks` borra e inserta en operaciones separadas. Adaptar guardado a transacción para no perder bloques si falla la segunda operación.
- Hay redirecciones al dominio de Katie tanto en configuración Next como Vercel; revisar ambas.
- `vercel.json` activa `/api/cron/cleanup-pending-orders`; no registrar ese cron en Encounters.
- La ruta de blog revisada anteriormente limitaba nuevos slugs con `dynamicParams = false`. Verificar y corregir en las plantillas nuevas.
- El build ejecuta `scripts/verify-return-policy-version.mjs`; tratarlo como dependencia del módulo comercial, no eliminar comprobaciones a ciegas.
- Newsletter ya ofrece envíos manuales por lotes y baja. Su límite editorial de 150 palabras es heredado de Katie; no asumir que es un requisito de Encounters.

### 1C. Separación de identidad y módulos inicial

- Cambiar marca, URL base, defaults visibles, navegación provisional, About, contacto, favicon/iconos disponibles, metadata, Open Graph, JSON-LD, imágenes fallback, emails, autoría y textos del admin.
- Buscar con `rg` referencias a Katie, dominios antiguos, emails, IDs, marcas de agua, tags comerciales, endpoints y políticas del negocio anterior. Revisar cada contexto; no hacer un reemplazo indiscriminado que rompa código o atribuciones.
- Si aún faltan assets de Encounters, usar una presentación provisional neutra con la marca correcta. No mostrar fotografías, logos o biografías personales de Katie como contenido de Encounters.
- Reemplazar defaults del seed/settings; no poblar la nueva DB con datos de Katie para luego intentar borrarlos.
- Introducir registro central de módulos, con controles en servidor. No usar un flag cliente como autorización.
- Desactivar de entrada los módulos comerciales y efectos no usados, incluso antes de conectar servicios nuevos.
- Preparar comportamiento de desarrollo sin servicios: mensajes claros de configuración y consultas que no se ejecutan si el módulo está apagado. Un error real del CMS activo no debe convertirse en un array vacío silencioso en producción.

### Entrega del Paso 1

- Carpeta/repo local independiente con remoto de Encounters verificado.
- Código base importado, identidad aislada y módulos fuera de alcance bloqueados.
- Instructivo y documentación integrados; versiones de diseño distinguibles.
- `.env.example` mínimo y lista exacta para Juani de datos que debe aportar en Paso 2.
- Mapa preliminar de esquema/dependencias y propuesta de orden SQL, sin ejecutar contra ningún servicio.
- Lint y TypeScript donde sea posible. Ejecutar build solo cuando tenga su configuración requerida; registrar bloqueos por servicios sin afirmar que pasó.

No bloquear este paso por la falta de HTML final, Resend o Vercel. Sí detener una copia insegura por falta de acceso o riesgo de sobrescribir trabajo existente.

## PASO 2 — Juani conecta servicios nuevos; Astra valida

### Supabase

Juani crea un proyecto nuevo de Encounters y facilita las variables mediante `.env.local` o el mecanismo seguro del entorno. Astra verifica URL/project ref y que no sean los de Katie; valores secretos nunca en commits, capturas de logs ni documentación.

Reutilizar las convenciones reales del código. Variables identificadas en `.env.example`:

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Proyecto nuevo. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clave pública compatible con el cliente usado; validar si se adapta la nueva nomenclatura de Supabase. |
| `SUPABASE_SERVICE_ROLE_KEY` | Solo servidor y scripts autorizados; nunca `NEXT_PUBLIC_*`. |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Allowlist visible heredada; debe coincidir con servidor y DB. No es una barrera de seguridad por sí sola. |
| `NEXT_PUBLIC_SITE_URL` | URL de cada entorno; producción será el dominio de Encounters. |

La credencial de conexión SQL o autorización del CLI es adicional si el método de migración la necesita; no exigir variables de otro proyecto/ORM que aquí no se usan.

- Elegir método de migración con Juani: CLI con historial versionado, preferido, o ejecución manual ordenada desde SQL Editor si es el flujo disponible. Documentarlo.
- No usar un dump de datos de Katie. No insertar directamente filas a mano en `auth.users` para crear contraseñas.
- Crear las tres cuentas mediante herramientas soportadas de Auth cuando estén confirmados sus emails; sincronizar allowlist. Crew no crea cuentas.
- Configurar callbacks y recuperación para localhost. Añadir las URLs de preview/producción cuando existan.
- Mantener cerrada la creación pública de cuentas admin. Newsletter no necesita cuenta Auth.
- DB/Auth/Storage viven en el mismo proyecto nuevo; no hace falta otro proveedor de archivos o autenticación para v1.

### Resend y contacto

Juani crea/configura Resend para Encounters. Variables existentes a adaptar según módulos activos:

| Variable | Valor conceptual |
|---|---|
| `RESEND_API_KEY` | Clave privada del servicio nuevo. |
| `NEWSLETTER_FROM_EMAIL` | Remitente con marca Encounters, de un dominio/subdominio propio verificado. |
| `NEWSLETTER_REPLY_TO_EMAIL` | Correo principal del colectivo. |
| `NEWSLETTER_NOTIFICATION_EMAIL` | Opcional si se conserva aviso de nueva suscripción. |
| `CONTACT_TO_EMAIL` | Correo principal del colectivo, cuando se use formulario. |
| `CONTACT_FROM_EMAIL` | Remitente verificado del formulario, si está activo. |

`encounters.services@outlook.com` administra servicios; no implica que sea el contacto público ni un remitente de dominio propio verificable en Resend. Preparar verificación del dominio/subdominio con sus registros, preservando el correo existente. La recepción de email no necesita mudarse a Resend.

El destinatario de Contact está decidido: **el email principal del equipo**. La interfaz se resuelve con el diseño vigente: si es contacto directo, `mailto:`; si Juani confirma formulario, reutilizar envío a ese correo. En ese caso, validar en servidor, usar remitente propio y `Reply-To` del visitante; no es necesario añadir `contact_submissions` ni un CRM. No tomar el formulario del handoff antiguo como requisito confirmado.

Si falta verificación del dominio, avanzar DB/CMS y preparar emails, pero no declarar el envío real validado. No bloquear todo el proyecto por Resend. La configuración DNS de envío es distinta del futuro cambio de los registros web a Vercel.

### Newsletter mínima

Formulario público con email → suscripción guardada → admin redacta asunto y contenido → prueba a un destinatario indicado → envío manual a suscritos → enlace de baja. No automatizar envíos al publicar contenido ni construir segmentación/marketing avanzado.

Conservar deduplicación, normalización, exclusión de bajas, resultados de envío y prevención de reenvíos accidentales. Revisar las RPCs públicas heredadas: no permitir consultar emails/tokens de otros suscriptores ni saltarse validación/controles del servidor. Las listas y exportaciones solo son accesibles para admins.

### Entrega del Paso 2

- Proyecto Supabase nuevo identificado y variables conectadas; aún sin afirmar esquema aplicado hasta Paso 3.
- Método de ejecución SQL decidido y tres emails admin pendientes o confirmados explícitamente.
- Resend conectado o bloqueo concreto identificado; destinatario principal confirmado antes de pruebas reales.
- Documentación de variables y checklist de configuración con estados creado/configurado/probado separados.
- Vercel continúa pendiente, como pidió Juani.

## PASO 3 — SQL inicial, adaptación mínima del CMS y seed

### 3A. Estrategia de base de datos

Crear **una línea de migraciones propia de Encounters**, con un baseline mínimo derivado de lo que realmente usa Katie. Después agregar cambios pequeños por requerimiento. No ejecutar todos los SQL históricos en orden alfabético ni usar el SQL del handoff como esquema definitivo.

El baseline resuelve de forma coherente tablas, columnas, índices, funciones, permisos y Storage necesarios para los módulos activos. Los módulos apagados conservan código y SQL de referencia fuera de la secuencia activa. Si una dependencia compartida necesita parte de una tabla, documentar y conservar ese mínimo; no inventar un sistema paralelo para evitar leer el original.

Propuesta de secuencia; ajustar nombres al sistema real de migraciones del repo:

| Migración | Responsabilidad |
|---|---|
| `*_001_core.sql` | Posts/bloques compatibles con cliente actual, settings, admin allowlist/helper, newsletter y dependencias mínimas de medios. Tablas nuevas con RLS activada; sin permisos amplios temporales. |
| `*_002_encounters_content.sql` | Tipos de contenido, Crew, categorías de Art, responsables múltiples, relaciones entre publicaciones, Próximamente y detalles estructurados. |
| `*_003_access_storage_save.sql` | Políticas definitivas, bucket/policies, grants de RPC y guardado atómico; cualquier tabla sin política previa permanece cerrada. |
| `*_004_settings.sql` | Defaults mínimos de marca y módulos, sin datos de Katie ni contenido inventado. |
| Migraciones posteriores | Cambios por página/función a medida que se implementa; no reescribir migraciones ya aplicadas a un entorno compartido. |

Es una división orientativa: combinar archivos si mejora la integridad. No dejar accesos inseguros entre pasos. Las migraciones SQL van versionadas en Git; las credenciales y backups privados no.

**No son lo mismo:** baseline del esquema, cambios incrementales y seed de contenido. El backup MySQL de WordPress es para recuperar WordPress; no se ejecuta como SQL en Supabase/Postgres.

### 3B. Compatibilidad y modelo mínimo

Mantener `posts` + `post_blocks` como motor editorial compartido. En el admin se muestran módulos con formularios propios. No crear cuatro editores independientes.

| Pieza | Reutilización/adaptación |
|---|---|
| `posts` | Conservar campos comunes útiles. Agregar discriminador de tipo, detalles específicos y SEO faltante; ocultar campos de viajes cuando no aplican. |
| `post_blocks` | Mantener inicialmente `post_id`, `type`, `position`, `content`. Adaptar renderers; evitar renombrar todo solo para coincidir con el handoff. |
| `site_settings` | Conservar estructura `key/value` si sigue siendo suficiente. Brand/contacto/redes/donaciones/Home e introducciones editables. |
| `crew_members` | Persona pública, alias, slug, bio, retrato, contenido personal, redes, orden y estado. Separada de Auth. |
| `post_contributors` | Publicación/persona/función/orden; múltiples responsables. |
| `art_categories` y relación | Categorías administrables y categoría principal que define la URL de cada obra. |
| `post_relations` | Actividad → relatos, vínculos opcionales entre arte y actividad; validar tipos y evitar duplicados. |
| `upcoming_items` | Referencia a ficha futura o anuncio independiente, fecha opcional, estado y orden. |
| Medios | Reutilizar almacenamiento y editor; añadir referencias/focal/alt/créditos cuando se necesiten. Decidir con el código si ampliar medios o crear catálogo; no duplicar sin motivo. |
| `newsletter_subscribers` | Reutilizar alta/baja y administración, sin copiar lista de Katie. |
| Historial de rutas | Mapa versionado o tabla para cambios de slug/categoría; fuente única para redirecciones. |

Tipos iniciales sugeridos: obra, expedición, workshop, mensaje, relato/novedad. Elegir identificadores de código consistentes y documentarlos. Los perfiles pueden reutilizar el editor sin volverse publicaciones duplicadas en `/posts`.

Etapas de workshop y necesidades pueden ser listas JSON validadas con IDs estables en v1; usar tablas específicas cuando lo justifiquen consultas o integridad. La autoría y relaciones entre entidades usan IDs/FK, no nombres como strings.

Estados editoriales `draft/published` separados de actividad e inscripción. No implementar roles parciales, aprobación, revisiones paralelas ni automatización editorial en esta fase. Las tres cuentas admin tienen acceso completo, respaldado en servidor y RLS.

### 3C. Traducción del editor de diseño al existente

Revisar payloads y elegir adaptadores/migraciones concretos, sin hacer reemplazos solo por nombre:

| Nombre del handoff anterior | Bloque existente a evaluar |
|---|---|
| `two_images` | `image-pair` |
| `simple_link` | `link` |
| `title_list` | `list` + título |
| `cost_breakdown` | `costs` |
| `faqs` | `faq` |
| `post_index` | `toc` |
| `tour_dive_center` | `tour` adaptado o bloque de colaborador |
| image, carousel, youtube, heading, paragraph, quote, quick_facts, accordion, divider | Reutilizar y ajustar datos/presentación cuando haga falta. |

Agregar audio/documentos/poema solo según el contenido real. Preservar saltos de línea y estrofas. No convertir todo a HTML en la DB ni perder validación del contenido de cada bloque.

### 3D. Módulos activos y apagados

Activos: CMS/bloques/medios, páginas/settings, Crew, Art, Expeditions, Workshops, Messages, relatos, Próximamente, newsletter y contacto al correo principal.

Apagados inicialmente: tienda, productos/carrito/checkout, pedidos, Stripe/donaciones internas, Printful/Tapstitch/proveedores, campañas comerciales/popups, reseñas y QR comerciales, Gear/afiliados como negocio, Destinations como sección autónoma, comentarios/likes y galería como página independiente. Revisar el inventario real por si hay más integraciones.

Conservar la herramienta de medios y galerías dentro de los contenidos. Conservar donaciones mediante enlace externo. Evaluar bloques de viajes/centros/logística para usos concretos; no esconder un bloque útil por pertenecer originalmente al blog de viajes.

Cada módulo apagado debe quedar fuera de navbar, Home, sitemap, admin principal, rutas y APIs activas, consultas del layout/dashboard, scripts de fondo, cron y webhooks. Sus dependencias no deben exigir claves de pagos ni tablas comerciales para arrancar el CMS activo. Mantener documentación de reactivación y scripts opcionales separados; conservar código no significa estar listo para vender sin configurar servicios.

### 3E. Aplicación y verificación del esquema

- Antes de ejecutar: comprobar project ref/URL contra el proyecto nuevo confirmado. Si apunta a Katie o el entorno es ambiguo, no ejecutar.
- Probar en base local/descartable si el entorno está disponible; si no, la base nueva y vacía de Encounters puede servir para desarrollo con el alcance confirmado. No usar `db reset` contra un proyecto remoto para resolver errores.
- Aplicar con historial y orden documentados. Si se usa SQL Editor, registrar exactamente qué se aplicó y cómo se reconciliará ese historial con el CLI; no ejecutar dos veces toda la línea por confundir métodos.
- Migrations versionadas se aplican una vez; no usar `IF NOT EXISTS` para ocultar diferencias de esquema. El seed sí debe ser idempotente.
- Políticas: público solo lee lo publicado; admins pueden editar; autenticado no admin no puede escribir ni leer borradores. Cubrir bloques, relaciones, perfiles, medios y newsletter. No basta con ocultar `/admin`.
- RPC de guardado: validar sesión/admin, tipos y pertenencia; guardar cabecera, bloques y relaciones en una operación íntegra. Si falla, conservar el contenido anterior.
- Validar que nueva obra/bloques/relaciones se guardan y publican; que no se filtran borradores ni listas de emails; que un módulo apagado no consulta tablas ausentes.

### 3F. Seed inicial

Usar `encounters-content-snapshot.zip` como fuente editorial, no la DB de Katie. Preparar mapeo/dry-run y empezar con contenido representativo; completar la importación al desarrollar cada módulo.

- `blocks` es la fuente canónica, `position` es el orden. `sections` y `curated_groups` agrupan lo mismo; no reinsertarlos.
- Resolver imágenes mediante `asset_id`; subir a Storage nuevo y registrar correspondencia origen/destino. Conservar referencias para redirecciones de medios.
- Conservar IDs/URLs de origen para trazabilidad e idempotencia. Una segunda ejecución no duplica ni pisa silenciosamente ediciones humanas.
- Textos iniciales reales quedan editables. No inventar fechas, integrantes, relatos o obras para llenar el diseño.
- Excluir contenido legacy/system/future-disabled del sitio público salvo decisión específica. Revisar placeholders y material de plantilla.
- No importar cuentas/suscriptores/pedidos de Katie; tampoco asumir que todo el dominio externo del libro está dentro del snapshot.

### Entrega del Paso 3

Migraciones y runbook propios, esquema aplicado al proyecto correcto, controles comprobados, CMS mínimo conectado, módulos aislados y seed representativo trazable. Primer recorrido funcional: una categoría → una obra con dos responsables → publicar → aparece por categoría y en ambos perfiles sin deployment.

Si la interfaz final de una página todavía falta, validar el flujo en una vista provisional con marca Encounters y datos de prueba identificados; no dar por aprobado su diseño.

## PASO 4 — Visual e integración completa, página por página

Solicitar/leer la entrega **vigente** de Claude Design para cada página. Los `.dc.html` y assets son referencia visual cuando existen; los datos/relaciones y permisos responden al alcance acordado. No reiniciar el proyecto al recibir un diseño nuevo: identificar el cambio y adaptar componentes/migraciones incrementales.

Orden inicial recomendado, ajustable a lo que Juani vaya entregando: componentes compartidos → Crew/perfil y Art → Expeditions → Workshops → resultados/Messages → About/Contact → Próximamente/Newsletter y Home final. La Home se conecta cuando las entidades ya funcionan.

Para cada página completar juntos: requisitos → campos y relaciones → SQL incremental si hace falta → inputs del admin → consultas → frontend → SEO/caché → validación desktop/móvil y estados vacíos. No construir todo el frontend con datos fijos y dejar admin/DB para el final.

### Funcionalidades que no se pueden perder

**Crew y Art**

- Una persona puede tener perfil sin cuenta. Perfil opcional, biografía, alias/marca como Wild Wonders, fotografías, redes y contacto si se cargan.
- Obras organizadas primero por categoría y responsables. Un podcast puede tener Flaco y Fabri; se muestra en ambos perfiles y en su categoría automáticamente.
- Categorías nuevas desde admin sin código/deploy. Ficha de obra con editor libre, portadas/galerías/embeds/enlaces adecuados al formato.
- Relación con expedición/workshop opcional. No exigir actividad para publicar arte.

**Expeditions**

- `/expeditions`: presentación del barco, historia, objetivos y colaboración, precargada desde WordPress y editable.
- Cada expedición: datos/fechas opcionales, estado, participantes, contenido libre y necesidades.
- Necesidades: abierta/conseguida/cerrada; conseguida visible con casilla marcada y texto tachado, contacto para sumarse cuando esté abierta. Solo admin modifica.
- Conservar ficha al finalizar y poder crear uno o varios relatos asociados con texto/fotos/video. No generar resultados automáticamente.

**Workshops**

- Una edición puede tener una o varias etapas, con fecha opcional por etapa; duplicación crea un borrador nuevo.
- Opcionales: público/edades, idioma, modalidad, ubicación, facilitadores, qué incluye, materiales/qué llevar, precio/moneda si aplica, inscripción/contacto y plazas informativas.
- Actividad: próximo/en curso/terminado/aplazado/cancelado. Inscripción: abierta/cerrada/completa/no aplica. Mantenerlos independientes.
- Al terminar, conservar programa y datos históricos, cerrar inscripción y enlazar relatos de resultados si existen.

**Messages, relatos y Próximamente**

- Messages: reflexiones/poemas/ilustraciones, responsables y saltos de línea. Soportar el único mensaje del snapshot inicial.
- Relatos: editor compartido y enlace a actividad de origen cuando corresponda. Cada relato tiene URL propia y puede aparecer en Home/perfiles.
- Próximamente: destacar contenido futuro existente o crear anuncio independiente; fecha e imagen opcionales, sin duplicar una ficha al vincularla después.

**Home, About, Contact y newsletter**

- Home permite entender la variedad del colectivo y ver actividad, próximos eventos, novedades, arte y Crew.
- Admin elige destacados, ordena/oculta secciones; listas automáticas solo con publicados y secciones vacías ocultas. No obligar a cargar cuatro eventos o seis personas para que funcione.
- About e introducciones institucionales editables. Contact apunta al email principal; redes, WhatsApp y donaciones solo si existen.
- Newsletter sencilla, desde Home/footer, con composición y envío manual en admin.

**Movimiento y legibilidad**

Conservar la identidad artística/marina del diseño vigente. Contenido principal y enlaces disponibles sin interacción, HTML semántico, fallback sin WebGL y movimiento reducido legible. Probar scroll con mouse/touch/teclado; no bloquear lectura con textos largos, capas superpuestas o alturas fijas. Las contradicciones del handoff anterior se contrastan con el prototipo actual.

### Nuevas rutas y redirecciones

Usar las rutas nuevas como públicas y canónicas. Las rutas Elementor solo se conservan como entradas de redirección a su contenido equivalente:

| Familia | Rutas |
|---|---|
| Base | `/`, `/about`, `/contact` |
| Crew | `/crew`, `/crew/[slug]` |
| Expeditions | `/expeditions`, `/expeditions/[slug]` |
| Workshops | `/workshops`, `/workshops/[slug]` |
| Art | `/art`, `/art/[category]`, `/art/[category]/[slug]` |
| Messages | `/meaningful-messages`, `/meaningful-messages/[slug]` |
| Relatos/novedades | `/posts/[slug]` |
| Próximamente | `/upcoming` solo si hace falta listado completo |
| Operación | `/admin/...`, baja de newsletter y legales/flujos necesarios |

Una ficha tiene una única URL canónica. Cambiar slug/categoría genera correspondencia desde su ruta anterior. Crear funciones de rutas compartidas para metadata, sitemap, cards, emails y links internos. Las propuestas antiguas `/messages` o `/stories` no se consideran URLs publicadas sin evidencia.

Mapa mínimo de origen confirmado en el snapshot:

| Anterior | Nueva |
|---|---|
| `/elementor-page-3462/` | `/crew` |
| `/elementor-2907/` | `/crew/wild-wonders` |
| `/elementor-3062/` | `/expeditions` |
| `/elementor-page-3107/` | `/workshops` |
| `/contact-3/` | `/contact` |
| `/you-never-know-what-encounter-could-change-your-life/` | `/meaningful-messages/you-never-know-what-encounter-could-change-your-life` |

Mantener `/` y `/about` con normalización coherente. Reconciliar el JSON del paquete antes de activar reglas; probar cada destino publicado con 200. Rutas retiradas sin equivalente: 404/410 según disposición. No mandar todo a Home ni redirigir `/wp-admin` al nuevo admin. No migrar/redirigir `.org` sin decisión propia.

Las redirecciones HTTP permanentes 301/308 sirven a visitantes, enlaces existentes y buscadores; no dependen de que el cliente tenga Search Console. Deben funcionar en la nueva aplicación cuando el dominio apunte a Vercel, no únicamente como plugin del WordPress antiguo. Complementar con canonicals, sitemap, enlaces internos, metadata y acceso rastreable.

Probar publicación de slugs nuevos sin despliegue, borradores fuera del público/sitemap y revalidación de índices/perfiles/Home. No conservar `dynamicParams = false` si impide ese flujo. Redirecciones sin bucles ni cadenas evitables, incluida normalización de barras y dominio.

## 3. Comprobaciones actuales de WordPress y Hostinger — Juani

Estas tareas se hacen en paralelo y no requieren esperar al desarrollo. Observar y respaldar; no cambiar enlaces permanentes, contenido, DNS o plugins de la web activa como parte del relevamiento.

### Hostinger

- [ ] Identificar qué sitio y plan estamos viendo y quién es el titular. Confirmar si también gestiona dominio, DNS y correo; acceso al hosting no prueba esas tres cosas.
- [ ] En panel del sitio → **Backups/Copias de seguridad**, descargar archivos y base de datos de una fecha coherente. Si hay backup específico de WordPress, confirmar que incluye ambos. Registrar fecha, nombres y alcance.
- [ ] Guardar copia fuera del hosting y verificar que se puede abrir. No subir un backup completo de WP al repo: puede incluir credenciales, usuarios y otros datos privados.
- [ ] Guardar zona DNS actual o capturas: A/AAAA/CNAME, MX, TXT y nameservers; identificar root/www y proveedor de correo. No cambiar registros web todavía.
- [ ] Identificar correo principal real y cuentas/alias que dependen del servicio. No cancelar un plan que también sostenga el correo.
- [ ] Revisar logs/estadísticas disponibles para URLs de uso frecuente; conservar referencias útiles para la migración.

### WordPress

- [ ] Captura de **Plugins instalados**: Site Kit/Analytics/Tag Manager, SEO (Yoast/Rank Math/etc.), redirecciones, formularios/SMTP, newsletter y backups.
- [ ] Registrar **Ajustes → Generales, Lectura y Enlaces permanentes**: URL del sitio, portada y visibilidad para buscadores. El email administrativo puede ser diferente del contacto público. No modificar estos ajustes ahora.
- [ ] Identificar sitemap y robots actuales, metadata/canonicals y verificación Google existente. Un plugin ausente no demuestra que no exista una propiedad de Google.
- [ ] Inventariar páginas/entradas publicadas, URLs, PDFs/adjuntos y cambios desde el snapshot. Exportar XML como complemento editorial si resulta útil; no sustituye el backup completo.
- [ ] Revisar redirecciones ya configuradas y enlaces relevantes de menú/footer; incorporar al mapa las rutas que existan realmente.
- [ ] Confirmar destino del contacto, redes/donaciones y si hay lista propia de newsletter. No exportar/importar datos personales sin necesidad para el proyecto.
- [ ] Si hay GA4/GSC, identificar propiedades y solicitar acceso al propietario. Conservar sus verificaciones/historial al migrar; nunca usar los IDs de Katie.

Primer material útil para revisar juntos: captura de plugins, pantalla de copias de seguridad y confirmación de quién gestiona dominio/DNS/correo. No compartir claves, contraseñas o tokens.

## 4. Vercel y lanzamiento — posterior a estas primeras etapas

Cuando la aplicación esté avanzada: crear proyecto Vercel nuevo, conectar repo/variables, validar preview fuera de indexación y luego producción. Mantener WordPress atendiendo el dominio mientras tanto.

Antes del corte: backup recuperable, sincronización editorial final, rutas e imágenes migradas, redirects/SEO probados, admin y newsletter validados, GA4/GSC propios preparados. El SEO se implementa desde las primeras páginas; configurar métricas al final no significa posponer el SEO.

Agregar el dominio existente a Vercel y cambiar solo registros web necesarios preservando correo/verificaciones. No exige transferir el dominio. Al conservar dominio y cambiar rutas internas/hosting, no usar “Cambio de dirección” de Search Console. Presentar sitemap y revisar URLs importantes.

Conservar WordPress durante estabilización y tener documentada la reversión; DNS no revierte instantáneamente. Verificar bajas/suscripciones y datos nuevos antes de volver atrás. Cancelar hosting antiguo es una decisión posterior, separada.

## 5. Reporte al finalizar cada etapa o sesión

Responder brevemente con:

1. Qué quedó implementado.
2. Qué se reutilizó y qué quedó apagado.
3. Qué migraciones se generaron y cuáles se aplicaron, indicando entorno sin secretos.
4. Qué comprobaciones se ejecutaron y resultados reales.
5. Qué falta aportar a Juani y cuál es la próxima acción.

Actualizar seguimiento/documentación y dejar un commit local coherente si corresponde. Un archivo creado no implica una migración aplicada; un servicio configurado no implica un flujo probado. No afirmar pruebas, deploys o envíos que no ocurrieron.

## 6. Fuentes verificadas para el plan

- [Código fuente revisado](https://github.com/juanimolfino/katie-blog/tree/102fc91acd4dd312dc15436e8e3de22643b84ce7).
- [Supabase: migraciones versionadas](https://supabase.com/docs/guides/deployment/database-migrations).
- [Resend: dominios verificados](https://resend.com/docs/dashboard/domains/introduction).
- [Hostinger: descarga de archivos y base de datos](https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/).
- [Google: redirecciones permanentes](https://developers.google.com/search/docs/crawling-indexing/301-redirects).
- [Search Console: cuándo usar Cambio de dirección](https://support.google.com/webmasters/answer/9370220?hl=es).

Estas referencias orientan la ejecución. Verificar la documentación aplicable si las versiones del proyecto o los servicios cambian al implementar.
