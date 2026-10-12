# Handoff a Claude Code — Encounters Again and Again

Fecha de corte: **2026-10-12**  
Repositorio: `encountersagainandagain/encounters-again-and-again`  
Rama: `main`  
Commit de partida: `ad883d8 test: verify isolated CMS workflow`

## Estado que debe preservarse

El trabajo está detenido en **PASO 4.0–4.2: Art y Crew implementados, con revisión visual pendiente**. Juani está revisando las pantallas. El diseño todavía no está aprobado y no se debe avanzar a Home ni a otras páginas hasta recibir instrucciones explícitas.

El único remoto Git configurado es el repositorio privado de Encounters. No se hicieron despliegues ni cambios de DNS, WordPress, Hostinger, Vercel o Katie. No se enviaron correos ni se crearon servicios pagos.

Antes de modificar nada:

```bash
git status --short
git log --oneline -8
git remote -v
```

El estado esperado al momento de este corte es un árbol limpio, `main` en `ad883d8` y un solo remoto `origin` que apunta a Encounters. No descartar ni reescribir trabajo que aparezca después de este handoff.

## Qué se completó

### Base independiente y migración editorial

- Se creó un proyecto independiente a partir de la base reutilizable de Katie. Katie quedó intacto y sus módulos privados/comerciales permanecen aislados.
- Supabase exclusivo de Encounters: project ref `lzwmwofxoegkxykglneq`.
- Hay **14 migraciones**. La base de la FASE 3 contiene 20 tablas con RLS; la migración 14 amplía Art/Crew y su CMS.
- Auth público mantiene el registro desactivado. Hay dos administradores reales configurados y falta el tercero.
- El bucket `media` es privado.
- El CMS permite bloques, guardado atómico, borrador/publicación, preview y duplicación.
- Se importó un snapshot editorial verificado e idempotente: 12 documentos, 161 bloques, 6 personas de Crew, 1 Meaningful Message, 8 documentos publicados y 4 drafts. Hay 50 referencias de imagen para 49 archivos únicos.
- No se importaron usuarios, suscriptores ni datos privados de Katie.
- Resend autentica, pero el dominio sigue pendiente y los envíos permanecen desactivados.

### Art y Crew

Rutas implementadas:

- `/art`
- `/art/[category]`
- `/art/[category]/[slug]`
- `/crew`
- `/crew/[slug]`

Se implementaron categorías, obras, perfiles, responsables y relaciones inversas en el CMS, además de sus controles de publicación, preview, duplicación, metadata, canonicals, breadcrumbs y sitemap condicionado por publicación.

Art real sigue vacío porque no hay categorías u obras curadas y no se inventó contenido. Crew usa el material importado; solo el perfil de Georgia/Wild Wonders está habilitado y publicado como detalle real.

### Páginas locales de revisión

La revisión visual utiliza fixtures sintéticos en memoria bajo `/review`, disponibles únicamente en desarrollo y desde `localhost` o `127.0.0.1`:

- `/review/art`
- `/review/art/test-gallery`
- `/review/art/test-gallery/test-work`
- `/review/crew/test-person-a`
- `/review/crew/test-person-b`
- `/review/art/test-empty`
- `/review/art/test-books`
- `/review/art/test-films`
- `/review/art/test-audio`

Estas rutas muestran la navegación completa Art → categoría → obra → dos responsables → perfiles → obra. No escriben en Supabase, no aparecen en sitemap, usan datos rotulados como `LOCAL TEST DATA` y responden 404 fuera del entorno local permitido.

El pin de las portadas de Crew y Wild Wonders fue restaurado según los prototipos: contenedor de 240vh, hijo sticky de 100vh, solapamiento del contenido claro, zoom y oscurecimiento. En móvil menor a 760px y con reduced motion se libera el pin. También se corrigieron los offsets y extremos de los carruseles.

La guía de revisión y las diferencias visibles están en [phase4-review.md](phase4-review.md). La evidencia visual está en `docs/encounters/verification/review-2026-10-09/`.

### Supabase local aislado y prueba del CMS

Se instalaron herramientas gratuitas locales:

- Colima `0.10.3`
- Docker CLI `29.9.0`
- Supabase CLI Homebrew `2.120.0`
- Supabase CLI fijada por el proyecto `2.119.0`

Comandos disponibles:

```bash
colima start
npm run cms:local:prepare
npm run cms:local:dev
npm run cms:local:status
npm run cms:local:verify
npm run cms:local:stop
```

`cms:local:prepare` inicia Supabase local, aplica las 14 migraciones, comprueba que el registro público siga desactivado y crea un admin y dos perfiles de Crew sintéticos. Las claves y credenciales se guardan en `.encounters-work/local-cms.json`, ignorado por Git. **Nunca mostrar, copiar o versionar ese archivo.** El script no modifica `.env.local`.

`cms:local:dev` inicia una aplicación separada en `http://127.0.0.1:3219`, con variables de proceso que apuntan exactamente a Supabase local y build en `.next-cms-local`. La aplicación habitual puede seguir en `http://127.0.0.1:3218` con su configuración normal.

La protección de destino está en `src/lib/encountersSupabaseTarget.ts`. Acepta el origen remoto confirmado de Encounters. Solo permite Supabase local fuera de producción, con `ENCOUNTERS_ALLOW_LOCAL_SUPABASE=true` y puerto exacto `54321` en `127.0.0.1` o `localhost`. Rechaza otros proyectos, puertos o destinos locales sin la bandera.

El recorrido integrado pasó desde navegador contra Supabase local:

1. Crear y publicar una categoría.
2. Crear una obra draft con bloque de texto y dos responsables sintéticos.
3. Guardar y abrir preview visual.
4. Confirmar que el draft devuelve 404 para anónimo.
5. Publicar y confirmar la ruta pública y ambos créditos.
6. Abrir el perfil sintético y comprobar la relación inversa con la obra.
7. Duplicar; comprobar UUID, slug y título nuevos, estado draft y conservación de categoría, bloque y responsables.
8. Confirmar 404 anónimo para el duplicado.
9. Adjuntar media sintética privada y confirmar cero filas anónimas, descarga Storage denegada y `/api/media/[id]` en 404.

Resultado: `remote_writes: 0`, `emails_sent: 0`. Evidencia estructurada y capturas en `docs/encounters/verification/review-2026-10-12-local-cms/`.

## Servidores y estado de procesos

Al preparar este handoff se confirmó que el servidor visual seguía escuchando en el puerto 3218 y la aplicación CMS local en 3219. El comando `cms:local:status` no pudo consultar el socket de Docker desde el sandbox de la sesión (`permission denied` sobre el socket de Colima), por lo que no se presenta esa limitación de inspección como una caída del stack. Los procesos pueden terminar al cambiar de herramienta; volver a comprobarlos y no asumir que siguen activos.

Comprobar primero:

```bash
lsof -nP -iTCP:3218 -sTCP:LISTEN
lsof -nP -iTCP:3219 -sTCP:LISTEN
npm run cms:local:status
```

Para restaurarlos si hace falta:

```bash
npm run dev -- --hostname 127.0.0.1 --port 3218
colima start
npm run cms:local:prepare
npm run cms:local:dev
```

El puerto 3218 sirve para revisión visual y puede leer la configuración habitual. Tratarlo como **solo lectura**. Cualquier prueba de escritura del CMS debe hacerse en 3219 contra Supabase local.

Next puede reescribir automáticamente `next-env.d.ts` y `tsconfig.json` al iniciar el segundo servidor con `NEXT_DIST_DIR=.next-cms-local`. Esos cambios generados ya fueron revertidos y no deben incorporarse a un commit si reaparecen.

## Verificación conocida

- Checkpoint visual: lint, tests, build y `git diff --check` pasaron.
- Preparación local: `npm run lint`, `npm run typecheck`, `npm test` y `npm run cms:local:verify` pasaron.
- El lint ignora `.next-cms-local`.
- No se repitió el build después de los últimos cambios locales para evitar interferir con los servidores de desarrollo activos. El último build válido corresponde al checkpoint visual.
- La evidencia del CMS local es PASS y no tocó la base remota.

## Diferencias y decisiones pendientes

La revisión visual todavía debe decidir:

- ritmo, legibilidad y transición del pin en Crew/Wild Wonders;
- composición de Art con contenido real, que depende de curación;
- biografías largas, orden del relato y copy frente al prototipo;
- coreografías sticky de pares internos de imágenes;
- altura y parallax del bloque grande de imagen heredado de Post.

También siguen pendientes, fuera de la tarea visual actual: tercer administrador, email público definitivo, video ausente del snapshot, respaldo restaurable de WordPress, Analytics/Search Console, DNS, Vercel, Resend y lanzamiento. No intervenir en esos puntos sin una instrucción nueva.

## Restricciones vigentes

- La aprobación visual **no** fue otorgada.
- No avanzar con Home, Expeditions, Workshops, Messages, About, Contact ni otras páginas.
- No desplegar.
- No cambiar DNS, WordPress, Hostinger, Vercel ni Katie.
- No enviar correos ni habilitar newsletter.
- No crear servicios pagos.
- No usar la base remota para ensayos del CMS.
- No importar nuevamente el snapshot ni inventar contenido de Art.
- No exponer secretos, `.env.local` ni `.encounters-work/local-cms.json`.
- Mantener disponibles las páginas `/review` y su aislamiento local.
- Publicar commits únicamente en el repositorio de Encounters.

## Próximo trabajo autorizado

1. Leer este handoff, [phase4-review.md](phase4-review.md), [phase4-art-crew.md](phase4-art-crew.md), [bootstrap-status.md](bootstrap-status.md) y [encounters-checklist-seguimiento.md](encounters-checklist-seguimiento.md).
2. Verificar Git, procesos y URLs sin modificar datos.
3. Esperar o aplicar únicamente el feedback visual que Juani dé sobre Art/Crew.
4. Mantener las correcciones dentro de PASO 4.0–4.2 y comprobar desktop, móvil, teclado y reduced motion según corresponda.
5. Actualizar `phase4-review.md` y el checklist con resultados reales, sin declarar aprobación hasta que Juani la confirme.
6. Ejecutar las comprobaciones proporcionales al cambio y hacer commit/push solo a Encounters.
7. Volver a detenerse para revisión visual; no iniciar la página siguiente automáticamente.

## Commits de referencia

| Commit | Contenido |
| --- | --- |
| `ad883d8` | Evidencia PASS del flujo CMS aislado. |
| `437b73f` | Preparación de Supabase/CMS local y guardas de destino. |
| `63299c4` | Páginas locales de revisión y ajustes visuales Art/Crew. |
| `952071e` | Checkpoint documental de Art/Crew. |
| `eec113e` | Implementación editorial de Art/Crew. |
| `2fe403f` | Importación idempotente del snapshot. |
| `28510a2` | Esquema, RLS y CMS mínimo. |
| `8560222` | Base independiente de Encounters. |

