# 12 · The crew — /crew

Prototipo: **The Crew.dc.html**

## Qué cuenta

Quiénes son. Pares de fotos que entran escalonados, garabatos que se trazan, y una tira final de retratos.

## Secciones, en orden

1. **Banner** — título "THE CREW".
2. **Pares de fotos + texto** — bloques alternados con el relato del grupo.
3. **Tira de retratos** — grilla de 6 columnas a sangre, una por integrante: foto, nombre, rol. **Es un listado editable.**
4. **Cierre** — frase + garabato + footer.

## Datos

De `crew_members` (ver 03-data-model.md), ordenado por `sort`, sólo `status = 'published'`:

- La cantidad es variable: la tira usa `grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))` y acepta de 3 a 10 personas sin rediseño. Hoy son 6.
- **`has_page`** decide si el retrato es un link: si es `false`, la tarjeta se renderiza como `div` (sin cursor, sin hover de brillo). Si es `true`, linkea a `/crew/[slug]`.
- Los textos del relato del grupo son estáticos (`about_page` o constantes), no por integrante.

## Animaciones

- Pares de fotos: `data-seq` escalonado 1.02 / 0.99 / 0.96 / 0.93, shift 70px (02 § 6).
- Retratos: hover `filter: saturate(1) brightness(1.04)` sólo si `has_page`.
- Garabatos: trazo atado al scroll con la corrección de `span` cerca del pie de página (02 § 6) — **importante**, sin eso el trazo del cierre queda a medias.
