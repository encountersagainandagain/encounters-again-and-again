# 16 · Art — /art

Prototipo: **Art.dc.html**

## Qué cuenta

Todo lo que el proyecto produce, por categoría: el libro, los cortos, los dibujos, las fotos… y las que vengan (podcasts, collages, lo que se les ocurra).

## Estructura

1. **Banner** — kicker "our" **pegado** al título "ART", y debajo la **firma** que se dibuja sola al entrar a la página (un solo trazo).
2. **Barra de categorías** — chips: All · Books · Films · Drawings · Photography · … Está **en el flujo**, no fija: se ve en su lugar y se va con el scroll.
3. **Una sección por categoría, a pantalla completa** — antetítulo numerado, título, crédito, párrafo destacado (Garamond) + párrafo base, CTA, y las obras en grilla de 6 columnas.
4. **Cierre** — frase + garabato + footer.

## Categorías dinámicas: carrusel

Hoy hay 4 categorías. Cuando sean más, **las cards de categoría se muestran en un carrusel horizontal** (decisión tomada):

- Se activa automáticamente con **más de 4** categorías.
- Cards de `min(30vw, 420px)`, `scroll-snap-type: x mandatory` con `scroll-snap-align: center`, flechas ← → (42×42, borde 1px, hover invertido) y contador monospace "03 / 07", igual que el carrusel de Post (02 § 11).
- Cada card: imagen `cover_id`, número, nombre y cantidad de obras. Al hacer click **filtra y scrollea** a la sección de esa categoría (misma mecánica que los chips).
- Con 4 o menos: grilla estática, sin flechas.

Los chips siguen existiendo arriba como filtro rápido; el carrusel es la entrada visual.

## Datos

`art_categories` + `artworks` (ver 03-data-model.md). Campo clave: **`layout`**, que define cómo se renderizan las obras de esa categoría:

| layout | Render |
|---|---|
| gallery | grilla de 6 columnas; cada obra usa su `span` y `full_height` |
| feature | una obra grande a pantalla completa + dos secundarias (el libro: tapa y contratapa) |
| video | miniatura de YouTube a todo el ancho con play (carga el iframe al click) |
| audio | tarjeta con embed de Spotify/anchor + lista de episodios (**para las categorías tipo podcast**) |

Crear una categoría nueva = insertar fila en `art_categories` + elegir `layout`. No requiere tocar código.

## Animaciones

- Firma del título: `artDraw`, 1800ms, cubic-bezier(.42,.02,.3,1), delay 1250ms (02 § 7). **Un solo trazo** — el segundo subrayado se quitó, no volver a agregarlo.
- Obras y textos: `data-seq` escalonado 1.2 / 1.05 / 1.0 / 0.86.
- Filtrado: al elegir categoría, ocultar las otras secciones y `scroll` suave a la elegida.
- Nav en modo claro desde el inicio (la página es fondo Espuma).
