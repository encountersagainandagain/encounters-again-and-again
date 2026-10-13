# Revisión local de Art/Crew — 2026-10-09

Estado: preparada para revisión del usuario; no implica aprobación visual. Continúa exclusivamente PASO 4.0–4.2.

Continuidad y cierre documental: 2026-10-11. Las capturas y el reporte de navegador corresponden a la ejecución del 2026-10-09; no se presentan como pruebas nuevas del CMS.

Cierre de comprobaciones 2026-10-11: `npm run lint`, `npm test`, `npm run build` (incluye TypeScript) y `git diff --check`: PASS. Servidor de desarrollo reiniciado en 127.0.0.1:3218; `/review/art` respondió HTTP 200 tras compilar. La reanudación tuvo carga del sistema cercana a 500 y aviso de filesystem lento: las primeras solicitudes agotaron el tiempo de espera, luego respondieron. El build conserva el aviso heredado de antigüedad de Browserslist.

Checkpoint técnico 2026-10-12: el avance se conserva en Git y se publica únicamente en el repositorio privado de Encounters. Esto no constituye aprobación visual; la revisión del usuario continúa abierta. Sin despliegue ni cambios en servicios externos.

## Entrega de fidelidad visual de `/crew` — 2026-10-13

Estado: **implementada y esperando revisión visual de Juani. No está aprobada.** Responde al feedback «el formato más o menos va, pero no está muy estético; debe apegarse más al diseño». Alcance: solo `/crew`, más navbar, footer y cue de scroll compartidos. Sin cambios en el CMS, contenido, migraciones, Auth, RLS, Storage ni despliegues. El recorrido Art/Crew completo **no** queda cerrado: ver el pendiente de `/crew/wild-wonders` más abajo.

Revisar en `http://127.0.0.1:3218/crew`. Prototipo para comparar: `cd docs/encounters/handoff-current && python3 -m http.server 3220 --bind 127.0.0.1` y abrir `http://127.0.0.1:3220/The%20Crew.dc.html`.

### Implementado

Referencia: `The Crew.dc.html` (prevalece sobre los Markdown), abierto en Chrome headless junto a la implementación a 1440×900 y 390×844. Todo el contenido sigue saliendo del CMS; cambia la presentación.

| Área | Cambio |
| --- | --- |
| Portada | Cue «Scroll» con línea que cae (`cueDrop`) en lugar de flecha; espaciados de antetítulo y título del prototipo. Pin de 240vh sin cambios. |
| Navbar (compartido) | Pasa a claro al 95 % del primer viewport en portadas pineadas; velo superior de 140px separado; fondo y blur con las fórmulas del prototipo (`k = min(1, scrollY/240)`); activo en Laguna en Crew y perfiles (Art conserva el subrayado); logo a 32px de alto con su proporción (antes quedaba a la mitad); alineación de enlaces en tablet y móvil. |
| «Following our nature» | Titular propio con garabato. El bloque importado `team_002` («FOLLOWING OUR NATURE: Through our encounters in life.») se divide en titular y antetítulo en el primer `:`. |
| Relato (`team_004`) | Columna 4–6 de la grilla de 6; primer párrafo como lead Garamond, cuerpo en Archivo, último párrafo en itálica. Un párrafo que empieza con raya se une en itálica al anterior. |
| Par de fotos (`team_003`, `team_005`) | A sangre, sin separación, sección de 150vh con hijo sticky y entrada/salida encadenadas con los valores del prototipo. En móvil <760px y reduced motion queda en flujo. |
| «A project to unite them all» (`team_006`) | El último párrafo del bloque pasa a titular a la izquierda; el resto queda a la derecha. |
| Our crew | Tarjetas a sangre (columna de 1240px más ambos márgenes), degradado, tipografías y espaciados del prototipo. La biografía se parte en «Above all…» para la línea itálica; la cita «Etiqueta: valor» muestra el valor en dorado. Altura mínima, no fija, para no recortar biografías largas. |
| More about us | Título y garabato nuevos. Tira de retratos altos a sangre con nombre superpuesto; «read →» y hover de brillo solo con perfil publicado; sin perfil se renderiza como `div`. |
| Footer (compartido) | Línea monoespaciada de 10px bajo un filete, dentro del bloque oscuro. |
| Garabatos | Tres trazos del prototipo (`title`, `loop`, `wide`), atados al scroll. |
| Móvil | Se eliminó el cuerpo del relato a ~40px causado por una regla que se filtraba. |

Decisiones tomadas para apegarse al prototipo, a confirmar en la revisión:

- Se quitó de `/crew` el cierre claro «following our nature» que quedaba entre la sección oscura y el footer. `12-crew.md` menciona un cierre; el HTML no lo tiene.
- Las tarjetas ya no muestran el alias ni el enlace «Meet … →». Ambos campos siguen editables; el acceso al perfil queda en la tira.
- En la tira, el atenuado y el hover se aplican a la imagen. En el HTML del prototipo el motor de `data-seq` pisa ese filtro y la tira termina sin atenuar; se implementó la intención descrita en `12-crew.md`.

Archivos: `app/crew/page.tsx`, `src/components/public/ImportedEditorial.tsx`, `EditorialInteractive.tsx`, `EditorialPieces.tsx`, `SiteChrome.tsx` y `src/styles/editorial.css`.

### Verificado

Ejecutado el 2026-10-12 y 2026-10-13 con Chrome headless y Playwright instalado fuera del repositorio (la extensión de Chrome no estaba conectada). Solo lectura contra el servidor 3218.

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit` y `eslint` sobre los cinco archivos TSX modificados | Sin errores, repetidos el 13/10 después de los últimos retoques. |
| `/crew` 1440×900, scroll completo | Sin desbordamiento horizontal, sin imágenes rotas, sin errores de consola. Altura 8762px; prototipo 8792px. Captura anterior a dos retoques menores (ancho del logo y espaciado de etiquetas). |
| Pin de portada y par de fotos, 12 posiciones de scroll iguales en prototipo e implementación | Estados coincidentes; el relato importado tiene un párrafo más y desplaza ~40px lo que sigue. |
| `/crew` 390×844 | Una pasada con límite de 90s: relato, par, tarjetas y tira en las columnas previstas. |
| Teclado en `/crew` (límite 100s) | Tab enfoca «Skip to content»; Enter lleva el foco a `main-content`; el siguiente Tab enfoca el cue y el siguiente el único perfil publicado en la tira, con contorno visible Laguna; Enter abre `/crew/wild-wonders`. Sin errores de consola. |
| Reduced motion en `/crew` (límite 100s) | Portada sin pin (900px, `position: relative`, sin solapamiento), par en flujo (`static`), 18 de 18 elementos animados en reposo, tres garabatos completos, sin animaciones de cue, navbar ni portada, sin desbordamiento. |
| Navbar y footer en `/art` y `/review/art` (límite 100s) | HTTP 200; navbar claro desde el inicio (`rgba(234,245,250,.6)` → `.92` con blur de 14px al bajar), velo apagado, activo con subrayado, logo 77×32; footer monoespaciado de 10px sobre Abismo al final del documento; sin desbordamiento ni errores de consola. |
| Retratos de la tira al saltar directo a ella (límite 60s) | Los seis cargan; tardaron 5,6s en desarrollo (carga diferida y medios sin caché). Por eso la captura de foco los muestra todavía vacíos. |

No ejecutado en esta entrega: `npm test`, `npm run lint` completo, build, anchos 360/768/1024px, estado hover de la tira, perfiles y resto de `/review`. Una batería que los incluía se interrumpió sin resultados y no se relanzó. No se repitió la prueba del CMS: los cambios no tocan escritura, permisos ni datos.

Capturas: [prototipo desktop 1](verification/review-2026-10-13-crew/prototype-desktop-1.jpg) · [2](verification/review-2026-10-13-crew/prototype-desktop-2.jpg) · [implementación desktop 1](verification/review-2026-10-13-crew/crew-desktop-1.jpg) · [2](verification/review-2026-10-13-crew/crew-desktop-2.jpg) · [antes de esta entrega](verification/review-2026-10-13-crew/crew-desktop-before.jpg) · [pines del prototipo](verification/review-2026-10-13-crew/prototype-pin-states.jpg) · [pines de la implementación](verification/review-2026-10-13-crew/crew-pin-states.jpg) · [móvil](verification/review-2026-10-13-crew/crew-mobile.jpg) · [prototipo móvil 1](verification/review-2026-10-13-crew/prototype-mobile-1.jpg) · [2](verification/review-2026-10-13-crew/prototype-mobile-2.jpg) · [reduced motion](verification/review-2026-10-13-crew/crew-reduced-pair.jpg) · [foco de teclado](verification/review-2026-10-13-crew/crew-keyboard-focus-strip.jpg) · [tira](verification/review-2026-10-13-crew/crew-strip-direct-jump.jpg) · [Art, footer](verification/review-2026-10-13-crew/art-footer.jpg) · [Art de prueba, navbar](verification/review-2026-10-13-crew/review-art-top.jpg).

### Pendiente separado: recarga en bucle de `/crew/wild-wonders` en desarrollo

**Sin resolver y sin investigar la causa.** Mientras siga abierto, el recorrido Art/Crew no se considera cerrado.

- Síntoma: en el servidor de desarrollo 3218 la página responde HTTP 200 pero se recarga sola sin detenerse. La consola repite `[HMR] connected` → `[Fast Refresh] rebuilding` → navegación completa.
- Evidencia: 8 navegaciones del frame principal en 12s; `/crew` y `/review/art` hicieron 2 (una recarga tras la carga inicial) y `/art` y `/review/art` una recarga en la comprobación del 13/10. Al cortar quedaban pendientes la propia página y `/api/media/9ed1097e-…`. Con `waitUntil: 'networkidle'` la carga agota 120s.
- Es anterior a esta entrega: con los cambios apartados (`git stash`) dio las mismas 8 navegaciones en dos mediciones seguidas; después se restauraron.
- Cómo reproducir: abrir `http://127.0.0.1:3218/crew/wild-wonders` con la consola abierta, o con Playwright contar eventos `framenavigated` del frame principal durante 12s tras `goto(..., {waitUntil: 'domcontentloaded'})`.
- Sin comprobar: si ocurre en un navegador con interfaz, en el servidor 3219, en `/review/crew/*` o en un build de producción.

### Diferencias visuales pendientes

- Retratos y orden vienen del CMS y no son los del prototipo (orden actual: Julian, Fabrizio, Georgia, Hugo, Maja, Alexis). Los recortes usan el foco 50/50 de cada medio, editable en la biblioteca.
- Hugo, Maja y Alexis no tienen rol cargado; el prototipo muestra «Crew».
- El copy importado difiere del prototipo; falta, por ejemplo, «Now we have crossed…».
- El footer no muestra email porque no está cargado en settings.
- Solo Georgia tiene perfil publicado, así que solo su retrato muestra «read →».
- La portada en móvil sigue en flujo; el prototipo la mantiene pineada.
- El navbar móvil mide ~16px más que el prototipo por el área táctil de los enlaces.
- El activo en Laguna sobre navbar claro tiene poco contraste; es fiel al prototipo.

Próxima acción: **revisión visual de Juani sobre `/crew`**. Después de su respuesta, continuar con el resto de Art/Crew y con el bucle de Wild Wonders.

## Revisión local de Art/Crew — 2026-10-09: abrir la revisión

Servidor de desarrollo: **http://127.0.0.1:3218**. Si se detiene: `npm run dev -- --hostname 127.0.0.1 --port 3218`.

| Pantalla | Ruta | Qué mirar |
| --- | --- | --- |
| Art real | `/art` | Título, firma, navegación y estado vacío; no hay curación real. |
| Art de prueba | `/review/art` | Cinco categorías, flechas/contador, chips y vuelta a All. |
| Categoría de prueba | `/review/art/test-gallery` | Portada, introducción, tarjeta y enlace a la obra. |
| Obra de prueba | `/review/art/test-gallery/test-work` | Portada, dos responsables, índice, texto, imagen y carrusel. |
| Responsables ficticios | `/review/crew/test-person-a`, `/review/crew/test-person-b` | Enlaces desde la obra y regreso a las obras acreditadas. |
| Categoría vacía | `/review/art/test-empty` | Estado vacío dentro de una colección. |
| Otros layouts de muestra | `/review/art/test-books`, `/review/art/test-films`, `/review/art/test-audio` | Distribución de tarjetas feature/video/audio. No se simula reproducción externa ni publicación de esos medios. |
| Crew real | `/crew` | Ver la entrega del 2026-10-13 arriba: portada pineada, relato, par de fotos pineado, tarjetas, «More about us» y tira. |
| Wild Wonders real | `/crew/wild-wonders` | Portada, transición al papel, bloques importados, imágenes y lectura móvil. |

Las rutas canónicas reales siguen siendo `/art/[category]` y `/art/[category]/[slug]`. Hoy no hay slugs reales de categorías/obras curadas. Los ejemplos solo existen bajo `/review`.

## Separación de los datos de prueba

- Ruta disponible solo con `NODE_ENV=development` y Host `localhost` o `127.0.0.1`. En `next start`, incluso local, devuelve 404. También devuelve 404 para otro Host.
- Datos en memoria, importados únicamente por esa ruta. No hay API de escritura, persistencia, seeds, importación ni altas de Auth.
- Aviso fijo **LOCAL TEST DATA**, nombres Test y responsables ficticios A/B. Ninguna atribución ficticia se agrega al Crew real.
- Usa componentes públicos compartidos: portada, tarjetas, responsables, categorías, filtros, bloques, carruseles y breadcrumbs. La composición de las pantallas de muestra es de revisión; no es el CMS ni prueba el guardado en Supabase.
- Imágenes de muestra: assets públicos del handoff, nunca medios privados. El shell general sigue leyendo settings públicos mediante el cliente anónimo existente; la muestra no modifica esos settings.
- `/art`, `/crew` y `/crew/wild-wonders` conservan sus lecturas reales y permisos. Ningún fixture se agrega a esas consultas ni al sitemap. Se mantiene noindex global, metadata y `X-Robots-Tag`.

## Contraste con prototipos y handoff vigentes

Se contrastaron `Art.dc.html`, `The Crew.dc.html`, `Wild Wonders.dc.html`, `Post.dc.html`, sus capturas conservadas y handoff 00, 02, 12, 13, 16 y 18. Los HTML prevalecen para la apariencia; categoría/obra no tienen HTML dedicado y extienden Art/Post.

| Área | Resultado / diferencia que queda visible |
| --- | --- |
| Art: tipografía, firma, chips | Mantiene Garamond/Archivo, un solo trazo, chips en flujo y filtro con scroll. La muestra de cinco categorías permite revisar el carrusel requerido por handoff/16; el prototipo está poblado con cuatro. |
| Art: contenido y grillas | Los datos reales siguen vacíos. Las muestras no reemplazan la curación ni equivalen a aprobar una colección real. Las secciones genéricas conservan diferencias de proporción/altura respecto de las composiciones específicas del HTML. Revisar antes de cerrar la fidelidad visual. |
| Crew/Wild Wonders: portada | Se restaura 240vh + hijo sticky de 100vh + superposición del contenido claro de -100vh. Zoom, oscurecimiento/desaturación y salida del título usan las rampas del HTML vigente. En móvil <760px y reduced motion se libera el pin y se elimina la superposición. |
| Crew: relato y personas | Rehecho el 2026-10-13 según el prototipo (sección superior). Se conserva el texto importado y biografías editables, aunque difieran del copy del prototipo. Las tarjetas crecen con biografías largas. Solo enlazan perfiles habilitados y publicados. |
| Pares de imágenes dentro del relato | **Crew: resuelto el 2026-10-13** con el par sticky del prototipo; lo que sigue vale para Wild Wonders. Los HTML también contienen pares internos con sticky/entradas y salidas encadenadas. La adaptación actual conserva pares y revelados en flujo; **no se declara paridad de esas coreografías internas**. Pendiente de revisión; la corrección de este turno se concentra en las portadas solicitadas. |
| Wild Wonders: bloques | Conserva grupos adaptados del contenido importado y portada de diseño. No se sustituyen textos o imágenes importados para copiar el contenido de ejemplo. |
| Obra/Post: bloques | Índice, responsables, imágenes y carrusel se pueden recorrer. El bloque de imagen genérico conserva diferencias de altura y no reproduce todo el parallax interno de la imagen grande de Post. Pendiente de revisión de fidelidad; las muestras no validan medios externos. |

## Por qué se había cambiado el pin

El checkpoint anterior solo registraba «portada de un viewport y flujo continuo con parallax/revelado, sin retener el scroll» como diferencia pendiente. **No se encontró una justificación de la decisión ni aprobación** en phase4-art-crew.md o design-decisions.md. Por eso no se atribuye el cambio a una decisión del usuario ni se inventa un motivo técnico: se revierte esa desviación según la instrucción actual.

Al probar el pin restaurado se encontró un problema concreto distinto: reglas heredadas `overflow-x:hidden` en `section` y `body` creaban un ancestro de scroll e impedían el sticky. Se corrige solo donde existe `.photo-hero-pin`, con overflow visible/clip, sin cambiar otras páginas. La animación de entrada y el movimiento por scroll tienen capas separadas para que sus transforms no se sobrescriban.

Se corrigió además el cálculo de offsets del carrusel y se centraron sus extremos: las flechas deben avanzar desde el primer elemento hasta el último. Se mantiene desplazamiento instantáneo con reduced motion.

## Verificación funcional y límite del CMS

**Actualización 2026-10-12:** Supabase CLI está disponible tanto en Homebrew (`2.120.0`) como en la dependencia fijada por el proyecto (`2.119.0`). Se instalaron las herramientas gratuitas Colima `0.10.3` y Docker CLI `29.9.0`; Colima quedó activo con 4 CPU, 6 GB de memoria y disco de 30 GB. Supabase local inició Postgres, Auth, PostgREST y Storage, aplicó las 14 migraciones existentes y completó el recorrido integrado.

La preparación del repositorio ya quedó lista para ese entorno:

- `npm run cms:local:prepare` inicia Supabase local con las 14 migraciones existentes, verifica que Auth mantenga el registro público desactivado y crea un administrador y dos integrantes de Crew estrictamente sintéticos.
- Las credenciales y claves locales se generan en `.encounters-work/local-cms.json`, ruta ignorada por Git. No modifica `.env.local`.
- `npm run cms:local:dev` inicia una segunda aplicación en `127.0.0.1:3219` con variables de proceso locales. El servidor habitual y la base remota conservan su configuración.
- El código solo admite el origen remoto confirmado o, con `ENCOUNTERS_ALLOW_LOCAL_SUPABASE=true` y fuera de producción, exactamente `127.0.0.1:54321`/`localhost:54321`. Los tests rechazan otros proyectos, otros puertos y Supabase local sin la bandera explícita.
- `npm run cms:local:stop` detiene únicamente el stack local. No se usa `db reset` remoto, importación del snapshot ni datos reales.

La app aislada queda disponible en `http://127.0.0.1:3219`; la revisión visual original continúa en `http://127.0.0.1:3218`. Usan directorios de compilación separados para poder funcionar al mismo tiempo. Para futuros arranques: `colima start`, `npm run cms:local:prepare` y `npm run cms:local:dev`. No hace falta crear un proyecto alojado ni servicio pago.

No se usó la base real como reemplazo. La sesión administrativa, la categoría, las obras, el usuario y los integrantes de Crew son locales y sintéticos. No se importó el snapshot, no se copió contenido real y no se enviaron correos.

| Recorrido | Estado |
| --- | --- |
| Pantallas públicas, noindex, pin, móvil y reduced motion | Evidencia de esta revisión en `verification/review-2026-10-09/browser.json` y capturas. |
| Categoría → obra → dos responsables → perfiles → obra | **PASS** con datos persistidos en Supabase local; ambos perfiles mostraron la relación inversa. |
| Crear categoría y obra, asignar responsables y guardar borrador en CMS | **PASS** desde navegador: categoría publicada, obra draft, bloque y dos responsables guardados. |
| Previsualizar borrador desde CMS y publicar | **PASS**: preview visual mostró el contenido guardado; antes de publicar la URL devolvió 404 y después respondió 200. |
| Duplicar desde CMS y comprobar copia en borrador | **PASS**: título, UUID y slug nuevos; estado draft; bloque, categoría y dos responsables conservados. |
| Anónimo no puede acceder al borrador/copias/medios privados | **PASS**: la copia devolvió 404; anon recibió cero filas del post, artwork, bloques y media; Storage rechazó la descarga y `/api/media/[id]` devolvió 404. |

Resultado estructurado: [result.json](verification/review-2026-10-12-local-cms/result.json). Capturas: [duplicado draft en admin](verification/review-2026-10-12-local-cms/admin-duplicate-draft.png), [obra publicada](verification/review-2026-10-12-local-cms/published-artwork.png) y [duplicado anónimo 404](verification/review-2026-10-12-local-cms/anonymous-duplicate-404.png). La verificación directa confirmó registro público desactivado, destino `127.0.0.1:54321`, dos identidades distintas, dos responsables por obra, original publicado visible, duplicado draft privado y medio sintético privado inaccesible por tabla, Storage y endpoint. `remote_writes: 0`; `emails_sent: 0`.

## Evidencia de navegador

[Reporte completo](verification/review-2026-10-09/browser.json): PASS en las comprobaciones enumeradas, sin errores JavaScript de página. Se utilizó Chrome headless aislado con Playwright local porque la herramienta del navegador integrado no estaba expuesta; sin sesión administrativa. Los avisos de desarrollo de Next Image sobre LCP/dimensiones no se clasifican como errores de página.

- Escritorio 1440×1000: pin de 2400px, portada de 1000px, top 0 tras desplazar 800px y papel en y=600px, en Crew y Wild Wonders.
- Reduced motion: pin liberado y texto visible. Móvil 390×844: seis pantallas sin desbordamiento horizontal y portadas en flujo.
- Clics: categoría → obra → ambos responsables → obra; filtros, flechas del carrusel, índice y carrusel de imágenes.
- Muestras: HTTP 404 en producción local y con Host no local, sin contenido ficticio en la respuesta.
- Art real sigue vacío; Tab → Skip to content → Enter transfiere el foco a main-content.

| Captura | Enlace |
| --- | --- |
| Crew | [Portada](verification/review-2026-10-09/crew-desktop.png) · [Pin](verification/review-2026-10-09/crew-pin.png) |
| Wild Wonders | [Portada](verification/review-2026-10-09/wild-wonders-desktop.png) · [Pin](verification/review-2026-10-09/wild-wonders-pin.png) |
| Art de prueba | [Portada](verification/review-2026-10-09/art-samples-desktop.png) · [Filtro](verification/review-2026-10-09/art-filtered.png) |
| Obra | [Índice](verification/review-2026-10-09/artwork-index.png) · [Móvil](verification/review-2026-10-09/-review-art-test-gallery-test-work-mobile.png) |

## Decisiones que requieren revisión visual

- Ritmo del pin restaurado, legibilidad y transición de portada a fondo claro en Crew/Wild Wonders.
- Composición de categorías y obras con contenido real aún por curar; tamaños de imágenes y lectura de créditos.
- Biografías largas, orden del relato y diferencias de copy respecto del prototipo.
- Fidelidad pendiente de los pares internos y del bloque de imagen de Post, descrita arriba.

No se avanzó con Home u otras páginas. Sin despliegues, emails, migraciones, importaciones ni cambios en DNS, WordPress o Katie.
