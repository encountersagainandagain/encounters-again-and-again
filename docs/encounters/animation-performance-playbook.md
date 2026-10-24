# Animación y rendimiento — playbook

Implementación **final** de la Home (scroll, fluidez y efectos) y lo aprendido para reutilizarlo en otras páginas.

**Aprobación (2026-10-24):** Juani aprobó el scroll, la fluidez y los efectos de la Home **en el entorno donde la probó**: su computadora y su navegador, con trackpad, sobre https://encounters-again-and-again-gamma.vercel.app.
- La aprobación no se extiende a dispositivos no probados: Safari de escritorio, iPhone, iPad, Android, pantallas de 120 Hz y equipos de menos potencia siguen sin validar.

Detalle de cada ronda y de sus mediciones: [entornos.md](entornos.md) (sección «Rendimiento y caché») y [page-progress.md](page-progress.md).

---

## Parte 1 — Principios reutilizables

### 1. Un solo reloj por página
- Una página con coreografía de scroll usa **un único `requestAnimationFrame`**, [`useFrame`](../../src/components/public/useFrame.ts).
  - Guarda en caché la altura del viewport y solo la actualiza con cambios grandes (la barra de direcciones móvil no la recalcula).
  - Se reinicia al volver a la pestaña.
  - Con `prefers-reduced-motion` pinta un único estado estático.
- **Por qué funciona:** todas las capas se calculan desde la misma posición y en el mismo cuadro. Con varios bucles, o con listeners de `scroll` que escriben estilos, cada capa lee una posición distinta y aparecen temblores entre capas.
- **Si hay scroll suavizado (Lenis), lo avanza ese mismo reloj** (`autoRaf: false`, y `lenis.raf(now)` al principio del cuadro). El scroll y las capas salen del mismo instante, sin un segundo reloj que se desfase.

### 2. Medir geometría estable
- Las posiciones que deciden una animación se leen **sin la transformación que esa misma animación aplica**. En [HomeView.tsx](../../src/components/public/HomeView.tsx), `settled()` resta el desplazamiento propio (`ty`) de la tarjeta antes de calcular su progreso.
- **Por qué:** si el progreso se mide sobre el elemento ya movido, cada cuadro corrige el anterior y se forma un lazo de realimentación. El elemento oscila o «tironea» aunque la página esté quieta.
- Los tamaños que no cambian con el scroll (criaturas, alturas de línea) se leen **solo en `resize`**, no en cada cuadro.

### 3. Suavizado independiente de los FPS
- Un retardo expresado como fracción por cuadro (`x += (target-x)*.08`) cambia con la frecuencia de pantalla: a 120 Hz el retardo es la mitad y con cuadros perdidos es el doble.
- La Home usa un retardo en tiempo: `x += (target-x)*(1-exp(-dt/200))`, con `dt` acotado a 250 ms. Son ~200 ms de retardo a cualquier frecuencia.
- **Si el scroll ya está suavizado (Lenis), no se suaviza dos veces:** las capas siguen la posición directa.

### 4. Inicializar en la posición actual
- El primer cuadro después de hidratar arranca donde ya está la página: el estado suavizado se inicializa en la posición real (`first ? raw : …`).
- **Por qué:** en una primera visita el usuario puede scrollear antes de que llegue el JS. Si el estado arranca en 0, la página «reproduce» el descenso desde arriba. No se toca el scroll ni se bloquea nada.

### 5. No recalcular en la GPU lo que no cambia
- Un `filter: blur()` animado o a pantalla completa obliga a recalcular el desenfoque en cada cuadro. Debajo de un canvas que se redibuja entero cada cuadro (el agua), eso se paga siempre.
- Lo que es estático se **precalcula en archivos** y la GPU solo mezcla texturas (opacidad), que es barato.
- Si una transición necesita «desenfocado → nítido», se cruza una copia desenfocada de antemano con la nítida, en lugar de animar `blur()`.

### 6. Calidad adaptativa, con protección del arranque
- Un efecto caro puede regular su resolución según el tiempo real de cuadro. La regla: bajar cuando los cuadros fallan de forma sostenida, subir como mucho una vez y recordar el nivel que se sostiene.
- **No juzgar durante el arranque.** Los cuadros justo después de hidratar son lentos por scripts y por la primera decodificación de imágenes, no por el efecto. El regulador espera a que la página termine de cargar y 1,5 s más.
- Si un nivel guardado pudo calcularse mal, se **versiona la clave** para descartarlo.

### 7. Imágenes, caché y fuentes
- **Imágenes:** el tamaño que se pide es el tamaño al que se dibuja. `sizes` describe el ancho dibujado, no el de la caja: una foto con `object-fit: cover` en un panel alto se dibuja más ancha.
- **Caché:** los archivos con hash en el nombre se cachean un año. Lo editable se cachea poco y se invalida al publicar. Lo que lleva sesión no se cachea nunca.
- **Fuentes:** WOFF2 recortadas a los caracteres y rasgos OpenType que se usan.
  - Al recortar fuentes variables, hay que comprobar los avances de cada letra contra el original en cada peso usado. Recortar el eje de peso puede dejar mal la tabla HVAR.
  - El respaldo métrico se ajusta al texto que lo necesita: un título en mayúsculas no se comporta como el texto corrido.
  - Se comprueba que el final no cambie, píxel por píxel.

### 8. Limpieza, historial y accesibilidad
- Todo lo que una página crea (bucle, Lenis, listeners, contexto WebGL) se destruye al salir. Al volver con Atrás se crea de nuevo.
- Las anclas internas crean su entrada de historial con `history.pushState`, que el router de Next integra copiando su propio estado. Una navegación nativa al fragmento crea una entrada que el router ignora: al volver con Atrás desde otra página, se veía esa otra página con la URL de esta.
- **Reduced motion:** sin scroll suavizado, sin partículas y con un estado final estático. Las anclas saltan sin animación.

### 9. Medir sin saturar la computadora
- **Antes de medir:** carga del sistema baja, sin modo de bajo consumo, y lo ideal es con cargador. Se anota si se midió a batería.
- **Un solo navegador de prueba**, con perfil temporal y cerrado siempre, también ante un error o un Ctrl-C. Nunca tocar el navegador personal.
- **Guarda de carga:** si la carga del sistema pasa un umbral, la prueba se detiene y se informa qué proceso consume. No se acumulan corridas.
- **Primero una pasada corta** que compruebe que el banco mide bien (el recorrido real frente al pedido, que el scroll suavizado no duplique el desplazamiento, selectores).
- **Corridas breves** con el orden de variantes y escenarios rotado. Esperas siempre acotadas: un `await` sin tope colgó una prueba.
- **Separar el tramo activo del frenado.** Con Lenis, el deslizamiento posterior al gesto se informa aparte.
- **Medir con el viewport real.** Con un viewport emulado (escala 1 sobre una pantalla 2×), Playwright entrega `deltaY` duplicado a la página.
- Las corridas hechas con la máquina saturada no son resultados: se guardan aparte como diagnóstico.
- Herramientas usadas, fuera de Git: `.encounters-work/bench-scroll-2026-10-23/` (`bench3.mjs`, `coldprobe.mjs`, `coldstart.mjs`, `check2.mjs`, `hist.mjs`, `delayfont.mjs`).

---

## Parte 2 — Decisiones específicas de Encounters

### Lenis en la Home
- **Solo en la Home**, por defecto ([HomeView.tsx](../../src/components/public/HomeView.tsx)). Ni otras páginas ni el admin.
- **Configuración:** `new Lenis({autoRaf:false, smoothWheel:true, syncTouch:false, anchors:true})`.
  - Rueda y trackpad suavizados.
  - **Táctil nativo** en móvil (`syncTouch: false`).
  - Las anclas internas las anima Lenis.
- Lo avanza el reloj de la Home (`lenis.raf(now)` antes de calcular las capas).
- **No se activa** con reduced motion ni con `?scroll=native` o `?calc=a`. Esas dos variantes quedan temporalmente para comparar.
- **Al salir de la Home:** `destroy()`, y además se cancela un temporizador de 400 ms que Lenis 1.3.26 deja vivo y que volvía a poner su clase en `<html>`.
- Al volver con Atrás se crea de nuevo. Verificado: 5 listeners de rueda en la Home y 4 fuera de ella.

### Agua (shader WebGL)
- Es el shader del prototipo dibujado en un único triángulo a pantalla completa, con alfa premultiplicada. Omite solo los términos que el propio `mix()` o un factor cero descartan ([homeWater.ts](../../src/components/public/homeWater.ts)).
- **Resolución:** hasta 1,75 píxeles de dispositivo por píxel CSS (1,25 en teléfonos).
- **Regulador** (`govern()` en HomeView): baja la escala cuando los cuadros superan su presupuesto de forma sostenida (mínimo 1×, con un paso calculado sobre el costo cuadrático) y sube como mucho una vez.
  - Recuerda el nivel en `localStorage` con la clave `encounters.water.scale.v2`. La `v2` descarta niveles guardados antes de corregir el arranque.
  - **No juzga** hasta `document.readyState === 'complete'` y 1,5 s después de crear el agua. En una primera visita bajaba de 1,75× a 1,25× en pleno scroll y lo recordaba.
  - `?water=full` desactiva el regulador.
- El agua y las capas de fondo **se ocultan y dejan de dibujarse** cuando no hay ninguna capa visible (`backVisible`).
- Sin WebGL, o si se pierde el contexto, se usa un degradado con textura de cáusticas.
- **Descartado como causa de tirones:** compilar el shader. `getProgramParameter` y `getShaderParameter` tardan menos de 3 ms.

### Desenfoques precalculados
- **Fondo de la Home:** las dos capas que se desenfocan al bajar (4 px y 11 px, con `saturate()`) son archivos ([home-bg-focus.mjs](../../scripts/home-bg-focus.mjs) → [home-bg-focus.json](../../src/config/home-bg-focus.json)).
  - Hay una copia por rango de altura de ventana, elegida con `<picture media>`, porque el radio en píxeles de la foto depende de la altura.
  - Antes eran `filter: blur()` debajo del agua: las trazas mostraban el hilo principal esperando 100–145 ms al compositor.
- **Tarjetas de Proyectos:** entran en foco cruzando una foto desenfocada de antemano (`data-pfocus`: `/api/media/<id>?w=360&blur=3.6`, o la variante `#focus` de las imágenes de diseño) con la nítida. Sin filtro por cuadro. El título y el texto quedan siempre nítidos.

### Imágenes y caché (producción)
- **Loader propio** ([imageLoader.ts](../../src/lib/imageLoader.ts)), sin el optimizador de Vercel.
  - **CMS:** `/api/media/<id>?w=` sirve un WebP del ancho pedido, con el mismo control de acceso que el original. Las imágenes publicadas, sin sesión, se cachean 10 minutos; con sesión, `private, no-store` ([route.ts](../../app/api/media/[id]/route.ts)).
  - **Diseño:** variantes WebP con hash en el nombre (`node scripts/image-variants.mjs`), cacheadas un año.
- **Páginas públicas:** ISR de 5 minutos, invalidado al instante desde el admin. Tabla completa de capas y tiempos en [entornos.md](entornos.md#caché-y-cuánto-puede-seguir-visible-algo-despublicado).

### Fuentes
- EB Garamond (normal e itálica) y Archivo, locales con `next/font/local` ([layout.tsx](../../app/layout.tsx)), con `display: swap` y respaldo métrico.
- **WOFF2 de 173 KB en total** ([subset-fonts.mjs](../../scripts/subset-fonts.mjs)):
  - caracteres: Latin-1 y Extended-A, acentos, puntuación, sub y superíndices, € ™ y flechas;
  - rasgos: los que el navegador aplica por defecto más `tnum`;
  - **eje de peso completo:** recortado a 400–500, harfbuzz 0.4.15 dejaba mal los avances en peso 500;
  - las posiciones de cada letra coinciden con los TTF originales en los 8 pares de familia y peso que usa el sitio.
- **Respaldos propios del descenso de la Home** ([site.css](../../src/styles/site.css), `--font-display-face` y `--font-body-face`):
  - título: Times New Roman al 97,5 % (97 % hasta 362 px);
  - párrafo: Arial al 98 %;
  - cortan como las fuentes finales en la gran mayoría de los anchos probados, y la composición final no cambia.

### Historial y anclas
- Un manejador en [SiteChrome.tsx](../../src/components/public/SiteChrome.tsx) atiende los enlaces `#…` de la misma página en todo el sitio público.
  - Crea la entrada con `history.pushState`, que Next integra al router.
  - El desplazamiento lo hace Lenis en la Home y `scrollIntoView` (según el `scroll-behavior` del CSS) en las demás páginas.
  - El foco pasa a los destinos que lo aceptan, como el `<main>` del skip link.
- Al entrar a una página nueva, Next la muestra arriba desde el primer cuadro (`data-scroll-behavior="smooth"` en `<html>`).
- En Atrás/Adelante, la posición se restaura de forma instantánea.
- **Verificado** con Lenis, con scroll nativo y con reduced motion: carga directa con hash, navbar, skip link, y el índice de un post creado y guardado desde el CMS local.

---

## Lo que no se concluye
- **La batería del 2026-10-23 al mediodía**, con la máquina saturada (carga ~273, bajo consumo), quedó solo como diagnóstico. El 19,8 % de cuadros perdidos de Lenis que salió ahí no se reprodujo con la máquina en condiciones.
- **A y B** (el cálculo anterior y el nuevo, con scroll nativo) no se distinguieron en el banco (M2, 60 Hz). B quedó como base por diseño (es independiente de los FPS), no por una diferencia medida.
- **Red real:** su variabilidad no permitió atribuir una mejora de arranque. El efecto de las fuentes (la animación arranca ~40 % antes) se midió con la red limitada a 150 KB/s.

## Limitaciones y pendientes reales
- **Dispositivos sin probar:** Safari, iPhone, iPad, Android, pantallas de 120 Hz y equipos lentos. La aprobación vale solo para el entorno de Juani.
- **Red lenta:** el agua espera a los scripts de Next, que van `async` con prioridad baja. No se cambió cómo Next los emite.
- **Respaldo del descenso:**
  - entre 363 y 371 px el título salta una línea (+20 px) al llegar la fuente;
  - en Android no hay Times New Roman ni Arial: no se comprobaron sus fuentes reales.
- **El CSS viaja tres veces en el HTML** (`experimental.inlineCss`: en el `<style>` y dos copias en el payload de RSC). Comprime bien. No se tocó.
- Las variantes `?scroll=native` y `?calc=a` siguen activas hasta que se decida retirarlas.
