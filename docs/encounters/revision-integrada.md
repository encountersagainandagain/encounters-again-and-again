# Revisión integrada de Encounters — guía para Juani

Una sola ronda para revisar todo el sitio. Cada página tiene su prototipo, un ejemplo editable, qué mirar y una casilla de aprobación. **Las casillas las marca solo Juani**; las únicas marcadas son las aprobaciones anteriores que siguen vigentes.

Estado técnico de cada módulo: [page-progress.md](page-progress.md).

## Dónde se revisa

| Qué | Dirección | Notas |
|---|---|---|
| Sitio completo (producción local) | http://127.0.0.1:3221 | Build de producción contra Supabase local, con los ejemplos de revisión. Reconstruido el 2026-10-21 desde `dc25415` (correcciones de la revisión manual y Wild Wonders local); los commits posteriores son solo documentación. |
| Admin conectado a esos datos | http://127.0.0.1:3221/admin | Usuario y contraseña locales en `.encounters-work/local-cms.json` (no versionado). Todo lo que se edita es local. |
| Prototipos | http://127.0.0.1:3220/ | `docs/encounters/handoff-current`, servidos tal cual. |
| Crew y Wild Wonders con datos reales | http://127.0.0.1:3218/crew · http://127.0.0.1:3218/crew/wild-wonders | Solo lectura de la base real; nada se escribe. Desde el 2026-10-21 las seis fichas originales y Wild Wonders también están en local (3221), con editor. |
| Desarrollo (mismos datos que 3221) | http://127.0.0.1:3219 | Alternativa si 3221 no está levantado. |

Para volver a levantar: `npm run cms:local:prod` (producción, 3221), `npm run cms:local:dev` (3219) y el servidor de prototipos de `handoff-current` en 3220.

Desde el 2026-10-20 el sitio local se ve **como si el equipo ya usara el CMS**: tres ejemplos ficticios por tipo, escritos en inglés, con relaciones entre sí. Detalle en [Ejemplos de revisión](#ejemplos-de-revisión-2026-10-20) más abajo.

En el navegador, la herramienta de diseño de pantalla (`Cmd+Opt+I` → icono de teléfono) sirve para mirar 390 px (teléfono) y 1024 px (tablet).

## Correcciones de la revisión manual (2026-10-20)

Qué mirar de cada punto. Causa, medición y pendientes en [page-progress.md](page-progress.md). Videos en `.encounters-work/videos-2026-10-20/`.

| Punto | Dónde | Qué mirar |
|---|---|---|
| 1. Tirones en Home | http://127.0.0.1:3221/ | Descenso lento, rápido y hacia atrás, sobre todo del hero a «Ongoing projects». El fondo se desenfoca y oscurece igual que antes. |
| 2. Banner de About | http://127.0.0.1:3221/about (escritorio y teléfono) | Las cuatro fotos, cada una con el doble de recorrido. La cuarta queda hasta que sube el papel. |
| 3. Fotos de Crew | http://127.0.0.1:3221/crew → Georgia Webb → http://127.0.0.1:3221/crew/wild-wonders · real: http://127.0.0.1:3218/crew | Seis fichas originales con sus retratos, más Flaquito y los tres ficticios con sus dibujos. El retrato se cambia en Admin → People → (persona) → Portrait. |
| 4. Barras azules (falta comparar con tu captura) | Home («What already happened», «Who is on board», About), Art, Messages, workshops, obras y perfiles; Crew en teléfono | Ninguna barra dentro de las secciones mientras entran las animaciones. Los rieles siguen respondiendo al gesto, al teclado y a sus botones. |
| 5. Navegación | Desde el final de cualquier página, cada enlace del navbar, tarjetas y detalles; después Atrás y Adelante | La página nueva aparece en su encabezado, sin viaje. Atrás vuelve a la posición anterior sin animar. |

- [ ] Fluidez de Home en tu pantalla
- [ ] Ritmo del banner de About
- [ ] Fichas originales de Crew con sus fotos
- [ ] Sin barras dentro de las animaciones
- [ ] Cada página nueva aparece arriba

## Ejemplos de revisión (2026-10-20)

Todo es ficticio y local:
- **Personas:** «Demo Maker Marea», «Demo Maker Coral» y «Demo Maker Nerida». Nada se atribuye a personas u organizaciones reales.
- **Imágenes:** dibujos sintéticos con una marca pequeña «DEMO».
- **Contenido:** sin testimonios, resultados científicos ni cifras de impacto.
- **Marcas de ejemplo:**
  - en el admin, cada ejemplo lleva la etiqueta **Example**;
  - en el sitio, el pie dice «Local review copy · people, works and activities shown here are fictional examples».
- **Fechas:** relativas al día de la carga, para que lo próximo sea realmente futuro.

Edición: Admin (http://127.0.0.1:3221/admin) → el menú indicado → **Edit** sobre el ejemplo. ★ = creado o completado desde la interfaz del admin.

| Tipo | Ejemplo | Ver | Dónde se edita |
|---|---|---|---|
| Art · libro (2 autores) | The Tide Notebook — tapa, contratapa, descripción, extracto | [/art/books/the-tide-notebook](http://127.0.0.1:3221/art/books/the-tide-notebook) | Works · Categories (Books, diseño *feature*) |
| Art · serie | Hermit crabs, moving house — galería de 4 con pies | [/art/drawings/hermit-crabs-moving-house](http://127.0.0.1:3221/art/drawings/hermit-crabs-moving-house) | Works · Categories (Drawings) |
| Art · audio ★ | Listening Post 01 · The reef before sunrise (2 autores) | [/art/listening/listening-post-01](http://127.0.0.1:3221/art/listening/listening-post-01) | Works · Categories (Listening, diseño *audio*) |
| Expedición próxima ★ | Following the humpbacks north — 5 necesidades: conocimiento, equipo y colaboración; 3 pendientes y 2 conseguidas | [/expeditions/following-the-humpbacks-north](http://127.0.0.1:3221/expeditions/following-the-humpbacks-north) | Expeditions (necesidades al pie del formulario) |
| Expedición en curso | Reef notes from the outer edge — imágenes, galería, actualización | [/expeditions/reef-notes-from-the-outer-edge](http://127.0.0.1:3221/expeditions/reef-notes-from-the-outer-edge) | Expeditions → «Results of this activity» |
| Expedición terminada | Winter crossing to the islands — resumen y resultado | [/expeditions/winter-crossing-to-the-islands](http://127.0.0.1:3221/expeditions/winter-crossing-to-the-islands) | Expeditions |
| Workshop, 1 sesión ★ | Draw a sea star in ten lines — inscripción abierta, público, idioma, formato, incluye, qué llevar, cupo | [/workshops/draw-a-sea-star-in-ten-lines](http://127.0.0.1:3221/workshops/draw-a-sea-star-in-ten-lines) | Workshops |
| Workshop, 3 sesiones | The reef in three afternoons — próximo, inscripción completa | [/workshops/the-reef-in-three-afternoons](http://127.0.0.1:3221/workshops/the-reef-in-three-afternoons) | Workshops (estado e inscripción por separado) |
| Workshop terminado | Wild wonders on the wall — imágenes, materiales, resultado | [/workshops/wild-wonders-on-the-wall](http://127.0.0.1:3221/workshops/wild-wonders-on-the-wall) | Workshops |
| Mensaje · reflexión ★ | The tide comes back | [/meaningful-messages/the-tide-comes-back](http://127.0.0.1:3221/meaningful-messages/the-tide-comes-back) | Messages |
| Mensaje · poema | What the rock pool keeps | [/meaningful-messages/what-the-rock-pool-keeps](http://127.0.0.1:3221/meaningful-messages/what-the-rock-pool-keeps) | Messages |
| Mensaje · historia | The morning the turtle waited | [/meaningful-messages/the-morning-the-turtle-waited](http://127.0.0.1:3221/meaningful-messages/the-morning-the-turtle-waited) | Messages |
| Persona | Demo Maker Marea | [/crew/demo-maker-marea](http://127.0.0.1:3221/crew/demo-maker-marea) | People · su página personal en «Edit personal page» |
| Persona ★ (cita y capítulo) | Demo Maker Coral | [/crew/demo-maker-coral](http://127.0.0.1:3221/crew/demo-maker-coral) | People |
| Persona | Demo Maker Nerida | [/crew/demo-maker-nerida](http://127.0.0.1:3221/crew/demo-maker-nerida) | People |
| Resultado de expedición | Winter crossing: what the islands gave back | [/posts/winter-crossing-what-the-islands-gave-back](http://127.0.0.1:3221/posts/winter-crossing-what-the-islands-gave-back) | Expeditions → Results |
| Resultado de workshop | Wild wonders, pinned to the wall | [/posts/wild-wonders-pinned-to-the-wall](http://127.0.0.1:3221/posts/wild-wonders-pinned-to-the-wall) | Workshops → Results |
| Actualización ★ | Day six on the outer edge | [/posts/day-six-on-the-outer-edge](http://127.0.0.1:3221/posts/day-six-on-the-outer-edge) | News |
| Aviso | Book launch: The Tide Notebook → el libro | Home, «What is coming» | Announcements |
| Aviso ★ | The winter crossing, in drawings → la expedición terminada | Home | Announcements |
| Aviso | A new poem on Meaningful Messages → el poema | (ver nota) | Announcements |
| Newsletter ★ | 3 suscriptores `reader.*@example.com/.org/.net` (uno desde el formulario de Home) | Admin → Newsletter | — |

Páginas permanentes (sin duplicar):
- **Expeditions y Workshops:** título y nota de la lista, y cierre.
- **About:** textos del prototipo, sin inventar historia ni logros.
- **Contact:**
  - email `hello@encounters.example` (dominio reservado: el correo nunca llega a nadie);
  - donación «Support the project (example link)» hacia `donate.encounters.example`, que no existe;
  - **WhatsApp vacío a propósito**, para no inventar un número que podría ser real.
- **Newsletter:** título y texto.
- **Home:**
  - todas las secciones visibles, en el orden del diseño;
  - agenda de hasta 6;
  - destacados: la expedición en curso (agenda), el libro (arte) y el resultado de la expedición (lo que ya pasó).
- **Messages:** el crédito pasa a «Words and illustrations by the example makers», porque el del prototipo atribuía estos mensajes ficticios a personas reales.

Notas:
- **Agenda de Home:** muestra 4 actividades y los dos primeros avisos. El del poema queda fuera por el máximo de 6; aparece si se baja otro o termina una actividad. Un aviso que apunta a una actividad ya listada no se repite.
- **El libro aparece dos veces en Home:** como aviso de la presentación y en «New art». Son secciones distintas, no una entrada repetida.
- **Recurso faltante:** no hay audio ni video autorizado para un episodio ficticio. «Listening Post 01» no tiene reproductor y lo dice («The episode is still being edited…»); no se usó el film real para no atribuirlo a autores ficticios. Para probar el reproductor: en Works, elegí YouTube o Spotify y cargá un ID real autorizado.
- **Sin fotos reales en el contenido ficticio:** las fotos del handoff solo siguen en About, Crew y las cards de Expeditions, como en los prototipos.

### Qué quedó oculto (borrador, reversible)

`npm run demo:local:tidy` pasó a borrador:
- el primer set demo (obras, categorías, actividades y mensajes «(demo)», incluido «All post blocks (demo)»);
- los registros de prueba inequívocos: «Local Test …», «Local Admin Flow Test», «UI journey …», «Rock pool study 0346», «Tide pools 0346».

No se tocó nada renombrado o editado, por ejemplo la persona «Flaquito». `npm run demo:local:untidy` vuelve a publicar lo que siga en borrador. Para ver todos los bloques del Post, publicá «All post blocks (demo)» desde Admin → Results.

### Conservar o limpiar

- **Volver a cargar:** `npm run demo:local:seed`. No duplica nada: lo creado desde el admin con la misma dirección se adopta.
- **Ver qué se borraría:** `npm run demo:local:plan`. Lista lo que se borra, lo que se conserva y por qué.
- **Conservar un ejemplo como contenido propio:** `npm run demo:local:keep -- <id>`, y renombralo.
- **Limpiar:** `npm run demo:local:clean -- --confirm`.
  - Borra solo los ejemplos que siguen como se cargaron, según la huella guardada en `.encounters-work/demo-state.json`.
  - Un ejemplo editado a mano se conserva.
  - Una imagen que todavía usa otro contenido también se conserva; hoy, las dos fotos de About.
- Todo actúa solo sobre Supabase local (`127.0.0.1:54321`); el script se niega a otro destino.

## Páginas

### Home — http://127.0.0.1:3221/ · prototipo `Abismo Home v2.dc.html`
- **Ejemplo y edición:** Admin → Home page (orden y visibilidad de secciones, textos). La agenda, las historias, el arte y la tripulación salen del contenido publicado.
- **Qué mirar:** descenso con el agua (resolución adaptativa), criaturas, agenda pineada, carrusel de arte, cierre. Fluidez del scroll en tu pantalla.
- **Diferencias conocidas:** textos de diseño o de ejemplo. El agua usa resolución adaptativa (decisión pendiente tuya).
- [x] Conformidad visual (2026-10-18, sobre `5762076`)
- [ ] Fluidez y resolución adaptativa del agua
- [ ] Optimizaciones respecto del prototipo (shader del agua, desenfoque del fondo con dos copias fijas, desenfoque solo de las palabras del título): misma imagen en la comparación, falta tu confirmación visual
- [ ] Aprobación editorial

### The Crew — http://127.0.0.1:3218/crew (real) · prototipo `The Crew.dc.html`
- **Edición:** Admin → People y Admin → Crew page (secciones).
- **Qué mirar:** sin cambios visuales desde lo aprobado. Navbar en teléfono: cada enlace se toca cómodo, sin activar el vecino.
- [x] Aprobada (`cbea565`, 2026-10-13)
- [ ] Editor de secciones de la página Team (no cambia el aspecto)

### Perfil (Wild Wonders) — http://127.0.0.1:3221/crew/wild-wonders (local, editable) · real: http://127.0.0.1:3218/crew/wild-wonders · prototipo `Wild Wonders.dc.html`
- **Edición:** http://127.0.0.1:3221/admin/content?table=posts&edit=17de9058-f9f1-5e5f-a434-e715df63667c (página, con «Visual preview» y «Full preview») · ficha de Georgia: http://127.0.0.1:3221/admin/content?table=crew_members&edit=c73cf5fc-1c68-59a6-a8d8-d32cf72fddd1. Recuperada del snapshot; las ediciones son solo locales.
- **Ejemplo local:** http://127.0.0.1:3221/crew/demo-maker-nerida (libro, episodio, workshops y mensajes acreditados).
- **Qué mirar:** igual que lo aprobado; navbar en teléfono.
- [x] Wild Wonders aprobado (2026-10-14)
- [ ] Editor de secciones del perfil

### Expeditions — http://127.0.0.1:3221/expeditions · prototipo `Expeditions.dc.html`
- **Ejemplos:** próxima, en curso y terminada (ver la tabla de ejemplos).
- **Edición:** Admin → Expeditions; cards del banner en Admin → Presentation cards (preview en vivo de la card).
- **Qué mirar:** disolución en franjas del banner, cards encadenadas, navbar que pasa a claro; lista con próximas y terminadas.
- **Diferencias:** la lista de expediciones no está en el prototipo; botón de donación oculto si no hay enlace.
- [ ] Aprobación visual

### Workshops — http://127.0.0.1:3221/workshops · prototipo `Workshops.dc.html`
- **Ejemplos:** una sesión con inscripción abierta, tres sesiones con inscripción completa y uno terminado con resultado (ver la tabla).
- **Edición:** Admin → Workshops (estado de la actividad e inscripción por separado; sesiones).
- **Qué mirar:** hero que se hunde, un pin por workshop con riel de sesiones (también con AvPág), tarjeta terminada con «See the result».
- **Diferencias:** imágenes sintéticas, enlace al detalle agregado.
- [ ] Aprobación visual

### Art — http://127.0.0.1:3221/art · prototipo `Art.dc.html`
- **Ejemplos:**
  - tres categorías: Books (*feature*), Drawings (*gallery*) y Listening (*audio*);
  - obra con dos autores: http://127.0.0.1:3221/art/books/the-tide-notebook;
  - el carrusel con contador y las obras apiladas se ven con más categorías u obras: publicá las del primer set desde Categories y Works.
- **Edición:** Admin → Categories (diseño gallery, feature, video o audio) y Admin → Works (categoría, autores, tamaño).
- **Qué mirar:** firma que se dibuja, tiles y chips que filtran y bajan a la sección, galería, video al click, cierre «More to come».
- **Diferencias:** pie `[ título ]` bajo cada obra (abre su página); flechas del carrusel solo donde hay más.
- [ ] Aprobación visual

### Meaningful Messages — http://127.0.0.1:3221/meaningful-messages · prototipo `Meaningful Messages.dc.html`
- **Ejemplos:** reflexión breve, poema e historia larga, con créditos (ver la tabla).
- **Edición:** Admin → Messages (frase, texto, ilustración, crédito, orden) y Admin → Messages page (banner, introducción, crédito, cierre).
- **Qué mirar:** banner pineado, introducción con garabato, mensajes que se cruzan (sube, crece y se enfoca; el que sale se desenfoca), en teléfono cada bloque entra solo.
- **Diferencias:** «Read the message →» agregado; en teléfono el texto queda dentro del margen (el prototipo lo corta).
- [ ] Aprobación visual

### Post (noticias y resultados) — http://127.0.0.1:3221/posts/winter-crossing-what-the-islands-gave-back · prototipo `Post.dc.html`
- **Ejemplos:** los dos resultados y la actualización de la tabla. Usan texto, imagen, galería, cita, lista y enlace. Para ver todos los bloques, publicá «All post blocks (demo)» (Admin → Results).
- **Edición:** cualquier contenido → Content blocks (agregar, subir/bajar, duplicar, quitar) con Visual preview y Full preview.
- **Qué mirar:** imagen grande con parallax, índice, carrusel, YouTube al click, costos, FAQs y acordeón.
- **Diferencias:** sin bloques de tour, alojamiento ni afiliados (fuera de alcance); sin etiquetas al margen (eran ayudas del prototipo).
- [ ] Aprobación visual

### About — http://127.0.0.1:3221/about · prototipo `About.dc.html`
- **Edición:** Admin → About page.
- **Qué mirar:** foto que se encoge en banda con las tres columnas, fotos que cambian, manifiesto, filas con lista y foto, «We believe…», contacto.
- **Para decidir:** en una columna (teléfono y tablet angosta) la segunda fila muestra la foto antes del texto y la primera no, como el prototipo ejecutable; su CSS dice «la foto siempre arriba». ¿Lo dejamos así o foto arriba en las dos?
- **Pendiente editorial:** la presentación real (hoy en la base real se ve el texto importado).
- [ ] Aprobación visual

### Contact — http://127.0.0.1:3221/contact · prototipo `Contact.dc.html`
- **Edición:** Admin → Settings (email, WhatsApp, página de donación y su texto, redes) y Admin → Contact page (motivos, textos).
- **Qué mirar:** imagen que se hunde, panel que monta, motivos.
  - El email local es `hello@encounters.example`, de un dominio reservado. Para ver el estado sin email, borralo en Settings y volvé a cargarlo.
  - «Open my email app» abre tu correo con el mensaje armado y la página dice que falta enviarlo.
- **Diferencias:** botón y estado posterior distintos al prototipo, porque el sitio no envía mensajes.
- [ ] Aprobación visual

### Newsletter — sección de Home (sin prototipo)
- **Qué mirar:** mensajes de cada caso: email inválido, falta el consentimiento, alta.
  - El alta dice que no se manda confirmación.
  - El admin (Admin → Newsletter) muestra que el envío está apagado.
- **Pendiente para más adelante:** borradores, prueba de envío y dominio verificado (lista en page-progress).
- [ ] Aprobación visual y de textos

## Recorridos de relaciones (10 minutos)

1. **Obra ↔ autores:**
   - abrí http://127.0.0.1:3221/art/books/the-tide-notebook y seguí a Nerida y a Marea hasta su perfil;
   - en cada perfil, volvé a la obra.
2. **Expedición ↔ resultado:**
   - en http://127.0.0.1:3221/expeditions/winter-crossing-to-the-islands, «See the result»;
   - en el resultado, «Keep reading · The expedition: …» vuelve.
3. **Expedición en curso ↔ actualización:** en http://127.0.0.1:3221/expeditions/reef-notes-from-the-outer-edge, «Read the latest update» lleva a la actualización, y ella vuelve a la expedición.
4. **Workshop ↔ resultado ↔ facilitadores:**
   - http://127.0.0.1:3221/workshops/wild-wonders-on-the-wall → «See the result» → vuelta al workshop;
   - «With» lleva al perfil de Nerida.
5. **Avisos de Home:**
   - «Book launch» abre el libro y «The winter crossing, in drawings» abre la expedición terminada;
   - en Admin → Announcements, cambiá el orden del aviso del poema a 0 y mirá que entra en la agenda; después volvé a 3.
6. **Privacidad:**
   - pasá cualquier ejemplo a Draft y comprobá que su página da 404 y que desaparece de listas, perfiles y Home;
   - volvé a publicarlo. Una vez editado, la limpieza lo conserva.
7. **Ida y vuelta:** recorré el navbar de punta a punta y volvé con el botón Atrás. Cada página arranca arriba con su título y sus animaciones.

## Diferencias conocidas y pendientes editoriales (resumen)

- Ejemplos ficticios marcados con «Example» en el admin y con el aviso del pie; imágenes sintéticas.
- Falta un audio o video autorizado para el episodio de Listening.
- Falta un retrato original de Georgia Webb con más resolución: el actual mide 236×315 y se conserva mientras tanto (Admin → People → Georgia Webb → Portrait).
- Datos reales por cargar: cards de Expeditions, workshops y expediciones reales, obras, presentación de About, email, WhatsApp y donación en Settings, textos de Messages.
- Pendiente en la base real, con aprobación: las migraciones `20261017000100` y `20261017000200`, y la conversión del perfil real a secciones.
- Funciones agregadas que el prototipo no dibuja: enlaces a detalles y resultados, créditos, pie de las obras, «Read the message».

## Aprobación por página

| Página | Estado |
|---|---|
| Home | Conformidad visual ✔ · fluidez y agua ☐ · editorial ☐ |
| The Crew | ✔ (`cbea565`) · editor de secciones ☐ |
| Wild Wonders | ✔ (2026-10-14) · editor de secciones ☐ |
| Expeditions y detalle | ☐ |
| Workshops y detalle | ☐ |
| Art, categorías y obras | ☐ |
| Meaningful Messages y detalle | ☐ |
| Post (noticias y resultados) | ☐ |
| About | ☐ |
| Contact | ☐ |
| Newsletter | ☐ |
