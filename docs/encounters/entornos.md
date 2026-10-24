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

**Fallo previo, en todo el sitio y sin corregir: ancla + navegación + Atrás.**
- Al tocar un ancla `#…` se crea una entrada de historial con `history.state = null`.
- Si después se va a otra página y se toca Atrás, la URL vuelve a `/#descenso` pero **sigue visible la otra página**, porque el router de Next ignora los `popstate` sin su estado. Un segundo Atrás vuelve bien.
- Pasa igual con Lenis, con `?scroll=native` y con `?calc=a`: no lo introdujo Lenis. `BlogPostPageContent.tsx` (`pushState(null, …)`) produce lo mismo.
- **Corrección propuesta:** en las anclas internas, crear la entrada conservando el estado de Next (`history.pushState(history.state, '', '#id')`) y hacer el desplazamiento suave por Lenis cuando está activo. Afecta la navegación de todo el sitio: espera aprobación.
