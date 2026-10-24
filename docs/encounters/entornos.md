# Entornos de Encounters

| Entorno | Dirección | Datos | Para qué |
|---|---|---|---|
| Revisión online (Vercel Preview) | https://encounters-review-juanimolfinos-projects.vercel.app | Supabase de pruebas (staging). **Pendiente:** el proyecto todavía no existe. | Que Juani revise la web y el admin desde cualquier dispositivo. |
| Producción local | http://127.0.0.1:3221 | Supabase local (Docker) | Revisión en la Mac, con medición de rendimiento. |
| Desarrollo local | http://127.0.0.1:3219 | Supabase local | Trabajo diario. |
| Datos reales, solo lectura | http://127.0.0.1:3218 | Supabase real `lzwmwofxoegkxykglneq` | Comparar Crew y Wild Wonders con lo importado; nunca se escribe. |
| Prototipos | http://127.0.0.1:3220 | `docs/encounters/handoff-current` | Referencia visual. |

El lanzamiento (producción con el dominio del cliente) **no está configurado**: no hay dominio asociado ni despliegue de producción.

## Revisión online

### Vercel
- **Proyecto:** `encounters-review`, en la cuenta `juanimolfinos-projects` (plan Hobby).
  - Es independiente: no es ninguno de los dos proyectos de 2024 (`encounters-again-and-again` y `encountersagainandagain`), que están vinculados a repositorios personales anteriores, y uno de ellos al dominio `.org`.
  - No tiene Git conectado: un push a `main` nunca genera un despliegue.
- **Despliegues:** siempre Preview, desde la rama `review` de `encountersagainandagain/encounters-again-and-again`, con `npm run review:deploy`. El script:
  - exige rama `review`, árbol limpio y publicado, y la carpeta vinculada a `encounters-review`;
  - despliega sin `--prod`;
  - apunta el alias estable al nuevo despliegue;
  - comprueba que el alias pida login. Si no lo pide, lo quita y falla.
- **Acceso privado:** Vercel Authentication. Se abre la URL, se inicia sesión en Vercel con la cuenta dueña del proyecto y se ve el sitio, desde cualquier dispositivo.
  - Quien no tiene sesión es redirigido al login de Vercel.
  - La contraseña por despliegue es un extra pago y no se usa.
  - Para mostrarlo a alguien sin cuenta, el botón **Share** del despliegue en el panel de Vercel genera un enlace temporal. Decisión tuya.
  - **Cuidado:** los alias `*.vercel.app` libres y el dominio por defecto del proyecto **no** quedan protegidos. El primero creado (`encounters-review.vercel.app`) respondía sin login y se eliminó a los pocos minutos, cuando el sitio todavía no tenía base de datos. Solo se usa el alias con el sufijo del equipo (`…-juanimolfinos-projects.vercel.app`).
- **Qué se sube:** `.vercelignore` deja fuera `docs/`, `legacy/`, `.encounters-work/`, los builds locales y todo `.env*` (salvo `.env.example`). Comprobado en el primer despliegue: 0 archivos de esas carpetas.
  - El build es el normal (`next build`); no corre migraciones ni seeds.
  - Las imágenes salen de Supabase Storage a través de `/api/media/:id`, y las del diseño, de `public/`. Nada depende del disco de la Mac.
- **`/review`:** la revisión visual local, con sus fixtures y los assets del prototipo, responde 404 en cualquier despliegue de Vercel (`proxy.ts`), además de su cierre previo fuera de localhost.
- **noindex:** se conserva en todas las respuestas (`X-Robots-Tag: noindex, nofollow` y la meta de robots). No reemplaza la protección de acceso.

### Variables del entorno Preview de `encounters-review`

| Variable | Estado | Notas |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | configurada | La URL de revisión, para enlaces y callbacks. |
| `ENCOUNTERS_EMAIL_ENABLED` | `false` | Además no hay `RESEND_API_KEY`: ningún envío real es posible. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pendientes | Del proyecto de pruebas; las carga `npm run staging -- env --apply`. |
| `SUPABASE_SERVICE_ROLE_KEY` | pendiente | Del proyecto de pruebas; se guarda como sensible. |

No se configuran `ENCOUNTERS_ALLOW_LOCAL_SUPABASE`, `ENCOUNTERS_LOCAL_PRODUCTION_CHECK`, `ENCOUNTERS_LOCAL_REVIEW`, `ADMIN_EMAILS` ni ninguna clave del proyecto real. `.env.local` no se sube ni se modifica.

### Validación del destino Supabase
`src/lib/encountersSupabaseTarget.ts` y `src/config/staging.json`:
- en un despliegue Preview de Vercel (`VERCEL_ENV=preview`), solo se acepta el proyecto de pruebas cuyo ref figura en `staging.json`. El proyecto real y el local se rechazan;
- en cualquier otro entorno, el proyecto de pruebas se rechaza;
- mientras el ref esté vacío, el Preview no acepta ninguna base;
- el cliente con clave de servicio también falla cerrado ante un destino no permitido;
- `check-isolation` (en `npm test`) cubre estos casos.

### Supabase de pruebas (staging)

**Estado:** no existe. El token de Encounters solo ve el proyecto real. El plan gratuito permite un segundo proyecto activo sin costo.

**Crearlo (Juani, una vez):**
1. Entrar en https://supabase.com/dashboard con la cuenta de servicios de Encounters y elegir la organización donde está el proyecto actual (plan Free).
2. **New project**:
   - nombre `encounters-staging`;
   - región **East US (North Virginia)**, la más cercana a las funciones de Vercel;
   - contraseña de base de datos generada (guardala);
   - confirmar que dice **$0/month**. Si pide un plan pago, detenerse.
3. Cuando esté listo, completar el archivo `.encounters-work/staging.env` (ya existe como plantilla vacía; ignorado por Git y por Vercel) con:
   ```
   STAGING_SUPABASE_URL=https://<ref>.supabase.co
   STAGING_SUPABASE_ANON_KEY=<Project Settings → API Keys: anon / publishable>
   STAGING_SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API Keys: service_role / secret>
   STAGING_SUPABASE_DB_PASSWORD=<la contraseña del paso 2>
   ```
   Si el proyecto quedara en otra cuenta, agregar `STAGING_SUPABASE_ACCESS_TOKEN=<token personal de esa cuenta>`.
4. Avisar. El ref (no es secreto) se toma de la URL con `npm run staging -- init --apply`, que lo escribe en `src/config/staging.json`; ese cambio se commitea en `review` antes de desplegar.

**Ninguna de estas claves sale de `.env.local`**: allí están las del proyecto real, que el Preview rechaza. De `.env.local` solo se reutiliza, si el proyecto de pruebas está en la misma cuenta, el token `SUPABASE_ACCESS_TOKEN` para la API de administración, sin copiarlo.

Los proyectos Free se pausan tras una semana sin uso; se reanudan desde el panel.

**Cargarlo (procedimiento de staging, nunca automático):** cada comando verifica el ref de `staging.json`, que no sea el real y que las claves pertenezcan a ese proyecto. Sin `--apply` solo muestra lo que haría; no imprime secretos.

```
npm run staging -- init --apply       # ref de la URL → src/config/staging.json (commit + push a review)
npm run staging -- check              # proyecto, Auth, Storage, esquema
npm run staging -- migrate --apply    # migraciones versionadas en orden (supabase db push, con historial)
npm run staging -- auth --apply       # registro público desactivado; Site URL y redirects = URL de revisión
npm run staging -- admin --apply      # administrador de prueba review-admin@encounters.example
npm run staging -- seed --apply       # ejemplos + 6 fichas originales + Wild Wonders, con relaciones y medios
npm run staging -- env --apply        # variables Supabase del Preview en Vercel
npm run staging -- verify             # borradores, medios privados y registro, sin sesión
npm run review:deploy                 # nuevo despliegue para que tome las variables
```

- Los scripts de contenido (`demo-local.mjs`, `crew-local-restore.mjs`) eligen el destino de forma explícita (`scripts/cms-target.mjs`): local por defecto, con su comprobación de localhost intacta, o `--target=staging`.
- Cada destino tiene su propio estado (`.encounters-work/` y `.encounters-work/staging/`). Así, la carga es idempotente y nunca sobrescribe una edición hecha desde el admin: `npm run demo:staging:plan` muestra qué es ejemplo intacto y qué fue editado.
- **Qué no se copia:** sesiones, contraseñas locales, el usuario admin local ni suscriptores reales. Los tres suscriptores del set de ejemplos usan dominios reservados (`example.com/.org/.net`).
- **Datos de contacto:** los de los ejemplos (`hello@encounters.example`, enlace de donación de ejemplo) usan dominios reservados y se identifican con la nota del pie. No son definitivos: se reemplazan en Admin → Settings cuando el equipo confirme los reales.

### Publicar una actualización de la revisión
1. Llevar los cambios a la rama `review`: `git checkout review && git merge main`, o trabajar sobre ella.
2. `git push origin review`.
3. `npm run review:deploy`. Al terminar indica la URL, el despliegue y el commit.
4. Si cambió el esquema: `npm run staging -- migrate` (revisar) y luego `-- migrate --apply`, antes del despliegue.

## Rendimiento y caché (producción, 2026-10-22)

Producción: https://encounters-again-and-again-gamma.vercel.app (cuenta Vercel del cliente, despliegue automático desde `main`). Las funciones corren en `hnd1` (Tokio), junto al proyecto Supabase (`vercel.json`).

### Imágenes
- `next/image` usa un loader propio (`src/lib/imageLoader.ts`); **no** se usa el optimizador de Vercel: no hay costo por transformación ni copias optimizadas compartidas de imágenes privadas.
- Imágenes del CMS: `/api/media/<id>?w=<ancho>` devuelve un WebP de ese ancho (nunca agrandado; si no pesa menos que el original, el original). El acceso se decide igual que para el original: la fila y el archivo se leen con los permisos de quien pide (anónimo: solo contenido publicado). SVG y GIF se sirven tal cual. Incluye todas las imágenes existentes: se generan al pedirlas.
- Imágenes de diseño (`public/design`, logo): variantes WebP versionadas en `public/**/w/`, generadas con `node scripts/image-variants.mjs` (manifiesto `src/config/image-variants.json`). Los originales no cambian.
- `sizes` describe el ancho al que se **dibuja** la foto, no su caja: una foto recortada para llenar un panel alto (`object-fit: cover`) se dibuja más ancha. Por defecto (`COVER_SIZES` en `MediaImage.tsx`) se asume panel a todo el ancho; la Home pasa los suyos, medidos.
- Fondo de la Home: la foto original se sirve sin variantes (se recorta por alto: en un teléfono se dibuja a ~2000 px). Sus dos capas de desenfoque (4 px y 11 px) están precalculadas (`node scripts/home-bg-focus.mjs`), una copia por rango de altura de ventana, con el mismo radio y la matriz exacta de `saturate()`.

### Caché y cuánto puede seguir visible algo despublicado
| Capa | Qué | Duración | Al editar/publicar/despublicar desde el admin |
|---|---|---|---|
| Páginas públicas (HTML, CDN de Vercel) y lecturas públicas | ISR `revalidate=300`, etiqueta `public-content` | 5 min | Se invalidan al instante (`/api/admin/revalidate`, solo admins). Si esa llamada fallara, como máximo 5 min. |
| Imágenes publicadas (`/api/media`, sin sesión) | navegador y CDN | 10 min cada una | No se purgan: una imagen despublicada puede seguir sirviéndose hasta ~20 min (10 en el CDN + 10 en el navegador que la pidió al final). |
| Imágenes con sesión / privadas | — | nunca se cachean | — |
| Imágenes de diseño (`/design`, `/images/brand`) | navegador | 1 día | Son parte del código, no del CMS. |

Lo que un visitante ya descargó queda en su dispositivo: no existe retirada inmediata de algo que ya se vio. El admin (`/admin/**`) es siempre dinámico y nunca pasa por la caché.

### Fluidez (trazas de Chrome)
Las pausas de 100–145 ms al entrar al agua eran el hilo principal esperando al compositor: la GPU recalculaba en cada cuadro los dos desenfoques CSS a pantalla completa del fondo (y el del navbar) bajo el shader del agua, que redibuja toda la pantalla. El desenfoque del fondo ahora está precalculado. Pendiente de confirmación visual de Juani: que las capas desenfocadas se vean igual que antes.

#### Cálculo de scroll A/B/C, ronda 2 (2026-10-23)
Variantes de `7839aeb`. Que sea el commit en producción es **una inferencia por el bundle, no una confirmación exacta**: el JavaScript publicado contiene `get("calc")` y Lenis, introducidos en ese commit. Eso demuestra que esas funcionalidades están publicadas, pero no identifica por sí solo el commit (no hay acceso al panel de Vercel del cliente).
- **A** = `?calc=a`: cálculo anterior.
- **B** = default: progreso sin la transformación del propio elemento y desfase independiente de los fps.
- **C** = `?scroll=lenis`: Lenis sobre el mismo reloj.

Condiciones:
- Apple M2, Chrome 155, GPU real (Metal), ventana 1440×751 a 2×, pantalla de 60 Hz.
- Modo normal pero **a batería**, carga 2–3,6. Un solo navegador de prueba, cerrado al terminar.
- Tramo: desde que asoman los Proyectos hasta que entra la Agenda (~3950 px).
- 3 repeticiones, con el orden de variantes y escenarios rotado. Script: `.encounters-work/bench-scroll-2026-10-23/bench3.mjs`.

El tramo **activo** (primer → último evento de rueda) se mide aparte del **frenado** (último evento → página quieta). 27/27 corridas válidas: el recorrido real quedó a menos del 2 % del pedido.

| Escenario | Var. | Recorrido | Activo | Cuadros perdidos | Pausas >50 ms | Mayor hueco | 1.er movimiento | Retraso | Frenado |
|---|---|---|---|---|---|---|---|---|---|
| Continuo 800 px/s | A | 3942 px | 4,93 s | 0/886 | 0 | 33 ms | 18 ms | 16 ms | — |
| | B | 3942 px | 4,93 s | 0/886 | 0 | 33 ms | 17 ms | 16 ms | — |
| | C | 3955 px | 4,95 s | 0/889 (frenado 0/165) | 0 | 33 ms | 19 ms | 176 ms | 0,92 s |
| Rápido 4000 px/s | A | 3923 px | 0,98 s | 0/176 | 0 | 33 ms | 14 ms | 8 ms | — |
| | B | 3892 px | 0,98 s | 0/176 | 0 | 33 ms | 19 ms | 16 ms | — |
| | C | 3952 px | 1,00 s | 0/180 (frenado 0/213) | 0 | 33 ms | 19 ms | 170 ms | 1,18 s |
| Rueda por pasos (40 × 100 px) | A | 3900 px | 3,27 s | 0/588 | 0 | 17 ms | 86 ms | 0 | — |
| | B | 3900 px | 3,27 s | 0/587 | 0 | 17 ms | 86 ms | 0 | — |
| | C | 3990 px | 3,92 s | 0/704 (frenado 0/180) | 0 | 33 ms | 19 ms | 179 ms | 1,00 s |

Valores: mediana por corrida y cuadros sumados de las 3. Un hueco de 33 ms es un solo cuadro repetido aislado, no una pausa visible.

- **A y B no se distinguen** en esta máquina. B queda como default: su desfase no depende de los fps, lo que importa en pantallas de 120 Hz o en equipos lentos (no medido aquí).
- **C** mueve los cuadros igual de fluido, pero la página va ~175 ms detrás de la rueda y sigue deslizándose ~1 s después del gesto. Es una decisión de sensación, no de rendimiento.
- Con la rueda por pasos, Chrome tarda 86 ms en el primer movimiento de A y B. Es su animación nativa de rueda, no un costo de la página.
- El tramo activo de C dura ~0,65 s más con la rueda por pasos: el listener de rueda no pasivo de Lenis hace que cada evento espere al hilo principal (~16 ms por evento en este banco).
- El 19,8 % de cuadros perdidos de C en la batería saturada no se reprodujo: era la saturación.
- Límites: entrada sintética de Chrome, no inercia real de trackpad; batería, no cargador; sin móvil, Safari ni iPhone.
- **B queda como default. La fluidez completa no está aprobada:** falta la revisión de Juani con su trackpad y su uso habitual. Si aparece un tirón, el paso siguiente es capturar una traza de ese momento en su navegador, anotando la sección y si era la primera pasada. No se repite la batería sintética. A y C se conservan hasta esa revisión.

#### Referencia White Desert (2026-10-23)
`https://white-desert.com/` también usa Lenis. Sus escenas tienen otra complejidad que la Home: es una referencia de **sensación**, no una comparación de rendimiento.
- Tramo: y = 800 → 3800 (3000 px), mismos tres escenarios, 2 repeticiones con el orden rotado. 6/6 corridas válidas, carga 1,4–1,9.
- **Primer intento colgado:** el banco esperaba sin límite `decode()` de todas las imágenes de la página, y 23 son `loading="lazy"` y nunca cargan.
- **Corrección:** solo se esperan las imágenes del tramo, con un tope de 3 s, y cada contexto tiene un watchdog de 150 s. Del tramo, 8 de 9 imágenes estaban cargadas; la novena no terminó y la espera cortó a los 3 s.

| Escenario | Cuadros perdidos activo | Pausas >50 ms activo | Retraso | Frenado | Cuadros perdidos en frenado (mayor hueco) |
|---|---|---|---|---|---|
| Continuo 800 px/s | 0/451 | 0 | 191 ms | 0,92 s | 23/111 (100 ms) |
| Rápido 4000 px/s | 1/92 | 0 | 163 ms | 1,19 s | 0/142 (33 ms) |
| Rueda por pasos | 1/291 | 0 | 161 ms | 1,03 s | 10/124 (83 ms) |

- White Desert tiene el mismo retraso (~160–190 ms) y el mismo frenado (~1 s) que la variante C. Esa sensación es la de Lenis, no un defecto de la Home.
- Durante el gesto se mueve fluido. Pierde cuadros mientras frena, cuando cambian sus escenas.
- La Home en C no perdió ningún cuadro en el frenado.

#### Lenis por defecto en la Home (`c63fe01`, 2026-10-23)
- **Aprobado por Juani:** la sensación de scroll con Lenis (C), probada con su trackpad. Es el default de la Home sin parámetros.
  - Se mantiene la configuración: rueda suavizada, `syncTouch: false` (el táctil sigue nativo en móvil), `anchors: true` y el reloj de la Home.
  - Solo en la Home: ni otras páginas ni el admin.
- **Alternativas temporales para comparar:** `/?scroll=native` (B, scroll nativo) y `/?calc=a` (A, nativo con el cálculo anterior). Reduced motion apaga Lenis.
- **Sigue pendiente:** la fluidez de la primera entrada al agua.

**Primera visita con caché fría y scroll rápido inmediato** (síntoma de Juani: el agua parece trabarse un instante).
- Sonda: `.encounters-work/bench-scroll-2026-10-23/coldprobe.mjs`. Una visita en frío por contexto, scroll de 3000 px a 4000 px/s apenas se ve el título, y después una segunda visita en el mismo contexto.
- Antes de la corrección (6 visitas en frío, B y C): **4 de 6 tuvieron un hueco de ~50 ms** (3 cuadros). Ninguna de las 6 segundas visitas tuvo huecos. Pasa igual con y sin Lenis.
- Qué coincidió con cada hueco, sin una causa única:
  - decodificación de 13 imágenes (40 ms);
  - el primer cuadro del agua después de la hidratación (swap de la GPU, 24 ms);
  - evaluación de un chunk de JS (30 ms);
  - un hueco antes de hidratar sin tarea atribuible.
- **Descartado:** la compilación del shader. `getProgramParameter` y `getShaderParameter` tardan menos de 3 ms.
- **Hidratación:** en frío, la Home se pinta a los 0,75–1,0 s pero hidrata a los ~1,3–1,5 s (sin trazado; con trazado, 1,1–4,7 s). Los scripts (~200 KB) se descargan en paralelo con las fuentes (370 KB) y la foto de fondo. Si se hace scroll antes de hidratar, el agua y las capas todavía no siguen la página.
- **Causa demostrada y corregida: ajuste de resolución.**
  - En una visita en frío con Lenis, el gobernador bajó el agua de 1,75× a 1,25× a los 1388 ms, en pleno scroll, ~320 ms después de crear el agua, y lo guardó para las visitas siguientes.
  - El gobernador juzgaba la GPU con los primeros cuadros después de la hidratación, que son lentos por el arranque y no por el shader.
  - Ahora espera a que la página termine de cargar y a que pasen 1,5 s desde que arranca el agua. La clave guardada pasa a `encounters.water.scale.v2`, así que se ignoran los niveles guardados antes de la corrección.
  - Después (4 visitas en frío, default y `?scroll=native`): 0 bajadas de resolución. Quedan huecos de 50 ms en 2 de 4, en corridas que hidrataron tarde (3,6 y 4,7 s), después del scroll.
- **Pendiente, propuesto sin aplicar:** acortar el tiempo hasta la hidratación en la primera visita, por ejemplo priorizando los scripts frente a las fuentes que no son críticas para el primer pintado. Requiere medir el costo en la carga, que ya está aprobada.

**Verificación funcional en producción, `c63fe01`** (`check2.mjs`, viewport real; default, `?scroll=native`, `?calc=a` y default con reduced motion; 0 errores de consola):
- Lenis está activo solo en el default (5 listeners de rueda frente a 4).
- 600 px de rueda mueven 600 px. Lenis va a 272 px a los 80 ms y llega a 600; nativo llega a 600 enseguida.
- Fin, Inicio y AvPág funcionan. El ancla «follow the current» deja `#descenso` a 150 px del borde, igual en todas las variantes.
- **Al salir de la Home se limpia Lenis:** en /crew no queda la clase, quedan 4 listeners y la rueda es nativa (500 px a los 80 ms).
- Atrás desde /crew sin haber usado el ancla: vuelve a la Home y Lenis se crea de nuevo. Adelante: /crew sin Lenis.
- **Artefacto de verificación:** con un viewport emulado (escala 1 sobre una pantalla 2×), Playwright entrega `deltaY` duplicado a la página, y Lenis movía el doble. Con el viewport real no hay duplicación. Los bancos usan el viewport real.

**Fallo previo, en todo el sitio: ancla + navegación + Atrás** (corregido en `246ccd6`, ver abajo).
- Al tocar un ancla `#…` se crea una entrada de historial con `history.state = null`.
- Si después se va a otra página y se toca Atrás, la URL vuelve a `/#descenso` pero **sigue visible la otra página**, porque el router de Next ignora los `popstate` sin su estado. Un segundo Atrás vuelve bien.
- Pasa igual con Lenis, con `?scroll=native` y con `?calc=a`: no lo introdujo Lenis. `BlogPostPageContent.tsx` (`pushState(null, …)`) produce lo mismo.
- **Corrección propuesta:** en las anclas internas, crear la entrada conservando el estado de Next (`history.pushState(history.state, '', '#id')`) y hacer el desplazamiento suave por Lenis cuando está activo. Afecta la navegación de todo el sitio: espera aprobación.

#### Anclas y primer arranque del agua (`246ccd6` + `03e6f15`, 2026-10-23)
**Anclas — corregido (`246ccd6`, `SiteChrome.tsx`).**
- Un solo manejador para los enlaces `#…` de la misma página (cualquier página pública).
- Cancela la navegación nativa al fragmento y crea la entrada con `history.pushState(null, '', '#id')`. Next 16 integra ese `pushState` a su router y le copia su propio estado. No se arman campos internos del router.
- El desplazamiento no cambia: en la Home lo anima Lenis, que atiende el mismo clic. En las demás páginas `scrollIntoView` sigue el `scroll-behavior` del CSS (suave, o instantáneo con reduced motion).
- El foco pasa a los destinos que lo aceptan (`<main tabIndex=-1>` del skip link), como en la navegación nativa.
- `BlogPostPageContent` ya usaba `pushState(null, …)`: Next le agrega su estado. Comprobado.

**Verificado en producción (`03e6f15`, `hist.mjs`, `skiponly.mjs`): 36 pasos y 6 skip links, 0 errores de consola.**
- Con Lenis, con `?scroll=native` y con reduced motion, el recorrido Home → ancla `#descenso` → /crew por el navbar → Atrás → Atrás → Adelante → Adelante mantiene URL, página visible y posición en correspondencia:
  - la Home en el ancla (y=1352, destino a 150 px);
  - la Home arriba;
  - /crew arriba.
- Carga directa de `/#descenso` (también con `?scroll=native`): queda en el ancla, y Lenis no la mueve al arrancar.
- Navbar desde la mitad de la Home: /about aparece arriba desde el primer cuadro.
- /about: su flecha `#about-content`, después /crew y Atrás vuelven a About en el ancla.
- Skip link en /about, `/` y `/?scroll=native`, con y sin reduced motion: el foco va a `main`.
- Post (`/meaningful-messages/you-never-know-what-encounter-could-change-your-life`): ningún post publicado tiene índice, así que se inyectó en el DOM un enlace igual a los del índice. Ancla, /crew y Atrás vuelven al post en el ancla. `pushState(null)` conserva el estado del router.
- Verificación funcional anterior (`check2.mjs`), en local y en producción:
  - Lenis se limpia al salir de la Home;
  - al volver con Atrás se crea de nuevo (5 listeners);
  - Fin, Inicio, AvPág, ancla y reduced motion funcionan.

**Primer arranque del agua — qué lo retrasa** (`coldstart.mjs`: prioridades de red, llegada de cada script, tareas largas, hidratación y primer cuadro).
- **Descarga.** La Home hidrata ~20 ms después de que llega el último script inicial, sin tareas largas: ni la ejecución del JS ni la hidratación pesan.
- Los scripts de Next van `async`, con prioridad baja, y el runtime se precarga con `fetchPriority="low"` (Next no lo deja configurar). Llegan después de las fuentes (precargadas, prioridad alta) y de las imágenes de la primera pantalla.
- Antes de hidratar llegaban ~726 KB: fuentes 373 (51 %), scripts ~185 (25 %), imágenes ~105 (14 %) y HTML 63 (9 %).
- La primera pantalla de la Home usa las tres caras: Archivo, EB Garamond y su itálica. Todas se conservan.
- **Decodificación de imágenes:** no retrasa la hidratación. En frío puede coincidir con un hueco de cuadros durante el scroll.
- El HTML trae el CSS tres veces: en el `<style>` y dos copias en el payload de RSC, efecto de `experimental.inlineCss`. Son ~495 KB sin comprimir, pero comprimen bien. No se tocó.

**Fuentes (`03e6f15`): 372 KB → 173 KB, sin cambio de tipografía.**
- **Rasgos OpenType:** solo los que el navegador aplica por defecto más `tnum`, el único que pide el CSS. EB Garamond tenía 2092 glifos para ~400 caracteres: versalitas, swashes, ss01–ss07 y otros que nunca se muestran.
- **Caracteres:** Latin-1 + Extended-A, acentos, puntuación, sub/superíndices, € ™ y flechas. Se recorrieron las 31 páginas publicadas: fuera de ASCII solo usan `· – — ’ “ ” • … ₂ ← → ↓ ↗`.
- **Eje de peso completo.** El recorte de `de55bf5` (limitado a 400–500) había dejado mal los avances en peso 500, por un problema de harfbuzz 0.4.15 con la tabla HVAR. EB Garamond 500 quedaba 1,9 % más angosta y la itálica 500, 3,2 %, desparejo letra por letra: es el espaciado irregular de «EN COUN TERS» en el navbar. Ahora las posiciones de cada letra coinciden con los TTF originales en las 8 combinaciones de familia y peso que usa el sitio.
- **Píxeles contra los TTF originales** en 7 páginas: solo difiere una franja de antialiasing de 6 px en los enlaces del navbar (Archivo 600, eje de ancho fijado en 100), igual que antes del cambio.
- **Dependencias:** `subset-font` forzaba todos los rasgos y no dejaba elegirlos. `scripts/subset-fonts.mjs` usa harfbuzz directo (`harfbuzzjs` 0.4.15 y `fontverter` 2.0.0, devDependencies fijas).
- **Efecto medido**, con red limitada a 150 KB/s y 150 ms (`prehydr.mjs`, mismo script antes y después): la animación arranca a los **4,9–5,5 s, contra 8,4–10,3 s** antes.
- Con la red real de esta sesión, muy variable, el arranque va de ~1,3 s a más de 4 s, sin una diferencia atribuible.

**Si ya se hizo scroll antes de que la animación esté lista** (`246ccd6`): el desfase de la superficie arranca en la posición actual. Era el único estado con suavizado en el tiempo; con Lenis ya seguía la posición directa. No se reproduce el descenso ni se toca el scroll. Antes de hidratar, la Home ya se ve en su posición (capturas con red limitada).

**Cierre en producción, `03e6f15`, primera visita en frío con scroll inmediato y segunda pasada** (`coldprobe.mjs`, default y `?scroll=native`):
- 1 de 4 visitas en frío tuvo un hueco de 50 ms; otra, con Lenis, perdió 30 de 116 cuadros sueltos sin pausas mayores a 40 ms. Antes eran 4 de 6 y luego 2 de 4.
- 0 bajadas de resolución.
- Segundas pasadas: 0 huecos.

**Pendiente**
- **Fluidez de la primera entrada al agua: no aprobada.** Falta la revisión de Juani.
- **Red lenta:** el agua todavía espera los scripts, que siguen con prioridad baja.
  - Siguiente palanca posible: subir su prioridad o bajar los bytes de JS.
  - La primera exige tocar cómo Next emite los scripts; no se hizo.
- ~~**Salto de línea al llegar la fuente (previo):** con el respaldo métrico, el `h2` del descenso ocupa 7 líneas; con EB Garamond, 8 (+55 px).~~ Corregido en `ef42a88` (ver abajo).
  - Si la fuente llega con la página ya scrolleada, el navegador compensa con scroll anchoring (`scrollY` +56) y lo que está en pantalla no salta, pero cuenta como layout shift.
  - Corregirlo requiere ajustar el respaldo de ese título.
- Safari e iPhone: sin probar.
- `?scroll=native` y `?calc=a` siguen disponibles para comparar.


#### Respaldo del descenso y prueba real del índice (`ef42a88`, 2026-10-23)
**Respaldo de fuentes del descenso** (`site.css`; `layout.tsx` expone `--font-display-face` y `--font-body-face`, las caras sin el respaldo compartido).
- **Título:** respaldo propio, Times New Roman con `size-adjust: 97.5%`. El compartido usa 93,54 % y está calculado para texto en mayúsculas y minúsculas; este título va todo en mayúsculas.
  - Antes cortaba en una línea menos en 8 de 17 anchos. Ahora corta exactamente igual que EB Garamond en 16: escritorio 1024–1920, iPad e iPhone 375–430.
  - En 360 px toma una línea de más. Ningún valor coincide en los 17 anchos: 97 % arregla 360 pero rompe 1366. 360 es sobre todo Android, que no trae Times New Roman.
- **Párrafo del descenso:** respaldo propio, Arial con `size-adjust: 98%` (el compartido usa 102,8 %). En 390 px el respaldo compartido ocupaba una línea más; antes eso se compensaba con el título, que crecía. Ahora toma tantas líneas como Archivo en los 19 anchos probados. El `<em>` conserva su propia fuente.
- **Final sin cambios:** con las fuentes cargadas, la sección del descenso es idéntica píxel por píxel (0 píxeles distintos) en 1440, 1366, 390 y 360.
- **Fuentes demoradas 4 s** (`delayfont.mjs`, 11 anchos de escritorio y móvil). El arrecife, debajo del descenso, se movía 56/56/55/0/0/0/0/0/−3/0/+21 px en 1920/1440/1366/1280/1024/834/430/414/390/375/360. Ahora: 0/0/0/−1/0/−1/0/−1/0/−1/−21 px.
- Siguen los pequeños desplazamientos al cambiar el resto de las fuentes (CLS ~0,005 en el swap), iguales que antes.
- **En producción, `ef42a88`:** el resultado es el mismo que en local (píxeles finales idénticos en los 4 anchos y los mismos movimientos con las fuentes demoradas). Además, el recorrido de historial de `hist.mjs` (Home, About, skip link y post) da ALL OK.

**Índice de un post, recorrido real en el CMS local** (`cmsindex.mjs`; app `127.0.0.1:3221` sobre Supabase local `127.0.0.1:54321`; nada en producción).
- **Editor:** en «New message» se cargan título, slug y mensaje, con «Show index» activo y tres bloques «Heading» con nombre de índice (`first-part`, `second-part`, `third-part`), cada uno con su párrafo. «Save and publish» responde «Published.».
- **Página pública, como visitante sin sesión:** `/meaningful-messages/local-index-check` renderiza el índice («In this post») con los tres enlaces guardados.
- **Recorrido, con y sin reduced motion, 0 errores de consola:**
  - el enlace 02 lleva a `#second-part` (destino a 150 px, estado del router presente);
  - /crew por el navbar aparece arriba;
  - Atrás vuelve al post en el ancla (misma posición);
  - otro Atrás vuelve al post donde estaba el visitante al tocar el índice;
  - Adelante dos veces repite el ancla y después /crew arriba;
  - la carga directa de `#third-part` queda en el ancla.
- **Datos locales:** quedan dos posts de prueba en la base local, «Local index test» (de una primera corrida) y «Local index check». En esa primera corrida, un segundo intento con el mismo slug fue rechazado por el CMS como dirección duplicada, como corresponde.
- Supabase local se detuvo conservando los datos (`supabase stop`, no `cms:local:stop`, que borra los volúmenes con `--no-backup`) y después se detuvo Colima.

**Siguen pendientes:** red lenta (scripts con prioridad baja, sin tocar cómo Next los emite), Safari e iPhone sin probar, 360 px del título del descenso (una línea de más con el respaldo), y la revisión manual de Juani de la primera entrada al agua.
