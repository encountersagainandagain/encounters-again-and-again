# Seguimiento por páginas

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
  - guía con las secciones y cuántos bloques tiene cada una;
  - en cada bloque, «Place on the page» con su explicación, y «Text style» en los párrafos del relato y del proyecto;
  - los bloques nuevos entran en Story;
  - la card *Cover* explica que la imagen se elige en Settings y que el título es fijo;
  - se ocultan créditos y relacionados, que esta página no usa.
- En las fichas de Crew: *Highlighted line* y *Favourite animal* con ayudas. El vínculo interno con la página personal ya no aparece como campo.

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
2. Cambiá el título de apertura (bloque «Opening title») y un párrafo del relato; probá su «Text style». Mirá «Visual preview».
3. Guardá y abrí `http://127.0.0.1:3219/crew`: los cambios tienen que verse en su lugar.
4. En **Crew → People**, editá una persona: «Highlighted line» y «Favourite animal». Guardá y mirá su tarjeta.
5. Compará `http://127.0.0.1:3219/crew` con el prototipo `http://127.0.0.1:3220/The%20Crew.dc.html`.
6. Decí si aprobás las secciones editables y si se puede preparar la aplicación de la migración en la base real.

## Entrega «web completa» (2026-10-17)

### Decisiones de presentación (explícitas, sin deducir por textos)

- **Expeditions:** las cards del banner son las `expedition_cards` de la página del programa (rol `encounters_expeditions`). El lado de la imagen es el elegido o alterna; el tema oscuro es el elegido. Ventanas del encadenado repartidas entre 0,42 y 1,0 para cualquier cantidad; alto del pin 220vh + 110vh × cards. **Sin cards** (base real hoy) se muestra el texto importado de la página debajo del banner. Lista: próximas y en curso primero (llevan a su página), terminadas después (llevan a su resultado o a su página).
- **Workshops:** cada workshop publicado es un pin; los terminados o sin sesiones muestran «How it went» (campo nuevo `outcome`) y «See the result» si tienen resultado. El título de la nota es el campo nuevo `note_title`. Inscripción: botón solo si el estado es *open* y hay email de inscripción; si no, el detalle lleva a /contact.
- **Meaningful Messages:** orden por *Order*; lados alternados por posición; ventanas con el ritmo del prototipo para cualquier cantidad.
- **About y Contact:** su presentación vive en *Page presentation*. Mientras no se complete (título de About, temas de Contact) se muestra el texto importado. Email, teléfono y redes salen de Settings y **solo se muestran si existen**; no se inventa ninguno.
- **Contact:** el sitio no envía nada. «Send message» abre la app de correo del visitante dirigida al email público, con los campos escritos; sin email el botón queda desactivado y lo explica.
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
