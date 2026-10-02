# 15 · Workshops (Artsy Animals) — /workshops

Prototipo: **Workshops.dc.html**

## Qué cuenta

Los workshops de Artsy Animals: qué son, cuándo, dónde, con qué etapas, qué hay que llevar y cómo sumarse. Uno por pantalla, con las sesiones en un carrusel vertical.

## Estructura

Un **pin por workshop** (165vh de recorrido, 100vh visible). Dentro de cada pin:

- **Columna izquierda (1/3):** "Workshop 01 · Running", título, subtítulo ("three sessions"), y al pie el bloque "Who it is for" / "A note about…". En ≤1080px pasa arriba, a una sola columna.
- **Card derecha (2/3, casi todo el alto):** dos áreas —
  - **riel de sesiones** (izquierda de la card): cada sesión es una pantalla del riel con número grande, título y cuerpo. Scroll propio con snap; el scroll **no se contagia** a la página hasta terminar la última sesión.
  - **imagen** (derecha de la card): cambia con crossfade al pasar de sesión.
  - **indicador** abajo a la izquierda: contador "01 / 03", barra de avance y la palabra "Sessions".

Al final, workshops terminados y cierre:

- **Workshop terminado:** misma card pero sin carrusel — cuenta cómo fue en pocas líneas y lleva el botón **"See the result →"** al post. El detalle completo (fotos, testimonios) vive en el post, no acá.
- **Cierre:** "Want one of these in your room?" + botón "Write to us" → /contact.

## Datos

De `workshops` (ordenado por `sort`, sólo publicados) y `workshop_sessions`:

| En pantalla | Campo |
|---|---|
| "Workshop 01 · Running" | `sort` + `lifecycle` |
| Título | `title` |
| Subtítulo | `subtitle`, o generado: "{n} sessions" |
| Nota de la columna | `audience_note` |
| Lugar y fecha | `place`, `starts_on`–`ends_on` (y por sesión: `workshop_sessions.place`, `held_on`) |
| Materiales | `materials` (jsonb array) → lista en la columna izquierda o en la última sesión |
| Botón sumarse | `mailto:{signup_email}?subject={signup_subject}` |
| Sesiones del riel | `workshop_sessions` por `sort`: `title`, `body`, `media_id` |
| Card de resultado | `lifecycle = 'finished'` + `report_post_id` |

**Alto del pin:** `100vh + 65vh` si tiene sesiones, `100vh + 30vh` si es un workshop terminado. El riel no necesita recorrido de página: las sesiones se pasan dentro de la card.

**Cantidad:** la página acepta de 1 a ~8 workshops sin rediseño (cada uno es su propio pin). Con más de 8 conviene paginar o separar "próximos" / "pasados".

## Animaciones

02-animations.md § 10. Lo crítico:

1. `overscroll-behavior-y: contain` + `scroll-snap-type: y mandatory` en el riel: es el efecto central.
2. Crossfade de la imagen ligado a la posición continua del riel (`raw = scrollTop / clientHeight`), no al índice redondeado: el cruce tiene que ser gradual.
3. Indicador: contador por índice redondeado, barra con `transition: width 220ms ease`.
4. En móvil el riel mantiene su scroll propio pero a 58vh de alto, con la imagen arriba a 38vh.
