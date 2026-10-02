# 13 · Página de integrante — /crew/[slug]

Prototipo: **Wild Wonders.dc.html** (la página de Georgia)

## Qué cuenta

La historia de una persona del crew y su trabajo. Misma estética que el sitio, contenido libre.

## Estructura

Es un **post de tipo `crew_member`** (03-data-model.md): banner + bloques.

1. **Banner** — foto de la persona, kicker (su rol o el nombre de su proyecto, ej. "wild wonders"), título.
2. **Bloques** — los del editor (04-editor-de-bloques.md). En la página de Georgia: paragraph, two_images, quote, carousel de obras, simple_link.
3. **Cierre** — frase fija + garabato + footer.

## Datos

    crew_members.has_page = true
    crew_members.page_post_id → posts (kind = 'crew_member')

El panel ofrece "crear página" desde la ficha del integrante: crea el post con el banner precargado (usa `portrait_id` como cover si no se sube otra) y abre el editor de bloques.

Si `has_page = false` la ruta `/crew/[slug]` devuelve 404 y el retrato no linkea.

## Animaciones

Las de post (02 § 11) más el banner estándar (02 § 2). Los mensajes fijos que definimos en la página de Georgia (frase de cierre, garabato) son del **layout**, no del contenido: aparecen en toda página de integrante.
