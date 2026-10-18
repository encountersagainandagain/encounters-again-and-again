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

| # | Ruta | Prototipo | Estado visual | CMS y datos | Comprobaciones | Diferencias pendientes | Aprobación de Juani |
|---|---|---|---|---|---|---|---|
| 1 | `/crew` | `The Crew.dc.html` | Fiel al prototipo; sin cambios visuales en la auditoría del 2026-10-17 | **Secciones explícitas** desde 2026-10-17 (ver abajo); migración `20261017000100` aplicada **solo en local** | Comparación 1440 / 1024 / 390; edición → preview integrado y por ruta → página pública; 3218 sin cambios | Ver sección «/crew» | **Aprobada visualmente** (2026-10-13, `cbea565`). Las secciones editables nuevas esperan su revisión. |
| 2 | `/crew/[slug]` | `Wild Wonders.dc.html` | Fiel en Wild Wonders | Plantilla genérica `ProfileStory` (**deduce el layout por tipos y cantidades de bloques**: pendiente pasar a secciones explícitas en su turno) | 2026-10-13 | Pies de imagen, negrita del bloque, galería por reglas | Wild Wonders **aprobado** (2026-10-14); segundo perfil aceptado como base inicial |
| 3 | `/art`, `/art/[category]`, `/art/[category]/[slug]` | `Art.dc.html` (categoría y obra sin prototipo propio; extienden Art y Post) | Implementado; fila de categorías corregida 2026-10-16 | Categorías, obras, autores, relaciones; ejemplos locales | 2026-10-14/16 (ver `art-module.md`) | Cuerpo de la obra sin la fidelidad completa de `Post.dc.html`; caché de imágenes | Pendiente |
| 4 | `/expeditions`, detalle y resultados | `Expeditions.dc.html` (detalle sin prototipo dedicado) | No implementado | Esquema existente (expeditions, needs, cards, informes) | — | — | Pendiente |
| 5 | `/workshops`, detalle, etapas y resultados | `Workshops.dc.html` (detalle sin prototipo dedicado) | No implementado | Esquema existente (workshops, sessions, informes) | — | — | Pendiente |
| 6 | `/meaningful-messages` y detalle | `Meaningful Messages.dc.html` (detalle sin prototipo dedicado) | No implementado | Esquema existente (messages) | — | — | Pendiente |
| 7 | `/about`, `/contact` | `About.dc.html`, `Contact.dc.html` | No implementado | Por mapear | — | — | Pendiente |
| 8 | Newsletter | En Home v2 / Contact según prototipos | No implementado (envíos desactivados) | Base heredada | — | — | Pendiente |
| 9 | `/` (Home v2) | `Abismo Home v2.dc.html` | No implementado | Destacados, avisos, listas automáticas | — | — | Pendiente |

Rutas de apoyo sin prototipo propio: `/posts/[slug]` (`Post.dc.html`), `/upcoming` (opcional). El admin no tiene prototipo; su organización y su validación manual siguen pendientes.

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
