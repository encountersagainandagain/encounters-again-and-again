# Encounters Again and Again — plan de adaptación y lanzamiento

Versión 2 · 12 de septiembre de 2026 · Actualizada con las aclaraciones de Juani. Esta versión sustituye el alcance anterior: tres administradores con acceso total, reutilización del CMS y prioridad en diseño, contenido y lanzamiento. Permisos parciales y revisión editorial quedan en el backlog.

## 1. Objetivo y prioridades acordadas

Construir una web que transmita arte y mar, explique con claridad qué hace el colectivo y permita a sus tres fundadores mantener el contenido desde el admin. Partimos de What Katie Seas y reutilizamos sus herramientas, adaptándolas a Encounters Again and Again.

Principios:

- Una carga, varias apariciones: categorías, perfiles y Home consultan el mismo contenido.
- Art se organiza principalmente por categoría y responsables. Relacionarlo con una expedición o workshop es opcional.
- Cada módulo tiene campos específicos y un editor de bloques libre para texto, imágenes, galerías, videos y otros formatos admitidos.
- Los campos informativos opcionales se muestran solo cuando tienen contenido; no quedan etiquetas ni secciones vacías.
- El contenido inicial procede de WordPress mediante seed y sigue siendo editable después.
- Home presenta visualmente la variedad de la web; no requiere cargar otro catálogo paralelo llamado Projects.
- Las funciones heredadas se evalúan para reutilización, adaptación o desactivación documentada. Se conserva su código para crecer.
- El lanzamiento incluye infraestructura propia, reemplazo completo de identidad y SEO, migración del dominio existente, newsletter, GA4 y Search Console.

## 2. Base revisada y reutilización

Referencia auditada en GitHub: `juanimolfino/katie-blog`, rama `main`, commit `34eb7e9971eee4e5dba974147a0caec12bb2bad9`. La revisión anterior examinó código y SQL documentados; no ejecutó la aplicación ni verificó migraciones aplicadas en producción. La comprobación adicional de esta versión revisó Settings, Newsletter y plantillas de email en esa misma referencia.

Se revisó el snapshot existente: 11 páginas, 1 publicación, 161 bloques y 50 imágenes. El dominio externo del libro está registrado como enlace; no se presupone que se haya relevado todo su contenido ni descargado su PDF.

La base es Katie Blog: Blog, Countries, Gallery, Gear y ecommerce. No se deben asumir los módulos de Ocean Log o Creatures del otro proyecto Alex and the Sea.

| Pieza existente | Adaptación para Encounters |
|---|---|
| Next.js App Router, TypeScript, Supabase JS, Tailwind, Zod | Mantener el stack y lockfile al duplicar; no sumar una migración de framework u ORM. |
| `posts` y `post_blocks` | Base del CMS, ampliada con tipos de contenido y relaciones. |
| Editor y renderizador del blog | Extraer componentes reutilizables; mostrar los inputs propios de cada módulo. |
| Auth y allowlist de administradores | Configurar tres fundadores con acceso total; validar también en API y RLS. |
| Imágenes, galerías, bloques YouTube y citas | Reutilizar con la identidad visual del proyecto; incorporar audio/documentos donde se necesiten. |
| Site Settings | Conservar logos, textos, email y redes; ampliar campos ausentes y aplicar visibilidad por contenido. |
| Newsletter | Reutilizar alta, baja, gestión de suscriptores y composición/envío; adaptar marca, remitentes y configuración. |
| Metadata, sitemap y revalidación | Reutilizar mecanismos, reemplazar identidad/dominio/autores y añadir los tipos nuevos. |
| Ecommerce y otros módulos | Conservar, aislar y documentar. Reactivación futura con configuración y pruebas propias. |

Hallazgos concretos que condicionan la implementación:

- `AdminPostForm.tsx` concentra 3.631 líneas y contiene opciones de viajes/afiliados. Separar campos, bloques y guardado facilita la reutilización.
- El guardado actual escribe metadatos y bloques por separado; el reemplazo de bloques hace delete e insert. Preparar guardado transaccional para evitar una ficha incompleta si falla una operación.
- El autor público está centrado en Katie. `created_by` identifica quién carga, no todos los responsables de la obra.
- Las categorías del blog están en código. Art requiere categorías administrables.
- Blog usa `dynamicParams = false`. Las nuevas rutas deben aceptar slugs publicados después del build, sin deploy.
- La subida aplica por defecto una marca de agua de Katie. Debe reemplazarse y hacerse optativa según el medio; preservar ilustraciones y transparencia.
- `shopEnabled` no aísla todo: el layout consulta campañas, el dashboard conserva consultas y secciones de ecommerce y `vercel.json` registra un cron de pedidos.
- Settings ya tiene email y redes. El archivo revisado no define WhatsApp ni enlace de donación general: se agregan allí si siguen ausentes al implementar.
- Newsletter ya cuenta con formulario y envío desde el admin, pero hay marca, nombres de exportación y enlaces de baja específicos de Katie que deben adaptarse.

Evidencia: [editor](https://github.com/juanimolfino/katie-blog/blob/34eb7e9971eee4e5dba974147a0caec12bb2bad9/src/components/admin/AdminPostForm.tsx), [CRUD](https://github.com/juanimolfino/katie-blog/blob/34eb7e9971eee4e5dba974147a0caec12bb2bad9/src/lib/adminPosts.ts), [Settings](https://github.com/juanimolfino/katie-blog/blob/34eb7e9971eee4e5dba974147a0caec12bb2bad9/src/lib/siteSettings.ts), [Newsletter](https://github.com/juanimolfino/katie-blog/blob/34eb7e9971eee4e5dba974147a0caec12bb2bad9/src/components/admin/AdminNewsletter.tsx), [emails](https://github.com/juanimolfino/katie-blog/blob/34eb7e9971eee4e5dba974147a0caec12bb2bad9/src/lib/email.ts).

## 3. Navegación, páginas y dirección visual

Menú aprobado: **Expeditions · Workshops · Art · Messages · The Crew · About**. El logo lleva a Home; Contact, donaciones y redes están en el footer. Wild Wonders vive dentro de Crew y puede destacarse en Home. Próximamente y Newsletter tienen presencia en Home; no es necesario aumentar el menú principal.

Conservar los nombres públicos Encounters Expeditions, Artsy Animals, Meaningful Messages y Wild Wonders donde corresponda.

| Ruta propuesta | Función |
|---|---|
| `/` | Presentación y acceso visual a todas las áreas, actividad actual, novedades, próximos contenidos y newsletter. |
| `/expeditions` | Presentación editable del barco y programa, colaboración y listado de expediciones. |
| `/expeditions/[slug]` | Ficha de una expedición, necesidades y relatos asociados. |
| `/workshops` | Introducción editable y listado de workshops. |
| `/workshops/[slug]` | Ficha, etapas, inscripción y relatos asociados. |
| `/art` | Categorías y obras. |
| `/art/[category]` | Presentación editable y listado de esa categoría. |
| `/art/[category]/[slug]` | Página de una obra. |
| `/messages` y `/messages/[slug]` | Archivo y detalle de Meaningful Messages. |
| `/crew` y `/crew/[slug]` | Equipo y perfiles con contribuciones automáticas. |
| `/stories/[slug]` | Post de resultados/experiencia vinculado a una expedición o workshop. |
| `/upcoming` | Listado de Próximamente si el volumen justifica el enlace “Ver todo”. |
| `/about` | Historia, misión y forma de trabajar. |
| `/contact` | Email, WhatsApp, redes y donaciones disponibles. |
| `/unsubscribe/[token]` | Baja de newsletter reutilizando el flujo existente. |

Las rutas dinámicas usan plantillas compartidas. Una categoría o contenido nuevo no necesita una carpeta propia. La generación de URL, consultas, SEO y caché deben admitir publicación después del build.

Dirección de diseño: combinar fotografía del océano, ilustraciones propias, tipografía legible y espacio para que el arte respire. Home debe mostrar de un vistazo la variedad del colectivo. Las tarjetas compartirán jerarquía y comportamiento, mientras cada formato podrá tener una presentación adecuada: una película, un poema y una expedición no necesitan verse iguales.

El trabajo visual entra desde el inicio: mapa de contenidos, referencias, bocetos de Home y plantillas, sistema de colores/tipografía y revisión móvil. Después se conecta a datos reales. No se pospone el diseño a una etapa de decoración final.

## 4. CMS compartido y campos por módulo

En el admin se muestran módulos claros, aunque internamente reutilicen la lógica del blog. Los tres fundadores pueden editar y publicar en todos.

Campos comunes: título, slug, resumen, portada opcional y alt, contenido por bloques, responsables/créditos, estado draft/published, fecha editorial, SEO y opción de destacar. Para publicar, exigir solo los mínimos que hacen identificable y utilizable la ficha. Las fechas y datos no conocidos permanecen vacíos o por confirmar.

Separar el estado editorial del estado de la actividad: una expedición futura puede tener una página publicada y un workshop terminado puede permanecer público.

### 4.1 Art: categoría y responsables primero

Admin: **Art → Categorías / Obras**.

Categoría: nombre, slug, portada, introducción, bloques opcionales, SEO, draft/published, orden, mostrar en submenú de Art y etiqueta del menú.

Obra: título, categoría principal, uno o varios responsables con función, resumen, portada, editor de bloques, fecha de creación/lanzamiento opcional, estado de realización, enlaces de lectura/reproducción/descarga/compra externa y etiquetas. La relación con otras obras, expediciones o workshops es opcional y se ofrece como “Contenido relacionado”.

Al publicar una obra, exigir una categoría principal y al menos un responsable de Crew; permitir varios con roles diferentes. La URL canónica utiliza una categoría principal. Crear otra categoría no obliga a cambiar código, mientras use formatos disponibles.

| Formato | Campos/presentación adicionales |
|---|---|
| Libro/publicación | Sinopsis, autores, ilustradores, portada/contraportada y enlaces. |
| Audio/podcast | URL compatible, episodio, duración y transcripción opcionales. |
| Video/película | URL compatible, imagen de presentación, duración y créditos opcionales. |
| Galería visual | Imágenes ordenadas, pies, técnica y año opcionales. |
| Texto/mixto | Texto, imágenes, citas y medios admitidos. |

Ejemplo central: cargan un podcast, eligen Podcasts y asignan a Flaco y Fabri. Aparece en la categoría, ambos perfiles y las novedades de Home. Solo aparece en una expedición si deciden vincularlo.

Un libro y sus ilustraciones pueden relacionarse sin duplicar archivos. Se puede empezar con una galería de ilustraciones como una sola obra; no transformar automáticamente cada foto del snapshot en una ficha. Colecciones de podcasts o formatos interactivos nuevos quedan para cuando exista esa necesidad.

### 4.2 Expeditions

**Presentación del programa y barco:** título, introducción, historia, objetivos, fotos, bloques explicativos y colaboración. El seed carga lo que ya escribieron, y ellos pueden editarlo en cualquier momento desde el admin. “Permanente” describe su función institucional, no un contenido fijo en código.

**Cada expedición:** título, resumen, portada opcional, galería, editor de bloques, objetivos, región, fechas exactas/aproximadas/por confirmar, estado operativo, integrantes y funciones, colaboradores, enlaces y necesidades.

Necesidades como checklist administrable:

| Campo | Uso |
|---|---|
| Identificador | Estable para cada elemento. |
| Tipo | Persona/especialidad, equipo/material, financiación u otro. |
| Título | Por ejemplo, persona con experiencia en acústica marina. |
| Descripción | Requisitos o ayuda esperada. |
| Cantidad/unidad | Opcional. |
| Fechas/plazo | Opcional. |
| Estado | Abierta, conseguida o cerrada. |
| Contacto/acción | Email, WhatsApp o enlace para colaborar. |

Cuando el admin marca “conseguida”, el público ve la casilla marcada, el texto tachado y la indicación “Conseguido”. No se elimina automáticamente: muestra el avance. “Cerrada” es diferente de “conseguida” y no se presenta como un logro. Una necesidad puede reabrirse. El visitante ve el estado pero no puede modificarlo. Las abiertas muestran una acción para contactar y sumarse; las cubiertas dejan de solicitar ese aporte concreto.

Al finalizar, la expedición conserva su ficha y ofrece **Crear relato de resultados**, que abre un post vinculado con editor libre. No hace falta un sistema de candidaturas ni recaudar pagos dentro de la web para esta versión.

### 4.3 Workshops

Cada ficha representa un taller o edición, con una o varias etapas. Si lo repiten, duplican como borrador una nueva edición y conservan la anterior.

Campos informativos opcionales: público/edades, idioma, presencial/online, ubicación/enlace, facilitadores, objetivos, qué incluye, qué llevar, materiales, accesibilidad relevante, gratuito/pago/a consultar, precio/moneda, plazas informativas y contacto/enlace de inscripción. Si no se completan, no se muestran. Si ingresan un precio, debe tener moneda; si ingresan hora, debe existir una zona horaria definida.

Cada etapa: identificador estable, título, orden, descripción, fecha/hora opcional, duración, estado y recursos. Puede ser un capítulo sin fecha o una sesión fechada. Se muestra como programa o acordeón dentro de la página; no requiere una URL individual en v1.

| Estado | Valores |
|---|---|
| Actividad | Upcoming, ongoing, completed, postponed, cancelled. |
| Inscripción | Open, closed, full, not_applicable. |

Una actividad próxima puede tener inscripción completa. Al terminar, se cierra la llamada a inscripción y la ficha permanece pública. El admin ofrece **Crear relato de resultados** para contar la experiencia con fotos, video, texto y materiales.

Según la explicación de Juani, Artsy Animals se importa inicialmente como ciclo de tres etapas; las fechas ausentes no se inventan. Confirmar con el equipo si los episodios fueron una sola edición o eventos independientes.

### 4.4 Relatos y resultados

Un tipo de post reutilizado del blog, visible en **Resultados / Relatos** dentro del admin y accesible desde cada actividad.

Campos: título, slug, resumen, portada opcional, responsables, fecha de publicación, actividad relacionada y editor de bloques. Puede haber uno o varios relatos para una expedición/workshop. La relación identifica la actividad de origen y permite mostrar el listado al final de su ficha.

El botón “Crear relato” precarga la relación y propone un título, pero crea un borrador. Marcar una actividad como terminada no genera ni publica texto automáticamente. El relato puede documentar el cierre o una experiencia durante la actividad.

Públicamente aparece en `/stories/[slug]`, enlazado desde la actividad, los perfiles acreditados y las novedades de Home. No necesita un enlace principal de navbar ni mezclarse con Meaningful Messages. El relato es una publicación distinta porque cuenta la experiencia; el mismo relato no se copia dentro de la ficha de actividad.

### 4.5 Meaningful Messages

Título, slug, ilustración/portada, texto o poema, responsables de escritura e ilustración, etiquetas y relaciones opcionales. Preservar estrofas y saltos de línea. Puede incorporarse un bloque de poema reutilizando el editor. Mantener el nombre y la identidad editorial.

### 4.6 Crew

Nombre público, alias/marca, slug, rol en el colectivo, biografía breve y extensa, retrato, galería, disciplinas, contacto público opcional, redes, orden y visibilidad. Perfiles como `/crew/wild-wonders`, `/crew/flaco` y `/crew/fabri`, sujetos a confirmar nombres/aliases.

Los perfiles muestran automáticamente las obras por categoría y, si corresponde, workshops, expediciones, mensajes y relatos acreditados. También permiten destacar una selección de trabajos existentes. Crear un perfil no crea una cuenta.

En v1 solo los tres fundadores tienen acceso al admin. El resto de Crew tiene perfil público y créditos, sin login. No se construye todavía una pantalla de alta de colaboradores ni asignación de permisos.

### 4.7 Próximamente

Nueva sección de admin: **Próximamente**. Debe admitir dos modos:

1. **Destacar contenido existente:** elegir una obra, expedición o workshop futuro. Se referencia su ficha; título, portada y resumen se obtienen de ella.
2. **Crear anuncio independiente:** para una idea todavía sin ficha. Título, texto breve, imagen opcional, fecha/periodo estimado, responsables opcionales, orden y enlace opcional.

En ambos: draft/published, mostrar en Home y estado anunciado/realizado/cancelado. Cuando un anuncio ya tiene ficha definitiva, vincularlo y usar esa ficha como destino, evitando mostrar dos tarjetas del mismo proyecto. Si no tiene enlace, se presenta como tarjeta informativa sin un botón vacío.

Los anuncios se muestran en Home y, si hay suficiente contenido, `/upcoming`. No necesitan una página de detalle individual en v1. Un cambio de fecha no debe exigir publicar otra obra. Marcar un elemento como realizado lo retira de Próximamente sin borrar el contenido relacionado. Las fechas informativas no implican un sistema de publicación programada.

### 4.8 Newsletter

Activa desde el lanzamiento. Reutilizar las funciones de Katie para suscribirse, darse de baja, administrar suscriptores y redactar novedades; rediseñar los bloques públicos con la marca Encounters.

Ubicaciones propuestas: Home cerca de Próximamente y footer. Admin: lista de suscriptores, asunto, texto/enlaces, previsualización o envío de prueba, y envío deliberado de la campaña. El contenido de la web puede enlazarse desde el email sin duplicarse como ficha.

Usar exclusivamente suscriptores de Encounters: los de Katie no se copian. Si existe una lista propia del cliente, inventariar su origen y estado antes de importarla. Evitar duplicados y mantener las bajas. Publicar una obra o anuncio no envía automáticamente una campaña.

Configurar Resend para Encounters, remitente y reply-to propios, dominio/subdominio verificado y enlaces de baja del nuevo sitio. Revisar el método de envío existente para el volumen previsto, límites actuales, entregas fallidas y reintentos sin duplicar correos. El admin debe reflejar éxitos/fallos; probar alta → recepción → baja → exclusión de futuros envíos.

## 5. Home, About y Contact

Home propuesta:

1. Presentación visual y frase que explique el colectivo.
2. Entradas visuales claras a Expeditions, Workshops, Art, Messages y Crew.
3. Actividades en curso.
4. Próximamente y llamada a newsletter.
5. Últimas publicaciones: arte, mensajes y relatos/resultados.
6. Obra o Meaningful Message destacado.
7. About breve, Crew y formas de ayudar.

Los admins editan el texto/imagen inicial, ordenan secciones, muestran u ocultan bloques, fijan contenidos existentes y previsualizan. El sistema completa las listas con contenido publicado y oculta las secciones vacías. Evitar repetir la misma ficha innecesariamente. Una corrección menor no la convierte en novedad: usar fecha editorial o publicación, no cualquier `updated_at`.

About conserva historia, misión y forma de actuar en campos/bloques editables, precargados desde WordPress. Contact reutiliza Settings: email, WhatsApp, redes y donaciones; cada campo no completado queda oculto. El formulario de contacto heredado puede quedar como módulo apagado, sin eliminar la integración de Resend que sí usa Newsletter.

## 6. Administración inicial y modelo de datos sencillo

Menú inicial: Dashboard, Expeditions, Workshops, Art, Messages, Resultados/Relatos, Próximamente, Crew, Media, Newsletter, Home & Pages y Settings. Los tres administradores acceden a todo. No hay bandeja de aprobación, permisos por módulo ni roles parciales en v1.

Estados editoriales: **draft / published**. Un admin guarda borradores y publica directamente. La edición guardada de una ficha publicada actualiza su contenido público; no se promete mantener una versión paralela pendiente de aprobación. Conservar guardado íntegro y aviso de cambios sin guardar; una comprobación simple de versión evita pisarse al editar simultáneamente.

Conservar separación entre perfil Crew, `auth.users` y autoría. Configurar la allowlist de los tres admins de manera consistente en UI/API/base de datos. Las escrituras se protegen con RLS y validación del servidor, incluyendo bloques y relaciones; ocultar el admin no basta. No hace falta construir un gestor de altas para estas tres cuentas.

Propuesta de esquema lógico, a concretar en migraciones:

| Tabla/pieza | Uso |
|---|---|
| `posts` | Publicaciones con `content_type`: artwork, expedition, workshop, message, story. Campos comunes, estado editorial y detalles específicos. |
| `post_blocks` | Bloques ordenados reutilizados del blog. |
| `crew_members` | Perfiles públicos con identidad estable. |
| `post_contributors` | Post, persona, rol y orden de créditos. |
| `art_categories` / `post_art_categories` | Categorías dinámicas y categoría principal de una obra. |
| `post_relations` | Relaciones entre contenidos; para story, actividad de origen obligatoria y validada como expedición/workshop. |
| `upcoming_items` | Referencia a contenido existente o anuncio independiente; estados y orden. |
| `site_settings` / páginas editables | Identidad, contactos, Home, About e introducciones de secciones. Reusar settings y separar solo si lo exige el contenido. |
| `newsletter_subscribers` y piezas existentes | Altas, bajas y gestión de la lista propia. |
| Medios existentes, ampliados según necesidad | Imágenes/archivos, créditos, alt y referencias de uso. |
| `admin_users` / Auth | Allowlist de los tres fundadores y cuentas privadas. |
| Mapeo de migración y redirecciones | Origen de datos, idempotencia y URLs anteriores. |

Las etapas y necesidades pueden guardarse como listas estructuradas dentro de `posts.details` en v1, con IDs estables y validación por tipo. Crear tablas específicas solo si se requieren consultas o comportamiento que lo justifique. Las relaciones entre personas y contenidos sí usan claves foráneas, no nombres escritos a mano.

No se construyen ahora `content_revisions`, matrices de permisos, editores asignados, colas de aprobación ni almacenamiento de revisiones editoriales. En el backlog se documenta cómo incorporar participant/roles y revisión cuando exista una necesidad real. No hace falta crear roles sin uso por anticipado.

Reglas de integridad:

- UUID para relaciones; slug para URL. Cambiar slug o categoría principal de Art genera redirección permanente al publicar el cambio.
- Guardar metadatos, bloques y relaciones de una ficha de forma atómica, con validación del tipo de contenido.
- Relatos: actividad de origen válida y link de regreso; una actividad sin relatos oculta el bloque de resultados.
- Público: solo fichas publicadas y relaciones visibles. Una categoría oculta no debe dejar obras públicas sin ruta; reasignar o retirar de forma explícita.
- Terminar una actividad no la despublica; quitarla de Próximamente no la elimina.
- Duplicar copia contenido como borrador y propone nuevo slug. Reinicia fechas editoriales, estado operativo/inscripción y selección de destacados; permite decidir qué campos conservar. No arrastra relatos de resultados ni publica la copia.
- Medios reutilizados no se borran mientras estén en uso. El bucket público heredado hace accesible un archivo a quien conozca su URL; no prometer confidencialidad de imágenes de borradores. Los recursos que sí deban ser privados requieren ubicación y acceso adecuados.
- Fechas opcionales y precisión explícita; metadatos y bloques vacíos no se renderizan.

## 7. Bloques de viajes, afiliados y módulos reutilizables

Antes de apagar un componente se evalúa si sirve con un ajuste pequeño. No confundir un bloque de contenido útil con toda la infraestructura comercial.

| Pieza heredada | Posible uso en Encounters |
|---|---|
| Quick facts | Fechas, región, duración, modalidad o datos del barco. |
| Costs | Presupuesto informativo de expedición o costo del workshop, si ellos lo desean. |
| List / accordion / FAQ | Programa, materiales, preguntas frecuentes y formas de participar. |
| Link / CTA | Colaborar, donar, leer, escuchar, descargar o inscribirse externamente. |
| Stay / tour | Evaluar convertir la tarjeta en logística o actividad recomendada si hay un caso real; no forzar su presencia. |
| Gallery / carousel / image pair | Portfolio, proceso artístico y resultados de actividades. |
| Países/mapa | Ubicación o zona de expedición si aporta claridad; no necesita un catálogo de viajes separado. |
| Afiliados | Mantener capacidad disponible pero apagada salvo decisión concreta; eliminar tracking/IDs de Katie del sitio activo. |

Módulos activos en v1: contenido, Art, Expeditions, Workshops, Messages, Crew, Relatos, Próximamente, Newsletter, páginas y settings.

Módulos conservados inicialmente apagados: ecommerce, carrito/checkout/pedidos/proveedores/campañas/reviews; donaciones internas por Stripe; Gear/afiliados; Destinations como sección independiente; comentarios/likes; Gallery como página independiente; formulario de contacto.

Usar un registro central de módulos para navegación, rutas públicas, admin, API, consultas, sitemap y tareas. Apagado significa que no ofrece funciones ni dispara consultas/efectos. Los endpoints de módulos apagados rechazan operaciones antes de actuar; su cron no se registra en el proyecto nuevo. Las herramientas compartidas usadas por módulos activos permanecen disponibles.

Por cada módulo documentar: finalidad, archivos/rutas, dependencias, tablas/migraciones, variables de entorno, servicios/webhooks/cron, motivo de desactivación, controles que lo bloquean y pasos/pruebas para reactivarlo. Conservar el código no implica que ecommerce pueda operar en el futuro sin configurar proveedor, pagos, productos y políticas de Encounters.

## 8. Servicios e identidad propia

Crear repositorio GitHub y proyecto Vercel propios. Crear Supabase nuevo para Encounters con DB, Auth y Storage. Configurar Resend con credenciales/remitentes propios y el servicio de correo que corresponda. Los entornos de pruebas no deben escribir en producción ni enviar a la lista real por accidente. Mantener WordPress atendiendo el dominio durante el desarrollo.

El cliente debe conservar propiedad o acceso administrativo a los servicios y Juani su acceso de trabajo. Inventariar quién gestiona el registrador, DNS y hosting actuales antes del lanzamiento. No comprar un dominio nuevo: ya existe `encountersagainandagain.com`.

Lista de rebranding técnico y editorial:

- Nombre público Encounters Again and Again; identificadores/dominio `encountersagainandagain` según contexto.
- Logos, iconos, favicon, tipografía, colores, imágenes por defecto, textos y marcas de agua.
- Navegación, footer, About, contacto, ayudas del admin, 404 y estados vacíos.
- Metadata por página, templates de títulos, descripciones, Open Graph, imágenes sociales y Twitter cards.
- URL base, canonicals, sitemap, robots, datos estructurados y autoría múltiple correcta.
- Redirecciones de `next.config.ts` y `vercel.json`; retirar destinos y hostnames de Katie.
- Emails de bienvenida/newsletter/baja, remitente, reply-to, direcciones de aviso y URLs de los enlaces.
- Exportaciones CSV, prefijos de borradores locales y defaults que puedan mostrar la marca anterior.
- IDs y verificaciones de Analytics/Search Console, Pinterest, Travelpayouts y otros servicios.
- Variables de entorno, claves, buckets, endpoints, callbacks de Auth y recuperación de contraseña.

Hacer búsqueda y revisión semántica: no basta reemplazar la palabra Katie. No copiar usuarios, pedidos, suscriptores ni secretos del proyecto base. La procedencia de código puede constar en documentación técnica, pero la experiencia pública y del admin debe pertenecer al cliente.

Resend: verificar el dominio/subdominio remitente con los registros indicados por el servicio, validar SPF/DKIM y revisar compatibilidad con el correo existente; no alterar registros de recepción ajenos al envío. [Configuración oficial de dominios](https://resend.com/docs/dashboard/domains/manage-domains).

## 9. Seed y migración editorial

| Origen WordPress | Destino |
|---|---|
| Home | Presentación editable y referencias a secciones/contenidos. |
| About | Página administrable `/about`. |
| Meet the Team | Perfiles Crew; solo los tres fundadores tendrán cuentas creadas durante configuración. |
| Wild Wonders | Perfil Georgia y obras/galerías relacionadas. |
| Encounters Expeditions | Introducción editable del barco/programa; fichas concretas solo con información suficiente. |
| Artsy Animals | Introducción editable y ciclo/etapas según aclaración del equipo. |
| Meaningful Messages | Mensaje en `/messages/[slug]`. |
| Obras futuras mencionadas en Home | Obra con estado futuro o anuncio de Próximamente, sin duplicar ambas tarjetas. |
| Libro en dominio externo | Ficha con información acreditada y enlace; incorporar PDF/contenido faltante cuando lo aporten. |
| Servicios de plantilla / shop vacío / checkout / dashboard | Respaldo y exclusión del seed público. |

El snapshot es la fuente intermedia; su `proposed_path` no impone las nuevas rutas. `blocks` es la fuente canónica y `position` su orden. `sections` y `curated_groups` agrupan el mismo contenido y no se insertan nuevamente. Las imágenes se resuelven con `asset_id` y archivos locales. Mantener `wp_id`, `block_id`, URL y slug anteriores para trazabilidad.

Preparar mapeo, dry-run y seed idempotente en la base nueva. Los campos del seed quedan editables; una segunda ejecución no duplica ni sobrescribe cambios humanos silenciosamente. No inventar fechas, autores, enlaces ni relatos de expediciones que todavía no se escribieron. Conservar texto original durante importación; las correcciones posteriores son edición editorial.

Convertir HTML heredado a bloques admitidos y tratar SVG de manera segura. Preservar originales y crear derivados de imágenes apropiados. Documentos/audio no pasan por el optimizador de imágenes. Reconciliar cada bloque: destino o exclusión explícita. Actualizar el snapshot o importar los cambios de WordPress antes del corte definitivo.

## 10. Dominio existente, SEO y salida de WordPress

La migración tiene dos partes: cambio de hosting hacia Vercel y cambio de algunas rutas. Mantener el dominio no evita tener que redirigir URLs antiguas como las de Elementor. Conservar rutas útiles que no necesitan cambiar y crear una correspondencia explícita para las demás. La guía de Google recomienda mapear y redirigir las URLs al reorganizar un sitio. [Migración con cambios de URL](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

Secuencia operativa:

1. Identificar registrador, proveedor DNS, hosting y correo. Guardar copia de la zona DNS y backup restaurable de WordPress, archivos y base de datos. Registrar dominio canónico, URLs importantes y métricas existentes si están disponibles.
2. Desarrollar y validar con una URL de preview de Vercel, protegida o fuera de indexación. La web actual sigue funcionando con el dominio del cliente.
3. Preparar producción con variables, contenido, tres cuentas admin, imágenes y Resend propios. Confirmar dominio canónico; preferir mantener el actual si funciona correctamente.
4. Probar las redirecciones de WordPress, sitemap y metadatos en el nuevo proyecto. No dirigir todas las URLs residuales a Home: resolver su destino o devolver 404/410 según corresponda.
5. Preparar Google Analytics y Search Console cerca de la salida para medir desde el lanzamiento. Conservar propiedades existentes si ya pertenecen a Encounters.
6. Hacer una sincronización editorial final; acordar una pausa breve de cambios en WordPress para no perder publicaciones durante el corte.
7. Agregar el dominio al proyecto Vercel y preparar su verificación. Usar los valores DNS que indique ese proyecto en ese momento, no los de Katie ni una IP copiada de otro despliegue.
8. Cuando la nueva web esté validada y la salida acordada, cambiar los registros web necesarios en el proveedor DNS actual. Preservar MX, TXT y registros de correo/verificación. Cambiar hosting no exige transferir el registro del dominio. [Configuración de dominios en Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).
9. Verificar propagación, HTTPS, dominio raíz y www, redirecciones, imágenes, acceso admin, alta/baja de newsletter y enlaces. La URL canónica debe ser consistente. Publicación y sitemap deben ser indexables; las previews y admin siguen excluidos.
10. Confirmar medición real, enviar el sitemap y revisar las URLs importantes en Search Console. Supervisar errores 404, redirecciones, indexación y tráfico tras el cambio.
11. Mantener el hosting WordPress y respaldo durante la estabilización. Conservar un procedimiento para restaurar los registros web anteriores si falla el lanzamiento, asumiendo propagación DNS; volver atrás no es instantáneo. Antes de usarlo, preservar altas de newsletter y contenido nuevo recibido en el sistema nuevo.
12. Retirar el hosting anterior solo después de validar estabilidad, datos y accesos con el cliente. La baja comercial del hosting se decide aparte; este plan no cancela servicios.

El dominio `.org` del libro queda como recurso externo hasta que se decida expresamente integrarlo o redirigirlo. No se cambia por el hecho de migrar el `.com`.

## 11. Analytics, Search Console y métricas

Implementación al final del desarrollo y validación alrededor del lanzamiento. El SEO técnico se trabaja desde las primeras plantillas, no al final.

### Google Analytics 4

- Comprobar si Encounters ya tiene propiedad GA4. Reutilizarla cuando corresponda para conservar historial; crear una propia si no existe. Nunca reutilizar el ID de Katie.
- Configurar el ID según entorno y validar pageviews al navegar entre páginas de Next.js sin recarga completa.
- Elegir un solo mecanismo de pageviews: automático por historial o manual. Si se conserva el envío manual heredado, desactivar los disparos automáticos equivalentes; probar que cada navegación cuenta una vez. [Medición de SPA](https://developers.google.com/analytics/devguides/collection/ga4/single-page-applications) y [control de pageviews](https://developers.google.com/analytics/devguides/collection/ga4/views).
- Mantener las pruebas y rutas admin fuera de las métricas públicas; validar en herramientas de depuración y tráfico de producción.
- Revisar las opciones de privacidad/consentimiento que correspondan a la implementación y reflejarlas en la información del sitio. No enviar emails, teléfonos ni texto de usuarios como parámetros analíticos.

Métricas propuestas para el cliente:

| Qué quieren conocer | Medición |
|---|---|
| Cuánta gente visita y de dónde llega | Usuarios, sesiones, fuentes y páginas visitadas. |
| Qué áreas interesan más | Visitas e interacción en Art, Expeditions, Workshops, Messages y Crew. |
| Crecimiento de comunidad | Alta de newsletter confirmada por el sistema, no solo clic en el botón. |
| Interés en actividades | Clic en contacto o inscripción externa con referencia de actividad. |
| Interés en colaborar | Clic en email/WhatsApp desde una necesidad o expedición. |
| Interés en donar | Clic en el enlace de donaciones. No llamarlo donación realizada. |
| Consumo de arte | Clic de reproducción/enlace/descarga medible; no presumir reproducción real dentro de embeds externos sin integración. |

Deduplicar eventos si Enhanced Measurement ya registra alguno. No se construye un dashboard analítico propio en el admin para v1; se entregan acceso y una guía breve de lectura en GA4.

### Google Search Console

Comprobar si existe propiedad del dominio y conservar su verificación/acceso. Si no, verificar una propiedad adecuada, preferentemente de dominio mediante DNS. Tras el lanzamiento, presentar el sitemap actualizado y revisar indexación, URLs canónicas, redirecciones, clics, impresiones y consultas. Al conservar el dominio, no corresponde usar “Cambio de dirección” solo por pasar de WordPress a Vercel; sí hay que resolver las rutas que cambian.

Separar sus objetivos: GA4 mide uso de la web; Search Console muestra presencia y rendimiento en Google. No garantizan indexación, posiciones ni recuperación inmediata de tráfico después de reorganizar URLs. [Orientación de Google para cambios de hosting](https://developers.google.com/search/docs/crawling-indexing/site-move-no-url-changes).

## 12. Checklist completo de ejecución

Las casillas siguientes describen trabajo pendiente de implementación. Lo completado hasta ahora es la revisión del repositorio, el snapshot inicial y este plan corregido.

### A. Preparación y diseño — Juani con los fundadores

- [ ] Confirmar identidad pública, aliases de Crew, email, WhatsApp, redes, donaciones y materiales faltantes.
- [ ] Obtener accesos de trabajo a WordPress, registrador/DNS y servicios existentes; identificar Analytics/Search Console si ya existen.
- [ ] Guardar backup de WordPress y zona DNS; inventariar URLs y contenido añadido desde el snapshot.
- [ ] Definir Home visual, navegación aprobada y plantillas de detalle/listados con estética de arte y mar.
- [ ] Cerrar campos comunes, campos opcionales y comportamiento de estados por módulo.

### B. Proyecto independiente y módulos — Juani

- [ ] Duplicar la referencia acordada de Katie en un nuevo repositorio GitHub.
- [ ] Crear Supabase y proyecto Vercel propios; conectar el repositorio y configurar entornos.
- [ ] Crear/configurar Resend y remitentes del cliente; preparar Auth y recuperación de acceso.
- [ ] Crear las tres cuentas fundadoras y validar allowlist, API y RLS.
- [ ] Reemplazar marca, defaults, dominios, metadatos, plantillas de email, IDs y verificaciones de Katie.
- [ ] Inventariar bloques de viajes/afiliados; reutilizar, adaptar o desactivar cada pieza con una razón.
- [ ] Implementar registro de módulos y documentar la desactivación/reactivación completa del ecommerce y demás módulos apagados.

### C. CMS y contenido — Juani

- [ ] Reutilizar `posts` y `post_blocks`; añadir tipos, categorías dinámicas, Crew y créditos múltiples.
- [ ] Separar componentes del editor y formularios; implementar guardado íntegro, borradores y previsualización.
- [ ] Adaptar medios, galerías, video, poema, audio y documentos a los formatos acordados.
- [ ] Completar el primer recorrido: categoría → obra con dos responsables → publicar → verla en Art, ambos perfiles y Home sin deploy.
- [ ] Implementar presentación editable del barco y fichas de expediciones.
- [ ] Implementar checklist de necesidades: abiertas, conseguidas/tachadas, cerradas y contacto.
- [ ] Implementar workshops con campos opcionales, etapas y estados separados de actividad/inscripción.
- [ ] Incorporar duplicación como borrador y reinicio de fechas/estados que no deben heredarse.
- [ ] Implementar posts de resultados para expediciones/workshops y sus enlaces de ida y vuelta.
- [ ] Completar Messages, perfiles Crew, Próximamente y su vinculación a fichas existentes.
- [ ] Construir Home administrable, destacados, orden, listas automáticas y ocultación de vacíos.
- [ ] Completar About, Contact y footer desde settings editables.
- [ ] Activar newsletter: formulario, lista, envío de prueba, envío manual, baja y manejo de fallos.

### D. Importación y validación — Juani y fundadores

- [ ] Mapear snapshot a tablas, preparar dry-run y subir assets al almacenamiento nuevo.
- [ ] Ejecutar seed idempotente con textos originales y campos editables; validar una segunda ejecución sin duplicados.
- [ ] Reconciliar todos los bloques y confirmar responsables, enlaces, imágenes, etapas y fechas reales.
- [ ] Preparar y probar redirecciones desde URLs anteriores de WordPress.
- [ ] Validar metadata/SEO, canonicals, sitemap, robots y publicación de slugs nuevos sin deploy.
- [ ] Revisar diseño móvil, legibilidad, accesibilidad, carga de medios, vacíos, permisos y módulos apagados.
- [ ] Probar con las tres cuentas: crear, editar, duplicar, publicar, completar necesidades y escribir resultados.
- [ ] Probar newsletter con direcciones de prueba, alta/baja y ausencia de identidad/enlaces de Katie.
- [ ] Validar versión completa con los fundadores y dejar contenido inicial listo para salir.

### E. Métricas y cambio del dominio — Juani con accesos del cliente

- [ ] Configurar GA4 de Encounters, eventos acordados y verificar ausencia de pageviews duplicados.
- [ ] Preparar o conservar Search Console y su verificación; registrar situación inicial si hay historial.
- [ ] Preparar producción, dominio en Vercel, registros DNS objetivo y procedimiento de reversión.
- [ ] Sincronizar los últimos cambios de WordPress y acordar la ventana de lanzamiento.
- [ ] Apuntar los registros web del dominio existente a Vercel preservando correo y verificaciones.
- [ ] Comprobar DNS, HTTPS, raíz/www, páginas, redirecciones, admin, imágenes y newsletter en el dominio real.
- [ ] Confirmar Analytics, presentar sitemap y revisar URLs principales en Search Console.
- [ ] Vigilar fallos, indexación y métricas durante la estabilización; mantener WordPress recuperable.
- [ ] Entregar guía de contenido, newsletter, módulos, accesos y métricas; retirar el hosting viejo solo cuando corresponda.

## 13. Criterios de cierre y responsabilidades

| Responsable | Construcción | Operación inicial |
|---|---|---|
| Juani | Diseño/implementación, infraestructura, seed, SEO, pruebas, migración y medición. | Mantenimiento técnico y cambios de funcionalidad. |
| Fabri, Flaco y Georgie | Validar contenido, identidad, contacto, estados y experiencia visual. | Administrar y publicar todo el contenido, completar necesidades, escribir resultados, seleccionar destacados y enviar newsletter. |
| Otros integrantes de Crew | Aportar biografía, imágenes y créditos. | Perfil público sin acceso al admin. |
| Aplicación | Aplicar las reglas construidas. | Mostrar relaciones, filtrar borradores, generar rutas/listas y actualizar caché/sitemap. |

Cierre funcional: los tres fundadores pueden mantener la web sin código; una nueva obra aparece por categoría y responsables; las expediciones y workshops muestran datos completos solo cuando existen; necesidades conseguidas siguen visibles y tachadas; resultados se publican como posts libres; Próximamente no duplica tarjetas; newsletter funciona con alta y baja; los módulos apagados no operan; el dominio real sirve la web nueva con redirecciones y métricas verificadas.

Las pruebas de implementación incluirán lint, TypeScript, build y recorridos dirigidos. El plan no afirma que estas pruebas ya se ejecutaron. No se hace una estimación cerrada de horas hasta concretar diseño y formatos finales.

## 14. Backlog posterior al lanzamiento

- Roles admin / participant / sin acceso, según la necesidad real del equipo.
- Creación de nuevas cuentas desde el admin y permisos por módulo o contenido.
- Revisión editorial, versiones paralelas y aprobación previa a publicar.
- Colecciones/series complejas de arte o podcasts.
- Publicación programada y newsletters automáticas, si las solicitan.
- Inscripciones internas, disponibilidad real y pagos de workshops.
- Reactivación de ecommerce, afiliados, comentarios o módulos documentados.
- Visores interactivos nuevos, multidioma o analítica personalizada en el admin.

Estos puntos no bloquean el lanzamiento inicial. La base con IDs estables, autoría separada de Auth y módulos documentados permite evaluarlos más adelante sin implementarlos antes de tiempo.
