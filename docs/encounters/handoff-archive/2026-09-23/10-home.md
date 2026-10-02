# 10 · Home — /

Prototipo: **Abismo Home.dc.html** (es la verdad visual; este archivo la describe)

## Qué cuenta

Dos movimientos. Primero **el descenso**: el visitante se sumerge desde la superficie hasta el arrecife y recién ahí aparece el contenido. Después **el presente del proyecto**: qué hacemos, qué viene, qué ya pasó, qué se hizo, quiénes somos.

Fondo oscuro (Abismo) de punta a punta. Una sola sección con imagen a pantalla completa (el arrecife) y un pin largo (la agenda).

## Secciones, en orden

1. **Banner / superficie** (200vh, sticky de 100vh) — ilustración fija de fondo + **canvas WebGL de agua** (olas, espuma, cáusticas y rayos de sol). Contenido: kicker "Welcome to", título "ENCOUNTERS", italic "again and again", logo, tagline "A space for our connection to nature", bajada "A space to feel and create with nature" y cue italic *"follow the current …where will it lead you.."* con filete vertical.
2. **Profundímetro** — no es una sección: es una capa centrada dentro del banner que aparece cuando el hero ya se fue. Número grande + etiqueta "Descending".
3. **El descenso** (`#descenso`) — grilla de 6 columnas, texto alineado a la derecha en las columnas 3–6: titular Garamond con degradado a Laguna + párrafo. Sin imágenes.
4. **Arrecife** (100vh) — foto del arrecife a sangre abajo con máscara de degradado arriba, y al pie: *"This is what we came for."* + "Heron Island · Great Barrier Reef".
5. **Ongoing projects** (`#projects`) — titular + garabato y **tres tarjetas apiladas en sticky** (Encounters Expeditions, Artsy Animals, Meaningful Messages). Cada una es una foto a sangre con kicker de estado y una bajada; linkean a su página.
6. **What is coming** (`#next`) — pin de 380vh: la agenda. Cuatro eventos, cada uno sobre su propia foto a pantalla completa, con riel de progreso de 4 tramos abajo. Encabezado fijo "What is coming / dates we already know".
7. **What already happened** — tres posts en grilla de 3, con categoría + fecha monospace.
8. **New art** — carrusel horizontal con snap (5 piezas), flechas y contador "01 / 05", link "Everything we make →".
9. **Who is on board** — tira de 6 retratos con nombre; sólo linkean los que tienen página.
10. **About** — bloque centrado: kicker, frase Garamond italic, párrafo y botón "Read our story".
11. **Cierre** — "May the ocean be with you" + garabato + footer (copyright y "Write to us").

## Datos

| Bloque | Fuente | Notas |
|---|---|---|
| Fondo, logo, garabatos | assets fijos | no editables |
| Título / bajada / tagline del banner | `site_settings` | `hero_title`, `hero_subtitle`, `hero_tagline`, `hero_cue` |
| Arrecife (foto y pie) | `site_settings.reef_media_id`, `reef_caption`, `reef_place` | |
| Ongoing projects (3) | **fijas en código** (son secciones del sitio) | editable: `media_id`, `status_label` ("Sail boat \| In refit") y bajada de 1–2 oraciones |
| What is coming (4) | `expeditions` + `workshops` con `lifecycle = 'upcoming'` | ver abajo |
| What already happened (3) | `posts` publicados, orden `published_at desc`, `kind` ≠ `crew_member` | |
| New art (5) | `artworks` publicadas, orden `sort` | etiqueta = nombre de su `art_category` |
| Who is on board (6) | `crew_members` publicados, orden `sort` | `has_page = false` → no linkea |
| Frase de cierre | `site_settings.closing_line` | |

**La agenda son dos tablas en una lista.** Se unen expediciones y workshops `upcoming`, se ordenan por `starts_on` y se toman los **primeros 4** (exactamente 4: el riel tiene 4 tramos y las ventanas de scroll están calculadas para eso; con menos de 4 se reparten las ventanas en partes iguales). Cada panel necesita: número (01–04, por posición), tipo ("Expedition" / "Workshop"), chip de estado (`availability_label`: "Two spots left", "Free · drop in", "Crew by invitation"…), fecha en texto (`date_label`: "October 2026", "September 27"), título en dos líneas, lugar + línea de detalle (`meta_line`), foto (`cover_id`) y CTA con texto propio (`cta_label`) hacia su página.

Campos a agregar respecto de 03-data-model.md: `availability_label`, `date_label`, `cta_label` y `home_rank` (int, opcional: fuerza el orden en la home) en `expeditions` y `workshops`.

## Animaciones

Ver **02-animations.md § 4** — está todo con valores exactos. Obligatorio: agua del banner (canvas o su degradado equivalente), desenfoque progresivo del fondo, velo de profundidad, burbujas, profundímetro, morfeo del logo del navbar y el pin de la agenda.

## Parámetros del agua (constantes en el front)

El prototipo los expone como tweaks; en Next van como constantes del componente, con estos valores:

    palette: "Azul Encounters"   // shallow [0.17,0.52,0.66] · deep [0.015,0.09,0.19]
    waves: 1 · caustics: 0.85 · godRays: 0.75 · sunPosition: 0.66
    diveDistance: 1              // el descenso dura 1 viewport de scroll
    bubbles: true

## Notas

- El profundímetro es un elemento de marca, no un dato real: no se conecta a nada.
- Las tarjetas de "Ongoing projects" son tres, no cuatro: **Art** ya no es tarjeta, tiene su propio carrusel más abajo.
- En móvil (<760px) el pin de la agenda baja a 340vh y el panel se ancla abajo en vez de centrarse; el riel pasa a 4 columnas apretadas con etiquetas de 8px.
- El carrusel de New art calcula el índice por **cercanía al centro**, no dividiendo scrollLeft por el ancho del slide (los slides tienen snap centrado y el riel tiene padding lateral). En los extremos se fuerza el primero y el último.
- Si WebGL no está disponible, el canvas no se monta y la página sigue funcionando: queda la ilustración de fondo con su desenfoque. No hay que bloquear nada por eso.
