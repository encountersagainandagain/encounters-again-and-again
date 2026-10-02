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

## 4. Home — el descenso, la agenda y el buceo

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

### 4.4 Ongoing projects — tarjetas que emergen

**Sin sticky ni pin: el scroll nunca se frena.** Las tres tarjetas van en flujo normal, en columna con `gap: clamp(60px,14vh,160px)`, ancho `min(100%, 880px)` alternando izquierda / derecha / izquierda (`margin-right: auto` en pares, `margin-left: auto` en impares), alto `clamp(320px,58vh,560px)`, `overflow: hidden`, sombra `0 30px 80px rgba(2,12,22,0.55)`.

Cada tarjeta tiene tres capas: la foto (`top: -14%; height: 128%`, sobra alto para el parallax), el degradado de legibilidad y una capa de **rayos de luz**: `repeating-linear-gradient(104deg, …)` con franjas `rgba(190,235,250,0.09)` cada 230px, `mix-blend-mode: screen`, desbordada 30% a los lados.

Por frame, sólo si la tarjeta está a menos de 120px del viewport. Con `r = rect`, `i` = índice, `side = i impar ? 1 : -1`, `t` = segundos desde el montaje:

    e    = 1 - (1 - clamp((vh - r.top) / (vh * 0.6)))^3       // emerge (ease-out cúbico)
    p    = clamp((vh - r.top) / (vh + r.height))              // paso por pantalla 0 → 1
    sway = sin(t * 0.55 + i * 1.9)

| Capa | Fórmula |
|---|---|
| Tarjeta | `translate3d(sway*7 + (1-e)*side*46 px, (1-e)*110 + sin(t*0.8 + i*2.3)*6 px, 0) rotate(sway*0.45 + (1-e)*side*2.4 deg)` |
| Tarjeta | opacity `0.1 + 0.9*e`; `filter: blur((1-e)*9px) saturate(0.5 + 0.5*e) hue-rotate((1-e)*14deg)` — `none` cuando `e ≥ 0.995` |
| Foto | `translate3d(0, (0.5 - p) * r.height * 0.24 px, 0) scale(1.03 + (1-e)*0.08)` |
| Rayos | `translate3d(sin(t*0.3 + i)*50 + p*90 px, 0, 0)` |

La lectura: cada tarjeta sube desde el fondo desenfocada, desaturada y corrida al azul, y se aclara al llegar; mientras está en pantalla se mece como algo suspendido en el agua.

**Garabato del titular:** se traza al entrar en pantalla, con `IntersectionObserver` (threshold 0.4) que pone `stroke-dashoffset: 0` con `transition: 1700ms cubic-bezier(.25,.75,.25,1)`, una sola vez. El garabato del cierre, en cambio, va atado al scroll (sección 6).

### 4.5 What is coming — descenso por la columna de agua

**Sin pin: el scroll sigue libre.** Cada evento es un `article` en flujo de `min-height: 130vh`, apilados uno bajo el otro. Cada uno más profundo que el anterior.

Capas de cada evento, de abajo arriba:

1. **Foto** en un contenedor `top: -15%; height: 130%` (sobra para el parallax).
2. **Degradado** `linear-gradient(to bottom, #061826 0%, rgba(6,24,38,0.5) 24%, rgba(4,17,30,0.62) 60%, #061826 100%)` — funde cada evento con el siguiente, nunca hay corte duro.
3. **Oscurecimiento por profundidad:** `rgba(2,10,20, 0 / 0.1 / 0.2 / 0.3)` para los eventos 1–4.
4. **Rayos:** `repeating-linear-gradient(100deg, …)`, franjas cada 280px con alpha `0.08 - i*0.018` (se apagan al bajar), `mix-blend-mode: screen`.
5. **Texto** (mismo contenido de antes: número, tipo, chip, fecha, título, meta, CTA), con `padding-right: clamp(64px,16vw,260px)` para no pisar el profundímetro.

Por frame, por evento visible (a menos de 80px del viewport):

    p = clamp((vh - r.top) / (vh + r.height))                 // paso 0 → 1
    e = 1 - (1 - smoothstep(vh - r.top, 0, vh*0.85))^3        // entrada
    x = 1 - smoothstep(vh - r.bottom, vh*0.1, vh*0.7)^2       // salida

| Capa | Fórmula |
|---|---|
| Foto | `clip-path: inset(b% 0 b% 0)` con `b = (1-e)*42` — se abre desde una franja horizontal, como luz que atraviesa el agua |
| Foto | `translate3d(0, (p - 0.5) * r.height * 0.34 px, 0) scale(1.12 - e*0.1)` |
| Rayos | `translate3d(sin(t*0.28 + i*1.7)*60 + p*120 px, 0, 0)` |
| Texto | `translate3d(sway*3 px, (1-e)*140 - (p-0.5)*vh*0.22 + sway*4 px, 0)` con `sway = sin(t*0.7 + i*2.1)` |
| Texto | opacity `e * x`; `blur((1-e)*8 + (1-x)*6 px)` (`none` si < 0.05); `pointer-events: auto` sólo con opacity > 0.5 |

**Encabezado y profundímetro** (`sticky; top: 0; height: 0` al inicio de la sección, así no ocupa lugar y queda pegado mientras dura): arriba, "What is coming / dates we already know" sobre un degradado `rgba(6,24,38,0.92) → 0`; a la derecha, una línea vertical de 44vh (desde `top: 34vh`) con 4 marcas en `i/3 * 100%` y su etiqueta.

- Opacidad de ambos: `smoothstep(vh - sección.top, vh*0.75, vh*1.05) * (1 - smoothstep(vh - sección.bottom, 0, vh*0.35))`.
- Progreso `g = clamp(-sección.top / (sección.height - vh))`: relleno Laguna `height: g*100%`; marcador (círculo 9px, borde #8FD9EA, `box-shadow: 0 0 14px rgba(143,217,234,0.6)`) en `translateY(g * alto - 4px)` con vaivén `sin(t*1.3)*1.5px` en x.
- Etiqueta activa: #EAF5FA cuando la opacidad del texto de su evento > 0.55; si no `rgba(234,245,250,0.45)`, `transition: color 300ms`.
- Móvil (<760px): se ocultan las etiquetas, quedan las marcas.

**Cantidad:** ya no hay ventanas escritas a mano. Con `n` eventos las marcas van en `i/(n-1)`; funciona igual con 2 a 6. Con 1, sin profundímetro.

### 4.6 El resto de la home

Todo lo que va después de la agenda entra con `data-seq` (sección 1.3), con `start` decreciente entre hermanos: encabezados de sección 0.96, tarjetas 0.94 / 0.90 / 0.86, bloque About 1.0 / 0.96 / 0.92 / 0.88, titular de cierre 1.05. Dos guardas propias del motor de `data-seq`: si el elemento está más abajo de `vh * 1.4` no se toca, y si ya quedó **arriba** del viewport (`rect.bottom < -vh*0.4`, por salto de ancla o recarga a media página) se fija en su estado final de una vez.

### 4.7 Buceo — lo que acompaña todo el descenso

Tres capas fijas que siguen después del hero, para que la sensación de bajar no se corte. Las tres son decorativas (`aria-hidden`, `pointer-events: none`) y se apagan con `prefers-reduced-motion`.

**Nieve marina** — `<canvas>` 2D fijo a pantalla completa, `z-index: 5`, `dpr = min(devicePixelRatio, 2)`.

- Visible: `opacity = smoothstep(d, 0.45, 0.9)` (aparece al sumergirse y ya no se va).
- 150 partículas (70 en móvil), cada una con `x, y ∈ [0,1)`, profundidad `z ∈ [0.2, 1]`, radio `0.6–2.1`, alpha `0.18–0.6`, fase aleatoria; el 7% son burbujas.
- Velocidad de scroll suavizada: `v += (Δy - v) * 0.22` por frame.
- Posición por frame, con `span = H + 40` y envoltura módulo `span`:

      speed = 0.25 + z*0.65                                     // parallax: cercanas más rápido
      drift = burbuja ? -t*(26 + z*30) : t*(4 + z*6)            // quieto: burbujas suben, nieve se hunde
      y     = wrap(y0*span - scrollY*speed + drift) - 20
      x     = x0*W + sin(t*0.35 + fase) * (6 + z*10)
      alpha = a * (0.45 + z*0.55)

- Estela: `stretch = min(46, |v| * speed * 0.8)`. Si `> 1.2px` la partícula se dibuja como línea vertical de ese largo (hacia abajo si se baja), `lineCap: round`, grosor `r*(0.6 + z*0.6)`. Si no, punto de radio `r*(0.5 + z*0.7)`, color `rgba(214,238,246,α)`. Burbujas: círculo sólo trazo, radio `1.5 + r*z*1.6`, `rgba(234,245,250, α*0.9)`, 0.8px.

**HUD de buceo** — panel fijo abajo a la izquierda (`left: clamp(10px,1.4vw,22px)`, `bottom: clamp(10px,2.2vh,22px)`, `z-index: 28`), semitransparente con blur de fondo. Muestra profundidad y un tanque de O₂.

- Toma la posta del profundímetro central: `handoff = smoothstep(scrollY, 0.9*vh, 1.15*vh)`. Profundímetro central: opacity `k * (1 - handoff)`. HUD: opacity `handoff`, `translateY((1 - handoff) * 16px)`.
- Profundidad: el mismo texto que el profundímetro (§ 4.1).
- O₂: `left = 1 - clamp(scrollY / (scrollHeight - vh))` → texto `round(left*100)` %, relleno del tanque `52px * left` de alto; color #8FD9EA, pasa a #F2A27E cuando `left < 0.2`.
- Ya no se esconde en la agenda (el profundímetro de la agenda está a la derecha, no chocan).

**Criaturas** — cuatro ilustraciones SVG de trazo claro (`rgba(234,245,250,·)` con relleno Laguna al 8–12%), dibujadas a mano en el prototipo: exportar esos SVG tal cual. Cada una tiene sus aletas en `<g>` separados con `transform-origin` propio. Todas usan `p` = progreso de su sección y `vis` = una campana `min(1, sin(π·p) * k)` para entrar y salir sin cortes. Opacity 0 si la sección está fuera de pantalla.

| Criatura | Dónde / tamaño | Recorrido | Aletas |
|---|---|---|---|
| Tortuga | capa fija, sobre `#descenso`; `clamp(150px,19vw,280px)` | `p = clamp((vh*1.1 - r.top)/(r.height + vh*0.9))`; izquierda → derecha: `x = -w + p*(vw*0.78 + w)`, `y = r.top + r.height*(0.1 + p*0.35) + sin(t*0.9)*10`, `rotate(7 + sin(t*0.9+1.2)*3 deg)`; opacity `min(1, sin(πp)*1.8) * 0.9` | delantera `sin(t*1.7)*20 - 4 deg`; trasera `sin(t*1.7+1.1)*10 deg` |
| Pez payaso | dentro del Arrecife (color, no trazo); `clamp(56px,6.5vw,92px)` | `p = clamp((vh - r.top)/(vh*1.5))`; derecha → centro: `x = r.width*(0.9 - p*0.3) + sin(t*0.6)*14`, `y = r.height*(0.34 + p*0.1) + sin(t*1.3)*6`, `rotate(sin(t*1.3+0.8)*4 deg)`; opacity `min(1, sin(π·min(1,p*1.15))*2)` | cola `sin(t*9)*14 deg`; pectoral `sin(t*7+1)*22 deg` |
| Delfín | fondo de "What already happened", en el margen superior; `clamp(140px,16vw,240px)` | `p = clamp((vh*1.05 - r.top)/(vh*0.95))`; izquierda → derecha rápido: `x = -1.1w + p*(r.width + 1.2w)`; ondula con `wave = p*3π`: `y = max(0, pad*0.5 - w*0.2) + sin(wave)*pad*0.18 + sin(t*1.1)*4` (`pad` = padding-top de la sección), `rotate(-cos(wave)*9 deg)`; opacity `min(1, sin(πp)*3) * 0.9` | cola `sin(t*5)*12 deg`; pectoral `sin(t*5+1.4)*8 deg`. Aleta dorsal inclinada **hacia la cola** |
| Ballena | fondo de About, detrás del texto; `clamp(320px,48vw,680px)` | `p = clamp((vh - r.top)/(r.height + vh*0.6))`; derecha → izquierda, lenta: `x = r.width - p*(r.width + 0.9w) + sin(t*0.25)*10`, `y = r.height*(0.12 + p*0.18) + sin(t*0.4)*8`, `rotate(-2 + sin(t*0.4+1)*1.5 deg)`; opacity `min(1, sin(πp)*2.2) * 0.5` | cola `sin(t*0.9)*9 deg`; pectoral `sin(t*0.9+1.2)*5 deg` |

`t` = segundos desde el montaje (`performance.now()`), no el scroll: las aletas y el vaivén siguen vivos con la página quieta.

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
