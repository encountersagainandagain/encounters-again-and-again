# 18 · Post — /posts/[slug]

Prototipo: **Post.dc.html** (ejemplo cargado: "The first crossing", una expedición terminada)

## Qué cuenta

Formato libre para lo que se va creando: resultado de una expedición, resultado de un workshop, página de un integrante, o una novedad.

## Estructura

1. **Banner** — kicker italic, título, línea de meta ("Coqui · 11 days | March 2026"), sobre la imagen de portada. Cue "Scroll".
2. **Bloques** — en el orden que el editor definió. Ver 04-editor-de-bloques.md.
3. **Pie** — copyright + link a /contact.

## Datos

`posts` + `post_blocks`. El banner sale de `posts`: `kicker`, `title`, `meta_line`, `cover_id`.

`show_index` controla el bloque "In this post", que se arma automáticamente con los `heading` que tengan `anchor`.

## Animaciones

02-animations.md § 11 y § 2 (banner). Lo característico:

- **Imagen grande a 95vw × 95vh** con aire a los lados y parallax interno del 8%: es el bloque que define el tono de la página.
- Carrusel con snap al centro + flechas + contador.
- YouTube que carga el iframe recién al click.
- Acordeones con "+" que rota 45°.

## Nota para el panel

En el prototipo cada bloque tiene una **etiqueta al margen** con su nombre (image, quote, carousel…). Es una ayuda de revisión de diseño: **no va a producción**, o va sólo en el modo previsualización del panel.
