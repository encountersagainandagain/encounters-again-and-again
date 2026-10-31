# Seguimiento por páginas

## Estado actual (2026-10-28)

Sitio de revisión: https://encounters-again-and-again-gamma.vercel.app (Vercel del cliente, despliegue automático desde `main`). Admin: https://encounters-again-and-again-gamma.vercel.app/admin, sobre el **proyecto real de Supabase `lzwmwofxoegkxykglneq`** (contenido importado + ejemplos marcados). Sin dominio propio y con `noindex`.

### Aprobado visualmente por Juani (en lo que revisó, en su entorno: su computadora y su navegador)
- **Home:** scroll con Lenis, fluidez y efectos (2026-10-24).
- **Todo lo que revisó en producción el 2026-10-24, incluida Expeditions** (tarjetas dentro del banner armadas desde el texto real, título «Expeditions»).
- No se extiende a dispositivos o navegadores no probados.

### Verificado técnicamente
- **Crew (2026-10-26):** «read →» a la derecha del nombre en las tarjetas, alineado por la base del texto. Verificado en Chrome a 1440, 900 y 390 px, sin desbordes; typecheck, lint (excluyendo el build generado `.next-check`), tests y build correctos. Capturas en `.encounters-work/crew-inline-read/`.
- **CMS de Crew y páginas personales (2026-10-27, publicado):** `main` está en `027e795` (cambio funcional `6dd2c8f`) y Vercel terminó exitoso. Personal pages permite crear una página eligiendo solo una persona de Crew sin página; crea un Draft y abre el editor. En la ficha de Crew se ocultó `Enable profile page`; Publication conserva el estado de la persona y una tarjeta `The Crew page` explica Position y Show on The Crew page.
- **Editor de página personal (publicado):** el enlace desde Crew dice solo `Edit personal page`; una página nueva se muestra con Main title y Opening text; Publication conserva únicamente el estado. Orden, fecha, destacado, Home e índice se ocultan. La barra superior no muestra Duplicate as draft, el Visual preview integrado, su icono ni Unpublish; conserva Full preview y Save.
- **The Crew page (publicado):** Banner → SEO → Below the banner. `THE CREW` es parte del banner, no un bloque. Se retiraron Sections of The Crew page y Place on the page; usa los mismos bloques que una página personal. Publication conserva solo Page status.
- **Bloque Paragraph (publicado):** el texto común permite marcar palabras en negrita, cursiva o subrayado y convertirlas en enlace; la página pública y los previews comparten el mismo render. Se retiró Index name del bloque Heading; Number se conserva.
- **Bloque YouTube en perfiles (publicado):** antes de reproducir muestra la miniatura real con play y al pulsarlo carga el reproductor privado de YouTube. Si no existe miniatura de máxima resolución, usa la estándar.
- **Migraciones todavía pendientes en la base real:** `20261026000200_profile_default_blocks.sql` y `20261026000300_keep_legacy_profiles_convertible.sql`, probadas localmente. El código desplegado funciona sin ellas mediante la conversión al abrir; aplicarlas juntas requiere autorización nueva, respaldo y dry run.
- **SEO de The Crew cargado en producción:** título `Meet the Encounters Crew`; descripción `Meet the crew behind Encounters Again and Again, brought together by the ocean and a shared commitment to art, education and conservation.`
- **Vercel:** el Preview automático de `review` puede fallar con `Unexpected Encounters database target` porque staging no está configurado. No confundirlo con producción: el deployment posterior de `main` para `027e795` terminó en success y gamma respondió 200. Detalle en `HANDOFF_2026-10-28.md`.
- **Navbar:** Art al frente del grupo derecho, en 14 anchos.
- **Historial y anclas:** ancla, otra página, Atrás y Adelante; también índice de posts guardados desde el CMS local, carga directa con hash, skip link y reduced motion.
- **Portadas:**
  - se piden con prioridad alta;
  - la Home anticipa las de Expeditions, Workshops y Messages después de su carga;
  - la intención (puntero, foco o toque) reutiliza la misma descarga ya decodificada;
  - **la entrada de cada portada espera a su foto** (con tope, sin repetirse si se scrolleó). Ver [entornos.md](entornos.md#sincronización-de-portadas-2026-10-24).
- **Expeditions:** preview igual a la página pública. Las tarjetas guardadas en el CMS tienen prioridad.
- **Fuentes:** WOFF2 de 173 KB idénticas a los originales, y respaldos propios del título y el párrafo del descenso.
- **CMS local:** `cms:local:stop` conserva los datos.
- Implementación de animación y rendimiento documentada en el [playbook](animation-performance-playbook.md).

### Pendiente de prueba manual del CMS
- **Expeditions page (2026-10-29, en revisión con Juani; sin desplegar).** Admin → Expeditions page, en el orden de la página:
  1 · Banner → 2 · Search engines (SEO) → 3 · Cards inside the banner → 4 · List of expeditions → 5 · Closing. Todo en
  `site_settings.pages.expeditions`: sin migración.
  - **SEO propio:** `seo_title`, `meta_description` y `seo_topics` (uno por línea), con la vista previa de Google y de redes
    (`SeoPanel`) y ayudas que explican para qué sirve cada campo. Vacío: el SEO de la página del programa, y si tampoco hay, los
    textos sugeridos de `expeditions-page.ts` (escritos a partir del texto real de la página: Coquitlam, Western Australia, conservación,
    investigación). `/expeditions` publica JSON-LD `CollectionPage` (keywords y about = los temas) con cada expedición con fecha como `Event`.
  - **Cards dentro del banner:** cantidad libre. Cada una tiene color de fondo de la paleta (White, Foam, Sand, Gold, Coral, Lagoon,
    Tide y Deep blue; los dos oscuros pasan el texto a blanco), una línea chica, el título, el texto con B / I / U / link (una línea
    vacía separa párrafos), una lista, una firma, un link (dirección completa, `/página` o `#expeditions-list`) y una foto con su
    lado. Todos los campos son opcionales salvo el título. Una card sin foto ocupa todo el ancho con el texto centrado.
    Orden de prioridad: las cards de esta página → las de la tabla vieja `expedition_cards` → el texto de Pages → Encounters
    Expeditions leído como cards. Al abrir, el admin muestra las cards que se ven hoy, convertidas; al guardar, quedan acá y la
    página se ve igual. Comparado en local con fotos ocultas y con la lista de fotos de cada card: 0 píxeles distintos en 1440 y
    390 px; en 900 px, diferencias de 1/255 en el degradé oscuro, que ya aparecían antes de guardar.
    «Presentation cards» salió del menú.
  - **Listado:** se agrupa por estado, cada grupo con su color: Coming up (blanco; incluye las postergadas), On the water now
    (laguna) y Where we have been (blanco, pedido de Juani 2026-10-29; incluye las canceladas). Arriba hay un filtro: All, Coming up, On the water now y Past,
    con la cantidad de cada uno. El filtro aparece solo si hay más de un grupo.
  - Guardar una página de «Page presentation» ahora expira la caché pública (antes podía tardar hasta 5 minutos).
- **Expeditions: estado automático, editor, historias y página de cada expedición (2026-10-29).**
  - **Estado por fecha, hora de Perth** (`activityStatus` en `activities.ts`, aplicado por `activities()`: web, Home, previews;
    vale también para workshops): antes del inicio Upcoming, del inicio al fin (ambos días incluidos) Running y después Finished.
    Postponed y Cancelled son manuales y ganan siempre. Sin fecha de inicio se usa el estado elegido. Sin migración.
  - **Editor de expedición (y workshop):** la barra superior queda sin Duplicate as draft, Visual preview, Example ni Unpublish,
    y Publication cambia Draft/Published. Tarjeta **Status** con «On the site now» y botones Follow the dates / Postponed /
    Cancelled; sin fechas, Upcoming / Running / Finished. Tarjeta **Delete** en dos pasos: primero qué se borra, después escribir
    el título. Lo mismo para los reports. Las historias de una expedición borrada se conservan.
  - **Historias:** la lista de Expeditions muestra el estado en la web, la columna Story («Story published/in draft →» o el
    botón **Write about this adventure** si terminó) y Publication. El botón, que también está en la tarjeta de resultados del
    editor, crea un borrador `expedition_report` con el título, la portada y los créditos de la expedición, lo enlaza como
    `result` y abre su editor (banner, SEO, bloques). Results lista solo las historias y dice de qué expedición es cada una;
    se inician desde la expedición. Probado en local de punta a punta, borrado incluido.
  - **Recordatorio e historias sueltas (2026-10-30):** arriba de la lista de Expeditions, un aviso enumera las terminadas sin
    historia, cada una con **Write about this adventure**. En Results, la columna About enlaza a la expedición; una historia
    sin enlace (ej. «All post blocks (demo)», borrador) muestra un selector para elegirla. El editor de la historia tiene la
    tarjeta «Expedition it tells about» para cambiarla (`StoryOf`: reemplaza su único enlace `result`). Probado en local.
    Solo un report cuenta como historia: las news enlazadas como `result` son novedades del viaje (Reef notes, en curso, ya no
    marca «Story published»). La columna Story muestra el título de la historia para que se vea con cuál de Results coincide.
  - **Results (2026-10-30):** «New story» pregunta de qué expedición es; lista solo las terminadas sin historia y crea el
    borrador enlazado como «Write about this adventure». Desde Results cada historia se edita o se borra (Edit → Delete).
    Ejemplo nuevo «Night watch at the sand patch» (terminada, sin historia): `node scripts/demo-finished-examples.mjs` (también agrega «Rock pool sketches, online», workshop de una session online terminado sin historia)
    lo agrega solo (local; real con `--target=production --confirm-real`) y no toca nada más.
  - **Cierre (prueba 2026-10-30):** el garabato bajo «May the ocean be with you» se reemplazó por tres olas que rompen, en un solo
    trazo que se dibuja con el scroll (`Scribble` variante `waves`, solo en Expeditions; Art, Messages y Home siguen con el loop).
  - **Página de cada expedición** (`ActivityGlance` en `PostView.tsx`, compartido con workshops desde 2026-10-30): estado con punto de color
    y «Starts in N days» / «Day N of M»; When (rango compacto y cantidad de días), Where y Who (retrato, nombre con enlace y
    rol). Después, una banda azul profundo con la invitación: el Excerpt grande, Availability como línea chica y el botón a
    Contact (`cta_label`), junto a la foto submarina o la portada. Terminada: banda arena «How it went» con el outcome y
    «Read the story →». «On board» del final no se repite.
- **About (2026-10-30, pendiente de prueba de Juani):** About page en el orden de la página: **1 · Banner** (fotos, línea
  chica, título, crédito y las tres columnas) → **2 · SEO** precargado (`aboutSeo` en `about-page.ts`; metadata y JSON-LD
  `AboutPage` de la organización) → **3 · Below the banner**: bloques que se agregan, mueven y quitan (Manifesto, Title, List
  and photo, Large phrase, Talk to us), guardados en `pages.about.blocks`. Lo guardado antes se lee en el orden en que se
  mostraba (`aboutBlocks`) y el editor lo abre así, sin cambios pendientes; al guardar quedan solo los bloques. Comprobado en
  local con capturas de página completa (1440 y 390) antes y después del código y del guardado: 0 diferencias salvo ruido de
  suavizado de 1–7 píxeles en «Our nature», que también aparece entre dos capturas del mismo código. Check:
  `scripts/check-about-blocks.mjs`.
- **Art (2026-10-31, pendiente de prueba de Juani):** misma forma de trabajo que las otras páginas.
  - **Art page** (Page presentation, nuevo en el menú Art): **1 · Banner** (línea chica, título, línea debajo, imagen para
    compartir) → **2 · SEO** precargado (`artSeo` en `art.ts`; metadata y JSON-LD `CollectionPage` con cada obra como
    `CreativeWork`: categorías, artistas, fecha, imagen) → 3 · Categories y 4 · Works (solo explican) → **5 · Closing**.
    Guardar deja la página idéntica (captura 1440: 0 diferencias).
  - **Tarjeta de cada obra en /art y en las páginas de categoría** (cambio visible pedido): bajo `[ título ]` muestra
    categorías · fecha (Publication date, mes y año), artistas (Credits → «Artists»), el resumen (excerpt, hasta 3 líneas) y
    «Read more →». Un video (YouTube o Vimeo) se reproduce dentro de la imagen; un audio (Spotify o SoundCloud), debajo. En la
    página personal de Crew y en «More from» las tarjetas siguen como estaban.
  - **Editor de cada obra (Works):** General information → **On the Art page** (Main category, Also in, Summary, imagen,
    link de video o audio pegado tal cual, dónde ver la obra completa, descripción, tamaño) → **The full story** (bloques) →
    Artists → Related expedition or workshop → SEO. Nuevo bloque **Video or audio** (`embed`, `{url,caption}`) para YouTube,
    Vimeo, Spotify o SoundCloud: el sitio no guarda archivos de audio o video, los reproduce desde esos servicios (nada carga
    hasta darle play).
  - **Migración `20261031000100_artwork_categories_and_media.sql` (no aplicada a la base real):** `artworks.more_categories`
    (otras categorías; `category_id` sigue siendo la principal y da la dirección), `embed_kind` admite vimeo y soundcloud, y
    `post_blocks.type` admite `embed`. Probada en local (aplicada, deshecha y reaplicada). Sin ella el código funciona: el
    admin no ofrece Also in, Vimeo/SoundCloud ni el bloque Video or audio (sondeo de la columna), y lo público trata cada obra
    con su categoría. Check: `scripts/check-art.mjs`.
- **Contact (2026-10-31, pendiente de prueba de Juani):** Contact page en el orden de la página: **1 · Banner** (imagen, título,
  línea) → **2 · SEO** precargado (`contactSeo` en `contact-page.ts`; metadata con la imagen del banner y JSON-LD `ContactPage`
  de la organización) → **3 · The form** (pregunta, temas, nota) → **4 · Other ways to reach us** (links propios; email,
  WhatsApp, donación y redes siguen saliendo de Settings). Sin bloques: la página es un formulario con partes fijas. El SEO
  reemplaza la descripción importada de WordPress. Comprobado en local con capturas de página completa (1440 y 390) antes y
  después del código y del guardado: 0 diferencias (salvo el ícono de desarrollo de Next en la primera captura).
- **Meaningful Messages (2026-10-30, pendiente de prueba de Juani):** misma forma de trabajo que Expeditions y Workshops.
  - **Messages page:** Banner → **SEO** precargado (`messagesSeo` en `messages-page.ts`; metadata y JSON-LD `CollectionPage` con
    cada mensaje como `CreativeWork`: nombre, dirección, texto, ilustración, fecha) → Introducción → Messages (solo explica) →
    Cierre.
  - **Cada mensaje (Messages):** la ilustración y, al lado, el **texto por partes** (Title / Text / Link; B, I, U y link en
    títulos y textos), en una tarjeta «The message». Se guarda como **un bloque** del mensaje (`content.layout='message-text'`,
    `message-text.ts`): sin migración. Un mensaje guardado antes se abre convertido, igual a como se ve (frase → Title, texto
    adicional → Text, crédito → Text en cursiva; sin ilustración, su portada), y no cambia hasta guardar. Al guardar, las
    columnas `messages.message`/`body` se actualizan con el texto plano (las usan la metadata y la lista del admin) y `credit`
    queda vacío; los bloques viejos del mensaje se reemplazan.
  - **Sin página propia** (pedido de Juani: son mensajes cortos): viven solo en `/meaningful-messages`, sin «Read the message →».
    Cada mensaje tiene su ancla (`#<slug>`, `messagePath`): Home, páginas personales y el JSON-LD apuntan ahí y al abrirla el
    mensaje entra completo. `/meaningful-messages/<slug>` redirige (308) a esa ancla.
  - Barra superior como el resto (sin Duplicate, Visual preview, Full preview ni Unpublish); General information solo con el
    título (el slug se crea solo); Publication solo con estado, fecha y orden; sin Cover, Content blocks, Related content ni
    Search and sharing. Se conservan Credits (los mensajes aparecen en las páginas personales).
  - **Lista del admin:** Message (ilustración, título, frase), Order, Date, Publication, **Edit** y **Delete…** en dos pasos
    (Continue → escribir el título), también desde el editor.
  - Probado en local: conversión sin cambios pendientes, partes nuevas (link y negrita), guardado, `/meaningful-messages` en
    1440/900/390 sin desbordes, página propia, JSON-LD, editor de la página (5 secciones, SEO precargado) y crear/borrar desde
    la lista. Check: `scripts/check-message-text.mjs` (en `npm test`).
- **Workshops (2026-10-30, pendiente de prueba de Juani):** la misma lógica que Expeditions, documentada en
  `docs/encounters/activities-logic.md`.
  - **Workshops page:** Banner (imagen, línea chica, título) → **SEO** precargado (`workshopsSeo` en `workshops-page.ts`; metadata
    y JSON-LD `CollectionPage` con cada workshop como `Event`, sus sessions como `subEvent`, «Online» como `VirtualLocation`) →
    Lista (título y nota) → Cierre.
  - **Lista pública:** grupos Coming up / Happening now / Past workshops con filtro; cada grupo abre con una banda (blanco,
    laguna, blanco) antes de las pantallas fijas de sus workshops, que no cambian.
  - **Sessions:** una o más. Sin fechas propias, el workshop va de su primera a su última session (`withSessionDates`), y el
    estado automático, la tarjeta Status, la lista del admin y la preview lo siguen.
  - **Editor, historias y Results:** iguales que Expeditions (Status, Delete, aviso, Write about this adventure, New story).
  - **Página de cada workshop:** el mismo vistazo (estado, When con cantidad de sessions, Where con el lugar o los de sus
    sessions, Details con formato, idioma, lugares y precio, With) y la banda de invitación con el botón de inscripción por
    email o Contact; Full / Registration closed lo dicen sin botón. Una sola session se titula «The session».
  - Probado en local (1440/900/390, sin desbordes): lista y filtro, JSON-LD, admin (aviso, Status por sessions, New story) y las
    páginas de un workshop de una session, uno lleno de tres, uno terminado online sin historia y uno terminado con historia.
  - Las cards de Expeditions page en producción **no se escribieron en la base**: el admin las muestra convertidas desde
    el texto actual y quedan guardadas cuando alguien guarda.
- **Página personal de Crew (2026-10-26, en prueba con Juani):**
  - **Banner explícito:** título grande = «Large title» de la página (`posts.subtitle`), o Crew «Alias / project», o Name; línea chica = la de la página, o «meet <primer nombre>» de Name; foto = la de la página, o el retrato. Tiene su tarjeta «Banner» arriba del editor.
  - **Debajo del banner, solo bloques en orden.** Bloques de perfil: Large title, Opening text, Pinned photo pair, Photo row, Chapter y Dark gallery; además, los bloques comunes. Se acabó el selector «Place on the page».
  - Al abrir una página guardada antes, el admin la muestra convertida a esos bloques. **Hasta guardar, el sitio sigue igual.** La conversión de Wild Wonders y de los 3 ejemplos se comparó píxel por píxel con la página actual: es idéntica (Georgia: 5 píxeles de antialiasing, mismo alto).
  - **Tarjeta «SEO» (reemplaza «General information» y «Search and sharing»):** nada visible en la página. SEO title (vacío: el título del banner), descripción (vacío: Biography de People), «What they do» (`posts.tags`, una especialidad por línea), nombre en el admin y la dirección `/crew/<slug>` (se cambia en People). `/crew/<slug>` ahora usa esos campos en su metadata, comparte la foto del banner y publica JSON-LD `ProfilePage` + `Person` (nombre, alias, rol, descripción, imagen, redes en `sameAs`, especialidades en `knowsAbout`, miembro de la organización). Con los campos vacíos la página es idéntica píxel a píxel; probado lleno y vacío en el CMS local.
  - Guardar conserva la imagen de diseño del banner (`cover_image`); antes se perdía y aparecía el retrato.
  - **Párrafos con estilo explícito** en «Opening text» y «Chapter» (`content.paragraphs`: `{text, style}`): Large (`crew-lead`), Highlighted (`crew-voice`) o Normal, con **negrita** y *cursiva* (botones B / I) y orden. Antes el estilo dependía de la posición (opening: el primero grande; chapter: el primero destacado si había más); los bloques guardados así se leen con esos mismos estilos. Probado en el CMS local: página idéntica sin cambios, con un párrafo destacado y negrita, y otra vez idéntica al revertir.
  - **Pinned photo pair a pantalla completa** (desde 760 px y con movimiento): las fotos ocupan desde el menú (74 px; 108 px entre 760 y 980) hasta abajo, y el pin crece con ellas (`100svh + 63vh`) para quedar fijo lo mismo que antes. Una foto de menos de 600 px se sigue mostrando a su tamaño (centrada sobre el azul) para no pixelarse.
  - **Chapter en orden de lectura en el admin:** izquierda (título y subtítulos), derecha (párrafos y enlaces debajo) y abajo las fotos, **hasta 4**: una centrada; 2 como antes (mitades alternadas); 3 o 4 en una fila en pantallas anchas, 2 por fila hasta 1080 px y una debajo de otra en teléfonos. Probado con 1–4 fotos en 1440, 900 y 390 px; el resto de la página, idéntico píxel a píxel.
  - **Formato en todos los textos de los bloques de perfil** (títulos, subtítulos, línea chica, párrafos, texto de enlaces, títulos de galería): botones B / I / U que marcan `**negrita**`, `*cursiva*` y `++subrayado++` (la misma marca de subrayado que los posts).
  - **Pinned photo pair:** la foto llena siempre su mitad, también si es chica; el admin avisa cuando una foto del par mide menos de 1200 px de ancho (se verá blanda).
  - **Photo row:** hasta 4 fotos con la misma distribución por cantidad que las de «Title, text & photos», y el mismo aire arriba que abajo (216 px a 900 px de alto) para que su banda no empiece pegada a una galería oscura.
  - **Nombres:** «Large title» → «Main title»; «Chapter» → «Title, text & photos».
  - **Editor:** botones flotantes abajo a la derecha: «Top» (aparece al bajar) y «Save» («Save changes» resaltado si hay cambios sin guardar). Van fuera de la barra superior porque su desenfoque fijaría el `position:fixed` a la barra.
  - **Cierre de la página personal** (`ProfileFooter`): banda oscura del color del pie, justo encima de él, con tres columnas que aparecen solo si tienen algo: **Related encounters** (Related content: tipo, título con enlace y comentario), **Crew** (Credited crew sin la propia persona: retrato, nombre con enlace si tiene página visible, y su texto como comentario, con formato) y **Contact** (People → social links: un email se vuelve `mailto:`, un dominio sin `https://` se completa; lo mismo alimenta `sameAs`). El contacto se movió ahí desde después de los bloques. Sin datos no se muestra (página idéntica píxel a píxel).
  - **Comentario de cada Related content:** en el editor, un campo «Comments» por elemento elegido (con B / I / U); se muestra debajo de cada uno en el cierre. Usa `post_relations.note` (migración `…20261026000100`, aplicada en la base real).
  - **Crew (antes «People») en el menú.** En la ficha de una persona, tarjeta «Remove» al final: «Hide from The Crew page» (o el tilde «Show on The Crew page» en Publication; `listed=false`: sale de /crew y del Home, su página y créditos siguen) y «Delete…» en dos pasos: primero qué se borra (la persona, sus N créditos, su página con sus bloques, relaciones e historial de direcciones; las fotos quedan), después escribir el nombre. Borra la persona y luego su página (las tablas dependientes caen por `on delete cascade`). Probado en local: ocultar (sale de /crew, la página responde 200), volver a mostrar, y borrar (persona, página y bloques en 0, la dirección da 404).
- **Carga y edición** por Juani, como los fundadores, con el contenido original: [guía de carga editorial](guia-carga-editorial.md). Cubre Crew y su página, el libro Encounters en Art, Expeditions, el workshop original con etapas, el Meaningful Message, Home, About y Contact.
- **Contenido para corregir en el CMS:** líneas repetidas y «Australia.She» en Expeditions; foto de portada de Expeditions de 963 px.
- **Decidir qué ejemplos retirar.** Se retiran de a uno con «Unpublish», o se conservan editándolos.

### Pendiente de lanzamiento
- Dominio del cliente, redirecciones, quitar `noindex`, y correo del newsletter (no habilitado).
- Pruebas en Safari, iPhone, iPad y Android, y en red lenta (el agua espera los scripts de Next).
- **Portadas pesadas:** Crew 374 KB y Contact 220 KB.
- Respaldo del título del descenso entre 363 y 371 px; Android sin validar.
- Retirar `?scroll=native` y `?calc=a` cuando ya no hagan falta.

> Las secciones de abajo son el historial: los estados marcados «(histórico)» fueron superados por este resumen.


Fuente única del estado de cada página pública. Rutas y prototipos según `handoff-current/handoff/00-README.md`. La aprobación solo la marca Juani; nada se aprueba por inferencia.

**Método (desde 2026-10-17):** página por página, el prototipo vigente es la referencia visual.

1. Abrir prototipo e implementación a iguales dimensiones (desktop, intermedio, móvil) y comparar todo el scroll.
2. Mapear cada sección visual a contenido editable, campo o bloque o relación existente, y el cambio necesario.
3. Ampliar el esquema solo con migraciones incrementales, probadas en Supabase local.
4. Hacer explícitas las decisiones de presentación (sin deducir el diseño por textos, frases, nombres o coincidencias).
5. Adaptar el admin con etiquetas y ayudas.
6. Compartir plantilla entre página pública y previews.
7. Probar con contenido real y ejemplos locales.

Orden: The Crew → Perfil de Crew → Art, categoría y obra → Expeditions, detalle y resultados → Workshops, detalle, etapas y resultados → Meaningful Messages y detalle → About y Contact → Newsletter → Home v2.

**Desde el 2026-10-17 (entrega «web completa»)** todas las rutas públicas usan su plantilla del prototipo; ya no queda ninguna página provisoria. Detalle por página más abajo.

## Estado al 2026-10-18 (histórico)

**Revisión integrada (2026-10-19):** guía única para Juani con URLs, ejemplos, qué mirar, recorridos y casillas → [revision-integrada.md](revision-integrada.md).

**Producción y rendimiento de la Home (2026-10-22/23):** https://encounters-again-and-again-gamma.vercel.app (cuenta Vercel del cliente, despliegue automático desde `main`; base real con ejemplos). Detalle de caché y capas en [entornos.md](entornos.md#rendimiento-y-caché-producción-2026-10-22).
- **Carga — hecho y medido:** imágenes responsivas WebP, caché ISR de 5 min invalidada por el admin, funciones en `hnd1`, CSS en línea, logo LCP precargado, variantes con hash cacheadas un año. Peso de la Home 4,0 → 2,1 MB (escritorio); Lighthouse escritorio de Juani: Performance 90, Accesibilidad 100, Buenas prácticas 100.
  - SEO 69: el único fallo es `noindex`, que se mantiene hasta el lanzamiento.
  - Speed Index: lo limita la entrada aprobada del fondo (opacidad 0 → 1 en 1,5 s); acortarla es decisión de Juani.
  - JavaScript legacy: son los polyfills del runtime de Next, no código del proyecto.
- **Fluidez — en curso:** banco de pruebas con Chrome 155 y GPU real (Apple M2, Metal), ventana 1440×754 a 2×, pantalla de 60 Hz.
  - Mide cuadros presentados (`Display::FrameDisplayed` y `PipelineReporter`) por tramo, con 3 repeticiones por escenario.
  - Causas demostradas desactivando efectos uno por uno: (1) el desenfoque CSS animado de las tarjetas de Proyectos (8,2 % → 1,0 % de cuadros perdidos sin él); (2) los dos desenfoques a pantalla completa del fondo bajo el agua (corregido antes con capas precalculadas).
  - El backdrop del navbar y las partículas solo pesan en el agua; el shader, la máscara del arrecife y los rayos tienen efectos menores.
  - No hay loops acumulados al navegar.
  - Corrección: las tarjetas entran en foco con una copia de la foto desenfocada de antemano que se desvanece, sin filtro por cuadro.
  - **Medido en Modo de bajo consumo y a batería**, con mucha variación entre repeticiones: repetir con cargador y modo normal antes de cerrar. Sin probar: móvil real, Safari e iPhone.
  - **Navbar, portadas y Expeditions (2026-10-24):**
    - Art abre el grupo derecho del navbar.
    - Las portadas se piden con prioridad alta, y la de la página siguiente se precarga cuando hay intención de navegar.
    - Expeditions vuelve al prototipo: tarjetas dentro del banner, generadas desde el texto real cuando no hay tarjetas de presentación, y título «Expeditions».
    - **Expeditions queda pendiente de aprobación visual de Juani.** Detalle en [entornos.md](entornos.md#navbar-portadas-y-expeditions-2026-10-24).
  - **Aprobado por Juani (2026-10-24): scroll, fluidez y efectos de la Home, en el entorno donde los probó** (su computadora y su navegador, con trackpad). No se extiende a dispositivos no probados (Safari, iPhone, iPad, Android, 120 Hz). Implementación final y aprendizajes: [animation-performance-playbook.md](animation-performance-playbook.md).
  - **Lenis por defecto en la Home (`c63fe01`, 2026-10-23):** Juani aprobó la sensación de scroll con Lenis. Es el default de la Home; `?scroll=native` y `?calc=a` quedan temporalmente para comparar. **La fluidez de la primera entrada al agua sigue pendiente.**
    - Corregido: en la primera visita, el ajuste automático bajaba la resolución del agua en pleno scroll y la recordaba.
    - Pendiente con propuesta: hidratar antes en la primera visita.
    - Corregido (`246ccd6`): ancla + otra página + Atrás mostraba la página equivocada. Comprobado con Lenis, nativo, reduced motion, carga directa con hash, navbar, skip link y un post.
    - Corregido (`03e6f15`): fuentes de 372 a 173 KB sin cambiar la tipografía. La fuente de `de55bf5` tenía mal los anchos en peso 500 (wordmark irregular en el navbar); ahora coincide con la original. Con red lenta, la animación arranca ~40 % antes.
    - Si ya se scrolleó antes de que arranque la animación, empieza en esa posición.
    - Corregido (`ef42a88` + respaldo hasta 362 px): el título y el párrafo del descenso tienen respaldos de fuente propios. Al llegar las fuentes, la sección ya no se mueve en escritorio (antes 55–56 px), ni en 320–362 px, ni en 373–430 px. La composición final queda idéntica.
    - Pendiente explícito: entre 363 y 371 px el título salta una línea (+20 px). Android no está validado: allí no hay Times New Roman ni Arial, y no se comprobaron sus fuentes reales.
    - Comprobado en el CMS local: editor → guardar → índice renderizado → ancla → otra página → Atrás/Adelante, con y sin reduced motion.
    - Pendiente: los scripts siguen llegando con prioridad baja en red lenta; Safari e iPhone sin probar; Android sin validar; revisión manual final de Juani (incluida la primera entrada al agua, no aprobada).
    - CMS local: `cms:local:stop` ya no borra los datos (detener ≠ reiniciar; ver entornos.md).
    - Detalle en [entornos.md](entornos.md#lenis-por-defecto-en-la-home-c63fe01-2026-10-23).
  - **Cálculo de scroll A/B/C (`7839aeb`, 2026-10-23):** la primera batería se cortó con la Mac saturada (carga ~273, bajo consumo). Sus datos quedan solo como diagnóstico en `.encounters-work/bench-scroll-2026-10-23/results-diagnostico-saturado/`. La segunda ronda corta, con carga 2–3,6 y modo normal (a batería), no reprodujo los cuadros perdidos de Lenis: **A, B y C sin pausas ni cuadros perdidos** en Proyectos → Agenda. Lenis suma ~175 ms de retraso y ~1 s de deslizamiento después del gesto. **B queda como default.** A y C (`?calc=a`, `?scroll=lenis`) se mantienen hasta la revisión manual de Juani. **La fluidez no está aprobada:** falta que Juani pruebe B con su trackpad. Si aparece un tirón, se captura una traza de ese momento (sección y si era la primera pasada), sin repetir la batería. White Desert, como referencia: mismo retraso y frenado que Lenis. Que `7839aeb` sea el commit en producción se infiere por el bundle; no está confirmado exactamente. Detalle en [entornos.md](entornos.md#cálculo-de-scroll-abc-ronda-2-2026-10-23).
- **Aprobación visual — pendiente de Juani (A/B):**
  - entrada de las tarjetas de Proyectos: `/` (nueva: foto desenfocada que se desvanece; título y texto nítidos) frente a `/?cards=a` (anterior: tarjeta entera desenfocada);
  - capas de desenfoque precalculadas del fondo al bajar;
  - optimizaciones previas del shader y el desenfoque frente al prototipo.

**Revisión online (2026-10-21):** proyecto Vercel `encounters-review` con despliegues Preview protegidos desde la rama `review`. Detalle y procedimiento en [entornos.md](entornos.md).
- Hecho: proyecto independiente sin Git conectado; Vercel Authentication; `noindex`; `/review` en 404; `docs`, `legacy`, `.env*` y el estado local fuera de la subida; correo bloqueado.
- Validación del destino: un Preview solo acepta la base de pruebas y ningún otro entorno la acepta.
- Scripts: procedimiento de staging (`npm run staging -- …`) y despliegue (`npm run review:deploy`).
- Desplegado `72807e7`: build correcto.
- **Pendiente:** el proyecto Supabase de pruebas no existe; lo crea Juani (pasos en entornos.md). Hasta entonces el sitio online responde «Supabase is not configured» y no se pudieron hacer la carga ni la verificación online (login, CRUD, privacidad, relaciones, newsletter).
- Incidente corregido: el primer alias libre (`encounters-review.vercel.app`) y el dominio por defecto del proyecto respondían sin login. Se eliminaron a los pocos minutos, cuando el sitio todavía no tenía base de datos. Ahora solo se usa el alias con el sufijo del equipo, y el script de despliegue verifica que pida login.

**Correcciones de la revisión manual (2026-10-20, producción local `51f2ec6`):** causa, solución y pendientes de cada punto. Videos en `.encounters-work/videos-2026-10-20/` (no versionados): `navbar-new-page-at-top`, `home-descent`, `about-banner-desktop`, `about-banner-phone`, `messages-read-link`.

1. **Home: tirones durante el scroll.**
   - *Medición:* Chrome con GPU real, densidad 2, por sección y en recorridos lento, rápido y hacia atrás. Solo había trabas en el descenso desde el hero: dos frames de ~265 ms y hasta 14 frames de más de 33 ms. El resto de las secciones iba a 60 fps. No se acumulan listeners ni bucles al navegar (60 rAF/s y la misma cantidad de listeners tras 3 vueltas).
   - *Causa (confirmada aislando cada capa):*
     - la foto de fondo, de pantalla completa, se re-filtraba en cada frame (`blur` de 0 a 11 px, `brightness`, `saturate`) debajo del agua WebGL;
     - el `blur` del título también abarcaba su halo radial de 900 px × 150 %;
     - el shader del agua calculaba agua y arena en cada píxel, aunque su propio `mix()` descarta una de las dos.
   - *Solución:*
     - el fondo funde dos copias desenfocadas una sola vez (4 y 11 px) y suma un velo negro para el brillo;
     - el `blur` se aplica solo a las palabras;
     - el shader calcula únicamente el lado que se ve: misma imagen (como máximo 1/255 en el 0,06 % de los canales) y entre 30 % y 70 % más barato.
     - Tiempos, efectos y resolución adaptativa sin cambios.
   - *Resultado:* con la escala recordada, el recorrido completo da 0 frames de más de 33 ms (antes, 11–21 en el hero, con picos de 133–267 ms).
   - **Diferencias con el prototipo, pendientes de tu confirmación visual:** el shader del agua y el desenfoque del fondo y del título ya no se calculan como en el prototipo.
     - El shader se salta las partes que su propio `mix()` descarta y la espuma invisible.
     - El fondo funde dos copias desenfocadas fijas en lugar de un radio continuo.
     - El título desenfoca solo las palabras, no el halo.
     - En la comparación lado a lado no se distinguen, pero la confirmación es tuya.
     - No sigo ajustando el rendimiento salvo que aparezca un problema concreto.
   - *Pendiente:* en la primera visita con pantalla densa, el regulador ajusta la escala una vez (2–7 frames lentos) y después la recuerda. Que tu pantalla se sienta fluida lo decidís vos.
2. **About: el banner avanzaba demasiado rápido.**
   - *Causa:* cada foto cambiaba al avanzar un 2 % del largo total de la página, unos 80 px (0,09 de pantalla). Las cuatro pasaban en un cuarto de pantalla.
   - *Solución:* cada foto dura 0,186 de pantalla (el doble), medida en pantallas y no en largo de página. La cuarta llega a 0,56, antes de que el papel cubra la banda (0,86 en escritorio, 1,0 en teléfono).
   - Orden, composición, cortes, velocidad de rueda y táctil y versión con movimiento reducido sin cambios.
   - *Pendiente:* evaluar el ritmo vos. Para alargarlo más habría que extender también el tramo fijado.
3. **Crew: faltaban las fotos.**
   - *Causa:* la base local nunca tuvo a los seis integrantes importados, porque se sembró con fixtures y ejemplos. Por eso `/crew` mostraba solo a Flaquito y a los tres ficticios. No era un problema de estilos ni de carga. En la base real (3218) las seis fotos responden 200.
   - *Solución:* `npm run crew:local:restore` (solo local; simula por defecto y aplica con `-- --apply`).
     - Toma las seis personas del Team del snapshot con el mismo mapeo, IDs y rutas que el importador.
     - Sube los 6 retratos al Storage local, con el bucket privado sin cambios.
     - Crea las 6 fichas, sin duplicar ni tocar a los ficticios.
     - Es idempotente.
   - **Wild Wonders en local (2026-10-21):** `crew:local:restore` también recupera la página personal de Georgia.
     - Incluye el post `wordpress:page:2907` (`17de9058-…`), sus 16 bloques y sus 8 imágenes (7 nuevas en el Storage local y el retrato reutilizado), con la misma transformación e IDs que el importador.
     - Solo agrega el vínculo en su ficha, sin tocar otros campos.
     - Antes comprobé que no existían; la segunda corrida no crea nada.
     - Recorrido: Crew → Georgia Webb → `/crew/wild-wonders`, igual que en 3218.
     - Se edita en Admin → Content → Wild Wonders, con vista previa visual y completa.
     - Los borradores y los medios privados siguen protegidos (0 de 40 borradores visibles sin sesión, bucket privado).
   - **Pendiente editorial:** conseguir un retrato original de Georgia Webb con más resolución. El actual mide 236×315 en la fuente y se conserva mientras tanto. Se reemplaza en Admin → People → Georgia Webb → Portrait.
   - En remoto no hay nada que reparar.
4. **Barras azules dentro de las animaciones.**
   - *Causa:* era la barra de scroll propia del sitio (8 px, color `--ocean`). La regla heredada `section { overflow-x: hidden }` convertía cada sección en un contenedor con scroll vertical. Cuando una entrada desplazaba contenido unos píxeles más abajo, aparecía la barra.
     - Antes había 14 elementos así: Home, Art, Messages, workshops, obras, perfiles y Crew en teléfono.
     - Además, el panel de columnas de About (hasta 1080 px) tenía `overflow: auto`.
   - *Solución:*
     - las secciones usan `overflow-x: clip`, que recorta igual en horizontal y no crea scroll ni rompe el sticky;
     - el panel de About ya no hace scroll y, en pantallas bajas, ajusta su espaciado para que el texto entre;
     - el riel del carrusel oculta la barra y conserva teclado, gesto táctil y botones.
   - *Resultado:* 0 barras internas en 4.398 muestras (18 páginas, 6 anchos, durante las entradas y en reposo). Chequeo agregado a `npm test`.
   - *Pendiente:* comparar con tu captura cuando haya una ruta accesible. El Escritorio no se pudo leer desde la sesión. Si la corrección ya la resuelve, no se cambia nada más.
5. **Navegación: la página nueva aparecía desde abajo.**
   - *Causa:* `html` tiene `scroll-behavior: smooth` para las anclas, pero no llevaba `data-scroll-behavior="smooth"`. Next 16 llevaba cada página nueva arriba con un scroll animado (0 de 9 empezaban arriba). Atrás también viajaba desde arriba hasta la posición restaurada.
   - *Solución:*
     - con el atributo, Next desactiva el scroll suave para ese movimiento;
     - Atrás y Adelante restauran sin animación;
     - el scroll suave vuelve con el siguiente toque o tecla, sin temporizadores.
   - *Resultado:*
     - 56/56 navegaciones del navbar en escritorio y 20/20 en teléfono empiezan arriba en el primer frame;
     - tarjetas y detalles también;
     - Atrás y Adelante restauran la posición exacta, y el primer frame pintado de About corresponde a la foto de esa posición;
     - la carga directa empieza arriba, en el estado inicial.
   - *Nota:* el ancla «Scroll» de About ya saltaba sin animación antes de este cambio, y sigue llegando a su sección.

Hallado durante la verificación: en Messages, los enlaces «Read the message» de los mensajes 1 y 2 nunca se podían tocar, porque la caja del último mensaje los tapaba. Corregido y verificado en escritorio, teléfono y movimiento reducido.

**Ejemplos de revisión (2026-10-20):** el CMS local tiene tres ejemplos ficticios por tipo, relacionados entre sí y con fechas relativas a la carga.
- Uno de cada tipo se creó o completó desde el admin.
- Están marcados con «Example» en el admin y con una nota en el pie del sitio local.
- Gestión: `demo:local:seed / tidy / untidy / plan / clean / keep / adopt`. La limpieza respeta ediciones manuales e imágenes compartidas.
- Tabla y enlaces en [revision-integrada.md](revision-integrada.md#ejemplos-de-revisión-2026-10-20).

Fallos corregidos con estos datos:
- Los avisos de Home que apuntaban a una obra o a un mensaje enlazaban a `/posts/…`, que no existe.
- Una expedición en curso no mostraba su actualización, aunque la ayuda del admin lo prometía.
- El crédito de la página de Messages atribuía mensajes ficticios a personas reales.

Verificado:
- 30 de 30 páginas responden, sin enlaces rotos ni errores de consola, con noindex y sin desborde en teléfono;
- relaciones en las dos direcciones;
- orden y destacados de Home;
- 7 vistas previas completas;
- la carga es idempotente;
- lint, TypeScript y 6 suites de tests pasan.

Categorías: **Implementado** (el código existe) · **Verificado** (comprobado en local con capturas o recorridos) · **Pendiente de contenido** (falta cargar datos reales; lo que se ve son textos del diseño o ejemplos locales) · **Pendiente de aprobación visual** (solo Juani aprueba) · **Pendiente en la base remota** (migración o datos por aplicar con aprobación).

| # | Ruta | Prototipo | Implementado | Verificado | Pendiente de contenido | Aprobación visual | Pendiente en remoto |
|---|---|---|---|---|---|---|---|
| 1 | `/crew` | `The Crew.dc.html` | Sí; secciones explícitas | 2026-10-17; 3218 sin cambios (8762 px) el 2026-10-18 | — | **Aprobada** la versión `cbea565` (2026-10-13). Las secciones editables (`ed1322d`) no cambian el aspecto y esperan revisión del editor | `20261017000100` |
| 2 | `/crew/[slug]` | `Wild Wonders.dc.html` | Sí; **secciones explícitas** desde 2026-10-18 (`e673a7a`) | Equivalencia con la lectura aprobada sobre los bloques de Wild Wonders del snapshot + 5 casos (`npm test`); 3218 idéntico (7654 px, mismo HTML); perfiles locales convertidos con el mismo HTML | — | Wild Wonders **aprobado** (2026-10-14, con la plantilla anterior a las secciones explícitas). El editor de secciones del perfil es nuevo: **revisar el editor**, no el aspecto | Convertir el perfil real (abrir y guardar en el admin, o script) |
| 3 | `/art`, categoría, obra | `Art.dc.html` (+ `Post.dc.html`) | Sí; módulo completo (2026-10-19) | 2026-10-19: prototipo 1440/1024/390, carrusel, filtros, teclado, movimiento reducido y recorrido del admin (ver abajo) | Obras reales | Pendiente (revisión visual de Juani) | — |
| 4 | `/expeditions` | `Expeditions.dc.html` | Sí; módulo completo (`175a101`) | 2026-10-18: prototipo 1440/390 y recorrido del admin (ver abajo) | Cards reales del programa | Pendiente (revisión visual de Juani) | `20261017000200` (opcional para la página) |
| 4b | `/expeditions/[slug]` | Plantilla Post | Sí | 2026-10-18 (recorrido del admin) | Expediciones reales | Pendiente (revisión visual de Juani) | `20261017000200` (`outcome`) |
| 5 | `/workshops` | `Workshops.dc.html` | Sí; módulo completo (2026-10-18) | 2026-10-18: prototipo 1440/1024/390, teclado, movimiento reducido y recorrido del admin (ver abajo) | Workshops reales | Pendiente (revisión visual de Juani) | `20261017000200` (`note_title`, `outcome`) |
| 5b | `/workshops/[slug]` | Plantilla Post | Sí; inscripción independiente y campos opcionales (2026-10-18) | 2026-10-18 (recorrido del admin) | Ídem | Pendiente (revisión visual de Juani) | Ídem |
| 6 | `/meaningful-messages` | `Meaningful Messages.dc.html` | Sí; módulo completo (2026-10-19) | 2026-10-19: prototipo 1440/1024/390, video, teclado, movimiento reducido, casos 0/1/varios y recorrido del admin (ver abajo) | Intro, crédito e ilustraciones reales | Pendiente (revisión visual de Juani) | — |
| 6b | `/meaningful-messages/[slug]` | Plantilla Post | Sí; plantilla compartida con la preview y créditos visibles (2026-10-19) | 2026-10-19 (recorrido del admin) | — | Pendiente (revisión visual de Juani) | — |
| 7 | `/posts/[slug]` | `Post.dc.html` | Sí; todos los bloques del alcance | 2026-10-19: bloque por bloque contra el prototipo, editor de bloques desde el admin y plantilla compartida en los seis tipos (ver abajo) | Noticias y resultados reales | Pendiente (revisión visual de Juani) | — |
| 8 | `/about` | `About.dc.html` | Sí; módulo completo (2026-10-19) | 2026-10-19: prototipo 1440/1024/390 y edición desde el admin (ver abajo) | Presentación completa (hoy: texto importado en remoto) | Pendiente (revisión visual de Juani) | — (vive en `site_settings`) |
| 9 | `/contact` | `Contact.dc.html` | Sí; módulo completo (2026-10-19) | 2026-10-19: prototipo 1440/390 y recorrido sin y con email desde Settings (ver abajo) | Email, WhatsApp, donación y redes reales en Settings | Pendiente (revisión visual de Juani) | — |
| 10 | Newsletter | Sin prototipo | Sí; alta revisada (2026-10-19), envíos bloqueados | 2026-10-19: alta con consentimiento, validación, duplicados, carga, éxito y errores; admin (ver abajo) | Texto | Pendiente (revisión visual de Juani) | — |
| 11 | `/` (Home v2) | `Abismo Home v2.dc.html` | Sí; fidelidad (`a4f98a6`) y rendimiento (2026-10-18, ver abajo) | Comparación controlada con el prototipo; mediciones de rendimiento sin video en desarrollo y producción local | **Sí**: textos de diseño o de ejemplo; **aprobación editorial pendiente** | **Conformidad visual de Juani (2026-10-18) sobre `5762076`, con rendimiento pendiente.** La revisión de rendimiento está hecha; falta que Juani confirme la fluidez y decida sobre la resolución adaptativa del agua | — |

Las aprobaciones de Crew (`cbea565`) y Wild Wonders (2026-10-14) se conservan. Lo cambiado después se marca solo en su parte: secciones editables de Crew, editor de secciones del perfil, cuerpo de las obras.

### Home v2 — fidelidad (2026-10-18)

Referencia visual y de movimiento: `docs/encounters/handoff-current/Abismo Home v2.dc.html`. Escenario de comparación **solo local**: `http://127.0.0.1:3219/review/home` (plantilla real de Home con los textos, imágenes y cantidades del prototipo; rotulado «LOCAL VISUAL REFERENCE»; cerrado fuera de desarrollo y de localhost; las imágenes salen de la carpeta del handoff por una ruta solo de desarrollo). Variante con listas cortas y secciones vacías: `?variant=sparse`.

**Diferencias corregidas**

| Área | Antes | Ahora (igual al prototipo) |
|---|---|---|
| Agua | Degradado con textura de cáusticas | **Shader WebGL original**, sin cambios (verificado por diff), con sus parámetros (Azul Encounters, olas 1, cáusticas 0,85, rayos 0,75, sol 0,66), su reloj y su resolución (dpr ≤ 1,75; ≤ 1,25 en teléfonos). El degradado queda como **fallback** si WebGL falta o se pierde el contexto. Movimiento reducido: el shader se dibuja quieto (tiempo 0) según el scroll |
| Ilustración de fondo | `translate3d` antes que `scale` | `scale(…) translate3d(…)` (orden del prototipo; seguía invertido) |
| Nieve marina | Estela hacia arriba al bajar, alfa completo | Estela hacia abajo y alfa × 0,8; la velocidad se sigue en cada cuadro aunque la nieve no se vea |
| Burbujas | Tamaños y duraciones fijos, borde 0,6 sin relleno | 30 (16 en teléfono) al azar: 3–12 px, 11–27 s, demora negativa, borde 0,4 y relleno radial |
| Entradas de Home | Desenfoque y escala 0,965 | Sin desenfoque, escala 0,972 → 1, desplazamiento 60 px y tramo 0,3 por defecto; los elementos ya pasados quedan en su estado final |
| Garabatos | El de Ongoing projects no se dibujaba; el del cierre con corrección de pie | Proyectos: se traza al 40 % visible en 1700 ms; cierre: atado al scroll con el tramo del prototipo |
| Marca del navbar | Origen de escala arriba | Origen centrado; logo grande del banner oculto en pantallas bajas (h < 700, o móvil con h < 800) |
| Navbar en Home | Velo 140 px, links blancos, filas móviles de 24 px | Velo 170 px (210 en móvil) con el degradado del prototipo, links #EAF5FA, transición 500 ms, filas móviles de 12 px con 18 px entre filas (objetivos separados 30 px) |
| Descenso en móvil | Texto a ancho completo (151 px más bajo) | Columnas 3–6 como el prototipo |
| Interlineado | Heredado del sitio | `normal`, como el prototipo (diferencias de 5–12 px por sección) |
| Tripulación | Separación 5vh | 4,5vh |
| Cierre y pie | Pie con 90–220 px abajo | Separación y cierre del prototipo |
| Carrusel de arte | Flechas desactivadas en los extremos | Siempre activas, como el prototipo |
| Agenda | Etiquetas recalculadas fuera de pantalla | Solo los eventos visibles actualizan su etiqueta; progreso con los límites del prototipo |
| Rendimiento | Se buscaban nodos y se leía la geometría entre escrituras en cada cuadro (p95 33 ms) | Nodos guardados, lecturas antes que escrituras, tamaños medidos al redimensionar; imágenes `decoding="async"`. Igual que el prototipo: 9,9 s vs 9,9 s para el mismo scroll, p95 16,8 ms |
| Scroll programático | `scroll-behavior: smooth` | Nativo en Home, como el prototipo |
| Texto del descenso | Sin itálica | Campo nuevo **«Words in italics»** (Page presentation → Home → The descent), como «Again and again.»; vive en `site_settings`, sin cambio de base |

Criaturas: los SVG ya eran los del prototipo; se compararon tamaño, trayectoria, entrada, salida y aletas (capturas y video `desktop-creatures`) y coinciden. La única corrección fue de rendimiento (anchos medidos al redimensionar).

**Comparaciones** (Chrome con GPU, mismo viewport y densidad, `Math.random` con semilla en ambos, reloj de Playwright para el mismo tiempo transcurrido):

- Posiciones de sección: iguales en desktop (0–5 px) y en 390 px (0–3 px). Navbar móvil 121 vs 120 px.
- Capturas lado a lado (prototipo a la izquierda): 13 puntos en 1440×900 y 9 en 390×844.
- Videos lado a lado, alineados al inicio del scroll: descenso lento, scroll rápido, scroll inverso, agenda, criaturas y pausas (desktop); descenso y agenda (móvil).
- Robustez: sin WebGL (fallback), movimiento reducido, datos reales del CMS local, variante con listas cortas y secciones vacías: sin errores ni desbordamiento.
- The Crew (8762 px) y Wild Wonders (7654 px) en 3218: sin cambios.

Evidencia: [verification/review-2026-10-18-home/](verification/review-2026-10-18-home/).

**Diferencias que todavía existen**

- El dibujo de las cáusticas y el giro de los links del navbar dependen del momento en que monta cada página; en capturas con el mismo tiempo transcurrido el patrón no coincide punto a punto (mismo shader, distinto origen de tiempo).
- Pie: el prototipo dice «© 2026 Encounters again and again · Write to us»; el sitio usa el pie común con el texto y los enlaces de Settings.
- Con movimiento reducido el banner queda visible y el agua quieta (decisión de accesibilidad, no del prototipo).
- Durante la grabación de video el servidor de desarrollo dibuja algo menos de cuadros que el HTML estático del prototipo (942 vs 1106 en 21 s); sin grabación la medición es igual. Conviene repetirlo sobre un build de producción.
- Diferencias menores de 1–3 px en móvil (proyectos, navbar).

**Pendientes editoriales** (no visuales): confirmar o reemplazar los textos de diseño de Home (banner, descenso con sus palabras en itálica, arrecife, estados y textos de los proyectos, About, newsletter) y el texto del pie, en la base real.

**Pendientes visuales**: aprobación de Juani de Home completa, incluida el agua.

### Home v2 — rendimiento (2026-10-18)

Juani registró **conformidad visual** de Home (versión `5762076`) y notó lentitud al hacer scroll. Revisión hecha antes de seguir con Expeditions.

**Método.** Mismo Chrome y ventana (1440×900) para prototipo (3220), desarrollo (3219) y **producción local** (3221, `npm run cms:local:prod`). Sin grabar video. Mismo scroll con rueda (descenso lento, o recorrido completo ida y vuelta) y `Math.random` con semilla. Por cuadro: intervalos de rAF (mediana, p95, p99, cuadros > 20 y > 34 ms), tareas largas, *long animation frames* con atribución de scripts, y contadores de Chrome (tiempo de script, layout y estilo). Densidad de píxeles 1 y **2 (pantallas Retina)**.

**Qué se encontró**

1. A densidad 1 todo va a 60 fps (prototipo, desarrollo y producción). La lentitud aparece a **densidad 2**, y también en el **prototipo** (p95 83 ms).
2. Sin tareas largas de JavaScript: el script ocupa ~2 % del tiempo. Los cuadros lentos son de **GPU**.
3. Apagando una capa por vez en producción, la única que explica el costo es el **shader del agua**: sin él, p95 16,7 ms y 1 cuadro lento en vez de 113. Filtros del navbar y del HUD, nieve, burbujas, fondo y tarjetas cambian poco.
4. El shader se dibuja a hasta **1,75×** (≈ 4 millones de píxeles a densidad 2) y el prototipo **lo sigue dibujando** (junto con fondo, burbujas, velo y tortuga) cuando las secciones opacas ya lo tapan, desde Ongoing projects hasta el final.
5. Había un **segundo bucle de animación** en Home (el de las páginas editoriales), que en Home no tenía nada que hacer.
6. Renders de React: ninguno por scroll (el bucle trabaja con refs; solo el carrusel cambia estado al deslizarlo). Lecturas de layout: ya agrupadas antes de las escrituras (entrega anterior).

**Qué se cambió**

- Las capas de fondo fijas (shader, ilustración, burbujas, velo, tortuga) **dejan de dibujarse** cuando no pueden verse: fuera del banner, el descenso, el arrecife y el 12 % superior de Ongoing projects. La imagen es la misma (ver la comparación del borde).
- Home usa **un solo bucle** de animación.
- **Resolución adaptativa del agua — compromiso visual a decidir por Juani:**
  - el shader arranca en la resolución del prototipo (1,75× o la densidad de la pantalla, la menor);
  - si los cuadros no llegan a 60 fps, baja (como mínimo a 1×, un píxel por píxel de pantalla), calculando el paso con el costo medido;
  - recuerda el nivel que funciona y prueba subir una sola vez;
  - con `?water=full` se mantiene siempre la resolución del prototipo.

  A 1× sobre pantalla de densidad 2, las líneas finas de las cáusticas quedan apenas más suaves (captura `water-resolution-*`). En pantallas de densidad 1, y en GPUs que sostienen 60 fps, no cambia nada.

**Mediciones (recorrido completo ida y vuelta; densidad 2 salvo indicación)**

| Versión | p95 | p99 | Cuadros > 20 ms | Long animation frames (ms) |
|---|---|---|---|---|
| Prototipo | 83 ms | 133 ms | 320 | 8753 |
| Producción antes | 100 ms | 150 ms | 259 | 10991 |
| Producción después, agua del prototipo (`?water=full`) | 67 ms | 117 ms | 141 | 4115 |
| **Producción después (adaptativa)** | **16,7 ms** | **16,8 ms** | **0** | **0** |
| Producción después, Home con datos del CMS local | 16,8 ms | 16,8 ms | 1 | 0 |
| Desarrollo después | 16,8 ms | 50 ms | 25 | 939 |
| Prototipo, densidad 1 | 16,7 ms | 16,8 ms | 5 | 102 |
| Producción después, densidad 1 | 16,7 ms | 16,8 ms | 0 | 0 |

Descenso lento solo (densidad 2):

| Versión | p95 | Cuadros > 20 ms |
|---|---|---|
| Prototipo | 83 ms | 134 |
| Producción antes | 117 ms | 159 |
| **Producción después** | **16,8 ms** | **26** (la única prueba de subir de nivel) |

Costo del agua en el descenso según resolución (densidad 2): 1,75× p95 117 ms · 1,5× 83 ms · 1,25× 50 ms · 1× 16,7 ms.

Los cuadros lentos que quedan en desarrollo son propios del modo desarrollo.

Cierre (después de corregir el ancho del logotipo del navbar y de impedir que se reintente un nivel que ya falló), producción, densidad 2, recorrido completo, tres corridas en primera visita: p95 16,8 ms en las tres; cuadros > 20 ms: 8, 1 y 14, todos del ajuste inicial del agua. Visita siguiente, con el nivel recordado: 9.

Durante el cierre la Mac pasó a batería (20 %) con modo de bajo consumo, y Chrome quedó limitado a 30 fps: el prototipo y Home midieron 33,3 ms planos, sin cuadros largos. Esas corridas no miden la página y no se usan. Conviene que Juani pruebe con la Mac enchufada y sin modo de bajo consumo.

**Corrección adicional:** en producción el logotipo del navbar quedaba recortado («ENCOUNTER»), porque su ancho se medía antes de que cargara la fuente. Ahora se mide de nuevo cuando las fuentes están listas y al cambiar el tamaño de la ventana.

**Producción local para probar la fluidez:**

- `http://127.0.0.1:3221/` — Home con el contenido del CMS local.
- `http://127.0.0.1:3221/review/home` — escenario de referencia.
- `http://127.0.0.1:3221/review/home?water=full` — agua siempre a la resolución del prototipo.

Se levanta con `npm run cms:local:prod` (build y `next start` contra Supabase local). La ruta de referencia se abre en producción solo con la bandera local `ENCOUNTERS_LOCAL_REVIEW`. La base local se acepta en un build de producción solo con `ENCOUNTERS_LOCAL_PRODUCTION_CHECK`. Ambas banderas las pone únicamente ese script, y siguen limitadas a localhost y a Supabase local.

Evidencia: [verification/review-2026-10-18-home-performance/](verification/review-2026-10-18-home-performance/).

**Pendiente:** que Juani confirme la fluidez en su pantalla y decida si acepta la resolución adaptativa o prefiere la del prototipo siempre. Expeditions espera ese cierre. La aprobación editorial de Home sigue pendiente.

### Expeditions — módulo completo (2026-10-18)

**Implementado**
- Pin de 660vh con 5 cards (220 + 88vh por card) y la tabla exacta de ventanas del prototipo.
- El navbar pasa a claro cuando el banner baja de 120 px, como el prototipo.
- Reglas de cards para móvil y tablet del prototipo, y título a tamaño del prototipo.
- Filas del navbar móvil de 12 px en todo el sitio, como en todos los prototipos. Corregido el 2026-10-18 (ver Workshops): el área táctil ya no queda limitada a esas 12 px.
- Preview en vivo de las cards de presentación (la plantilla pública, desplazada a la card). «Shown on» solo ofrece la página del programa y las cards nuevas la traen elegida.
- Después de guardar, el admin conserva `?edit=<id>`.
- Comando `demo:local:adopt` para contenido creado desde el admin.
- El seed agrega participantes a la expedición terminada.

**Verificado técnicamente**
- Comparación con el prototipo en 1440 y 390 px, cuadro a cuadro: igual. Diferencias de contenido: la imagen de la card 1, y el botón de donación oculto porque no hay enlace real.
- Recorrido desde el admin, completo y en verde: crear, borrador privado, recargar, editar, preview visual y Full preview, publicar sin destacar, página pública, listado, agenda de Home, perfil del participante, terminada con resultado (enlaces en los dos sentidos), y al despublicar desaparece de todo.
- Ejemplos adoptados: «UI journey crossing (demo)» (publicada, terminada, con resultado y participante) y «UI journey crossing 1607 (demo)» (borrador).

**Aprobado por Juani:** pendiente.

**Siguiente:** Workshops (hecho, ver abajo).

### Workshops — módulo completo (2026-10-18)

**Navbar móvil compartido (revisado antes de seguir)**
- Problema encontrado: con las filas de 12 px del prototipo, el área táctil de cada enlace también era de 12 px.
- Corrección: la fila visual sigue en 12 px y un `::after` invisible amplía el área a 26 px de alto (30 px en Home, donde las filas están más separadas). Las áreas de enlaces vecinos se tocan sin solaparse. El foco sigue visible (anillo sólido de 2 px #8FD9EA).
- Comprobado en teléfono (390 px) en The Crew y Wild Wonders (3218, datos reales, solo lectura) y en Home (3219): sin solapamientos ni cambio visual. Capturas en `nav/`. No se rediseñó nada de Crew ni de Wild Wonders.

**Implementado**
- Hero propio como el prototipo. Al bajar, la imagen se desplaza, crece y se oscurece, y el texto sube y se desvanece con los tiempos del prototipo. El navbar se oscurece sobre el hero y deja de hacerlo al pasarlo.
- Apariciones con los desplazamientos del prototipo. Reglas de tablet (≤1080) y teléfono (≤760) del prototipo: pin estático en teléfono, imagen de 38vh y riel de 58vh.
- Estados independientes: actividad (próximo, en curso, terminado) e inscripción (abierta, cerrada, completa). Con inscripción completa o cerrada no hay botón para sumarse y la ficha dice «Full» o «Closed». Publicar no destaca: `featured` sigue en falso.
- Campos opcionales en el detalle: idioma, formato, plazas, precio (0 se muestra como «Free») y «What is included». Si están vacíos, no aparecen.
- Ayudas del admin para cada campo del workshop (subtítulo, estados, textos del botón y de disponibilidad, idioma, formato, qué incluye, precio, plazas, email y asunto de inscripción, resultado). Las ayudas de los campos de detalle ahora se muestran.

**Verificado técnicamente**
- Comparación cuadro a cuadro con el prototipo en 1440, 1024 y 390 px (`d-sheet.jpg`, `t-sheet.jpg`, `m-sheet.jpg`): igual en composición, pin, riel y tiempos. Las únicas diferencias vienen del contenido (ver abajo).
- Sin desborde horizontal. Con movimiento reducido no queda texto oculto. Con teclado el riel recibe foco y AvPág pasa las sesiones 01 → 02 → 03 con las imágenes en fundido.
- Recorrido desde la interfaz del admin, completo y en verde (`journey/`): crear un workshop de una sesión, guardar borrador (privado: 404, fuera del listado y de Home), recargar, editar la sesión, preview visual y Full preview, publicar sin destacar, detalle con ficha, botón, sesión, qué llevar y facilitador, listado («ONE SESSION»), agenda de Home, perfil del facilitador, inscripción completa (sin botón, «Full»), terminado con resultado (enlaces en los dos sentidos y sale de la agenda de Home), despublicar (privado en todas partes).
- TypeScript, lint y `npm test` en verde.

**Ejemplos locales (editables; ninguno se pisa)**
- Una sesión: «UI journey drawing day (demo)», creado desde el admin y adoptado (`demo:local:adopt`). Publicado, próximo, inscripción abierta.
- Varias sesiones: «Draw the ocean (demo)», en curso, tres sesiones.
- Próximo con inscripción completa: «Encounters at the market (demo)», dos sesiones.
- Terminado con resultado: «Wild wonders at Coledale (demo)» ↔ «Wild wonders at Coledale (demo result)».

**Diferencias conocidas**
- Los títulos llevan «(demo)», que desplaza algunas líneas respecto del prototipo.
- Las imágenes de sesiones son dibujos sintéticos de ejemplo.
- La columna de cada workshop agrega un enlace al detalle, que el prototipo no tiene.

**Sin cambios de esquema.** Todos los campos ya existían.

**Aprobado por Juani:** pendiente.

**Siguiente:** Meaningful Messages (hecho, ver abajo).

Capturas: [verification/review-2026-10-18-workshops/](verification/review-2026-10-18-workshops/).

### Meaningful Messages — módulo completo (2026-10-19)

**Implementado**
- Escenario con la tabla exacta de ventanas del prototipo para 3 mensajes. Abre la columna izquierda: la ilustración en los mensajes impares y el texto en los pares, como el prototipo. Para otra cantidad se usa el mismo ritmo (salidas repartidas de 0.22 a 0.86, entrada 0.06 después, primero en negativo y último hasta 1).
- Movimiento del prototipo: sube 110 px, crece de 0.97 a 1 y se enfoca (desenfoque de 4 px). La salida sigue subiendo (154 px), se achica y se desenfoca (5 px).
- Columnas 1.05/1 y desborde lateral del prototipo en los dos lados.
- Teléfono: el pin de portada de 240vh se conserva solo en Messages, como su prototipo. Crew y perfiles no cambian. El escenario se desarma y cada bloque entra solo, sin salida, con imagen de 68vh.
- Portada con las ventanas del prototipo de Messages (imagen 0.06–0.82, texto 0.10–0.78). Crew conserva las suyas.
- Garabato de la introducción con el tamaño y el color del prototipo.
- Teclado: al enfocar «Read the message» el pin se mueve al momento en que ese mensaje está entero.
- Detalle (`MessageView`): una sola plantilla para la página pública y la preview del admin. Ahora muestra **Made by** con los créditos, que ya aparecían en los perfiles, y «← All messages».
- Ayudas del admin para cada campo del mensaje y de la presentación de la página.

**Verificado técnicamente**
- Comparación con el prototipo en 1440, 1024 y 390 px (`d-sheet.jpg`, `t-sheet.jpg`, `m-sheet.jpg`, `mh-sheet.jpg`) y video lado a lado (`messages-desktop.mp4`): igual en composición, cruce y tiempos.
- Casos sobre la base local, restaurados al final: 0 mensajes (sin escenario ni huecos), 1 (180vh), 3, orden invertido, sin datos opcionales y texto largo. En todos los casos cada mensaje llega a opacidad 1 y entra en pantalla, sin desborde horizontal ni errores de consola.
- Movimiento reducido: nada oculto. Teclado: los tres enlaces quedan visibles y con foco al recibirlo.
- Recorrido desde el admin, en verde: crear con crédito, borrador privado (404 y fuera del escenario), recargar, editar, preview visual y Full preview con «Made by», publicar sin destacar, aparece cuarto (orden 4), detalle con migas, crédito y vuelta, perfil de la persona acreditada, reordenar al primer lugar, despublicar (privado en página, escenario y perfil).
- Presentación de la página desde **Messages page**: editar la introducción, preview en vivo, la página pública sin cambios antes de guardar, guardar, recargar, página pública actualizada y valor original restaurado.

**Ejemplos locales:** los tres mensajes del seed y «UI journey message (demo)», creado desde el admin, adoptado y en borrador.

**Diferencias conocidas**
- El enlace «Read the message →» y el detalle no están en el prototipo (función requerida).
- En teléfono el prototipo corre los mensajes 20 px fuera de la pantalla y corta el borde del texto. La implementación deja el texto dentro del margen.
- El cierre usa el footer compartido del sitio.
- Ilustraciones de ejemplo sintéticas.

**Aprobado por Juani:** pendiente.

Capturas: [verification/review-2026-10-19-messages/](verification/review-2026-10-19-messages/).

### Art — módulo completo (2026-10-19)

**Implementado**
- Galería como el prototipo (Drawings): dos obras que ocupan las columnas libres junto a una obra de alto completo se apilan ahí a media altura, en vez de pasar a la fila siguiente.
- Video sin imagen propia: usa la miniatura de YouTube, en la obra y en su tile de categoría, como el prototipo. El reproductor carga recién al click.
- Audio: el reproductor de Spotify es una tarjeta de 352 px, no un cuadro de video. Cada obra de la categoría es un episodio. Carga al click.
- Teléfono, según el prototipo: el banner con sus medidas de escritorio, tiles de 74vh y obras de alto completo a pantalla menos navbar. Con eso, banner y tiles coinciden al píxel (358 px y 625 px).
- Carrusel (más de 4 categorías): **corregido un bucle de renders** («Maximum update depth exceeded») que además cortaba el scroll al elegir un tile.
- La preview de una categoría la numera como quedará publicada.
- `demo:local:adopt` acepta también categorías de arte.

**Verificado técnicamente**
- Comparación con el prototipo en 1440, 1024 y 390 px, con las mismas 4 categorías: igual en banner, tiles, chips, secciones, galería, libro, video y cierre (`d-sheet.jpg`, `t-sheet.jpg`, `m-sheet.jpg`). Las otras 4 categorías se dejaron temporalmente en borrador y se restauraron.
- Con 8 categorías: carrusel con contador «01–04 / 08» → «02–05 / 08». El tile filtra y lleva a su sección, los chips filtran y «All» vuelve a mostrar las 8. Teclado con foco visible en chips, obras y CTA. Movimiento reducido sin nada oculto. Sin desborde en teléfono ni errores de consola.
- Audio (`audio.jpg`): comprobado publicando temporalmente la categoría de ejemplo con un embed, y restaurado después.
- Recorrido desde el admin, en verde:
  - Categoría nueva: borrador privado (404 y fuera de /art), recargar, preview, publicar vacía («No published works in this collection yet.»), chip en /art.
  - Obra con **dos autores** (Drawing y Colour): borrador privado, recargar con los dos autores, preview «By … · Drawing, … · Colour», publicar sin destacar.
  - Aparece en la categoría, en la página de la obra con migas y autores enlazados, y **en los dos perfiles**.
  - Despublicar la obra la quita de la categoría y de los perfiles.
  - Despublicar la categoría deja 404 en la categoría y en su obra, la saca de /art, de los perfiles y del sitemap.

**Ejemplos locales:** las 8 categorías del seed (Books, Films, Drawings, Photography, Wire art, Field notes, Sound notes en borrador, y las de prueba local). Además, «Tide pools (demo)» (categoría en borrador) y «Rock pool study (demo)» (obra con dos autores), creadas desde el admin y adoptadas.

**Diferencias conocidas**
- Las obras llevan el pie `[ título ]` que abre su página; el prototipo no lo tiene (función requerida). Suma unos 30 px por obra.
- Los nombres de ejemplo llevan «(demo)».
- Las flechas del carrusel aparecen solo donde hay más para ver (decisión anterior, sin cambios).

**Aprobado por Juani:** pendiente.

Capturas: [verification/review-2026-10-19-art/](verification/review-2026-10-19-art/).

### Plantilla Post — verificación completa (2026-10-19)

**Implementado:** sin cambios de código en este módulo. Los bloques ya cumplían; las correcciones de esta ronda que tocan la plantilla están en Messages (`MessageView`) y en Art (video y audio).

**Verificado técnicamente**
- Bloque por bloque contra `Post.dc.html` a 1440 px, con cada bloque en la misma altura de pantalla y el movimiento asentado (`blocks/`). Igual composición en imagen grande, índice, heading con número y antetítulo, párrafo con lead, quick facts, dos imágenes, título + lista, cita, carrusel con flechas y contador, divisor, YouTube con miniatura y play, costos con total, link simple, FAQs y acordeón.
- Diferencias de contenido: el post de ejemplo tiene menos filas de costos y preguntas y dos headings más. Las etiquetas al margen del prototipo son ayudas de revisión y no van a producción, como indica el handoff.
- Bloques fuera de alcance (tour/centro de buceo, afiliados, alojamiento) siguen desactivados.
- Editor de bloques desde el admin, en verde:
  - crear una noticia con heading, párrafo y cita;
  - mover la cita al primer lugar, duplicar el párrafo y quitar la copia;
  - guardar borrador (404 público) y recargar con el mismo orden y los mismos textos;
  - editar, y revisar la preview visual y la Full preview en ese orden;
  - publicar sin destacar; la página pública mantiene el orden;
  - despublicar: 404 y fuera del sitemap.
- La plantilla compartida conserva lo propio de cada tipo:
  - resultados con el enlace a su expedición o workshop;
  - expedición con datos y necesidades;
  - workshop con sesiones, qué llevar y resultado;
  - mensaje con ilustración y vuelta;
  - obra con autores y roles;
  - personas acreditadas donde existen.
  - En teléfono con movimiento reducido: sin desborde, sin contenido oculto, sin enlaces vacíos y sin errores de consola.
- Crew y perfiles conservan su renderizador aprobado (sin cambios).

**Ejemplos locales:** «All post blocks (demo)», los resultados de ejemplo y «UI journey news (demo)», creada desde el admin y adoptada (en borrador).

**Aprobado por Juani:** pendiente.

Capturas: [verification/review-2026-10-19-post/](verification/review-2026-10-19-post/).

### About — módulo completo (2026-10-19)

**Implementado**
- Frase «We believe…» sin el tracking global de los h2 (el prototipo usa `normal`): vuelve a tres líneas.
- Listas de las filas con interlineado `normal` como el prototipo (48 px por ítem; antes 59).
- Una columna desde 860 px, como el prototipo. La primera fila muestra el texto antes de la foto y la segunda la foto antes del texto.
  - **Para decidir:** el CSS del prototipo dice «la foto va siempre arriba del texto», pero solo lo aplica a la segunda fila. Se siguió el prototipo ejecutable.
- Columnas y filas vacías no se muestran (antes quedaban huecos). Una fila sin título no deja un h3 vacío.
- Ayudas en los campos de Page presentation → About page.

**Verificado técnicamente**
- Comparación con el prototipo en 1440, 1024 y 390 px (`d-sheet.jpg`, `t-sheet.jpg`, `m-sheet.jpg`): secciones con ±15 px en escritorio y misma composición en tablet y teléfono.
- Edición desde el admin del título del banner y de la frase «We believe»: preview en vivo, la página pública sin cambios antes de guardar, guardar, recargar, página pública actualizada y valor original restaurado.
- Enlaces a secciones: /art, /expeditions, /contact («Write to us →»), más el navbar.
- Teléfono y movimiento reducido: sin desborde, sin contenido oculto, sin enlaces vacíos y sin errores.

**Diferencias conocidas**
- Fotos de ejemplo distintas a las del prototipo.
- La fila de contacto (email, teléfono y redes) aparece solo con datos en Settings. En local está vacía; ver Contact.
- El cierre usa el footer compartido.

**Pendiente editorial:** cargar la presentación real (en la base real hoy se ve el texto importado).

**Aprobado por Juani:** pendiente.

Capturas: [verification/review-2026-10-19-about/](verification/review-2026-10-19-about/).

### Contact — módulo completo (2026-10-19)

**Implementado**
- **Settings** suma, sin cambiar el esquema (JSON de `site_settings`):
  - **WhatsApp**: número internacional que se convierte en un enlace `wa.me`.
  - **Página de donación**: solo `https://`, con su texto.
  - Contact y About los muestran solo si están cargados, junto al email y las redes.
- El formulario explica su acción:
  - el botón dice **«Open my email app»**;
  - debajo de la nota: «The button opens your email app with this message written to … Nothing is sent until you press send there.».
- Ya no dice «Thank you for writing» ni nada que suene a enviado. Después de abrir la app de correo muestra:
  - **«One more step · Send it from your email app»**, que explica que llega solo al pulsar enviar ahí;
  - el texto del motivo elegido;
  - «Open it again» con el mismo mensaje preparado;
  - el email directo;
  - «Edit the message», que vuelve al formulario con lo escrito.
- Sin email: botón desactivado, explicación al visitante y mención de los otros caminos.
- La nota de validación vuelve a su texto en cuanto se corrige un campo.
- Ayuda del admin actualizada: el texto por motivo se llama «Text for this topic after the email app opens».

**Verificado técnicamente** (recorrido con Settings desde el admin, valores originales restaurados)
- Sin email: botón desactivado, explicación visible, sin «otros caminos» vacíos y ninguna frase de «enviado».
- Con email `hello@example.com`, WhatsApp y donación de ejemplo:
  - la validación pide nombre y email;
  - se elige motivo y se abre la app de correo;
  - destinatario `hello@example.com`, asunto = motivo («Workshops & talks»), cuerpo con nombre, email, lugar y mensaje;
  - estado «One more step» sin palabras de envío; «Edit the message» conserva el texto;
  - «otros caminos» y About muestran email, WhatsApp (`https://wa.me/61400000000`) y donación.
- Comparación con el prototipo en 1440 y 390 px: misma composición del banner, panel, motivos, campos y pie.

**Diferencias conocidas**
- Botón «Open my email app» en vez de «Send message» y estado «One more step» en vez de «Message sent»: el sitio no envía (decisión del alcance).
- En local no hay email cargado, así que el botón se ve desactivado y «otros caminos» oculto. Cargar email, WhatsApp y donación reales en Settings.

**Aprobado por Juani:** pendiente.

Capturas: [verification/review-2026-10-19-contact/](verification/review-2026-10-19-contact/).

### Newsletter — alta y gestión (2026-10-19)

**Implementado**
- Cada mensaje describe lo que pasó:
  - email inválido: «Please enter a valid email address.»;
  - sin consentimiento: «Please tick the box…»;
  - alta: «Thank you. Your address is on the list. We do not send a confirmation email: the first newsletter arrives when we write one.»;
  - sin conexión: «… Nothing was saved.»;
  - error del servidor: «We could not save your address right now…»;
  - demasiados intentos: también aclara que no se guardó nada.
- La API distingue la falta de consentimiento (antes respondía «email inválido»). La validación usa los mensajes de la página, no los globos del navegador. El estado de carga desactiva el botón y marca el formulario como ocupado.
- Duplicados: la misma respuesta verdadera («Your address is on the list») y una sola fila. No revela si el email ya existía.
- Admin → Newsletter: aviso visible de que **el envío está apagado** y botón «Sending is turned off» desactivado. Usa la misma bandera `ENCOUNTERS_EMAIL_ENABLED` que la ruta de envío, que sigue ausente; no se habilitó nada.

**Verificado técnicamente** (Home, Supabase local; la dirección de prueba se borró al terminar)
- Inválido, sin consentimiento, carga («Subscribing…», desactivado), alta con fila `subscribed · home · consent_at` y duplicado (misma respuesta, 1 fila).
- Red caída y error 502 simulados en el navegador. API sin consentimiento.
- Ningún correo enviado.

**Qué existe hoy en el admin:** contadores (activos, dados de baja, total), descarga CSV, asunto y cuerpo en texto plano con enlaces markdown, enlace de baja automático y ruta de envío por lotes (Resend), bloqueada.

**Qué falta para que los fundadores redacten y envíen novedades (etapa posterior, no implementado):**
1. Verificar el dominio de envío y cargar la clave del proveedor; prueba de envío autorizada; recién entonces la bandera de envío.
2. Guardar borradores (hoy el texto se pierde al salir) y un historial de envíos con fecha, asunto y cantidad.
3. Preview con la plantilla del correo y envío de prueba a una dirección del equipo antes del envío real.
4. Opcional: armar la novedad desde contenido publicado (noticia, resultado, actividad) con su enlace.
5. Decidir si hace falta doble confirmación (double opt-in) y su texto; hoy el alta es directa con consentimiento.
6. Rediseñar la pantalla con el estilo del admin nuevo (hoy conserva el estilo heredado).

**Aprobado por Juani:** pendiente.

Capturas: [verification/review-2026-10-19-newsletter/](verification/review-2026-10-19-newsletter/).

### Verificación integrada (2026-10-19)

- **Recorrido completo del sitio**, en desarrollo (3219) y en producción local (3221, build de `4bad594`). Parte de /, el sitemap, el navbar y el footer y sigue todos los enlaces internos:
  - 51 páginas, todas 200;
  - ningún enlace vacío o roto ni errores de consola;
  - todas con `noindex`;
  - ninguna con desborde en teléfono.
- **Relaciones:** obras ↔ autores (los dos perfiles), actividades ↔ resultados (en los dos sentidos), facilitadores y participantes ↔ perfiles, mensajes ↔ créditos. Todo comprobado en los recorridos de cada módulo y por el recorrido completo.
- **Home** (desde el admin; todo restaurado):
  - publicar no destaca;
  - «Featured on Home» con orden 1 lleva un workshop al primer lugar de la agenda, y al desmarcarlo vuelve al orden por fecha;
  - en Home page, subir «Who is on board» dos lugares cambia el orden;
  - ocultar una sección la quita;
  - sin actividades próximas ni anuncios, la agenda desaparece sin hueco.
- **Ida y vuelta** por el navbar (navegación del cliente) y con Atrás y Adelante:
  - cada página arranca arriba con su título visible;
  - los loops de animación no se acumulan (60 o 120 llamadas por segundo según la página, estables tras volver);
  - sin errores.
  - Las páginas con 120 tienen dos loops por diseño: el de la página y el compartido de apariciones.
- **Regresiones:**
  - The Crew 8762 px y Wild Wonders 7654 px en 3218, igual que lo aprobado;
  - perfiles locales sin desborde;
  - los cambios de esta ronda están acotados a las clases de cada página (Messages, Art, About, Contact).
- **Observación de entorno:** durante una lentitud de la máquina (respuestas de 38 s), una consulta superó el límite local de 3 s del rol `anon` (código 57014) y /expeditions mostró su estado de error («Unable to load this page»). No se repitió en 5 intentos (menos de 0,5 s). Nada que corregir en el código. El estado de error se ve correctamente.
- **Chequeos:** TypeScript, lint, `npm test` (5 suites, incluida la nueva de esta ronda: ventanas de Messages para 1 a 12 mensajes y datos de contacto desde Settings) y build de producción. La prueba nueva encontró y dejó corregidos dos bordes de Messages con muchos mensajes (salida antes de terminar la entrada desde 6; salida fuera del pin con 11).
- El build de producción reescribe `tsconfig.json` y `next-env.d.ts` para su carpeta (`.next-cms-prod`). Se restauraron y no se versionan.

**Guía para Juani:** [revision-integrada.md](revision-integrada.md).

### Migraciones en la base remota

**Actualizado 2026-10-28:** hay 17 migraciones aplicadas en la base real. La última, aplicada el 2026-10-26 con aprobación de Juani (respaldo previo de esquema y datos en `.encounters-work/backups/2026-10-26-before-20261026000100-*.sql`, dry run con solo esta migración, `production-migrate.mjs --apply`), es:

- `supabase/migrations/20261026000100_crew_listing_relation_notes.sql` — `crew_members.listed` (sacar a alguien de The Crew page y del Home sin borrar su página) y `post_relations.note` (comentario por relación); `save_content` igual salvo que guarda `note`. No convierte ni borra nada.

Pendientes, en este orden, probadas localmente pero no aplicadas a producción:

1. `supabase/migrations/20261026000200_profile_default_blocks.sql` — Main title para los perfiles que lo necesitan y RPC de creación con Main title + Opening text.
2. `supabase/migrations/20261026000300_keep_legacy_profiles_convertible.sql` — conserva la conversión completa de perfiles legacy y corrige las posiciones que la migración anterior pudo tocar.

Aplicarlas juntas requiere un OK explícito nuevo, respaldo, prueba local y dry run que muestre únicamente esas dos.

Historial (ya aplicadas):

1. `supabase/migrations/20261017000100_crew_page_sections.sql` — campos `crew_members.highlight` y `favourite_animal`, conversión única de los textos importados y secciones explícitas de los bloques de la página Team.
2. `supabase/migrations/20261017000200_activity_presentation.sql` — `workshops.note_title`, `workshops.outcome` y `expeditions.outcome` (textos opcionales; no convierte ni borra nada).

La conversión del perfil real a secciones explícitas no es una migración: se hace al abrir y guardar la página en el admin, o con `scripts/profile-sections-local.mjs` adaptado al destino, siempre con aprobación.

### Cierre 2026-10-18

- **Full preview** (`/admin/posts/[id]/preview`): carga el detalle del tipo, necesidades o sesiones, créditos y resultado con la sesión de admin y usa las plantillas públicas. Recorrido local: borrador → editar necesidad/sesión → guardar → público 404 → Full preview muestra el cambio → publicar → público igual → restaurado (expedición y workshop).
- **Plantilla Post** (`PostBlocks`): imagen grande con parallax y número, dos imágenes, carrusel, YouTube al click, heading con número y antetítulo, párrafo con lead, título + lista, cita, quick facts, costos con total, FAQs, acordeón, link simple, divisor e índice. Fuera de alcance: tour/centro de buceo, alojamiento y afiliados (módulos desactivados). El editor del admin crea y edita todos. Los perfiles y The Crew conservan su renderer aprobado. Los bloques importados con varias imágenes se muestran como par o carrusel según su cantidad (compatibilidad con datos importados).
- **Perfil:** `profile-sections.ts`. Secciones: título de apertura, texto de apertura, par de fotos, fila de fotos, capítulo, galería oscura, contenido extra, no se muestra; opción «también en el par». El banner de Wild Wonders deja de depender del nombre en perfiles convertidos (portada de diseño explícita).
- **Home:** tortuga, pez payaso, delfín y ballena con los SVG y fórmulas del prototipo; cáusticas con deformación ondulada. Sin recursos faltantes.
- Verificación: TypeScript, lint, `npm test` (incluye la equivalencia de perfiles), build; 3218 sin cambios en `/crew` y Wild Wonders.

| Página | Implementación | Prototipo | Qué revisar | Diferencias conocidas |
|---|---|---|---|---|
| Home | http://127.0.0.1:3219/ | http://127.0.0.1:3220/Abismo%20Home%20v2.dc.html | Descenso, agua, criaturas, agenda, carrusel | Agua por degradado (no WebGL); textos de diseño o ejemplo |
| Expeditions | http://127.0.0.1:3219/expeditions | http://127.0.0.1:3220/Expeditions.dc.html | Disolución y cards; lista | La lista de expediciones no está en el prototipo |
| Expedición | http://127.0.0.1:3219/expeditions/demo-ningaloo-crossing | Post.dc.html | Datos, necesidades, contacto | Sin prototipo propio |
| Workshops | http://127.0.0.1:3219/workshops | http://127.0.0.1:3220/Workshops.dc.html | Hero, riel de sesiones, terminado | Imágenes demo sintéticas; títulos «(demo)»; enlace al detalle |
| Workshop | http://127.0.0.1:3219/workshops/demo-draw-the-ocean | Post.dc.html | Sesiones, qué llevar | Sin prototipo propio |
| Messages | http://127.0.0.1:3219/meaningful-messages | http://127.0.0.1:3220/Meaningful%20Messages.dc.html | Cruce de mensajes | Enlace «Read the message» agregado |
| Post | http://127.0.0.1:3219/posts/demo-post-blocks | http://127.0.0.1:3220/Post.dc.html | Todos los bloques | Sin tour, alojamiento ni afiliados |
| Resultado | http://127.0.0.1:3219/posts/demo-first-crossing | Post.dc.html | Vuelta a su expedición | — |
| About | http://127.0.0.1:3219/about | http://127.0.0.1:3220/About.dc.html | Foto que se encoge, filas | Contacto oculto sin email/teléfono |
| Contact | http://127.0.0.1:3219/contact | http://127.0.0.1:3220/Contact.dc.html | Temas, validación | El envío abre el email del visitante; sin email, desactivado |
| The Crew | http://127.0.0.1:3219/crew | http://127.0.0.1:3220/The%20Crew.dc.html | Sin cambios visuales | — |
| Perfil | http://127.0.0.1:3218/crew/wild-wonders y http://127.0.0.1:3219/crew/local-test-person-c | http://127.0.0.1:3220/Wild%20Wonders.dc.html | Igual que lo aprobado; editor de secciones | — |
| Art | http://127.0.0.1:3219/art | http://127.0.0.1:3220/Art.dc.html | Cuerpo de la obra con bloques de Post | Obra sin prototipo propio |

Capturas: [verification/review-2026-10-18-close/](verification/review-2026-10-18-close/).

### Historial 2026-10-17

| # | Ruta | Prototipo | Diseño | CMS y datos | Navegación | Verificación | Pendiente | Aprobación de Juani |
|---|---|---|---|---|---|---|---|---|
| 1 | `/crew` | `The Crew.dc.html` | Fiel | Secciones explícitas (migración `…0100`, solo local) | Navbar, tira → perfiles | 2026-10-17 | Migración en la base real | **Aprobada visualmente** (2026-10-13). Secciones editables: pendiente |
| 2 | `/crew/[slug]` | `Wild Wonders.dc.html` | Fiel en Wild Wonders | `ProfileStory` (deduce layout por bloques; pendiente pasarlo a secciones) | Migas, obras ↔ autores | 2026-10-13 | Secciones explícitas | Wild Wonders **aprobado** |
| 3 | `/art`, categoría, obra | `Art.dc.html` (+ `Post.dc.html`) | Implementado | Categorías, obras, autores | Filtros, rail, migas, obras ↔ autores | 2026-10-16 | Cuerpo de obra sin toda la fidelidad de Post | Pendiente |
| 4 | `/expeditions` | `Expeditions.dc.html` | Fiel: pin con disolución en 6 franjas y cards encadenadas | Cards: `expedition_cards` de la página del programa. Banner: Page presentation → Expeditions page | Lista → detalle; terminadas → resultado | 1440 / 390 / reducido; 3218 | Cards reales por cargar en la base real | Pendiente |
| 4b | `/expeditions/[slug]` | Sin prototipo: plantilla Post | Post + datos, necesidades, participantes, resultado | `expeditions`, `expedition_needs`, relación «result» | Migas, ← todas, resultado, contacto | 1440 / 390 | — | Pendiente |
| 5 | `/workshops` | `Workshops.dc.html` | Fiel: un pin por workshop con riel de sesiones | `workshops` (+ `note_title`, `outcome` nuevos), `workshop_sessions` | Columna → detalle; terminado → resultado; cierre → /contact | 1440 / 390 / teclado | — | Pendiente |
| 5b | `/workshops/[slug]` | Sin prototipo: plantilla Post | Post + sesiones, qué llevar, facilitadores, resultado | Ídem | Migas, inscripción por email o /contact | 1440 | — | Pendiente |
| 6 | `/meaningful-messages` | `Meaningful Messages.dc.html` | Fiel: portada pineada, intro, escenario cruzado | `messages` + Page presentation → Messages page | «Read the message →» → detalle | 1440 / 390 / reducido | — | Pendiente |
| 6b | `/meaningful-messages/[slug]` | Sin prototipo: plantilla Post | Mensaje + ilustración + bloques | `messages`, `post_blocks` | Migas | 200 | — | Pendiente |
| 7 | `/posts/[slug]` (noticias y resultados) | `Post.dc.html` | Plantilla Post compartida | `posts`, `post_blocks`, relaciones | Resultado → su actividad; relacionados | 200 | Bloques sin toda la fidelidad de Post | Pendiente |
| 8 | `/about` | `About.dc.html` | Fiel: foto que se encoge, 3 columnas, contador, manifiesto, filas, contacto | Page presentation → About page (sin datos: texto importado) | Filas → /art, /expeditions; «Write to us» → /contact | 1440 / 390 | Cargar presentación real | Pendiente |
| 9 | `/contact` | `Contact.dc.html` | Fiel: panel que emerge, temas, validación, estado enviado | Page presentation → Contact page; email público de Settings | Sin envío desde el sitio: abre el email del visitante | 1440 / 390 / teclado | Cargar temas y email reales | Pendiente |
| 10 | Newsletter | Sin prototipo: bloque de Home | Estilo de Home | `newsletter_subscribers` (solo alta con consentimiento; envíos bloqueados) | En Home | Solo local | — | Pendiente |
| 11 | `/` (Home v2) | `Abismo Home v2.dc.html` | Fiel salvo el agua (equivalente aceptado, ver abajo) | Page presentation → Home page + contenido publicado | Proyectos → páginas; agenda → actividades; historias → posts; arte → obras; tira → perfiles | 1440 / 390 / reducido / teclado | Criaturas SVG no implementadas | Pendiente |

## `/crew` — auditoría y secciones editables (2026-10-17)

Referencias:

- Página aprobada con datos reales: `http://127.0.0.1:3218/crew`.
- Con la migración y ejemplos locales: `http://127.0.0.1:3219/crew`.
- Prototipo: `http://127.0.0.1:3220/The%20Crew.dc.html`.
- Editor: `http://127.0.0.1:3219/admin` → menú **Crew → Crew page** (secciones) y **Crew → People** (tarjetas).

**Visual.** Se compararon el prototipo y la página aprobada a 1440×900, 1024×768 (primera vez) y 390×844, en todo el scroll. Composición, tipografía, espaciados, pines, tarjetas y tira coinciden. Las diferencias son de contenido real: orden y retratos de las personas, y textos repartidos en más párrafos. **No se rehizo nada visual.**

**Mapeo** sección visual → contenido → soporte anterior → cambio:

| Sección | Contenido | Antes | Ahora |
|---|---|---|---|
| Portada | Imagen, antetítulo, título | Imagen: Settings (Crew cover) o banner de diseño. Antetítulo «Meet the team» **fijo en el código**. Título «The Crew». | Imagen: igual (el editor de la página indica dónde cambiarla). Antetítulo: campo *Kicker* de la página Team. Título «The Crew»: constante del diseño, como «our ART» en Art. |
| Título de apertura | «Following our nature» | **Deducido** al cortar el párrafo `team_002` en los dos puntos | Bloque *Heading* con sección **Opening title** |
| Relato | Antetítulo, lead, cuerpo, continuación en itálica, cierre | **Deducido**: segunda mitad de `team_002`; primer párrafo lead, último cierre; párrafo que empieza con raya unido en itálica | *Heading* en sección **Story** = antetítulo; *Paragraph* en **Story** con **Text style** elegido: Lead, Body, Continues previous line in italics, Closing line in italics |
| Par de fotos | Dos imágenes pineadas | Bloques `team_003`/`team_005` por ID de importación | Bloques *Image* en sección **Photo pair** |
| Proyecto | Título a la izquierda, texto a la derecha | **Deducido**: el último párrafo de `team_006` pasaba a título | *Heading* y *Paragraph* en sección **Project** |
| Tarjetas | Nombre, rol, biografía, línea destacada, animal favorito | Línea destacada **deducida** por la frase «Above all»; animal favorito **deducido** al cortar `quote` en los dos puntos | Campos de Crew **Highlighted line** y **Favourite animal** (nuevos); *Biography* queda como texto principal; *Quote* se renombra «Other quote» (no se muestra en `/crew`) |
| «Our crew», «More about us», tira | Rótulos y retratos | Rótulos del diseño; tira automática desde People | Sin cambios: rótulos fijos del diseño; tira automática (retrato, nombre, «read →» si hay página publicada) |
| Contenido adicional | — | Bloques sin ID de importación al final | Bloques con sección **Extra content**; los demás, «Not shown» (por ejemplo, las biografías importadas de la web anterior, que ahora viven en People) |

**Esquema.** Migración `supabase/migrations/20261017000100_crew_page_sections.sql`:

- `crew_members.highlight` y `crew_members.favourite_animal` (texto, opcionales);
- conversión única y visible de los textos importados a esos campos, solo donde están vacíos;
- marca `content.section` y `content.style` en los bloques de la página Team, separando en bloques propios el título y antetítulo de apertura, cada párrafo del relato y el título del proyecto;
- antetítulo de la página Team = «Meet the team» si estaba vacío.

No borra textos. Probada y **aplicada solo en Supabase local**. **No aplicada en la base real.** Mientras tanto, la plantilla reconoce los datos sin convertir y conserva para ellos el adaptador anterior, así 3218 se ve igual que lo aprobado (verificado: 8762px, 6 personas; Wild Wonders 7654px). Antes de aplicarla en la base real hay que revisarla y aprobarla. Mientras no se aplique, el admin contra la base real no tiene los campos nuevos.

**Admin:**

- Menú por módulo, con **Crew → Crew page** y **Crew → People**.
- En la página Crew:
  - orden del editor: *Banner* (imagen, línea chica y título grande) → *SEO* → *Below the banner*; el banner usa la portada de Settings, «Meet the team» y «The Crew» cuando sus campos están vacíos;
  - el SEO queda separado del contenido visible y explicado campo por campo; el *Excerpt* anterior solo queda como respaldo de la descripción mientras *Short description* esté vacío;
  - usa los mismos bloques completos que las páginas personales: *Main title*, *Opening text*, *Pinned photo pair*, *Photo row*, *Title, text & photos* y *Dark gallery*, más los bloques comunes;
  - al abrir el formato anterior, el admin lo convierte en memoria conservando título, relato con estilos, par de fotos y proyecto; los bloques importados sin sección que nunca se mostraban (incluido «THE CREW») no entran al editor nuevo;
  - todos los campos de texto ofrecen negrita, cursiva, subrayado y link; cada párrafo de *Opening text* y *Title, text & photos* conserva además su estilo visual;
  - el par de fotos llena la altura disponible bajo el menú, igual que en las páginas personales;
  - *Publication* conserva solo *Page status*: fecha, orden, Home e índice no intervienen en `/crew` y quedan ocultos sin borrar valores; *Draft* oculta el texto y los bloques editables, no la ruta permanente ni las tarjetas de Crew;
  - la barra superior de páginas conserva solo navegación, estado, *Open public page*, *Full preview* y *Save*: duplicar, el preview integrado y publicar/despublicar se ocultan; la publicación se controla una sola vez en la tarjeta *Publication*;
  - se ocultan créditos y relacionados, que esta página no usa.
- En las fichas de Crew: *Highlighted line* y *Favourite animal* con ayudas. El vínculo interno con la página personal ya no aparece como campo.
- En *Personal pages*, *New personal page* permite elegir únicamente una persona de Crew que todavía no tenga página; crea el borrador y abre directamente su editor.
- En las fichas de Crew, *Enable profile page* queda oculto porque duplica el estado de la página personal. *Publication* conserva solo el estado general de la persona; *Position on The Crew page* y *Show on The Crew page* quedan juntos en una tarjeta propia, con ayudas que explican que controlan la tarjeta de `/crew` y la tira de Home, no la página personal.

**Plantilla compartida.** `CrewView` (`src/components/public/CrewView.tsx`) la usan `/crew`, el preview integrado y el preview por ruta de la página Team.

**Comprobaciones** (2026-10-17, 3219 con Supabase local, tiempos límite):

| Comprobación | Resultado |
|---|---|
| TypeScript, eslint, `npm test` | Sin errores |
| Migración | Aplicada en local y convertida como se esperaba (11 bloques con sección y estilo; tarjetas con línea destacada y animal favorito). Seed demo actualizado; repetido: 0 creados, 46 conservados |
| HTML de `/crew` migrada | Idéntico en estructura al del adaptador anterior (título, antetítulo, lead con continuación en itálica, cierre, par, proyecto, tarjetas) |
| Capturas a 1440, 1024 y 390 px | Misma composición que el prototipo; alturas 8762 / 7459 / 9966px; sin desbordamiento ni errores |
| Editar | Título de apertura editado → preview integrado → guardar → `/crew` lo muestra → restaurado. Animal favorito de una tarjeta editado → guardado → `/crew` lo muestra → restaurado. Preview por ruta con la plantilla de Crew |
| 3218 (base real sin migrar) | Sin cambios respecto de lo aprobado |

**Pendiente y observaciones:**

- Aplicar la migración en la base real, con aprobación.
- En local, la «quote» de Flaquito («more infoooo») no tiene la forma «Favourite animal: …», así que no se convirtió y ya no se muestra en `/crew`. Para mostrar algo en esa línea hay que usar *Favourite animal* o *Highlighted line*.
- La imagen de portada sigue editándose en Settings (decisión para no duplicar la portada).
- Durante la prueba se cerró el servidor local 3219. Se reinició con `npm run cms:local:dev` y la prueba se repitió completa.

Capturas: [verification/review-2026-10-17-crew-page/](verification/review-2026-10-17-crew-page/).

## Checklist para Juani — `/crew`

1. Abrí `http://127.0.0.1:3219/admin` → **Crew → Crew page**.
2. Cambiá Main title y un párrafo de Opening text; probá su estilo y el formato inline. Guardá y abrí `Full preview`.
3. Abrí `http://127.0.0.1:3219/crew`: si Page status está Published, los cambios tienen que verse en su lugar.
4. En **Crew**, editá una persona: Highlighted line y Favourite animal. Guardá y mirá su tarjeta.
5. Compará `http://127.0.0.1:3219/crew` con el prototipo `http://127.0.0.1:3220/The%20Crew.dc.html`.
6. Decí si aprobás los bloques compartidos y, por separado, si se pueden preparar las migraciones `…00200` y `…00300` para la base real.

## Entrega «web completa» (2026-10-17)

### Decisiones de presentación (explícitas, sin deducir por textos)

- **Expeditions:** las cards del banner son las `expedition_cards` de la página del programa (rol `encounters_expeditions`). El lado de la imagen es el elegido o alterna; el tema oscuro es el elegido. Ventanas del encadenado repartidas entre 0,42 y 1,0 para cualquier cantidad; alto del pin 220vh + 110vh × cards. **Sin cards** (base real hoy) se muestra el texto importado de la página debajo del banner. Lista: próximas y en curso primero (llevan a su página), terminadas después (llevan a su resultado o a su página).
- **Workshops:** cada workshop publicado es un pin; los terminados o sin sesiones muestran «How it went» (campo nuevo `outcome`) y «See the result» si tienen resultado. El título de la nota es el campo nuevo `note_title`. Inscripción: botón solo si el estado es *open* y hay email de inscripción; si no, el detalle lleva a /contact.
- **Meaningful Messages:** orden por *Order*; lados alternados por posición; ventanas con el ritmo del prototipo para cualquier cantidad.
- **About y Contact:** su presentación vive en *Page presentation*. Mientras no se complete (título de About, temas de Contact) se muestra el texto importado. Email, teléfono y redes salen de Settings y **solo se muestran si existen**; no se inventa ninguno.
- **Contact:** el sitio no envía nada. «Open my email app» (antes «Send message») abre la app de correo del visitante dirigida al email público, con los campos escritos, y la página dice que falta enviarlo desde ahí. Sin email el botón queda desactivado y lo explica. Ver «Contact — módulo completo».
- **Home:** orden y visibilidad de secciones en Page presentation → Home page; una sección que falte en un orden guardado vuelve a su lugar del diseño. Las listas salen de contenido publicado: agenda = expediciones y workshops próximos o en curso + anuncios que no sean uno de ellos (sin duplicados); historias = noticias y resultados más recientes, sin repetir lo que ya está en la agenda; arte = obras publicadas; tripulación = personas publicadas. **Publicar no destaca:** «Featured on Home» y su orden ponen un contenido primero. Secciones vacías se ocultan.
- **Agua de Home:** se usó el «degradado animado equivalente» que permite 10-home.md § 4.2 (línea de agua que sube, cáusticas como textura celular, rayos). El shader WebGL no se replicó. Sí están el desenfoque del fondo, el velo, burbujas, profundímetro, HUD, nieve marina y morfeo del logo. **Las criaturas SVG (deseables, no bloqueantes) no se implementaron.**
- **Newsletter:** solo registra suscripciones con consentimiento; los envíos siguen desactivados (`campaigns: false`).

### Rutas sin prototipo propio

`/expeditions/[slug]`, `/workshops/[slug]`, `/meaningful-messages/[slug]` y `/posts/[slug]` usan la plantilla Post (`PostView`); el detalle de actividad suma datos, necesidades, sesiones, qué llevar, personas y el resultado. Newsletter usa el estilo de las secciones de Home.

### CMS

- **Page presentation** (menú: Overview → Home page; Expeditions/Workshops/Meaningful Messages → … page; Site → About page, Contact page): campos en el orden de cada prototipo con ayudas; vista previa en vivo = la plantilla pública en un marco con el borrador.
- Previews de expediciones, workshops, mensajes, noticias y resultados usan sus plantillas públicas.
- Settings: teléfono público nuevo; guardar General ya no pisa la presentación de páginas.
- Migración `20261017000200_activity_presentation.sql`: `workshops.note_title`, `workshops.outcome`, `expeditions.outcome`. **Aplicada solo en local.** Sin ella, la base real funciona igual (campos vacíos).

### Seed demo (solo local)

`npm run demo:local:seed` agrega (sin pisar nada; ids `de000000-…32xx/60xx/61xx/62xx/63xx/70xx`): páginas de programa de Expeditions y Workshops con las 5 cards del prototipo (la de donación **sin enlace**: el botón queda oculto), una expedición próxima con necesidades pendientes y obtenidas, una terminada con su resultado, un workshop en curso con 3 sesiones e inscripción abierta sin email, uno próximo completo, uno terminado con resultado, 3 mensajes, una noticia, dos anuncios (uno borrador) y textos de Page presentation (la card de Artsy Animals de Home queda sin imagen ni texto a propósito). `plan` / `clean` / `keep` cubren también cards, anuncios y ajustes (los ajustes se quitan solo si conservan el valor demo). Repetido: 0 creados.

### Verificación (2026-10-17, 3219 con Supabase local; 3218 con datos reales solo lectura)

| Comprobación | Resultado |
|---|---|
| TypeScript, `npm run lint`, `npm test` | Sin errores |
| `next build` (carpeta aparte, borrada luego) | OK, todas las rutas |
| Enlaces: rastreo desde Home y navbar en 3219 (49 páginas) y 3218 | 0 rotos, 0 `href="#"` o vacíos |
| Borradores | Obra, categoría, noticia y anuncio borrador: 404 o ausentes de Home |
| 1440 vs prototipo | Expeditions, Workshops, Messages, About, Contact, Home: misma composición (capturas) |
| 390 px | Sin desbordamiento horizontal en todas las páginas nuevas |
| Movimiento reducido | Expeditions apila cards; Messages apila mensajes; Home sin burbujas ni nieve |
| Teclado | Orden lógico en Contact, Workshops (riel enfocable) y Home; skip link |
| Admin | Home page: editar → preview → guardar → público → restaurar; ocultar sección → desaparece; editores de About, Contact, Messages, Expeditions y Workshops abren con preview |
| 3218 (base real sin migrar) | /expeditions, /workshops, /crew responden 200; /crew sin cambios |

Capturas: [verification/review-2026-10-17-site/](verification/review-2026-10-17-site/).

### Pendiente y a revisar

- **Revisar con Juani:** todas las páginas nuevas; el agua de Home (equivalente, no WebGL); textos por defecto del diseño en Home (banner, títulos de sección) que se pueden cambiar en Page presentation.
- Cargar en la base real: cards de Expeditions, presentación de About y Contact, email público y teléfono, textos de Home. Aplicar las migraciones `…0100` y `…0200` con aprobación.
- Criaturas SVG de Home; fidelidad completa de los bloques de Post; perfil de Crew con secciones explícitas.
- La preview por ruta (`/admin/posts/[id]/preview`) no recibe necesidades ni sesiones; la preview integrada sí.
- Datos de prueba locales antiguos (persona con enlaces a example.org) siguen en la base local.

## Checklist para Juani — web completa

1. Abrí `http://127.0.0.1:3219/` y bajá hasta el final; compará con `http://127.0.0.1:3220/Abismo%20Home%20v2.dc.html`.
2. Desde el navbar recorré Expeditions, Workshops, Art, Messages, About, The crew y Contact; compará cada una con su prototipo en `http://127.0.0.1:3220/`.
3. En Expeditions entrá a «Ningaloo crossing (demo)» y a «The first crossing (demo)» → «See how it went».
4. En `http://127.0.0.1:3219/admin` → **Overview → Home page**: cambiá un texto, mirá la vista previa, guardá y abrí Home. Ocultá una sección y volvé a mostrarla.
5. Probá **Site → About page** y **Site → Contact page** igual; en Contact cargá el email público en **Settings** y probá «Send message».
6. Abrí una expedición o un workshop en el admin y usá «Visual preview».
7. Decí qué páginas aprobás y si se puede preparar la carga en la base real.
