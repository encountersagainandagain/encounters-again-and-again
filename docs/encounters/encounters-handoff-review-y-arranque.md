# Encounters — revisión del handoff, rutas y arranque

Fecha: 2026-09-23. Estado: revisión documental terminada; decisiones propuestas para implementación, sin código desplegado ni cambios de DNS.

## 1. Conclusión

Sí: usar What Katie Seas como base de un proyecto independiente. Reutilizar infraestructura, CMS, autenticación, medios, newsletter y SEO; adaptar los componentes públicos al diseño de Encounters.

Los 16 Markdown entregados describen la estética y los comportamientos, pero no sustituyen el alcance funcional acordado ni constituyen migraciones SQL listas para ejecutar. Antes de programar se deben aplicar las correcciones de este documento. La estructura técnica se decide contra el código real de Katie; no hace falta reconstruir su CMS desde cero.

Documentos de referencia:

- `encounters-arquitectura-y-plan.md`, versión 2: alcance funcional y técnico acordado.
- `encounters-checklist-seguimiento.md`: único seguimiento de los 22 pasos.
- `handoff/00-README.md` a `handoff/90-checklist.md`: especificación de diseño original, conservar sin sobrescribir.
- Este documento: diferencias detectadas y propuesta de integración. Las decisiones visuales pendientes se contrastarán con los prototipos.
- `encounters-redirects-plan.json`: inventario inicial de URLs y disposiciones propuestas; **no es configuración ejecutable ni confirma redirecciones desplegadas**.

Si hay diferencias, prevalecen las instrucciones explícitas de Juani; el handoff aporta el diseño. Una propuesta de tabla en el handoff no obliga a desechar tablas o lógica existentes. Los cambios de alcance pendientes no se consideran aprobados por recibir estos archivos.

## 2. Material recibido y alcance de la revisión

| Archivos leídos | Qué aportan |
|---|---|
| 00-README | Índice, rutas y reglas; declara los HTML como referencia visual principal. |
| 01-design-system | Paleta, EB Garamond/Archivo, navbar, espaciado y medios. |
| 02-animations | Motor de scroll, efectos, comportamiento móvil y movimiento reducido. |
| 03-data-model | Propuesta de entidades, relaciones, campos y SQL parcial. |
| 04-editor-de-bloques | 17 formatos de contenido y su presentación. |
| 10-home a 19-contact | Diez plantillas/páginas: Home, About, Crew, perfil, Expeditions, Workshops, Art, Messages, Post y Contact. |
| 90-checklist | Secuencia visual y criterios del prototipo. Se usa como checklist complementario, no reemplaza los 22 pasos del proyecto. |

**Faltan los diez prototipos `.dc.html` y sus dependencias**: imágenes, logos, garabatos SVG, estilos/scripts y cualquier shader utilizado. Pedir un ZIP del proyecto de diseño que conserve su estructura relativa. Capturas desktop/móvil son útiles como referencia adicional; no reemplazan el comportamiento de los HTML.

No se revisaron visualmente esos prototipos, ni se ejecutó un build. La cuenta `encounters.services@outlook.com` está confirmada; las nuevas cuentas de GitHub/Vercel/Supabase/Resend siguen pendientes de confirmar. WordPress está en pausa. No se requiere recuperarlo para comenzar el proyecto nuevo.

GitHub: acceso privado confirmado a `juanimolfino/katie-blog`, rama por defecto `main`. En esta revisión se leyeron `package.json`, `next.config.ts` y `app/blog/[slug]/page.tsx`. Mantiene Next `^16.2.6`, React 19, TypeScript, Supabase JS y Tailwind 3. La auditoría amplia anterior corresponde al commit `34eb7e9971eee4e5dba974147a0caec12bb2bad9`; registrar el SHA exacto elegido al duplicar y comparar cualquier cambio posterior. No se afirma una nueva auditoría integral de la rama actual.

## 3. Diferencias que debemos resolver

| Área | Lo que dice el handoff | Integración propuesta |
|---|---|---|
| CMS | Una tabla por tipo; crea `posts` y `post_blocks` nuevos. | Mantener el núcleo compartido acordado y ampliar mediante migraciones compatibles. El SQL entregado es una referencia parcial, no ejecutarlo encima de Katie. |
| Art y autoría | Créditos de texto en categorías; obras sin relación estructurada con Crew. | Categoría principal y varios responsables por obra, con roles. Esas relaciones alimentan automáticamente perfiles y Home. Créditos editoriales de texto pueden complementar, no sustituir la relación. |
| Páginas de Art | Filtros y anclas dentro de `/art`. | Conservar esa experiencia y añadir URLs reales para categoría y obra. Los enlaces a cada ficha deben funcionar sin interactuar primero con un filtro. |
| Crew | Página opcional mediante un post y carruseles manuales. | Mantener página opcional; completar identidad, bio, redes y obras automáticas. El post usado como cuerpo del perfil no se publica también en `/posts`. Wild Wonders debe tener ficha pública completa al migrar. |
| Expeditions | Presentación del barco guardada como campos de una expedición. | Separar la presentación editable del programa de cada viaje concreto. El seed del barco no inventa una expedición fechada. |
| Necesidades | No modeladas. | Añadir checklist editable con abierta/conseguida/cerrada, texto tachado cuando se consigue y contacto para colaborar. |
| Workshops | Tres estados de actividad y un `mailto` de inscripción. | Conservar estados de actividad e inscripción separados, campos opcionales acordados y etapas. Admitir enlace externo o contacto según lo cargado. No construir reservas ni cobros internos. |
| Resultados | Un `report_post_id`, solo al terminar; al terminar se ignoran sesiones. | Admitir varios relatos vinculados, incluso durante la actividad. Conservar programa e información histórica; una actividad terminada sin relato no muestra un botón roto. Puede existir un resultado destacado sin limitar el resto. |
| Próximamente | Solo expediciones y workshops con fechas. | Incluir obras futuras y anuncios independientes; fecha opcional, referencia a ficha cuando exista y deduplicación. |
| Home | Tres entradas fijas; orden de secciones fijo; arte por `sort`. | Conservar composición visual, permitir editar entradas/orden/visibilidad y elegir destacados. Usar fecha editorial para novedades y orden manual como selección explícita; ocultar vacíos. |
| Newsletter | No aparece en las plantillas ni en el modelo. | Incorporar suscripción en Home/footer, gestión y envío manual desde admin, prueba y baja; reutilizar Katie. |
| Contact | Formulario, motivos, almacenamiento y notificación. | Contradice el contacto directo acordado. Por defecto mantener email, WhatsApp, redes y donación; adaptar el panel visual. Formulario queda pendiente de decisión explícita, no se activa por este handoff. |
| Navbar | Añade Contact al menú y cambia el orden. | Tomarlo como propuesta visual nueva, pendiente de confirmar. Hasta entonces conservar el menú acordado y Contact en el footer. |
| Textos institucionales | Crew y algunos cierres admiten constantes. | Textos del cliente editables en Settings/páginas. Mantener en código únicamente estructura y decoración. |
| Cantidades | Messages mínimo 2; agenda descrita como exactamente 4; varias cantidades fijas. | Las cantidades del prototipo son muestras o límites de presentación. Debe funcionar con 0, 1 y varios elementos; el snapshot tiene un solo mensaje. No inventar contenido para completar el diseño. |

Otros detalles del modelo que deben completarse: `status`, slug, fechas editoriales y SEO en obras/mensajes; referencias y validación de medios; publicaciones ocultas fuera de consultas públicas; autenticación y RLS de tres admins; guardado íntegro de bloques/relaciones; duplicación a borrador; desactivación completa y documentada de módulos. Ninguno queda resuelto por el SQL parcial del handoff.

Los bloques de viajes y afiliados se evalúan uno por uno. Quick facts, costos, galerías, FAQ y enlaces tienen usos claros. Una ficha de centro de buceo puede adaptarse a un colaborador; afiliación y tracking solo se habilitan si existe un uso aprobado. No heredar IDs ni campañas de Katie.

## 4. Rutas recomendadas

Se propone adoptar `/meaningful-messages` y `/posts/[slug]` del handoff para esas dos familias, manteniendo las fichas específicas que faltan en el diseño. Esto actualiza nombres propuestos, no URLs ya publicadas. No hay ventaja SEO automática por elegir “posts” en lugar de “stories”.

| Ruta | Contenido y canonical |
|---|---|
| `/` | Home. |
| `/about` | Misión e historia; conservar ruta existente. |
| `/contact` | Contacto directo. |
| `/crew` | Equipo. |
| `/crew/[slug]` | Una persona; Georgia/Wild Wonders en `/crew/wild-wonders`. |
| `/expeditions` | Programa, barco, colaboración y expediciones. |
| `/expeditions/[slug]` | Una expedición: datos, necesidades, participantes y enlaces a relatos. |
| `/workshops` | Artsy Animals y listado de ediciones. |
| `/workshops/[slug]` | Una edición, etapas, información e inscripción. |
| `/art` | Índice visual de categorías y obras. |
| `/art/[category]` | Categoría administrable con introducción y obras. |
| `/art/[category]/[slug]` | Obra con responsables y contenido propio. |
| `/meaningful-messages` | Presentación y mensajes, admitiendo un único mensaje inicial. |
| `/meaningful-messages/[slug]` | Mensaje individual, texto completo y créditos; destino compartible. |
| `/posts/[slug]` | Relato/resultado o novedad independiente; excluye el cuerpo privado de perfiles y otras fichas. |
| `/upcoming` | Opcional si el volumen requiere listado completo; no bloquea v1. |
| `/unsubscribe/[token]` | Baja de newsletter; sin indexación. |

Conservar o adaptar páginas legales y flujos de suscripción necesarios del proyecto base, con datos de Encounters. Admin y previews no entran al sitemap.

**Una ficha tiene una URL canónica.** Reutilizar un editor o tabla no implica servir la misma biografía tanto en Crew como en Posts. La categoría principal define la URL de una obra; al cambiarla o cambiar un slug, guardar la ruta anterior y redirigir a la nueva. Los índices pueden mostrar extractos y enlazar al contenido completo.

Los detalles de categoría, obra, actividad y mensaje no están documentados como prototipos independientes. Se pueden componer con el sistema visual y la plantilla de bloques, pero requieren revisar su encabezado, metadatos, relaciones y navegación de regreso.

## 5. Correspondencia inicial de WordPress

Fuente: `source_url` del snapshot, **no** `proposed_path`. El snapshot contiene 11 páginas y una publicación. Sus destinos sugeridos antiguos (`/team`, `/our-story`, `/projects/...`) no prueban que esas rutas hayan sido públicas.

| URL anterior, relativa al `.com` | Destino propuesto | Tratamiento |
|---|---|---|
| `/` | `/` | Conservar. |
| `/about/` | `/about` | Conservar página; normalizar barra final según la política global. |
| `/elementor-page-3462/` | `/crew` | Redirección permanente a equipo. |
| `/elementor-2907/` | `/crew/wild-wonders` | Redirección permanente cuando el perfil esté publicado. |
| `/elementor-3062/` | `/expeditions` | Redirección permanente al programa del barco. |
| `/elementor-page-3107/` | `/workshops` | Redirección permanente a Artsy Animals, conservando el contenido de las etapas. |
| `/contact-3/` | `/contact` | Redirección permanente; `/contact` también aparece como enlace en el snapshot. |
| `/you-never-know-what-encounter-could-change-your-life/` | `/meaningful-messages/you-never-know-what-encounter-could-change-your-life` | Redirección permanente al mensaje equivalente. |
| `/services-3/` | Sin equivalente | Propuesta 410 al retirar contenido de plantilla; confirmar al revisar tráfico/inventario final. |
| `/shop/` | Sin página activa en v1 | Propuesta 404 mientras el módulo esté apagado; no redirigir a Art si no es equivalente. |
| `/checkout/` | Sin función activa | Propuesta 404. |
| `/customer-dashboard/` | Sin función activa | Propuesta 404. |

No cambiar el dominio externo `encountersagainandagain.org` del libro. Mantener su enlace hasta acordar una migración propia y disponer de acceso. No convertir rutas de Katie en supuestas URLs antiguas de Encounters.

**Imágenes y documentos:** el JSON adjunto también inventaría las 50 imágenes del snapshot. Las URLs bajo nuestro dominio requieren conservar el archivo en su ruta o mapearlo al recurso nuevo después de subirlo; no redirigir imágenes a páginas HTML. Los recursos externos no se pueden redirigir desde nuestro dominio. Los placeholders y recursos de plantilla tienen disposición pendiente de revisión. Confirmar PDFs, adjuntos y versiones de imagen no incluidas antes del corte.

El mapa es inicial: faltan registros de tráfico, GSC si existe, archivos/adjuntos y cambios posteriores al snapshot. La lectura pública de `wp-sitemap.xml` y `robots.txt` falló en esta sesión; eso **no demuestra que estén ausentes**. Reintentar al completar el inventario; no se accedió al panel de WordPress.

## 6. SEO y Search Console

La ausencia de Search Console no significa que el sitio esté fuera de Google. La herramienta permite comprobar y seguir su presencia; no es un requisito para aparecer. Recuperar una propiedad existente si la hay; verificar una propia antes del lanzamiento si no existe. [Google: acerca de Search Console](https://support.google.com/webmasters/answer/9128668?hl=es).

Para las rutas movidas, usar redirecciones HTTP permanentes en el servidor (301 o 308), con destino equivalente y publicado. Evitar bucles y cadenas propias. Una navegación mediante JavaScript no reemplaza esa respuesta. [Google: redirecciones](https://developers.google.com/search/docs/crawling-indexing/301-redirects).

Mantener las redirecciones al menos un año, idealmente mientras sigan siendo útiles. Actualizar los enlaces internos y el sitemap; conservar verificaciones existentes. Las páginas retiradas sin equivalente responden 404/410, no todas a Home. [Google: migración de URLs](https://developers.google.com/search/docs/crawling-indexing/site-move-with-url-changes).

Como conservamos el dominio, no corresponde usar “Cambio de dirección” por cambiar hosting o rutas internas. Sí corresponde presentar el sitemap actualizado e inspeccionar destinos importantes. [Google: cambio de dirección](https://support.google.com/webmasters/answer/9370220?hl=es).

Requisitos de implementación del proyecto:

- Centralizar la URL base de Encounters y los constructores de rutas. Metadata, enlaces, canonical, sitemap y datos estructurados deben coincidir.
- HTML con texto principal y enlaces reales desde el servidor. Animar lo ya renderizado; no exigir scroll, filtros o un canvas para obtener el contenido. [Google: JavaScript SEO](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics).
- Titular, descripción, imagen social y créditos propios por ficha; canonicals de la ruta correspondiente. Borradores devuelven 404 en acceso público.
- Sitemap con rutas canónicas publicadas y módulos activos; fecha de modificación real. Nueva ficha publicada sin deployment y con invalidación coherente de página, índices y sitemap.
- Previews protegidas o fuera de indexación; retirar restricciones solo de producción pública al lanzar. No depender de `robots.txt` para proteger información privada.
- Medios nuevos propios, dimensiones, alt contextual y tamaños adecuados. Decoraciones pueden llevar alt vacío; no imponer texto alternativo descriptivo a elementos puramente decorativos.
- Probar cada regla de redirección con respuesta HTTP, destino final 200 y canonical correcto. Cubrir raíz/www, HTTP/HTTPS, barras finales y rutas desconocidas; considerar su normalización al evitar saltos adicionales.
- Registrar el estado previo disponible y revisar indexación, 404, clics e impresiones después. No prometer mantenimiento exacto de posiciones durante el rediseño.

## 7. Animaciones: conservar intención, resolver inconsistencias

El diseño busca una experiencia de descenso al océano. Conservar la paleta, tipografía, composición, imágenes protagonistas y movimiento, con una base de lectura y navegación independiente de los efectos.

| Hallazgo | Qué resolver antes de cerrar el componente |
|---|---|
| README limita animaciones por tiempo, pero luego aparecen navRoll, cueDrop, burbujas y agua continuos. | Acordar excepciones decorativas explícitas; todas respetan movimiento reducido. |
| Regla general suelta pines en móvil, pero Home/Workshops mantienen pines o rieles propios. | Revisar prototipos y definir una regla por página; validar touch, alturas y contenido largo. No asumir ambas instrucciones simultáneamente. |
| Workshops promete transferir scroll al llegar al final con `overscroll-behavior: contain`. | Esa propiedad impide el encadenamiento también en el extremo. Ajustar interacción; proponer scroll nativo sin atraparlo y controles accesibles para sesiones. La solución requiere prueba de mouse, touch y teclado. |
| Opacidad del velo de expediciones calculada de 1 a 1.55. | Como opacidad CSS queda saturada en 1; definir el efecto esperado sin copiar la fórmula literalmente. |
| Reducir movimiento significa “estado final”, pero hay capas absolutas superpuestas. | Presentar todas las cards/mensajes en flujo legible; no volverlas todas opacas en el mismo lugar. |
| Markup empieza en opacity 0 y espera al motor. | Base visible sin JavaScript; activar estilos de animación solo después de inicializar. Evitar contenido inaccesible si falla el motor. |
| Agenda declara exactamente cuatro, pero también admite menos. | Tratar cuatro como máximo de la composición inicial; calcular progreso según cantidad real y ocultar si no hay ítems. |
| Messages exige dos y el contenido real tiene uno. | Renderizar un mensaje sin recorrido vacío. Ampliar al añadir contenido real. |
| Alturas fijas y textos limitados. | Probar textos reales, zoom, móvil y mayor tamaño de letra. Ofrecer detalle completo; no truncar información necesaria para encajar. |
| WebGL y varios efectos por frame. | Probar con recursos reales; limitar coste móvil, detener trabajo fuera de vista/oculto, limpiar listeners al navegar y mantener fallback sin WebGL. |

Fuente del comportamiento de scroll: [MDN, overscroll-behavior](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overscroll-behavior).

No se afirma que los prototipos tengan estos fallos: se identifican contradicciones o riesgos en las instrucciones escritas, pendientes de contrastar con sus HTML.

## 8. Duplicación y primer tramo de implementación

### Paso 4 del checklist: proyecto independiente

Responsable: Juani con el agente de programación en el entorno del proyecto.

1. Crear repositorio privado nuevo, nombre sugerido `encounters-again-and-again`, bajo la cuenta/organización elegida para el cliente; confirmar URL y accesos.
2. Obtener una copia del código versionado de Katie en una carpeta nueva. Registrar rama y SHA de origen. Conservar lockfile y versiones para que adaptación y actualización tecnológica no se mezclen.
3. Configurar el remoto del proyecto nuevo sin posibilidad de hacer push accidental al de Katie. Verificar destino antes del primer push. No modificar la web original.
4. Revisar archivos versionados y documentación antes de publicar la copia. No copiar `.env*` con secretos, vinculación local `.vercel`, credenciales, bases de datos, buckets ni listas de usuarios/suscriptores/pedidos de Katie. Crear `.env.example` con nombres y valores de ejemplo seguros.
5. Incorporar `docs/encounters/handoff/`, plan, seguimiento, esta revisión y el mapa de rutas. Mantener documentación original del diseño separada de las decisiones de implementación. Los medios pesados pueden quedar en un paquete de importación accesible sin versionarlos todos en Git.
6. Instalar dependencias desde el lockfile y documentar qué funciona sin servicios configurados y qué necesita la nueva Supabase. Un fallo por variables faltantes no se resuelve apuntando a Katie.

### Paso 5 y aislamiento inicial

Crear Supabase nuevo (DB/Auth/Storage), Vercel nuevo vinculado al repo y Resend propio usando la cuenta de servicios acordada. Mantener el dominio público atendido por WordPress.

Antes de un despliegue público o de habilitar escrituras/envíos, separar variables y entornos, retirar redirecciones/identificadores de Katie y apagar ecommerce, cron, pagos y afiliados no usados. El código se conserva con documentación de reactivación. Newsletter sigue en alcance, con lista propia.

Hallazgos confirmados en el código actual:

- `next.config.ts` tiene redirecciones desde `whatkatieseas.com` y `katie-blog.vercel.app` hacia `www.whatkatieseas.com`. Revisarlas en la copia; nunca reemplazar simplemente el dominio y mandar previews a producción por accidente.
- `app/blog/[slug]/page.tsx` mantiene `dynamicParams = false`, canonical `/blog/...`, autor Katie y portada fallback de Katie. Cambiar publicación dinámica, metadata y defaults al crear las nuevas plantillas.
- `package.json` ejecuta una comprobación de políticas comerciales antes del build. Evaluarla dentro del aislamiento del ecommerce; no borrar verificaciones a ciegas para hacer pasar el build.

### Primer recorrido completo

El primer objetivo funcional será **crear una categoría, cargar una obra con Flaco y Fabri como responsables, publicarla y verla en Art y ambos perfiles sin nuevo deploy**. Incluye nuevo admin, bloques, relaciones, medios, publicación, metadata y caché. Usar datos de prueba identificados, sin inventar contenido público definitivo.

En paralelo al desarrollo de ese recorrido, construir tokens, navbar/footer y el motor visual mínimo. Probar un componente con scroll complejo antes de extenderlo a toda la web. El editor compartido se necesita temprano; no dejarlo para después de todas las páginas como sugiere el checklist visual.

Después: Expeditions y necesidades → Workshops/etapas → relatos y Messages → Próximamente/Newsletter → Home conectada → contenido completo, SEO, pruebas y lanzamiento. La Home se termina con entidades reales y cantidades variables.

### Comprobaciones del primer tramo

- Original Katie sin cambios; todos los servicios y remotos nuevos identificados.
- Tres admins autorizados, resto sin escritura pública; validación servidor y RLS coherentes.
- Guardado de una obra completo, responsables múltiples sin duplicación y nueva URL pública sin deploy.
- Página pública legible sin animación; enlaces y canonical correctos; borrador no público.
- Lint, TypeScript y build cuando la nueva infraestructura necesaria esté disponible; registrar bloqueos reales, no declarar pruebas sin ejecución.

## 9. Próxima acción y pendientes concretos

1. Juani comparte ZIP de los `.dc.html` con todos los assets; la preparación del repo puede avanzar mientras tanto.
2. Crear/confirmar el repositorio privado nuevo y compartir su URL; entonces empieza la duplicación y configuración del entorno.
3. Revisar las diferencias visuales pendientes con el handoff completo: Contact con formulario o contacto directo, ubicación de Contact en navbar y comportamiento móvil de los pines. Mientras no cambien las instrucciones, se conserva el alcance previamente acordado.
4. Completar las plantillas de detalle y elementos ausentes usando el sistema visual recibido.

El paso 3 queda en curso: recibida y revisada la documentación, todavía faltan referencia visual y aprobación. El paso 4 está preparado pero no ejecutado. No se creó un repositorio ni un servicio, no se ejecutó SQL y no se cambió el dominio en esta revisión.
