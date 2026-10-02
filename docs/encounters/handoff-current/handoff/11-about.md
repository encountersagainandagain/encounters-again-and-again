# 11 · About us — /about

Prototipo: **About.dc.html**

## Qué cuenta

La misión, en pocas palabras y con fotos que van cambiando mientras se lee.

## Secciones, en orden

1. **Banner** — kicker "What is our mission?" + título en mayúsculas ("TO CONNECT PEOPLE WITH NATURE."), sobre foto a pantalla completa.
2. **Manifiesto con fotos** — columna de texto que sube mientras el marco de fotos cambia de imagen (4 fotos).
3. **Qué hacemos** — cuatro líneas de acción (expediciones, arte, workshops, mensajes) cada una con su link a la sección.
4. **Cierre** — frase + garabato + footer.

## Datos

Tabla `about_page` (una sola fila):

| Campo | Tipo |
|---|---|
| hero_kicker, hero_title | text |
| hero_media_id | → media |
| manifesto | jsonb: array de párrafos |
| gallery | jsonb: array de media_id (3–6; el front reparte el recorrido entre ellas) |
| actions | jsonb: array de { label, body, href } |
| closing_line | text |

## Animaciones

- Banner: coreografía estándar (02 § 2). El título va **en mayúsculas con tracking 0.02em**, igual que el resto de los banners del sitio.
- Manifiesto: texto con `data-seq` escalonado; fotos con crossfade por índice de progreso (02 § 5).
- Nav: inversión a modo claro al salir del banner (02 § 3).
