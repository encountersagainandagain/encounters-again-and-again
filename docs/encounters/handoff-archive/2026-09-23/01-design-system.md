# 01 · Sistema de diseño

## Paleta

| Nombre | Hex | Uso |
|---|---|---|
| Abismo | #061826 | Fondo base. El único color a pantalla completa. |
| Marea | #0F3B4C | Superficies elevadas: tarjetas, bloques de sección, footer. |
| Laguna | #8FD9EA | Acento frío: hover de links, antetítulos, detalles del agua. |
| Oro | #C9A55C | Heredado del logo: filetes, numeración, firmas. Nunca en párrafos. |
| Arena | #E3D3B4 | Modo papel: lectura larga, el libro, los dibujos. |
| Coral | #E08A6E | El afecto. Un solo uso por pantalla: la acción principal. |
| Alga | #4E8A72 | Lo terrestre: conservación, aliados. |
| Espuma | #EAF5FA | Texto por defecto sobre oscuro y fondo de páginas claras. |

Tonos derivados que aparecen en los prototipos (agregarlos como tokens):

- `ink` #0E2A38 — texto principal sobre fondo Espuma
- `ink-strong` #08222F — titulares sobre fondo Espuma
- `paper` #ffffff — tarjetas sobre fondo Espuma

Opacidades de texto sobre oscuro: 0.86 (párrafo), 0.72 (secundario), 0.55 (meta). Sobre claro: rgba(14,42,56,·) con los mismos pasos.

**Regla de fondo por página:** máximo dos fondos. Oscuro (Abismo) para Home, Crew, Meaningful Messages, Workshops y Contact; claro (Espuma) para About, Art, Expeditions (después del banner) y Post.

## Tipografía

Dos familias, cargadas de Google Fonts:

    EB Garamond — 400, 500, 400 italic
    Archivo — 400, 500, 600, 700

- **Titulares** → EB Garamond 400. Mayúsculas con `letter-spacing: 0.02em`. En banners `line-height: 0.95`.
- **Voz de la marca** → EB Garamond *italic*, sin mayúsculas ("following our nature", "again and again"). Es la firma de tono: aparece una vez por sección como máximo.
- **Interfaz y párrafos** → Archivo. Antetítulos y botones en 10px/600 con `letter-spacing: 0.26em–0.3em` y mayúsculas.
- **Datos y numeración** → `ui-monospace, monospace` en 10–11px con `letter-spacing: 0.1em` (contadores "01 / 03", precios, fechas técnicas).

### Escala (todas fluidas, nunca fijas)

| Rol | Tamaño |
|---|---|
| Título de banner | clamp(2.4rem, min(11vw, 13vh), 8.5rem) |
| H2 de sección | clamp(2rem, 5.6vw, 4.4rem) |
| H3 de bloque | clamp(1.6rem, 3.4vw, 2.8rem) |
| Párrafo destacado (Garamond) | clamp(20px, 2.1vw, 28px) |
| Párrafo base (Archivo) | clamp(16px, 1.2vw, 18px), line-height 1.78 |
| Caption | 13px, line-height 1.5 |
| Antetítulo / botón | 10px, 600, tracking 0.26em |

Todo párrafo lleva `text-wrap: pretty` y ancho máximo 46–58ch.

## Espaciado

- Padding lateral de página: `clamp(20px, 5vw, 72px)`
- Separación entre secciones: `clamp(70px, 16vh, 180px)`
- Grillas internas: gap `clamp(20px, 3vw, 44px)`
- Anchos de contenido: 680px (lectura), 760px (listas y datos), 1120–1240px (grillas), 95vw (imágenes grandes)
- Bordes: 1px sólido, `rgba(14,42,56,0.14)` sobre claro y `rgba(234,245,250,0.12)` sobre oscuro. **Sin radios**: todo esquina viva (el único radio del sistema es el 3px del Brand System en fichas internas).
- Sombras sólo bajo tarjetas flotantes: `0 50px 110px -50px rgba(4,17,30,0.85)`

## Navbar (componente compartido, presente en todas las páginas)

Fijo arriba, `z-index: 30`, grilla de tres zonas: `'l c r'`.

- **Izquierda (4 links):** Expeditions · Artsy Animals/Workshops · Art · Meaningful Messages
- **Centro:** marca → logo (32px) + "ENCOUNTERS" / "again and again" (Garamond 500, tracking 0.3em / 0.2em)
- **Derecha:** About us · The crew · Contact
- Links en Archivo 9px/600, tracking 0.08em, mayúsculas, gap `6px clamp(10px, 1.3vw, 22px)`

**Marca que se abre (sólo Home):** arriba de todo el centro muestra **únicamente el logo, grande** (escala 1.85, 1.45 en móvil) y el wordmark colapsado a ancho 0. Con el descenso el logo vuelve a 32px y el wordmark se despliega. Fórmula exacta en 02-animations.md § 4.1. En el resto de las páginas la marca arranca ya en su estado final.

**Links rotantes:** dos de los links de la izquierda muestran dos etiquetas alternándose en un ciclo de 7s (ver 02-animations.md, "navRoll"): "Encounters / Expeditions" y "Artsy Animals / Workshops". Las dos etiquetas de un mismo link van al mismo destino. Ninguna etiqueta se repite entre links.

**Estado activo:** `box-shadow: inset 0 -1px 0 currentColor` en el link de la página actual.

**Responsive** (por ancho de ventana, no por breakpoint de Tailwind únicamente):
- ≥980px: tres zonas en una fila
- 760–980px: marca arriba centrada, links en una segunda fila (`'c c' / 'l r'`)
- <760px: tres filas (`'c' / 'l' / 'r'`), links centrados a 10px

**Velo superior:** un degradado fijo de 140px (170px en Home) desde `rgba(4,17,30,0.72)` hasta transparente, `z-index: 29`, que garantiza legibilidad del nav sobre cualquier imagen. Se apaga (opacity 0) cuando la página pasa a fondo claro.

## Componentes base

- **Botón primario:** fondo Espuma, texto #08222F, padding `16px clamp(26px, 3vw, 42px)`, 10px/600 tracking 0.26em, hover → fondo Laguna. En fondo claro: fondo #0E2A38 con texto Espuma.
- **Botón fantasma:** borde 1px Laguna (u #0E2A38 en claro), mismo interior; hover invierte fondo/texto.
- **Chip / tag:** padding `7px 12px`, borde 1px, 10px tracking 0.16em mayúsculas.
- **Card de contenido:** fondo blanco (o #08222F en variante oscura), borde 1px, sin radio, grilla de dos áreas 'media' + 'text'; la media siempre a sangre del borde.
- **Caption:** número monospace + texto en 13px al 0.62 de opacidad, debajo de la imagen, nunca encima.
- **Antetítulo de sección:** número monospace (01, 02…) + etiqueta en mayúsculas, separados 10px.
- **Garabato (scribble):** SVG de trazo único, `stroke-width` 1.4–2, color a 0.7 de opacidad, que se dibuja con el scroll (ver 02-animations.md). Es el cierre visual de las páginas y la firma de los títulos.

## Imágenes

- Formatos: WebP preferente, JPG para fotos grandes. Storage de Supabase.
- Cada registro de imagen guarda `alt`, `width`, `height` y **punto focal** (`focal_x`, `focal_y` en 0–1) que se traduce a `object-position: calc(focal_x*100%) calc(focal_y*100%)`.
- Las fotos de personas y fondos se recortan con `cover`; las tapas de libro y dibujos con `contain` + padding `clamp(16px, 3%, 44px)`.
- Todo `img` fuera del primer viewport lleva `loading="lazy" decoding="async"`.
