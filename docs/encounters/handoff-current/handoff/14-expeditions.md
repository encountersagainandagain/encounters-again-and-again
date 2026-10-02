# 14 · Expeditions — /expeditions

Prototipo: **Expeditions.dc.html**

## Qué cuenta

Qué son las expediciones: el velero, el propósito, el trabajo, el equipamiento y cómo ayudar. Todo dentro de un banner que **no avanza**: la superficie se disuelve en el fondo del mar y sobre esa imagen van entrando las cards.

## Estructura

1. **Banner pineado (660vh de recorrido, 100vh visible)**
   - Imagen de superficie (la tripulación) → se disuelve en la imagen submarina en 6 franjas intercaladas.
   - Kicker "following our nature" + título "EXPEDITIONS" → se van durante la primera pasada.
   - Después, **5 cards** encadenadas sobre la imagen submarina: cada una entra cuando la anterior empieza a salir. Ancho 2/3 (`min(66vw, 1120px)`), alto 76%.
2. **Cierre** — "May the ocean be with you" + garabato + footer.

## Datos

- Banner: `expeditions.cover_id` (superficie) + `expeditions.underwater_id` (submarina), `kicker`, `title`.
- Cards: `expedition_cards` ordenadas por `sort` (3 a 6). El front alterna el lado de la imagen automáticamente si `media_side` está vacío, y usa `theme = 'dark'` para la card de cierre con CTA (el fundraiser).
- **Alto del pin calculado**: `220vh + 110vh × cantidad de cards`. Con 5 cards da 770vh; el prototipo usa 660vh para 5 cards porque las ventanas están comprimidas — la fórmula es la que debe implementarse para que funcione con cualquier cantidad, repartiendo las ventanas de `data-card` en partes iguales entre 0.42 y 1.0.

### Expediciones como listado

Esta página es la **explicación** del programa. Las expediciones concretas (upcoming / running / finished) se listan al pie o en una sección propia:

- `lifecycle = 'upcoming' | 'running'` → tarjeta con fecha, lugar y CTA de contacto.
- `lifecycle = 'finished'` → tarjeta con link a `report_post_id` ("See how it went →"). El resultado se cuenta en un post de bloques, no acá.

## Animaciones

02-animations.md § 9, completo. Lo que no se puede perder:

1. Las 6 franjas en **dos pasadas intercaladas** (0-2-4, después 1-3-5) con dirección alternada arriba/abajo.
2. Que el banner **no se suelte** mientras entran las cards.
3. El encadenado de las cards (la siguiente entra mientras la anterior sale).
4. El oscurecimiento del agua cuando las cards están en pantalla.
