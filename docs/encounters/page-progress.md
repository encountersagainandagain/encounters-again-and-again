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

## Estado al 2026-10-18

Categorías: **Implementado** (el código existe) · **Verificado** (comprobado en local con capturas o recorridos) · **Pendiente de contenido** (falta cargar datos reales; lo que se ve son textos del diseño o ejemplos locales) · **Pendiente de aprobación visual** (solo Juani aprueba) · **Pendiente en la base remota** (migración o datos por aplicar con aprobación).

| # | Ruta | Prototipo | Implementado | Verificado | Pendiente de contenido | Aprobación visual | Pendiente en remoto |
|---|---|---|---|---|---|---|---|
| 1 | `/crew` | `The Crew.dc.html` | Sí; secciones explícitas | 2026-10-17; 3218 sin cambios (8762 px) el 2026-10-18 | — | **Aprobada** la versión `cbea565` (2026-10-13). Las secciones editables (`ed1322d`) no cambian el aspecto y esperan revisión del editor | `20261017000100` |
| 2 | `/crew/[slug]` | `Wild Wonders.dc.html` | Sí; **secciones explícitas** desde 2026-10-18 (`e673a7a`) | Equivalencia con la lectura aprobada sobre los bloques de Wild Wonders del snapshot + 5 casos (`npm test`); 3218 idéntico (7654 px, mismo HTML); perfiles locales convertidos con el mismo HTML | — | Wild Wonders **aprobado** (2026-10-14, con la plantilla anterior a las secciones explícitas). El editor de secciones del perfil es nuevo: **revisar el editor**, no el aspecto | Convertir el perfil real (abrir y guardar en el admin, o script) |
| 3 | `/art`, categoría, obra | `Art.dc.html` (+ `Post.dc.html`) | Sí; el cuerpo de la obra usa ahora los bloques de Post | 2026-10-16; obra con bloques 2026-10-18 | Obras reales | Pendiente (cambió el cuerpo de la obra: revisar esa parte) | — |
| 4 | `/expeditions` | `Expeditions.dc.html` | Sí; módulo completo (`175a101`) | 2026-10-18: prototipo 1440/390 y recorrido del admin (ver abajo) | Cards reales del programa | Pendiente (revisión visual de Juani) | `20261017000200` (opcional para la página) |
| 4b | `/expeditions/[slug]` | Plantilla Post | Sí | 2026-10-18 (recorrido del admin) | Expediciones reales | Pendiente (revisión visual de Juani) | `20261017000200` (`outcome`) |
| 5 | `/workshops` | `Workshops.dc.html` | Sí; módulo completo (2026-10-18) | 2026-10-18: prototipo 1440/1024/390, teclado, movimiento reducido y recorrido del admin (ver abajo) | Workshops reales | Pendiente (revisión visual de Juani) | `20261017000200` (`note_title`, `outcome`) |
| 5b | `/workshops/[slug]` | Plantilla Post | Sí; inscripción independiente y campos opcionales (2026-10-18) | 2026-10-18 (recorrido del admin) | Ídem | Pendiente (revisión visual de Juani) | Ídem |
| 6 | `/meaningful-messages` | `Meaningful Messages.dc.html` | Sí | 2026-10-17 | Intro y crédito reales (Page presentation) | Pendiente | — |
| 6b | `/meaningful-messages/[slug]` | Plantilla Post | Sí | 2026-10-17 | — | Pendiente | — |
| 7 | `/posts/[slug]` | `Post.dc.html` | Sí; **todos los bloques del alcance** desde 2026-10-18 | Comparación con el prototipo (post demo con todos los bloques) | Noticias y resultados reales | Pendiente | — |
| 8 | `/about` | `About.dc.html` | Sí | 2026-10-17 | Presentación completa (hoy: texto importado en remoto) | Pendiente | — (vive en `site_settings`) |
| 9 | `/contact` | `Contact.dc.html` | Sí | 2026-10-17 | Temas, email y teléfono públicos | Pendiente | — |
| 10 | Newsletter | Sin prototipo | Sí (envíos bloqueados) | 2026-10-17 | Texto | Pendiente | — |
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

**Siguiente:** Meaningful Messages, después Art y Post, About/Contact/Newsletter y la revisión integrada.

Capturas: [verification/review-2026-10-18-workshops/](verification/review-2026-10-18-workshops/).

### Migraciones pendientes en la base remota (en orden; no aplicadas)

Las 14 primeras (hasta `20261006000100_art_crew_publication.sql`) ya están en la base real. Faltan, solo probadas en local:

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
