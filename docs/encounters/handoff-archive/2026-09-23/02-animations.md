# 02 · Animaciones (crítico)

Todas las páginas comparten **un mismo motor**. Si se replica bien este archivo, las páginas se sienten iguales al prototipo.

## 1. Motor común

### 1.1 Reloj

Un único `requestAnimationFrame` por página. Nada de listeners de scroll que escriban estilos: el listener de scroll **sólo guarda números**, el rAF los aplica.

    // en el listener de scroll (passive: true)
    progress = clamp(window.scrollY / window.innerHeight, 0, 1)

    // en el rAF, una vez por frame
    eased += (progress - eased) * 0.08     // suavizado exponencial

Ese `eased` (llamado `d` más abajo) es el que mueve los banners. El 0.08 es el "peso del agua": más alto se siente seco, más bajo se siente elástico.

### 1.2 La función `ramp`

Es la única interpolación que usa el sistema:

    function ramp(v, from, to, smooth) {
      const k = Math.min(1, Math.max(0, (v - from) / (to - from)));
      return smooth ? k * k * (3 - 2 * k) : k;   // smoothstep
    }

`smooth = true` para todo lo que entra o sale de pantalla; `false` para valores lineales (contadores, trazos, velos).

### 1.3 Entradas por elemento: `data-seq`

El patrón que aparece en todas las páginas. Atributo `data-seq="start,span[,shift]"`:

- `start` — a qué altura de pantalla dispara, en fracciones de viewport (0.94 = cuando el elemento llega al 94% del alto)
- `span` — cuánto scroll dura, en fracciones de viewport (0.4 = 40% de pantalla)
- `shift` — desplazamiento inicial en px (default 60–70)

Cálculo por frame:

    const rect = el.getBoundingClientRect();
    const p = ramp((vh * start - rect.top) / (vh * span), 0, 1, true);
    el.style.opacity   = p;
    el.style.transform = \`translate3d(0, \${(1 - p) * shift}px, 0) scale(\${0.965 + p * 0.035})\`;
    el.style.filter    = p > 0.99 ? "none" : \`blur(\${(1 - p) * 5}px)\`;

Estado inicial en el markup: `opacity: 0`, `translate3d(0, shift, 0)`, `will-change: opacity, transform`.

**Escalonado:** elementos hermanos usan `start` decreciente (1.2, 1.05, 1.0, 0.86) para que entren uno detrás del otro sin retardos por tiempo.

### 1.4 Pines (sticky)

Ningún efecto largo usa `position: fixed` ni scroll-jacking. Se usa el patrón contenedor alto + hijo sticky:

    <section style="height: 300vh">          <!-- el recorrido -->
      <div style="position: sticky; top: 0; height: 100vh">   <!-- lo que se ve -->

Progreso del pin (0 → 1 mientras el pin está tomado):

    const rect = section.getBoundingClientRect();
    const run  = rect.height - inner.offsetHeight;
    const t    = clamp(-rect.top / run, 0, 1);

En móvil (<760px) los pines se sueltan: el sticky pasa a `static` y el contenedor a `height: auto`. El contenido se apila y conserva las entradas `data-seq`.

### 1.5 Accesibilidad y rendimiento

- `prefers-reduced-motion: reduce` → no se arranca el rAF; se aplica el estado final (opacity 1, sin transform) y los carruseles pasan a `scroll-behavior: auto`.
- Sólo se animan `opacity`, `transform`, `clip-path`, `filter` y `background-color`. Nunca `top`, `height` ni `margin`.
- `will-change` sólo en los elementos animados de la vista actual.

## 2. Animaciones de entrada (por tiempo, sólo al cargar)

Son las únicas por temporizador, y sólo en el banner. Keyframes:

    @keyframes heroRise      { from { transform: translate3d(0,14%,0) scale(1.05); opacity: 0 } to { transform: none; opacity: 1 } }
    @keyframes heroTitleRise { from { transform: translate3d(0,48px,0); opacity: 0 }            to { transform: none; opacity: 1 } }
    @keyframes heroFadeIn    { from { opacity: 0 } to { opacity: 1 } }
    @keyframes cueDrop       { 0%,100% { transform: translateY(0);  opacity: .55 } 50% { transform: translateY(8px); opacity: 1 } }
    @keyframes navRoll       { 0%,38% { transform: translateY(0) } 50%,88% { transform: translateY(-50%) } 100% { transform: translateY(0) } }
    @keyframes artDraw       { from { stroke-dashoffset: 1 } to { stroke-dashoffset: 0 } }

Coreografía del banner (siempre en este orden):

| Elemento | Animación | Duración | Delay |
|---|---|---|---|
| Imagen de fondo | heroRise | 1500ms cubic-bezier(.16,.84,.24,1) | 0 |
| Kicker (italic) | heroFadeIn | 900ms ease | 420ms |
| Título | heroTitleRise | 1100ms cubic-bezier(.16,.84,.24,1) | 700ms |
| Meta / fecha | heroFadeIn | 900ms ease | 1100ms |
| Cue "Scroll" | cueDrop | 2600ms ease-in-out infinite | 0 |

**navRoll:** el link contiene un `span` en columna con las dos etiquetas, cada una de `height: 12px; line-height: 12px`, dentro de un `a` de `height: 12px; overflow: hidden`. La animación corre 7s infinita. Sin delays distintos entre links (se movían desincronizados y se leía sucio).

## 3. Navbar reactivo

Por frame, con `y = scrollY` y `k = min(1, y / 240)`:

- Fondo: sobre oscuro `rgba(6,24,38, k*0.72)`; sobre claro `rgba(234,245,250, 0.68 + k*0.28)`
- `backdrop-filter: blur(k * 14px)` (se omite si k < 0.05)
- Borde inferior: `rgba(255,255,255, k*0.14)` en oscuro, `rgba(14,42,56,0.14)` fijo en claro
- **Inversión de tema:** cuando `heroSection.getBoundingClientRect().bottom < 150` el nav pasa a modo claro: color de texto #0E2A38, logo con `filter: invert(1)`, velo superior a opacity 0. Transición 400ms ease. Se aplica sólo en las páginas de fondo claro (About, Art, Expeditions, Post).

## 4. Home — el descenso y la agenda

### 4.1 El descenso

Fondo fijo, canvas de agua, burbujas y profundímetro. `run = diveDistance * vh` (diveDistance = 1) y `d` = reloj suavizado de `clamp(scrollY / run, 0, 1)` (sección 1.1). El hero es una sección de **200vh** con un sticky de 100vh adentro.

| Efecto | Fórmula |
|---|---|
| Fondo (imagen fija), con `k = min(1, d/0.8)` | `scale(1 + k*0.14) translateY(-k*5%)`, `blur(k*11px) brightness(1 - k*0.5) saturate(1 + k*0.2)` |
| Velo de profundidad (#02101c) | opacity `k * 0.72`, con `k` medido **después** del recorrido del hero: `(scrollY - run) / (vh * 1.8)` |
| Burbujas | opacity `clamp((d - 0.42) / 0.35) * 0.9`; 30 en desktop, 16 en móvil, duración 11–27s y delay aleatorio **negativo** (arrancan ya en curso) |
| Bloque del banner (`k = clamp((d - 0.18)/0.42)`) | opacity `1 - k`, `translateY(k*70px) scale(1 + k*0.12)`, `blur(k*9px)` |
| Cue "follow the current" | opacity `max(0, 1 - d/0.2)` |
| Profundímetro (`k = clamp((d - 0.6)/0.25)`) | opacity `k`, `translateY(calc(-50% + (1-k)*40px))`. Texto: `5.0 m` al aparecer → `30.0 m` al final del descenso, y después sigue sumando. Fórmula: `5 + max(0,(y - 0.6*vh) / (0.25*vh)) * 25`, un decimal, sufijo " m" |
| Arrecife | `translateY((1 - t) * 60px)` con `t = clamp(1 - rect.top / vh)` |

**Morfeo de la marca del navbar** (`k = clamp((d - 0.05)/0.3)`, `e = smoothstep(k)`): arriba de todo se ve **sólo el logo, grande y centrado**; al descender se achica y aparece el wordmark a su lado. Logo: `scale(1 + (1-e)*0.85)` (0.45 en móvil). Wordmark: opacity `e`, `translateX((1-e)*-12px)`, `max-width: e * anchoMedido` (medir una vez al montar, con `max-width: none`). El `<a>` de la marca lleva `pointer-events: none` mientras `e < 0.5`, si no se clickea el logo gigante sin querer.

**Chrome del navbar** (`k = clamp((d - 0.08)/0.25)`): fondo `rgba(6,24,38, k*0.5)`, `backdrop-filter: blur(k*14px)` (omitido si k < 0.05), borde inferior `rgba(255,255,255, k*0.14)`.

### 4.2 El canvas de agua (WebGL)

Un `<canvas>` fijo a pantalla completa, `z-index: 1`, sobre la ilustración de fondo y debajo del contenido. Un solo shader de fragmento a pantalla completa (tres vértices, sin librerías), alpha premultiplicado, dibujado **en el mismo rAF** que todo lo demás. Uniforms: `uTime`, `uDive` (= `d`), `uCaustic`, `uRays`, `uSun`, `uWaves`, `uShallow`, `uDeep`.

Qué dibuja, en orden: línea de agua que **sube con el descenso** (`mix(0.12, 1.22, d)`) con oleaje de tres senos + surgencia; cuerpo de agua interpolado de Laguna a Abismo por profundidad; cáusticas por fbm de dominio deformado; rayos de sol desde `uSun` que sólo aparecen bajo el agua (`smoothstep(0.04, 0.45, d)`); espuma de rompiente sobre el borde; arena mojada y salpicadura, que se apagan apenas empieza la inmersión. Viñeta final y alpha que tapa todo cuando `d → 1`.

Resolución: `dpr = min(devicePixelRatio, ancho < 760 ? 1.25 : 1.75)` — el shader es caro en teléfonos.

**Es decorativo.** Si no se replica, se acepta un degradado animado equivalente; lo obligatorio es el desenfoque progresivo del fondo, el velo, las burbujas y el profundímetro.

### 4.3 Robustez del reloj (aplica a todas las páginas)

Tres detalles del prototipo que no son opcionales:

- **Altura cacheada:** `vh` se guarda al montar y sólo se recalcula en `resize` si cambia más de 140px. En iOS la barra de direcciones cambia `innerHeight` a mitad de gesto y recalcular ahí hace saltar la inmersión.
- **rAF pausado:** si pasaron más de 140ms desde el último frame (pestaña oculta, ahorro de energía, captura), el listener de scroll pinta el estado directo sin suavizado.
- **`visibilitychange`:** al volver a ser visible se cancela y se reengancha el rAF; si no, el reloj queda con un salto de minutos.

### 4.4 Ongoing projects — tarjetas apiladas

Tres `article` con `position: sticky` y `top` escalonado — `clamp(90px,13vh,130px)`, `clamp(116px,17vh,168px)`, `clamp(142px,21vh,206px)` — alto `clamp(340px,62vh,600px)`, y entre ellas un espaciador vacío de **72vh / 72vh / 78vh**. No hay JS: el apilado es puro sticky. Cada tarjeta lleva borde superior `rgba(234,245,250,0.55)` y sombra hacia arriba `0 -18px 46px rgba(2,16,28,0.72)` para despegarse de la de abajo.

**Garabato del titular:** se traza al entrar en pantalla, con `IntersectionObserver` (threshold 0.4) que pone `stroke-dashoffset: 0` con `transition: 1700ms cubic-bezier(.25,.75,.25,1)`, una sola vez. El garabato del cierre, en cambio, va atado al scroll (sección 6).

### 4.5 What is coming — la agenda pineada

Pin de **380vh** (340vh en móvil) con un sticky de 100vh. Progreso `t` como en la sección 1.4, pero con `clamp(-0.3, 1)`: el primer panel ya está entrando antes de que el pin se tome.

Cada panel lleva `data-next="inFrom,inTo,outFrom,outTo"`:

| Panel | Ventana |
|---|---|
| 01 · Expedition | -0.10, -0.02, 0.22, 0.30 |
| 02 · Workshop | 0.22, 0.30, 0.47, 0.55 |
| 03 · Expedition | 0.47, 0.55, 0.72, 0.80 |
| 04 · Workshop | 0.72, 0.80, 1.30, 1.40 (no sale: el pin termina antes) |

Por frame, con `p = ramp(t, inFrom, inTo, true)` y `out = ramp(t, outFrom, outTo, true)`:

    opacity      = p * (1 - out)
    transform    = translateY(-50%) translate3d(0, (1-p)*64 - out*90 px, 0)   // sin el -50% en móvil
    filter       = blur((1-p)*6 + out*7 px)
    pointerEvents = opacidad efectiva > 0.6 ? auto : none

**La foto acompaña con margen**, para que nunca se vea el fondo pelado entre dos eventos: entra 0.07 antes (`inFrom-0.07 → inTo-0.04`) y sale 0.02–0.05 después (`outFrom+0.02 → outTo+0.05`), con `scale(1.1 - sIn*0.1 + sOut*0.05)`.

**Riel de progreso** (4 tramos, abajo): la barra de cada tramo es `ramp(t, inFrom, outFrom, false) * 100%` de ancho, lineal. La etiqueta pasa a #EAF5FA cuando su panel está visible (opacidad efectiva > 0.5) y vuelve a `rgba(234,245,250,0.45)`, con `transition: color 300ms ease`.

**Velo del pin:** `opacity = 0.82 + ramp(t, 0, 0.25, true) * 0.18`.

### 4.6 El resto de la home

Todo lo que va después del pin entra con `data-seq` (sección 1.3), con `start` decreciente entre hermanos: encabezados de sección 0.96, tarjetas 0.94 / 0.90 / 0.86, bloque About 1.0 / 0.96 / 0.92 / 0.88, titular de cierre 1.05. Dos guardas propias del motor de `data-seq`: si el elemento está más abajo de `vh * 1.4` no se toca, y si ya quedó **arriba** del viewport (`rect.bottom < -vh*0.4`, por salto de ancla o recarga a media página) se fija en su estado final de una vez.

## 5. About — fotos que cambian mientras el texto sube

Dos capas: una columna de texto que entra con `data-seq` escalonado, y un marco de foto con 4 imágenes superpuestas. La imagen visible se elige por índice según el progreso del pin: `i = floor(t * n)`, con crossfade de 240ms entre vecinas (opacity + `scale(1.02 → 1)`).

## 6. The crew — pares escalonados + garabatos

- Las fotos entran en pares con `data-seq` de `start` decreciente: 1.02 / 0.99 / 0.96 / 0.93 (shift 70px).
- Los retratos de la tira inferior tienen hover `filter: saturate(1) brightness(1.04)`.
- **Garabatos atados al scroll:** cada SVG se mide al montar y se anima por posición, no por tiempo:

      const len = path.getTotalLength();
      path.style.strokeDasharray  = len + " " + len;
      // por frame:
      const p = ramp((vh - svg.getBoundingClientRect().top) / span, 0, 1);
      path.style.strokeDashoffset = len * (1 - p);

  `span` = `min(vh * 0.4, vh - minTop)` donde `minTop` corrige los SVG que están tan cerca del final del documento que nunca llegarían a completarse. Sin esa corrección el trazo queda a medias en el footer.

## 7. Art — firma y categorías

- **Firma del título:** el SVG bajo "ART" se dibuja con `artDraw` (1800ms, cubic-bezier(.42,.02,.3,1), delay 1250ms) usando `pathLength="1"` + `stroke-dasharray="1"`. Es la única animación de trazo por tiempo del sistema: simula una firma al entrar a la página. El kicker "our" va pegado al título (margin-bottom 2–6px) y la firma cuelga debajo con `margin-top: clamp(-18px, -1.6vh, -6px)`.
- **Filtros:** barra en flujo normal (no sticky, no fija). Al elegir una categoría se ocultan las demás secciones y se hace scroll suave a la elegida. Chip activo: fondo #0E2A38, texto Espuma.
- Cada categoría ocupa pantalla completa: las obras se dimensionan con `calc(100vh - max(96px, 13vh))`.
- Las obras entran con `data-seq` escalonado (1.2 / 1.05 / 1.0 / 0.86).

## 8. Meaningful Messages — mensajes que se cruzan

Pin de **300vh**. Progreso `t` del pin (sección 1.4). Cada bloque lleva `data-stage="inFrom,inTo,outFrom,outTo,shift"`; entra con `ramp(t, inFrom, inTo, true)` y sale con `ramp(t, outFrom, outTo, true)`:

| Bloque | Ventana |
|---|---|
| Mensaje 01 · imagen | -0.20, -0.08, 0.22, 0.40 |
| Mensaje 01 · texto | -0.17, -0.04, 0.26, 0.44 |
| Mensaje 02 · imagen | 0.28, 0.36, 0.56, 0.74 |
| Mensaje 02 · texto | 0.31, 0.39, 0.59, 0.77 |
| Mensaje 03 · imagen | 0.62, 0.70, 0.86, 1.00 |
| Mensaje 03 · texto | 0.65, 0.73, 0.89, 1.00 |

Los valores negativos son intencionales: el progreso se calcula permitiendo hasta **-0.3** (`clamp(-0.3, 1)`), de modo que el primer mensaje ya está en pantalla durante la aproximación de la sección, antes de que el pin se tome. Sin eso queda un tramo en blanco después de la línea "Illustrated by…".

Transform: `translate3d(0, (1-p)*shift - out*130 px, 0)` con `shift = 110`; opacity `p * (1 - out)`.

La imagen de cada mensaje ocupa **el alto completo del viewport** (el pin arranca en `top: 0`, 100vh) y el texto se centra al lado.

Banner: la portada se disuelve con `ramp(d, 0.06, 0.82, true)` y el título sale con `ramp(d, 0.10, 0.78)`.

## 9. Expeditions — banner que no avanza + cards encadenadas

Pin de **660vh**, un solo sticky de 100vh que contiene todo: las dos imágenes, el título y las cinco cards.

**9.1 Disolución en 6 franjas.** La imagen de superficie está al fondo; encima, una grilla de 6 columnas donde cada celda contiene la imagen submarina desplazada (`width: 600%`, `left: -N*100%`) para que las 6 juntas reconstruyan una sola foto continua. Cada franja se revela con `clip-path: inset()`:

- Orden de revelado: **0, 2, 4** (primera pasada) y después **1, 3, 5** (segunda pasada) → `ORDER = [0,2,4,1,3,5]`
- Inicio de cada franja: `from = (j < 3 ? 0.05 : 0.24) + (j % 3) * 0.045`, donde `j` es la posición en ORDER
- Duración: 0.11 de `t`, con smoothstep
- Dirección alternada: franjas pares se revelan desde arriba (`inset(hidden 0 0 0)`), impares desde abajo (`inset(0 0 hidden 0)`), con `hidden = (1 - p) * 100%`

**9.2 El título se va** con `ramp(t, 0.06, 0.22, true)`: opacity `1 - o`, `translateY(o * -46px)`, `scale(1 + o*0.05)`. El cue "Scroll" se apaga con `ramp(t, 0, 0.05)`.

**9.3 El agua se oscurece** cuando entran las cards: el velo del banner va a `opacity = 1 + ramp(t, 0.36, 0.5, true) * 0.55`.

**9.4 Las cards** se apilan sobre la segunda imagen, absolutas dentro del sticky, `top: max(13%, 104px)`, `height: 76%`, ancho `min(66vw, 1120px)` centrado con `margin-left: max(-33vw, -560px)` (ojo: `max` y no `min`, porque el valor es negativo). Cada una lleva `data-card="inFrom,inTo,outFrom,outTo"`:

| Card | Ventana |
|---|---|
| 01 | 0.42, 0.50, 0.55, 0.62 |
| 02 | 0.55, 0.62, 0.67, 0.74 |
| 03 | 0.67, 0.74, 0.79, 0.86 |
| 04 | 0.79, 0.86, 0.91, 0.97 |
| 05 | 0.91, 0.97, 1.40, 1.50 (no sale: el pin termina antes) |

Por frame: `opacity = p * (1 - out)`, `translateY = (1-p)*90 - out*130`, `scale = 0.965 + p*0.035 - out*0.05`, `blur = (1-p)*5 + out*6`, y `pointer-events: auto` sólo si la opacidad efectiva supera 0.6.

El escalonado de las ventanas es lo que produce el encadenado: la card siguiente empieza a entrar exactamente cuando la anterior empieza a salir.

## 10. Workshops — carrusel vertical dentro de la card

Cada workshop es un pin de **165vh** (130vh si es un workshop terminado, que no tiene sesiones). La card ocupa 2/3 del ancho y casi todo el alto (el pin sólo despeja el navbar: `padding: 82px … 16px`).

**Dentro de la card**, la columna de texto es un riel con scroll propio:

    overflow-y: auto;
    overscroll-behavior-y: contain;   /* el scroll NO se contagia a la página */
    scroll-snap-type: y mandatory;    /* cada sesión: height 100%, scroll-snap-align start */

El contagio contenido es el corazón del efecto: con el cursor sobre la card se pasa de sesión en sesión; al terminar la última, el scroll vuelve a la página y avanza al workshop siguiente.

Sincronía imagen ↔ sesión (listener de scroll del riel):

    const raw = rail.scrollTop / rail.clientHeight;     // 0..n-1 continuo
    const i   = clamp(Math.round(raw), 0, count - 1);
    // por cada imagen n de la card:
    const dist = Math.min(1, Math.abs(raw - n));
    img.style.opacity   = 1 - dist;
    img.style.transform = \`scale(\${1 + dist * 0.04})\`;
    // indicador
    counter.textContent = pad(i+1) + " / " + pad(count);
    bar.style.width     = ((i + 1) / count) * 100 + "%";   // transition: width 220ms ease

La barra de scroll del riel se oculta (`scrollbar-width: none` + `::-webkit-scrollbar { display: none }`) y cada sesión reserva abajo `clamp(78px, 7vw, 106px)` de padding para no quedar tapada por el indicador.

## 11. Post — bloques

- **Bloque de imagen grande:** 95vw × 95vh, con aire a los lados. La imagen interna mide 108% del alto (`inset: -4% 0`) y hace parallax: `translateY((t - 0.5) * 0.08 * alto)`, con `t` = progreso del marco cruzando el viewport.
- **Carrusel horizontal:** `scroll-snap-type: x mandatory`, slides de 62vw (84vw en móvil) con `scroll-snap-align: center`, flechas que llaman `scrollTo({ behavior: "smooth" })` centrando el slide, y contador "01 / 04".
- **Acordeones y FAQs:** despliegue por click, sin animación de alto (display none/block); el signo "+" rota 45° al abrir (`transition: transform 240ms ease`).
- **YouTube:** se muestra la miniatura (`img.youtube.com/vi/ID/maxresdefault.jpg`) con botón de play; el iframe se inserta recién al hacer click (no se carga antes, por peso y privacidad).
- Todos los bloques de texto entran con `data-seq` ~0.94, 0.4.

## 12. Contact — el formulario emerge del agua

- Banner de 100vh; la imagen se hunde con `ramp(d, 0, 0.9)`: `translateY(k * 8%)`, `scale(1 + k*0.07)`, `brightness(1 - k*0.35)`. El título sale con `ramp(d, 0.04, 0.6)`: `translateY(t * -60px)`.
- El panel del formulario monta **sobre** el banner con `margin-top: -24vh` (-14vh en móvil) y sombra hacia arriba `0 -30px 90px -40px rgba(4,17,30,0.9)`.
- Tarjetas de motivo: hover y selección cambian fondo a Espuma con texto #08222F; la seleccionada define el texto de la pantalla de agradecimiento.
- Al enviar: el formulario se oculta, aparece el estado "Message sent" y el garabato se dibuja con el scroll (sección 6).
