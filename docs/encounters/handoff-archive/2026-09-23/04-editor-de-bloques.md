# 04 · Editor de bloques

Los posts (expediciones terminadas, workshops terminados, páginas de integrantes y novedades) se arman apilando bloques. El panel muestra esta lista; el front renderiza cada tipo con la estética definida.

Referencia visual: **Post.dc.html** — tiene los 17 bloques uno debajo del otro, cada uno rotulado al margen.

## Reglas generales

- El orden lo define `sort`. No hay bloques anidados.
- Todo bloque de texto entra con `data-seq="0.94,0.4"` (ver 02-animations.md).
- Ancho por tipo: **680px** lectura, **760px** listas y datos, **900px** citas y acordeones, **1240px** video, **95vw** imagen grande.
- Los bloques traen su propio espacio superior (`clamp(60px, 14vh, 150px)`); no se agregan separadores manuales.

## Los 17 bloques

### 1. image
La imagen a 95vw × 95vh con aire a los lados, parallax interno y caption numerado.

    { "media_id": uuid, "caption": string?, "number": string? }

### 2. two_images
Dos imágenes al 50% con caption propio, 74vh de alto. En móvil se apilan a 46vh.

    { "left": { "media_id": uuid, "caption": string? },
      "right": { "media_id": uuid, "caption": string? } }

### 3. carousel
Carrusel horizontal con snap al centro, flechas y contador. 2–8 slides.

    { "slides": [ { "media_id": uuid, "caption": string? } ] }

### 4. youtube
Miniatura + play; el iframe se carga al click.

    { "video_id": string, "caption": string? }

### 5. heading
Antetítulo (número + etiqueta) y titular grande. Genera entrada en el índice si tiene `anchor`.

    { "kicker": string?, "number": string?, "title": string }

### 6. paragraph
Uno o dos párrafos: el primero puede ir destacado en Garamond.

    { "lead": string?, "body": string }

### 7. title_list
Título + lista numerada de ítems con filete superior.

    { "title": string, "items": [string] }

### 8. quote
Cita centrada en Garamond italic + atribución.

    { "quote": string, "attribution": string? }

### 9. quick_facts
Hasta 4 datos en grilla con filetes de 1px. Etiqueta arriba, valor grande en Garamond.

    { "facts": [ { "label": string, "value": string } ] }

### 10. cost_breakdown
Filas de concepto / detalle / monto, con total remarcado y nota italic al pie.

    { "title": string,
      "rows": [ { "label": string, "note": string?, "amount": string } ],
      "total_label": string, "total_amount": string, "note": string? }

### 11. faqs
Preguntas plegables con filetes; la primera abierta por default.

    { "title": string?, "items": [ { "q": string, "a": string } ] }

### 12. accordion
Igual mecánica que faqs pero en fichas con borde y etiqueta en mayúsculas (para info técnica).

    { "items": [ { "label": string, "body": string } ] }

### 13. tour_dive_center
Ficha de un tour o centro de buceo: imagen, nombre, descripción, tags y botón.

    { "media_id": uuid, "kicker": string?, "name": string, "body": string,
      "tags": [string], "cta_label": string, "cta_url": string }

### 14. affiliate_link
Recomendación de equipo con aviso de afiliación visible (obligatorio por transparencia).

    { "kicker": string?, "title": string, "body": string,
      "cta_label": string, "cta_url": string }

### 15. simple_link
Un link suelto en Garamond con subrayado fino.

    { "label": string, "url": string }

### 16. divider
Filete con rombo al centro. Sin datos.

    {}

### 17. post_index
Índice "In this post": se arma automáticamente con los bloques `heading` que tengan `anchor`.

    { "title": string? }

## Bloques por tipo de post (sugerencia para el panel)

| kind | Bloques típicos |
|---|---|
| expedition_report | image, post_index, heading, paragraph, quick_facts, two_images, title_list, quote, carousel, youtube, cost_breakdown, tour_dive_center, affiliate_link, faqs |
| workshop_report | image, heading, paragraph, carousel, quote, quick_facts, two_images, simple_link |
| crew_member | image, heading, paragraph, two_images, quote, carousel, simple_link |
| news | cualquiera |
