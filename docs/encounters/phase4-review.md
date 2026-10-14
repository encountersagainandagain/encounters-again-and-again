> Continuación (2026-10-14): el módulo Art completo, las mejoras comunes del CMS, los ejemplos locales y el orden de los módulos siguientes están en [art-module.md](art-module.md).

# Decisiones de Juani — 2026-10-14

- **Wild Wonders (`/crew/wild-wonders`): aprobado visualmente.**
- **Segundo perfil (plantilla con estructura distinta): aceptado como formato inicial**; se ajustará más adelante.
- **Admin: NO aprobado.** Su presentación cambió mucho respecto del admin original y resulta poco amigable. Antes de probar sus funcionalidades hay que mejorar diseño y usabilidad. La revisión manual de Juani sigue pendiente; nada del admin figura como validado por el usuario.

## Entrega de diseño y usabilidad del admin — 2026-10-14

Estado: **implementada y esperando la prueba manual de Juani. No validada por el usuario.** Solo administración; sin cambios en páginas públicas, esquema, RLS, Auth, servicios ni datos remotos.

Revisar en `http://127.0.0.1:3219/admin` (app local aislada contra Supabase local; credenciales locales en `.encounters-work/local-cms.json`, fuera de Git). Si no responde: `colima start`, `npm run cms:local:prepare`, `npm run cms:local:dev`.

### Qué había cambiado y por qué

- La base de Katie tenía un admin de blog con estilo propio: `AdminPosts` y `AdminPostForm`, fondo claro, cards con borde, etiquetas pequeñas en mayúsculas y botones `btn-ocean`, con su propio encabezado.
- Para cubrir el modelo de Encounters (tipos de contenido, Crew, categorías, medios, anuncios, tarjetas de expediciones, responsables, relaciones, bloques, borrador/publicación y preview), se creó `EncountersCms` en `/admin/content`, y el inicio del admin pasó a enlazar ahí. **El cambio funcional era necesario**; el visual no se diseñó: formularios crudos sin agrupar, botones como texto plano y, al quitar el encabezado heredado, el admin quedó dentro del header y el footer públicos oscuros, con poco contraste. El inicio era una lista de tres enlaces.
- El editor detallado heredado de Katie (`/admin/posts/[id]/edit`) se conserva para los bloques que el editor simple no cubre.

### Implementado

| Área | Cambio |
| --- | --- |
| Estructura | Armazón propio del admin (`AdminShell`): barra lateral Abismo con grupos Overview / Content / Site, sección activa marcada, «View site» y «Sign out»; en pantallas pequeñas pasa a barra superior con navegación horizontal. Skip link al contenido. El admin ya no hereda el header ni el footer públicos. Solo aparecen los módulos habilitados en `modules.ts`. |
| Estilo | `src/styles/admin.css`, todo bajo `.adm`: fondo Espuma suave, cards blancas, tinta y Marea para texto y botones, Laguna solo sobre fondo oscuro, Alga/Oro para estados. EB Garamond en títulos, Archivo en la interfaz. Sin animaciones. |
| Inicio | Acciones frecuentes (nueva publicación, subir imágenes, editar el Crew), contenido editado recientemente desde la base (6 últimos, con estado) y cards de todas las secciones habilitadas. Sin métricas inventadas. |
| Listados | Publicaciones en tabla con miniatura de portada, título y dirección, tipo, estado con texto y color, última edición y «Edit»; búsqueda y filtros por tipo y estado. Crew y categorías en cards con retrato o portada. Medios en grilla de miniaturas con descripción, tamaño y ajuste, más zona de subida. Anuncios y tarjetas de expediciones en tabla. |
| Miniaturas | Los medios siguen privados: se piden a `/api/media/[id]` con el token del administrador y se muestran con URLs temporales. |
| Editor de contenido | Barra fija con estado real (Draft/Published), «Unsaved changes»/«All changes saved», Duplicate as draft, Visual preview, Full preview (ruta), Save y «Save and publish»/«Unpublish». Secciones: información general, bloques, detalles del tipo, responsables (con retratos), relacionados, hijos (necesidades/sesiones), búsqueda y sharing; a la derecha publicación y portada con miniatura. Todos los campos anteriores se conservan, agrupados. |
| Bloques | Cada bloque en una card con número, tipo, Up/Down (antes solo había subir), Duplicate y Remove; imagen con miniatura; botones «+ tipo» para agregar. Enlace al editor detallado para tipos no cubiertos. |
| Crew, categorías, medios, anuncios, tarjetas | Mismo lenguaje: datos en «Details», estado/orden/página de perfil en «Publication», imágenes con miniatura. Crew enlaza a «Edit profile page» (este editor) y conserva el enlace al editor detallado. |
| Settings | General y contacto, presentación de Art/Crew y secciones de Home en cards, con ayuda en cada campo. Misma lógica de guardado. |
| Login y permisos | Pantalla de acceso y mensajes de permisos con la paleta; misma lógica. |
| Ayudas | Textos que explican para qué sirve cada campo, sin detalles internos (`adminLabels.ts`). |

Comportamiento agregado sin cambiar datos: «Save and publish»/«Unpublish» usan el mismo guardado con el estado correspondiente; al salir del editor con cambios sin guardar se pide confirmación; los enlaces del inicio abren una publicación concreta o una nueva (`?edit=` / `?new=1`).

**Corrección funcional encontrada:** guardar un medio fallaba siempre. `save_entity` inserta la fila antes de resolver el conflicto, y `storage_path` y demás columnas obligatorias no forman parte del formulario. Error comprobado en local: «null value in column "storage_path"…». Sin tocar el esquema, la interfaz actualiza los campos editables del medio con una actualización directa bajo los permisos de administrador. Las demás entidades siguen usando `save_entity`.

### Verificación técnica (no reemplaza la prueba manual)

Todas las escrituras en Supabase local (`127.0.0.1:54321`), cada comprobación con límite de tiempo.

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit`, eslint de `src/components/admin`, `app/admin` y `SiteChrome`, `npm test` | Sin errores. |
| Recorrido en navegador | Login → inicio; «New content» abre un borrador; título, slug, párrafo y encabezado; Up/Down reordena; indicador «Unsaved changes»; Save → «Saved.» y «Draft»; Visual preview muestra el contenido; Full preview abre la ruta con el contenido y el aviso de borrador; «Save and publish» → «Published.»; «Unpublish» → «Moved back to draft.»; Duplicate → copia con slug nuevo, guardada como Draft; volver a la lista con búsqueda; subir imagen (de 6 a 7 medios); editar descripción y foco del medio → «Saved.» (tras la corrección; antes fallaba); editar el rol de un integrante → «Saved.» y restaurado. |
| Teclado | Tab llega al skip link (antes, solo el indicador de desarrollo de Next), Enter lleva el foco a `admin-main`; luego marca, inicio y secciones con contorno visible (Laguna sobre la barra oscura). |
| Contraste (WCAG) | Texto secundario 6,0:1; encabezados de tabla y direcciones 6,56:1; estados Draft 6,51:1 y Published 6,91:1; botón 12:1. |
| Móvil 390px | Inicio, listado, Crew y editor sin desbordamiento horizontal. |
| Páginas públicas | `/crew` (8762px), `/crew/wild-wonders` (7654px, mismos elementos) y `/art` con su navbar y footer, sin estilos del admin. |

Datos de prueba creados en local: «Local Admin Flow Test» y su copia (borradores) y una imagen sintética. No existen en la base real.

### Pendiente

- **Prueba manual de Juani** con el checklist de la entrega.
- El editor detallado heredado (`/admin/posts/[id]/edit`), Newsletter y el listado heredado `/admin/posts` quedan dentro del armazón, pero conservan su estilo interno de Katie.
- El selector de «Related content» sigue siendo una lista múltiple nativa.
- Estados de error del servidor o de red no simulados.
- No ejecutados: build, lint completo y `cms:local:verify`.

Capturas: [inicio](verification/review-2026-10-14-admin/dashboard.jpg) · [inicio antes](verification/review-2026-10-14-admin/before-dashboard.jpg) · [listado](verification/review-2026-10-14-admin/content-list.jpg) · [editor](verification/review-2026-10-14-admin/editor.jpg) · [editor antes](verification/review-2026-10-14-admin/before-editor.jpg) · [preview integrado](verification/review-2026-10-14-admin/editor-inline-preview.jpg) · [Crew](verification/review-2026-10-14-admin/crew-list.jpg) · [editor de Crew](verification/review-2026-10-14-admin/crew-editor.jpg) · [medios](verification/review-2026-10-14-admin/media-list.jpg) · [editor de medio](verification/review-2026-10-14-admin/media-editor.jpg) · [settings](verification/review-2026-10-14-admin/settings.jpg) · móvil: [inicio](verification/review-2026-10-14-admin/mobile-dashboard.jpg), [listado](verification/review-2026-10-14-admin/mobile-list.jpg), [Crew](verification/review-2026-10-14-admin/mobile-crew.jpg), [editor](verification/review-2026-10-14-admin/mobile-editor.jpg).

# Revisión local de Art/Crew — 2026-10-09

Estado: preparada para revisión del usuario; no implica aprobación visual. Continúa exclusivamente PASO 4.0–4.2.

Continuidad y cierre documental: 2026-10-11. Las capturas y el reporte de navegador corresponden a la ejecución del 2026-10-09; no se presentan como pruebas nuevas del CMS.

Cierre de comprobaciones 2026-10-11: `npm run lint`, `npm test`, `npm run build` (incluye TypeScript) y `git diff --check`: PASS. Servidor de desarrollo reiniciado en 127.0.0.1:3218; `/review/art` respondió HTTP 200 tras compilar. La reanudación tuvo carga del sistema cercana a 500 y aviso de filesystem lento: las primeras solicitudes agotaron el tiempo de espera, luego respondieron. El build conserva el aviso heredado de antigüedad de Browserslist.

Checkpoint técnico 2026-10-12: el avance se conserva en Git y se publica únicamente en el repositorio privado de Encounters. Esto no constituye aprobación visual; la revisión del usuario continúa abierta. Sin despliegue ni cambios en servicios externos.

## Entrega del perfil `/crew/[slug]` — 2026-10-13

Estado: **aprobada visualmente por Juani el 2026-10-14** (ver decisiones al inicio). Caso real: `/crew/wild-wonders`. `/crew` se mantiene como fue aprobada. Sin cambios en CMS, datos, migraciones, Auth, RLS, Storage, correos ni despliegues.

Revisar en `http://127.0.0.1:3218/crew/wild-wonders`. Prototipo: `http://127.0.0.1:3220/Wild%20Wonders.dc.html` (si no responde: `cd docs/encounters/handoff-current && python3 -m http.server 3220 --bind 127.0.0.1`).

### Preview unificado y segundo perfil sintético — 2026-10-13

El perfil sigue **pendiente de aprobación visual de Juani**. Todo lo que escribió datos se hizo en Supabase local (`127.0.0.1:54321`, app `127.0.0.1:3219`); no hubo escrituras remotas ni correos.

**Una sola plantilla para página pública y preview.** `ProfileView` (en `ProfileStory.tsx`) arma portada + contenido del perfil y lo usan los tres contextos, cada uno con sus datos:

| Contexto | Datos | Acceso |
| --- | --- | --- |
| Página pública `/crew/[slug]` | Lecturas anónimas de contenido publicado, sin cambios. Agrega migas y relacionados. | Público; sin cambios en lo que ve un visitante. |
| Preview integrado en `/admin/content` («Visual preview») | Estado del editor, incluso sin guardar; integrante vinculado al post. | Sesión de administrador existente. Sin motor de scroll: plantilla en reposo. |
| Preview por ruta `/admin/posts/[id]/preview` | Post y bloques guardados; integrante y medios leídos con la sesión. | `ProtectedAdminRoute`, sin cambios. Con motor de scroll. Antes mostraba los perfiles con el layout de artículo heredado. |

Las imágenes de borrador siguen llegando por `/api/media/[id]` con el token del administrador y URLs temporales. La portada (título, antetítulo, imagen) se calcula en `profileHero`, compartida.

**Segundo perfil, distinto de Georgia** («Local Test Person C», solo local): sin alias, sin encabezado de apertura, un párrafo inicial, dos imágenes grandes al inicio, dos capítulos de un solo encabezado, una cita entre capítulos, tres portadas (una con pie), un bloque `link`, sin galería oscura; con enlaces de contacto y dos obras publicadas en dos categorías.

Supuestos que solo valían para Wild Wonders, corregidos sin cambiar a Georgia:

- Un texto de una línea seguido de imágenes al principio se tomaba como galería oscura y el perfil quedaba sin apertura ni par. Ahora la apertura toma los textos e imágenes iniciales; las galerías solo se detectan después.
- Un encabezado posterior al primer texto se usaba como título de apertura y quedaba antes que ese texto. Ahora solo es título de apertura si precede a todo texto; si no, abre un capítulo.
- Un texto de una línea que abre un capítulo y va seguido de imágenes se convertía en galería oscura. Ahora queda como capítulo con portadas.
- Los bloques `link` del editor simple no se adjuntaban al capítulo (solo los `source`).
- El antetítulo de portada «meet georgia» estaba fijo en el código para Wild Wonders. Ahora sale de `kicker` del post, o del encabezado de apertura, o del rol. Para Georgia el resultado es el mismo.
- Sin título de apertura, el primer texto quedaba pegado a la portada; ahora recibe el espacio superior.
- Las portadas se alinean arriba, para que una con pie y otra sin pie no queden desparejas.

Sigue siendo específico de Wild Wonders, a propósito: su banner de diseño (`/design/ww-banner.webp`) mientras la portada del CMS sea el retrato.

Comprobaciones, todas con límite de tiempo y terminadas:

| Comprobación | Resultado |
| --- | --- |
| Borrador ante anónimo | 0 filas del post, de sus bloques y de sus medios exclusivos; página pública 404; `/api/media` del medio 404; el preview por ruta redirige a `/admin/login` y su HTML no contiene texto del perfil. |
| Preview por ruta y preview integrado, con sesión local | Ambos renderizan la plantilla con la misma estructura: portada, fila de apertura, par de 2, 2 capítulos, 3 portadas con su pie, cita, enlace de capítulo, sin galería. 6 imágenes servidas como `blob:` autenticadas. Aviso «This draft is not public yet». |
| Perfil publicado en local, 1440 y 390 | HTTP 200, misma estructura que el preview, sin desbordamiento, imágenes cargadas, sin errores de consola. |
| Relacionados | Contacto: Website e Instagram. Dos grupos por categoría con sus enlaces `/art/local-test-gallery/local-test-work-c1` y `/art/local-test-prints/local-test-work-c2`; la obra responde 200 y enlaza de vuelta al perfil. |
| Georgia y `/crew` (3218) | Georgia: misma altura (7654px), antetítulo «meet georgia», banner de diseño, 3 párrafos, par de 2, 1 capítulo, 2 portadas, 2 grupos con 4 fichas. `/crew`: 8762px, 6 tarjetas, 6 retratos. Sin errores. |
| `npx tsc --noEmit`, eslint de lo modificado, `npm test` | Sin errores. |

Observaciones: en el preview aparece un 404 de consola cuando una imagen de borrador se pide sin token antes de que llegue su URL autenticada; ya ocurría y es la protección funcionando. Las capturas de preview son anteriores a los dos últimos ajustes (espacio superior y alineación de portadas). No se ejecutó `npm run cms:local:verify`; los datos anteriores del entorno local no se tocaron.

Para revisar el segundo perfil: `http://127.0.0.1:3219/crew/local-test-person-c` (quedó publicado solo en local). Preview: iniciar sesión en `http://127.0.0.1:3219/admin/login` con las credenciales locales y abrir `/admin/posts/20000000-0000-4000-8000-000000000003/preview`, o «Visual preview» en `/admin/content`.

Capturas: [perfil sintético](verification/review-2026-10-13-profile-preview/synthetic-profile-desktop.jpg) · [relacionados en móvil](verification/review-2026-10-13-profile-preview/synthetic-profile-mobile-related.jpg) · [preview por ruta](verification/review-2026-10-13-profile-preview/preview-route-top.jpg) · [preview, portadas](verification/review-2026-10-13-profile-preview/preview-route-covers.jpg) · [preview integrado](verification/review-2026-10-13-profile-preview/preview-inline.jpg) · [Georgia sin cambios](verification/review-2026-10-13-profile-preview/georgia-unchanged.jpg).

### Recarga continua de Wild Wonders: resuelta

- **Causa comprobada:** caché de desarrollo de Turbopack obsoleta en `.next/dev`. Se había creado el 6/10, cuando el repositorio estaba en `Desktop/developer/…`; hoy está en `Desktop/Codigo/…` y la caché conservaba rutas absolutas viejas. Al suscribirse al chunk de `/crew/[slug]`, el servidor respondía por el websocket de HMR `reloadPage` con `TurbopackInternalError: Failed to write app endpoint /crew/[slug]/page — Next.js package not found`, y el navegador recargaba sin fin.
- **Evidencia:** mensajes del websocket capturados con Playwright (cuatro `reloadPage` en 8s); archivos `.sst` de `.next/dev/cache/turbopack` con la ruta vieja; un servidor temporal con directorio de build limpio (`NEXT_DIST_DIR=.next-diag`, puerto 3231) sirvió la misma página sin ningún `reloadPage`.
- **La «recarga inicial» de las otras páginas no era una recarga.** Playwright emite dos eventos `framenavigated` por carga, pero el servidor registra un solo `GET` del documento y no hay `reloadPage`. La cifra de «2 navegaciones» de la entrega anterior contaba ese evento.
- **Solución:** se detuvo el servidor 3218, se retiró `.next/dev` (caché regenerable, ignorada por Git) y se reinició con `npm run dev -- --hostname 127.0.0.1 --port 3218`. No se desactivó HMR ni ninguna función, y no hubo cambios de código para esto. El servidor temporal y `.next-diag` se eliminaron; los cambios que Next generó en `tsconfig.json` y `next-env.d.ts` se revirtieron.
- **Verificado después (límite 100s):** una sola solicitud del documento en 15s, cero `reloadPage`; navegación perfil → `/crew` → perfil sin recargas.
- Si el repositorio vuelve a moverse de carpeta: detener el servidor y borrar `.next/dev` (y `.next-cms-local/dev` para el 3219) antes de iniciarlo. La caché del 3219 no contenía la ruta vieja.

### Implementado

Referencia: `Wild Wonders.dc.html`, abierto junto a la implementación a 1440×900 y 390×844. El prototipo usa la misma estructura que The Crew, así que el perfil reutiliza sus filas, el par sticky, la sección oscura y los garabatos.

`src/components/public/ProfileStory.tsx` es la plantilla para **todos** los perfiles: lee la secuencia de bloques de cualquier post `crew_member` y la compone por tipo de bloque, sin identificadores ni textos de Georgia. Reemplaza al adaptador específico `WildWondersStory`, que se eliminó.

| Parte de la plantilla | Regla |
| --- | --- |
| Apertura | Primer encabezado → titular con garabato. Párrafos previos al segundo encabezado → columna 4–6, con el alias (o el nombre) como antetítulo y el primer párrafo como lead. |
| Par sticky | Las dos primeras imágenes de la apertura. Con una sola, se suma la última imagen del primer capítulo (retrato junto a una obra, como en el prototipo). Las imágenes de menos de 600px de ancho se muestran a su tamaño sobre Marea en lugar de ampliarse. |
| Capítulo | Cada encabezado abre un capítulo; los encabezados consecutivos forman titular + nombre en mayúsculas. Párrafos a la derecha (el primero en itálica si hay más de uno), enlaces de bloques `source` como antetítulo-enlace, imágenes como portadas 3:4 con pie `[ … ]` si el medio tiene pie cargado. |
| Galería oscura | Un texto de un solo párrafo seguido de dos o más imágenes abre una sección oscura: el primero como titular centrado con garabato y fichas altas; los siguientes como antetítulo Laguna con fichas bajas. Imágenes en `contain` sobre Espuma. |
| Otros bloques | Citas, carruseles, video, listas y demás siguen pasando por el renderizador compartido, en su orden. |
| Relacionados | Contacto, obras por categoría y «Other encounters» sin cambios: se ocultan si no hay contenido publicado. Hoy Georgia no tiene ninguno. |

Decisiones tomadas para apegarse al prototipo, a confirmar en la revisión:

- La portada ya no muestra el rol bajo el título.
- La barra de migas no se ve; sigue en el documento con su JSON-LD y aparece al recibir foco de teclado.
- Se quitó el cierre claro «following our nature», igual que en `/crew`. `13-crew-member.md` lo describe como parte del layout; el HTML no lo tiene.
- En el navbar del perfil «The crew» no lleva marca de activo, como en el prototipo (en `/crew` sigue en Laguna).

Archivos: `app/crew/[slug]/page.tsx`, `src/components/public/ProfileStory.tsx` (nuevo), `ImportedEditorial.tsx` y `src/styles/editorial.css`.

### Verificado

Chrome headless con Playwright fuera del repositorio, solo lectura contra 3218, cada comprobación con límite de 100s. Todas terminaron.

| Comprobación | Resultado |
| --- | --- |
| `npx tsc --noEmit`, `eslint app/crew src/components/public`, `npm test` | Sin errores; tests PASS. |
| Estabilidad y navegación | Ver sección anterior. |
| Desktop 1440×900 y móvil 390×844 contra el prototipo, 12 posiciones cada uno | Composición coincidente; diferencias listadas abajo. |
| Imágenes, enlaces, consola, SEO (1440 y 390) | 10 de 10 imágenes cargadas, sin desbordamiento, sin errores de consola. Enlaces: `/crew` y el externo del libro. `noindex, nofollow`, canonical y JSON-LD de migas presentes. |
| Teclado | Skip link → contenido → cue → migas (se hacen visibles) → enlace del libro, todos con contorno visible. |
| Reduced motion | Portada y par sin pin, 14 de 14 elementos animados en reposo, garabatos completos, sin animación del cue, sin desbordamiento. |
| `/crew` sin cambios | Altura 8762px, igual que la aprobada; tres garabatos, activo en Laguna, cuerpo del relato a 18px, 6 tarjetas y 6 retratos. |

No ejecutado: build, lint completo del repositorio y anchos intermedios. El preview del CMS y un segundo perfil con obras relacionadas se cubrieron después con datos sintéticos locales (subsección anterior); sigue sin existir un segundo perfil real.

Capturas: [prototipo desktop](verification/review-2026-10-13-profile/prototype-desktop.jpg) · [prototipo, 12 posiciones](verification/review-2026-10-13-profile/prototype-scroll-states.jpg) · [perfil, 12 posiciones](verification/review-2026-10-13-profile/profile-scroll-states.jpg) · [antes de esta entrega](verification/review-2026-10-13-profile/profile-desktop-before.jpg) · [prototipo móvil](verification/review-2026-10-13-profile/prototype-mobile.jpg) · [perfil móvil](verification/review-2026-10-13-profile/profile-mobile.jpg) · [reduced motion](verification/review-2026-10-13-profile/profile-reduced-pair.jpg) · [migas con foco](verification/review-2026-10-13-profile/profile-keyboard-breadcrumb.jpg) · [`/crew` sin cambios](verification/review-2026-10-13-profile/crew-unchanged-story.jpg).

### Diferencias visuales pendientes

- Los pies `[ cover ]` / `[ back cover ]` y las etiquetas de los logos no aparecen: los medios no tienen pie cargado en el CMS.
- El prototipo resalta en negrita «SCROLL DOWN TO SEE SOME OF THAT ART (:»; el bloque es texto plano.
- El titular de la sección oscura ocupa más líneas porque el texto importado está en mayúsculas.
- El prototipo deja huecos para un logo y un boceto; el CMS tiene las cuatro imágenes y se muestran todas.
- La portada en móvil sigue en flujo, como en `/crew`.
- Recortes según el foco 50/50 de cada medio.

Próxima acción: **revisión visual de Juani sobre `/crew/wild-wonders`**. No se avanza con Art ni otras páginas.

## Entrega de fidelidad visual de `/crew` — 2026-10-13

Estado: **aprobada visualmente por Juani el 2026-10-13** sobre el commit `cbea565`: «No vi diferencias, lo hizo muy bien». La aprobación incluye las tres decisiones visuales listadas abajo. Es una aprobación visual: las verificaciones técnicas no ejecutadas siguen pendientes. Responde al feedback «el formato más o menos va, pero no está muy estético; debe apegarse más al diseño». Alcance: solo `/crew`, más navbar, footer y cue de scroll compartidos. Sin cambios en el CMS, contenido, migraciones, Auth, RLS, Storage ni despliegues. El recorrido Art/Crew completo **no** queda cerrado: ver el pendiente de `/crew/wild-wonders` más abajo.

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

Decisiones tomadas para apegarse al prototipo, aprobadas con la entrega:

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

### Recarga en bucle de `/crew/wild-wonders`: resuelta

Documentada aquí como pendiente el 13/10 y resuelta en la entrega del perfil (sección superior): era la caché de desarrollo de Turbopack, no el código. La «recarga tras la carga inicial» atribuida a las demás páginas era un evento duplicado de la herramienta, no una recarga.

### Diferencias visuales pendientes

- Retratos y orden vienen del CMS y no son los del prototipo (orden actual: Julian, Fabrizio, Georgia, Hugo, Maja, Alexis). Los recortes usan el foco 50/50 de cada medio, editable en la biblioteca.
- Hugo, Maja y Alexis no tienen rol cargado; el prototipo muestra «Crew».
- El copy importado difiere del prototipo; falta, por ejemplo, «Now we have crossed…».
- El footer no muestra email porque no está cargado en settings.
- Solo Georgia tiene perfil publicado, así que solo su retrato muestra «read →».
- La portada en móvil sigue en flujo; el prototipo la mantiene pineada.
- El navbar móvil mide ~16px más que el prototipo por el área táctil de los enlaces.
- El activo en Laguna sobre navbar claro tiene poco contraste; es fiel al prototipo.

Las diferencias anteriores dependen de contenido del CMS o fueron aceptadas en la revisión. Siguen sin ejecutar para `/crew`: build, lint completo, anchos 360/768/1024px y hover de la tira.

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
