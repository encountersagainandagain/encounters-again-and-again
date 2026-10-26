# Encounters Again and Again — guía para agentes (Claude Code, Codex y otros)

Leé este archivo completo antes de tocar código. Resume el estado al **2026-10-26**, las reglas que no se negocian, las decisiones
tomadas y por dónde seguir. El detalle vive en `docs/encounters/`; acá están los punteros.

> Prioridad de instrucciones: lo que diga Juani en la conversación actual → este archivo → `docs/encounters/page-progress.md`
> (estado por página) → prototipos de `docs/encounters/handoff-current/` (referencia visual) → documentos históricos.

---

## 1. Qué es

Web y CMS propio de **Encounters Again and Again**, un colectivo de arte, océano, educación y conservación (fundadores: Fabri,
Flaco y Georgie). Migra su WordPress a **Next.js 16 (App Router) + React 19 + Supabase**, reutilizando como base técnica el blog
«What Katie Seas» (`juanimolfino/katie-blog`). El resultado es Encounters: nada de Katie debe verse en la web, el admin, los
emails ni el SEO.

- **Juani** es quien dirige el proyecto, revisa y aprueba. Escribe en español rioplatense.
- **Sitio en revisión:** https://encounters-again-and-again-gamma.vercel.app (admin en `/admin`). Sin dominio propio, con `noindex`.
- **Repositorio:** `encountersagainandagain/encounters-again-and-again`. Se trabaja en la rama `review`; `main` es lo desplegado.

## 2. Estado al 2026-10-26

- **Todas las rutas públicas** usan su plantilla del prototipo (desde 2026-10-17). Juani aprobó visualmente la Home y lo que revisó
  en producción el 2026-10-24 (incluida Expeditions), solo en su computadora y navegador.
- **En prueba con Juani: la página personal de Crew** (`/crew/<slug>`, ejemplo real: Georgia Webb / Wild Wonders). Se rehízo el
  editor y la plantilla en esta etapa; ver §6.
- **Base real** (`lzwmwofxoegkxykglneq`): 17 migraciones, todas aplicadas; local y remoto coinciden. La última es
  `20261026000100_crew_listing_relation_notes.sql`.
- **Pendiente de lanzamiento:** dominio del cliente, redirecciones desde WordPress, quitar `noindex`, correo del newsletter
  (apagado), pruebas en Safari/iPhone/iPad/Android y red lenta, portadas pesadas (Crew 374 KB, Contact 220 KB).

El estado vivo y detallado por página está en `docs/encounters/page-progress.md`, sección «Estado actual». Mantenelo al día.

## 3. Reglas que no se rompen

### Datos reales y base de datos
1. **Nunca escribir en la base real sin el OK explícito de Juani en la conversación actual.** Un OK anterior no se extiende a
   otra acción. Leer con la clave pública (`NEXT_PUBLIC_SUPABASE_*`, solo lo que es público) para verificar está bien.
2. **Migraciones:** siempre nuevas e incrementales (`supabase/migrations/AAAAMMDDHHMMSS_nombre.sql`), probadas primero en
   Supabase local (`supabase migration up --local`). **Nunca editar una migración ya aplicada.** Para producción, en este orden
   y con OK: respaldo (`node scripts/production-backup.mjs before-<migración>`, deja esquema y datos en `.encounters-work/backups/`) →
   `node scripts/production-migrate.mjs` (dry run: la lista debe tener solo la migración nueva) → `... --apply`.
   El build de Vercel **no** corre migraciones.
3. **Código desplegado antes de su migración debe funcionar sin ella.** Patrón usado: la opción nueva del admin aparece solo si
   la columna existe (ej. `record.listed!==undefined`, sondeo de `post_relations.note`), y lo público trata el valor ausente
   como el comportamiento anterior (`listed!==false`).
4. **Secretos:** `.env.local` tiene las claves del proyecto real. Nunca se imprime, se copia, se sube ni se modifica. Los scripts
   enmascaran los valores en su salida.
5. **Claude Code:** el clasificador de permisos bloquea comandos que tocan producción y la escritura de permisos propios. No
   intentes rodearlo: pedile a Juani que corra el comando con `! <comando>` o que agregue la regla con `/permissions`.

### Katie y alcance
6. No usar credenciales, base, usuarios, suscriptores ni servicios de Katie. `legacy/` es código de Katie conservado como
   referencia: no se importa ni se despliega.
7. Los módulos fuera de alcance están apagados en `src/config/modules.ts` (commerce, donations, reviews, affiliates, gallery,
   analytics, contactForm, etc.). «Apagado» bloquea rutas, consultas y efectos; no los reactives sin pedido.
8. No enviar emails reales (`ENCOUNTERS_EMAIL_ENABLED=false`), no tocar DNS, WordPress ni Hostinger.

### Diseño y contenido
9. **No cambiar lo visual sin pedido.** Si un cambio «no debería verse», demostralo: captura de página completa antes y después
   y comparación píxel a píxel (0 diferencias). Si debe verse, mostralo con capturas en desktop (1440), intermedio (900) y
   teléfono (390).
10. La presentación es **explícita**: cada bloque o campo dice qué muestra y dónde. No deducir diseño por textos, posición,
    nombres o coincidencias (ver §6, párrafos con estilo).
11. Las aprobaciones solo las da Juani; nada se aprueba por inferencia. No inventar contenido: los ejemplos están marcados
    («Example», `demo-*`) y se retiran con «Unpublish».
12. Interfaz pública y admin en **inglés**; ayudas del admin en inglés, claras para alguien no técnico.

### Git y despliegue
13. Trabajar en `review`. Cada entrega: typecheck, lint, tests y build pasan → commit → `git push origin review` →
    `git fetch origin review:main` → `git push origin main`. **Push a `main` despliega producción** (Vercel del cliente,
    `encountersagainandagains-projects/encounters-again-and-again`). No hay force-push ni reset.
14. Commits en inglés, descriptivos, con el pie de coautoría que indique la herramienta.

## 4. Arquitectura

| Qué | Dónde |
|---|---|
| Rutas públicas | `app/` — `/`, `/art`, `/art/[category]/[slug]`, `/crew`, `/crew/[slug]`, `/expeditions`, `/workshops`, `/meaningful-messages`, `/posts`, `/about`, `/contact` |
| Vistas públicas (compartidas con las previews del admin) | `src/components/public/*View.tsx`, `ProfileStory.tsx`, `EditorialBlocks.tsx`, `EditorialPieces.tsx` |
| Datos públicos | `src/features/encounters/editorial-data.ts`, `site-data.ts`, `public-content.ts` (ISR `revalidate=300`, etiqueta `public-content`) |
| Reglas de presentación | `src/features/encounters/presentation.ts` (`profileHero`, `profileVisible`, `listedCrew`), `profile-sections.ts` (bloques de perfil) |
| Admin (un solo editor para todas las tablas) | `src/components/admin/EncountersCms.tsx`; campos en `src/features/encounters/cms-fields.ts`; textos en `src/components/admin/adminLabels.ts`; menú en `AdminShell.tsx` |
| Estilos | `src/styles/editorial.css` (público), `src/styles/admin.css` (admin). CSS propio con tokens `--enc-*` / `--adm-*` |
| Animación y scroll | Lenis + `ScrollStage` / `EditorialInteractive.tsx`. Leé `docs/encounters/animation-performance-playbook.md` antes de tocar scroll o animaciones |
| Imágenes | Bucket privado de Supabase servido por `/api/media/:id`; diseño en `public/design/` |

**Modelo (Supabase):** núcleo `posts` (campo `kind`: page, crew_member, expedition, workshop, artwork, message, news,
expedition_report, workshop_report) + `post_blocks` (bloques ordenados, `content` jsonb) + tablas de detalle por tipo
(`expeditions`, `workshops`, `artworks`, `messages`). `crew_members` (la persona) enlaza su página personal por
`page_post_id`. `post_contributors` (créditos con `role`) y `post_relations` (relacionados, con `note`). Guardado atómico con el
RPC `save_content`; RLS con `content_is_public`. Al guardar, el admin llama `/api/admin/revalidate` (expira toda la caché pública).
Mapa completo: `docs/encounters/schema-map.md`.

## 5. Cómo trabajar y verificar

```sh
npm run typecheck && npm run lint && npm test
NEXT_DIST_DIR=.next-verify npx next build && rm -rf .next-verify   # build de producción sin pisar .next
git checkout -- next-env.d.ts tsconfig.json                          # el dev server y el build los tocan; no se commitean
```

**CMS local** (Docker con Colima: `colima start`):
- `node_modules/.bin/supabase start` → `npm run cms:local:prepare` (crea el admin local; credenciales en
  `.encounters-work/local-cms.json`) → `npm run cms:local:dev` → http://127.0.0.1:3219 (admin en `/admin`).
- Al terminar: cortar el dev server y `colima stop`. `cms:local:stop` conserva los datos.
- Pruebas con navegador: `playwright-core` con `channel:'chrome'`. En la Mac de Juani hay scripts reutilizables en
  `.encounters-work/bench-scroll-2026-10-23/`: login al admin, `pixdiff.mjs` para comparar capturas y `reval.mjs` para
  expirar la caché local como hace el admin. Esa carpeta la ignora git: en otra máquina no existe y hay que rehacerlos. La caché pública también aplica en local: después de tocar la base a mano, revalidá.
- El sitio usa scroll propio (Lenis): para ver animaciones al scrollear, usá la rueda (`mouse.wheel`), no `scrollTo`. Para
  comparar páginas completas, capturá con `reducedMotion:'reduce'`.
- `/review/...` es la revisión visual local con fixtures; responde 404 en cualquier despliegue.

**Antes de afirmar algo, probalo.** Reportá qué se comprobó y cómo; si algo no se pudo probar, decilo. Un archivo creado no es
una migración aplicada; un push no es un despliegue verificado.

## 6. Decisiones vigentes (no revertir sin pedido)

**Generales**
- Un núcleo `posts` + bloques, en lugar de una tabla por tipo. Detalles tipados aparte. Una obra canónica; perfiles en `/crew`.
- Marcas de texto en contenido editable: `**negrita**`, `*cursiva*`, `++subrayado++` (las mismas que los posts del blog).
- El admin se divide por tarjetas que dicen qué muestran y de dónde sale cada valor «vacío» (fallback explícito).

**Página personal de Crew (2026-10-26)** — editor en orden: Banner → SEO → bloques → Credited crew → Related content → Contact.
- **Banner:** título grande = `posts.subtitle` («Large title») → si no, «Alias / project» de la persona → si no, el nombre;
  línea chica = `kicker` → si no, «meet <primer nombre>»; foto = `cover_id` → imagen de diseño (`cover_image` `/design/...`)
  → retrato. Guardar conserva `cover_image`.
- **SEO** (invisible en la página): `seo_title`, `meta_description` (vacío: biografía), «What they do» (`posts.tags` →
  `knowsAbout`), nombre en el admin. `/crew/<slug>` publica metadata y JSON-LD `ProfilePage` + `Person`; comparte la foto del banner.
- **Bloques de perfil** (`content.layout`): Main title, Opening text, Pinned photo pair, Photo row, Title, text & photos
  (`profile-chapter`), Dark gallery; más los bloques comunes. Las páginas guardadas con el formato viejo se abren convertidas,
  idénticas, y recién cambian al guardar.
- **Párrafos con estilo explícito** (`content.paragraphs: {text, style}`: Large / Highlighted / Normal). Los bloques viejos se
  leen con el estilo que tenían por posición, para verse igual.
- **Pinned photo pair:** fotos a todo el alto bajo el menú (desde 760 px); el pin se alarga para durar lo mismo. El admin avisa si
  una foto mide menos de 1200 px de ancho.
- **Fotos de Title, text & photos y de Photo row:** máximo 4, distribuidas según la cantidad (1 centrada; 3–4 en una fila en
  pantallas anchas; 2 por fila hasta 1080 px; una por fila en teléfono). Photo row con el mismo aire arriba y abajo.
- **Cierre de la página** (`ProfileFooter`): banda oscura sobre el pie con Related encounters (con comentario `note`), Crew
  (créditos, el rol como comentario, sin la propia persona) y Contact (links de la persona; email → `mailto:`, dominio sin
  protocolo → `https://`). No aparece si no hay nada.
- **Crew en el admin** (antes «People»): «Hide from The Crew page» (`crew_members.listed=false`: sale de `/crew` y del Home,
  la página y los créditos siguen) y «Delete…» en dos pasos (qué se borra; escribir el nombre). Borrar elimina también la página
  personal; bloques, relaciones e historial caen por `on delete cascade`. Las fotos quedan en la biblioteca.
- **Editor:** botones flotantes «Top» y «Save» (fuera de la barra superior: su `backdrop-filter` atraparía el `position:fixed`).

## 7. Estilo de código

- Imitá el código que rodea: TSX compacto (varias sentencias por línea es lo normal acá), nombres cortos, sin dependencias nuevas.
- Comentarios en inglés y solo para el «por qué» (decisión, restricción, caso raro), como los existentes.
- Cambios mínimos y localizados: reemplazos exactos verificados (un solo match) mejor que reescrituras.
- Si un componente público se usa también en la preview del admin, mantené un único render compartido.

## 8. Comunicación con Juani

- En español rioplatense, claro y sin jerga; nombres de pantallas y botones tal como se ven en el admin (en inglés).
- Al cerrar cada entrega: qué cambió, cómo se ve, qué se probó y cómo, qué quedó pendiente o necesita su decisión.
- Si algo necesita su decisión (diseño, base real, contenido), preguntá antes; si es un detalle técnico con una opción obvia,
  decidí y contalo.
- Juani prueba en producción con contenido de prueba («TEST TITLE», etc.): no lo borres ni lo «arregles».

## 9. Por dónde seguir

1. **Cerrar la página personal de Crew con Juani** (pendiente de su prueba manual): cargar Related content, Credited crew y
   contacto de Georgia en producción y revisar el cierre de la página.
2. Seguir el orden de `page-progress.md` con el mismo método (prototipo ↔ implementación, campos explícitos, previews compartidas):
   Art → Expeditions → Workshops → Meaningful Messages → About y Contact → Newsletter.
3. Contenido a corregir en el CMS (Juani): líneas repetidas y «Australia.She» en Expeditions; portada de Expeditions de 963 px.
4. Lanzamiento (con Juani): dominio, redirecciones (`docs/encounters/encounters-redirects-plan.json`), quitar `noindex`,
   newsletter, pruebas en dispositivos, aligerar portadas, retirar `?scroll=native` y `?calc=a`.

## 10. Documentos útiles

| Documento | Para qué |
|---|---|
| `docs/encounters/page-progress.md` | Estado vivo por página, decisiones recientes, migraciones. **Actualizalo en cada entrega.** |
| `docs/encounters/entornos.md` | Entornos, scripts de staging y local, caché, portadas. (Su tabla inicial menciona un proyecto de Vercel `encounters-review` que no es el sitio en revisión actual: el sitio vivo es el `-gamma` de §1.) |
| `docs/encounters/animation-performance-playbook.md` | Cómo están hechos el scroll, el agua y las animaciones; qué medir. |
| `docs/encounters/guia-carga-editorial.md` | Cómo cargar el contenido real desde el admin. |
| `docs/encounters/schema-map.md`, `routes-and-seo.md` | Modelo de datos; rutas, redirecciones y SEO. |
| `docs/encounters/handoff-current/` | Prototipos HTML vigentes (Home vigente: `Abismo Home v2.dc.html`; perfil: `Wild Wonders.dc.html`). |
| `docs/encounters/INSTRUCCIONES_ASTRA_ENCOUNTERS.md` | Instructivo original por pasos (histórico; sus reglas de aislamiento de Katie siguen vigentes). |
