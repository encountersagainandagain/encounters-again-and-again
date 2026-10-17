# Módulo Art completo y claridad del CMS — 2026-10-14

Estado: **implementado y verificado técnicamente en local. Pendiente de la prueba manual de Juani; nada de esto figura como aprobado por el usuario.**

Crew y Wild Wonders siguen aprobados visualmente y no cambiaron (verificado: `/crew` 8762px y `/crew/wild-wonders` 7654px, con los mismos elementos). El segundo perfil sigue aceptado como base inicial. El admin tiene la mejora visual del 14/10, pero su organización y validación manual siguen pendientes.

Sin escrituras remotas, correos, servicios pagos, despliegues ni cambios en DNS, WordPress, Hostinger, Vercel o Katie. Noindex conservado. Sin migraciones nuevas: el esquema existente alcanzó.

## Forma de trabajo a partir de ahora

Cada módulo se entrega completo: diseño público según el prototipo vigente, edición contextual en el admin, relaciones y ejemplos locales editables. Se reutiliza lo que ya existe y no se pide aprobación entre subpáginas del mismo módulo.

Orden acordado:

1. **Art** — esta entrega.
2. **Expeditions y sus resultados** (informes, necesidades, tarjetas de presentación).
3. **Workshops y sus resultados** (sesiones, facilitadores).
4. **Meaningful Messages.**
5. **About, Contact y Newsletter.**
6. **Home v2**, cuando sus fuentes (destacados, avisos, listas automáticas) ya existan con contenido real o de ejemplo.

## 1. Entradas del admin

- La entrada principal ya no es un selector genérico de tipo. El inicio y «Pages and publications» ofrecen acciones directas: **New artwork, New expedition, New workshop, New message, New news post** y los informes; **New announcement** y **New crew member** abren sus secciones.
- El listado separa **Activities and publications**, **Site pages** (permanentes: se editan, no se crean ni se borran desde aquí) y **Crew pages** (se crean y abren desde cada integrante).
- El editor sigue siendo compartido, pero cada entrada abre el tipo correcto con sus campos, sus títulos de sección y ayudas propias (`kindHelp` en `adminLabels.ts`). Ejemplo para una obra: «Artwork: category and display», «Authors», «Related expedition or story (optional)».
- **El tipo ya no se puede cambiar**, ni siquiera por accidente: no hay selector. Se fija al crear y se guarda igual en cada edición, así que la dirección, los detalles y las relaciones de un contenido existente no se rompen.
- Las relaciones se guardan sin duplicados y sin autorreferencias, también si el formulario las trae repetidas.

## 2. Crew y página personal

La ficha de cada integrante tiene una card **Personal page**:

- explica que la persona es el registro de Crew y la página es otra pieza vinculada, titulada con el nombre artístico (ej.: Georgia → Wild Wonders);
- muestra el estado (no creada / borrador / publicada) y avisa si la página existe pero «Enable profile page» está apagado;
- permite crear la página (borrador), editarla en el editor del CMS o el detallado, previsualizarla y abrir la página pública cuando está publicada.

No se duplican integrantes para crear páginas. Los créditos históricos se conservan en `post_contributors`, y el perfil sigue separado de cualquier cuenta de acceso.

## 3. Relaciones comprensibles

- Los créditos se nombran según el contenido: **Authors** (obra), **Facilitators** (workshop), **Participants** (expedición), **Credits** (mensaje), **Credited crew** (resto). Cada card explica dónde se muestra el crédito: en la página del contenido y en la página personal de cada persona, cuando ambas están publicadas.
- **Related content** pasa a un selector visible: búsqueda, filtro por tipo, miniatura, estado, casilla por elemento y lista de elegidos con botón para quitar. No hace falta Ctrl/Cmd. Excluye el propio contenido y no repite elementos.
- En las expediciones y los workshops el selector se limita a sus resultados (news e informes).
- En Art, la organización esencial es **categoría** (selector obligatorio) y **autores**. La relación con una expedición o historia es opcional y se explica así.

## 4. Art público

Prototipo: `Art.dc.html` (prevalece sobre `16-art.md`). La categoría y la obra no tienen prototipo propio: extienden Art y la plantilla de banner de Post. Las tres rutas comparten las vistas de `src/components/public/ArtViews.tsx`, que también usan los previews del CMS.

| Ruta | Implementado |
| --- | --- |
| `/art` | Banner con «our ART», reglas verticales y firma que se dibuja una vez. Tiles de categoría a 74vh dentro del banner (grilla con ≤4 categorías; carrusel con más, como pide el handoff), con número monoespaciado y portada (o la primera obra si no hay portada). Chips en el flujo con fondo translúcido. Una sección por categoría en grilla de 6 columnas: antetítulo numerado, título, crédito, lead Garamond, texto y CTA. Obras según `layout`: gallery (columnas por `span`, alto completo con `full_height`), feature (dos grandes lado a lado, `contain`), video (ancho completo, el reproductor de YouTube carga recién al click), audio (con embed de Spotify). Pie monoespaciado `[ título ]` que abre la obra. Cierre oscuro «More to come». |
| `/art/[category]` | Mismo lenguaje: banner con el nombre de la categoría, su sección, «Other collections» y cierre oscuro. Se crea al publicar una categoría desde el admin, sin tocar código. |
| `/art/[category]/[slug]` | Banner con la imagen de la obra, fila con categoría, título y autores enlazados a sus perfiles (rol incluido), lead, pie y enlace externo; video al click; bloques del editor; relacionados; «More from…» y cierre oscuro. |
| Perfiles | Las obras publicadas aparecen agrupadas por categoría en la página personal de cada autor, en tarjetas compactas. |

Estados vacíos conservados: Art real (base remota, sin curación) muestra «There are no published collections yet». Una categoría sin obras muestra su mensaje propio. Los borradores, las categorías en borrador y las obras de una categoría en borrador devuelven 404 y no entran al sitemap.

Previews del CMS con las plantillas públicas: obra (preview integrado y por ruta) y categoría (preview integrado, con sus obras publicadas).

## 5. Avisos, news, «próximamente» y Home

Auditoría del modelo existente, sin cambios de esquema:

| Pieza | Para qué sirve | Dónde se crea |
| --- | --- | --- |
| Expedición / Workshop | La actividad, con su página, fechas y estado (`activity_status`: upcoming, running, finished, postponed, cancelled). | Expeditions / Workshops (New expedition / New workshop). |
| Estado *upcoming* | Una actividad próxima. La Home provisional ya la lista sola en «upcoming». | En la propia actividad. No hace falta otro contenido. |
| Announcement (`upcoming_items`) | Aviso breve para Home. Si apunta a una actividad (`post_id`, único), usa su título y fechas: no se copia texto. Solo sin vínculo necesita título propio. | Announcements. |
| News | Publicación con página propia (`/posts/…`): novedad o historia. | New news post. |
| Informes de expedición/workshop | Resultados de una actividad, vinculados desde ella como «Results». | New expedition report / New workshop report. |

Publicar **no** equivale a destacar: `featured` y `home_rank` son decisiones aparte, y así lo explican las ayudas del editor. Fijar contenido arriba de Home se hace en Site settings → Home sections → Pinned content. Hoy la Home provisional ordena por fijados y agrupa por tipo; `featured`/`home_rank` quedan guardados y explicados para Home v2, que no se implementa en esta entrega. Un aviso que apunta a una actividad *upcoming* no la duplica en la lista: se filtran publicaciones, no avisos.

## 6. SEO y medios

### SEO: qué existe

| Pieza | Estado |
| --- | --- |
| Metadata por página | `title`, `description`, canonical, Open Graph y Twitter en Art, categoría, obra, Crew y perfiles (`editorialMetadata`). Valores por defecto: SEO title → título; descripción → SEO description → resumen (categoría: lead; obra: resumen o pie) → descripción del sitio. |
| Canonical | Relativo al dominio configurado (`metadataBase`). En local apunta a la URL local. |
| Sitemap | Dinámico, solo Art y Crew publicados (categorías, obras de categorías publicadas y perfiles visibles). Verificado: 12 URLs demo, sin borradores. |
| Redirects | Historial automático de rutas al cambiar slug o categoría (`route_history`), más los dos redirects históricos de Crew. Sin cambios. |
| Datos estructurados | Organization y WebSite (layout), BreadcrumbList (Art/Crew). **Nuevo:** `CreativeWork` en cada obra (autores como `Person` con su URL si tienen página, categoría como `isPartOf`) y `CollectionPage` en cada categoría con sus obras. |
| Indexación | Noindex global (meta y `X-Robots-Tag`) hasta el lanzamiento. Sin cambios. |

En el admin, «Search and sharing» usa lenguaje claro: título y descripción con el valor por defecto como marcador, conteo de caracteres orientativo, **vista previa aproximada de buscador** (dominio › ruta, título, descripción) y **de enlace compartido** (imagen, título, descripción). Aparece en todo contenido y en las categorías. No se agregaron campos técnicos. Las previsualizaciones se declaran orientativas; no se promete posición ni aparición en respuestas de IA.

### Imágenes: qué funciona y qué se corrigió

| Aspecto | Estado verificado |
| --- | --- |
| Subida y reducción | En el navegador, antes de subir: ancho máximo 1400px, WebP si el navegador lo soporta, calidad 0,74 y objetivo de 450 KB. **Medido en local:** JPEG 2000×1333 de 148 KB → WebP 1400×933 de 22 KB; PNG 1940×811 de 1,88 MB → WebP 1400×585 de 30 KB. GIF se conserva sin procesar (máx. 10 MB). |
| Dimensiones | Se guardan ancho y alto reales; el editor de medios los muestra junto al formato y el peso. |
| Reutilización | Por hash SHA-256 del archivo optimizado: subir la misma imagen reutiliza el registro existente. |
| Descripción alternativa | **Corregido:** antes una subida quedaba con el nombre del archivo como descripción. Ahora queda vacía y el listado y el editor marcan «Needs a description»; también se marcan descripciones con forma de nombre de archivo. |
| Foco | `focal_x`/`focal_y` y `fit` editables; aplicados por `MediaImage` en las páginas públicas. |
| Acceso | Bucket privado; `/api/media/[id]` sirve solo lo visible bajo RLS (anónimo: solo lo usado por contenido publicado). Los borradores se previsualizan con la sesión del admin. |
| Pendiente | `/api/media` responde `private, no-store`: cada visita vuelve a descargar las imágenes públicas. Cachearlas sin exponer imágenes despublicadas requiere una decisión de privacidad, así que no se cambió. Las páginas públicas no generan tamaños responsivos (imágenes `unoptimized`), y 1400px puede quedar corto para obras a pantalla completa en pantallas retina. |

## 7. Ejemplos editables (solo Supabase local)

Script versionado `scripts/demo-local.mjs`. Se niega a correr contra cualquier destino que no sea `127.0.0.1:54321`/`localhost:54321` y lee las claves locales de `.encounters-work/local-cms.json`, ignorado por Git.

```bash
npm run demo:local:seed                  # crea lo que falte; nunca pisa lo existente
npm run demo:local:plan                  # lista qué borraría la limpieza y por qué conserva el resto
npm run demo:local:clean                 # sin confirmar: solo muestra el plan
npm run demo:local:clean -- --confirm    # borra los ejemplos del plan
npm run demo:local:keep -- <id>          # conserva un ejemplo editado como propio
```

Contenido (todo con «(demo)» en el nombre y las obras con `source_metadata.demo = true`). Ampliado el 2026-10-16 para recorrer `/art` como en el prototipo:

- **Las cuatro categorías de `Art.dc.html`, con su contenido real y sus créditos tal como figuran en el prototipo.** Para estas no se crean registros de personas: el crédito es texto de la categoría y de la obra.
  - «Books (demo)»: feature. La obra «Encounters (demo)» es una presentación completa del libro: banner con el guepardo, autores, encabezados, tapa y contratapa, cómo se hizo, cita, imagen y enlace a encountersagainandagain.org. Además, la contratapa como segunda obra.
  - «Films (demo)»: video, con el corto real de YouTube; el reproductor carga recién al click.
  - «Drawings (demo)»: el guepardo, el logo y el boceto descartado.
  - «Photography (demo)»: el apneísta, la raya y los lobos marinos.
- **Casos sintéticos con personas ficticias** («Demo Maker Marea», alias «Marea Studio (demo)», y «Demo Maker Coral», con páginas personales). Usan solo dibujos SVG generados y rotulados «DEMO», para no atribuir trabajo real a autores inventados.
  - «Wire art (demo)»: arte con alambre, con una obra de **dos responsables** con roles distintos y **un borrador**.
  - «Field notes (demo)»: sin crédito, lead ni texto, y una obra sin imagen, resumen ni autores, para los casos sin datos opcionales.
  - «Sound notes (demo draft)»: categoría de audio en borrador, con una obra publicada que no se ve.
- Imágenes del handoff idénticas a otras ya existentes en local se reutilizan y no pasan a ser «demo».

El cambio de definición se aplicó con `demo:local:clean -- --confirm` y un nuevo seed. Antes se comprobó que no hubiera ediciones locales posteriores al seed anterior (ninguna en contenidos, categorías, Crew ni medios). Resultado: 43 registros creados; el seed repetido crea 0 y conserva 43.

**Identificadores estables** con prefijo `de000000-`. Volver a ejecutar el seed no crea ni sobrescribe nada; comprobado con 0 creados y 29 conservados. Si una imagen idéntica ya existe, se reutiliza y no pasa a ser «demo».

La limpieza borra solo IDs del set que no estén en la lista de conservados (`.encounters-work/demo-keep.json`, local). Tampoco borra nada que siga usado por contenido que se queda: integrante con créditos, página de un integrante, categoría con obras o imagen referenciada desde portadas, obras, bloques o settings. El plan lo lista antes; probado: plan → limpieza → 0 restantes, imágenes compartidas intactas → nuevo seed.

`keep` agrega el ID a la lista local y, en contenidos, marca `demo: false`. Conviene renombrarlo para quitar «(demo)».

## Verificación técnica (2026-10-14, local, con tiempos límite)

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit`, eslint de `src/components`, `app`, `src/features`, `src/lib` y el script demo; `npm test`; `scripts/check-phase4-render.tsx` (actualizado: las tarjetas abren la obra y los autores se acreditan en la obra) | Sin errores; PASS. |
| Comparación con `Art.dc.html` a 1440×900 en 12 posiciones de scroll | Composición, tiles, chips, filas, formatos y cierre coincidentes. Diferencias abajo. |
| Recorrido público en 3219 | `/art` (6 secciones, 7 chips; el filtro deja 1 sección) → categoría (2 obras, 4 colecciones más) → obra (autores con roles) → perfil de autor (obras agrupadas en 4 categorías) → regreso a la obra. JSON-LD `CreativeWork` con ambos autores; canonical y `noindex` presentes. |
| Privacidad | Obra en borrador, categoría en borrador y obra de categoría en borrador: 404 anónimo. Sitemap sin ellas. Anónimo sin filas de borradores. |
| Admin en 3219 | «New artwork» abre el tipo correcto, sin selector de tipo. Categoría, imagen y autor elegidos. El selector de relacionados agrega, quita y vuelve a agregar (1 elegido, sin autorreferencia). La vista previa SEO muestra `› art › demo-wire-art › …`. Guardar → Draft, 404 anónimo. Preview integrado y por ruta con la plantilla de obra. Publicar → página pública 200 con autor y relacionado. Al recargar persisten título, autor, relación y categoría. Duplicar → copia en borrador, 404 anónimo. Card de página personal con estado y acciones. Preview de categoría con sus 3 obras. Aviso nuevo con la ayuda de vínculo. Pestañas del listado. |
| Medios | Subida real de JPEG y PNG medida (arriba); el nuevo aviso de descripción aparece. |
| Móvil 390px | `/art`, categoría y obra sin desbordamiento horizontal. |
| Páginas aprobadas | `/crew` y `/crew/wild-wonders` sin cambios; Art real con su estado vacío. |

Los dos registros creados por la prueba del admin se eliminaron después; el set demo quedó tal como lo deja el seed.

## Diferencias y pendientes

- En local hay 8 categorías publicadas: 6 de demo y 2 fixtures de la verificación anterior del CMS, «Local Test Gallery» y «Local Test Prints». La primera tiene una imagen privada de 1 px, por eso su tile se ve vacío. `/art` muestra entonces la **fila desplazable**, porque son más de 4 (decisión del handoff); con 4 o menos se ve la grilla del prototipo.
- **Fila de categorías (2026-10-16, feedback de Juani):** el carrusel genérico centraba el primer tile (empezaba «en la posición 2») y mostraba la barra de scroll. Ahora es una fila propia de Art que arranca alineada como la grilla y muestra 4 tiles (3 en tablet, 1 y parte del siguiente en móvil). No tiene barra visible. Lleva flechas circulares sobre los bordes, que aparecen solo cuando hay más hacia ese lado (la de avanzar se mueve suavemente para invitar a desplazarse), un degradado en ese borde y un contador «01–04 / 08». Verificado: primer tile alineado, barra de 0 px, flechas y contador al avanzar, flecha accesible por teclado, sin desbordamiento a 1440 y 390 px.
- La columna doble de dibujos del prototipo (una obra grande y dos apiladas) no se reproduce automáticamente: se compone con `span` y `full_height`.
- Los bloques del cuerpo de la obra usan el renderizador compartido. La fidelidad completa a `Post.dc.html` (imagen 95vw con parallax, etiquetas de bloque) queda para el módulo de publicaciones.
- Caché de imágenes públicas y tamaños responsivos: ver medios.
- La organización general del admin y su validación manual siguen pendientes.
- Ejemplos de expediciones, workshops, mensajes y Home: en sus módulos.

## Para revisar (local)

Servidores: CMS aislado `http://127.0.0.1:3219` (Supabase local, credenciales en `.encounters-work/local-cms.json`) y revisión visual `http://127.0.0.1:3218` (base real, Art vacío). Prototipo: `http://127.0.0.1:3220/Art.dc.html`.

- Art con ejemplos: `http://127.0.0.1:3219/art`
- Categoría: `http://127.0.0.1:3219/art/demo-wire-art`
- Presentación del libro: `http://127.0.0.1:3219/art/demo-books/demo-encounters-book`
- Obra con dos autores: `http://127.0.0.1:3219/art/demo-wire-art/demo-wire-manta`
- Perfil de autor: `http://127.0.0.1:3219/crew/demo-maker-coral`
- Admin: `http://127.0.0.1:3219/admin`

Capturas en `verification/review-2026-10-14-art/`: [inicio del admin](verification/review-2026-10-14-art/admin-dashboard.jpg), [editor de obra](verification/review-2026-10-14-art/admin-artwork-editor.jpg), [preview de obra](verification/review-2026-10-14-art/admin-artwork-preview.jpg), [relacionados](verification/review-2026-10-14-art/admin-related-picker.jpg), [página personal en Crew](verification/review-2026-10-14-art/admin-crew-page.jpg), [preview de categoría](verification/review-2026-10-14-art/admin-category-preview.jpg), [descripción de medios](verification/review-2026-10-14-art/admin-media-needs-description.jpg), [obras en perfil](verification/review-2026-10-14-art/profile-works.jpg), [Art en móvil](verification/review-2026-10-14-art/art-mobile.jpg), [Art: prototipo](verification/review-2026-10-14-art/prototype-art.jpg) y [Art: implementación](verification/review-2026-10-14-art/art-scroll-states.jpg), [fila de categorías](verification/review-2026-10-14-art/art-rail-desktop.jpg), [fila en móvil](verification/review-2026-10-14-art/art-rail-mobile.jpg), [Art con ejemplos ampliados](verification/review-2026-10-14-art/art-examples.jpg) y [libro Encounters](verification/review-2026-10-14-art/book-encounters.jpg).

## Validación y errores comprensibles en el admin — 2026-10-16

Pedido de Juani: que al crear algo los campos que faltan, sobre todo los obligatorios, se marquen en rojo y digan qué falta, y que no aparezcan errores técnicos como `insert or update on table "artworks" violates foreign key constraint "artworks_category_id_fkey"`.

- **Antes de guardar:** se comprueban los campos obligatorios de cada tipo (título, dirección y categoría en una obra; nombre y dirección en Crew y categorías; los de necesidades y sesiones), el formato de la dirección y que las opciones elegidas sigan existiendo. Si falta algo, no se envía nada: el aviso general dice cuántos campos necesitan atención y cada campo queda con borde, etiqueta y mensaje en rojo («Required: add the title.»). El foco va al primero. Los obligatorios llevan asterisco, y los lectores de pantalla anuncian «(required)». El error de un campo desaparece al corregirlo.
- **Dirección automática:** mientras el contenido es nuevo, la dirección se completa sola a partir del título o del nombre, por ejemplo «Validation test (demo)» → `validation-test-demo`. Deja de seguirlo en cuanto se edita a mano.
- **Si la base rechaza el guardado:** el error se traduce a lenguaje claro y se marca el campo afectado; el texto técnico queda plegado en «Technical detail» para soporte. Casos cubiertos:
  - opción que ya no existe (categoría, imagen, página, persona o relacionado): además se recargan las listas;
  - dirección repetida o con caracteres no permitidos;
  - contenido guardado por otra persona mientras estaba abierto;
  - sesión vencida o sin permiso;
  - falta de conexión.
- **El error que vio Juani:** la obra apuntaba a una categoría que ya no existía. Casi seguro fue porque el set demo se regeneró con el admin abierto y la lista de categorías del formulario quedó desactualizada. Reproducido en local con una categoría temporal borrada mientras el formulario estaba abierto. Ahora el mensaje es «Not saved. The chosen category no longer exists. The list has been refreshed: choose a category again.», el campo queda en rojo y la categoría borrada desaparece de la lista. Con otra categoría el guardado funcionó.

Verificado en 3219 con tiempo límite; la categoría temporal y la obra de prueba se borraron después. TypeScript y eslint sin errores. Capturas: [campos obligatorios](verification/review-2026-10-16-admin-errors/required-fields.jpg) y [error explicado](verification/review-2026-10-16-admin-errors/friendly-error.jpg).
