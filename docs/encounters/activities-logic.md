# Expeditions y Workshops: cómo funcionan (2026-10-30)

Lógica que definimos con Juani entre el 2026-10-29 y el 2026-10-30 para **Expeditions**. **Workshops** sigue exactamente
la misma lógica; lo único propio de un workshop son sus **sessions** (§ 6). Para cada parte se indica dónde vive el código.

## 1. Tres cosas distintas en el admin

| Menú del admin | Qué es | Dónde se ve |
|---|---|---|
| **Expeditions page** / **Workshops page** | La página del programa: banner, SEO, textos de la lista y cierre. Una sola, permanente. | `/expeditions`, `/workshops` |
| **Expeditions** / **Workshops** | La lista oficial de **todas** las actividades, pasadas, en curso y por venir. Cada una con su página. | `/expeditions/<slug>`, `/workshops/<slug>` |
| **Results** | Solo las **historias** ya escritas de actividades terminadas («cómo nos fue»). Una por actividad. | `/posts/<slug>` |

Una historia (`expedition_report` / `workshop_report`) no es otra actividad: cuenta una de la lista y queda enlazada a ella
con `post_relations` (`relation='result'`, `post_id`=actividad, `related_post_id`=historia). Las **news** enlazadas como
`result` son novedades del viaje («Read the latest update»), no la historia: no aparecen en Results ni cuentan como historia.

## 2. Página del programa (Settings → `site_settings.value.pages.<expeditions|workshops>`)

Editor en el orden de la página (`src/components/admin/pageSettingsSchema.ts`, `PageSettings.tsx`):

1. **Banner**: imagen(es), línea chica y título.
2. **Search engines (SEO)**: título y descripción para Google, prellenados con un texto nuestro
   (`expeditionsSeo` / `workshopsSeo` en `src/features/encounters/*-page.ts`), y temas (`seo_topics`) que van a `keywords` y
   `about` del JSON-LD `CollectionPage`. Cada actividad con fecha entra como `Event` (`hasPart`). Vacío: texto sugerido.
3. **Solo Expeditions — cards del banner** (`settings.cards`): cualquier cantidad, color de fondo de la paleta, título,
   texto con B/I/U/link, lista, firma, link y foto opcionales. Prioridad: `settings.cards` → tabla `expedition_cards` →
   texto de la página leído como cards. Lo viejo se abre convertido como ejemplo y se guarda al primer Save.
4. **Lista**: título y nota. Las actividades publicadas se agrupan por estado con un filtro arriba (solo con más de un
   grupo): **Coming up** (blanco; incluye Postponed), **On the water now / Happening now** (laguna), **Where we have
   been / Past workshops** (blanco; incluye Cancelled). Los nombres de los grupos son fijos.
5. **Cierre**: frase oscura final (Expeditions: olas dibujadas con el scroll; Workshops: pregunta y botón a Contact).

## 3. Estado de cada actividad (`src/features/encounters/activities.ts`)

- **Automático por fecha, en hora de Perth** (`perthToday`, `activityStatus`): antes de `starts_on` → Upcoming; de
  `starts_on` a `ends_on` (ambos incluidos) → Running; después → Finished. Sin `ends_on`, dura un día.
- **Postponed y Cancelled son manuales** y siempre ganan hasta volver a «Follow the dates».
- Sin fechas, el estado elegido a mano (Upcoming / Running / Finished / Postponed / Cancelled).
- Se aplica al leer (`activities()`): la web, Home, las previews y el admin muestran lo mismo, sin cron ni escritura.
- Admin: tarjeta **Status** arriba del editor (`ActivityStatusCard`) con «On the site now: …».

## 4. Editor de una actividad (`src/components/admin/EncountersCms.tsx`)

- Barra superior sin Duplicate as draft, Visual preview, Example ni Unpublish; Draft/Published solo en **Publication**.
- **Status** (§ 3) y **Delete** en dos pasos (qué se borra y qué queda; escribir el título). Borrar la actividad borra
  detalles, bloques, créditos, needs/sessions y sus enlaces; **las historias se conservan** en Results.
- **Excerpt = la invitación**: se muestra grande con el botón para sumarse en la página de la actividad.
- Tarjeta de resultados: si terminó y no tiene historia, invita a **Write about this adventure**.

## 5. Historias

- **Lista de la actividad** (Expeditions / Workshops): columnas Status on the site, **Story** («Story published →» o
  «Story in draft →» con el título de la historia; si terminó sin historia, el botón **Write about this adventure**; si no
  terminó, «After it ends») y Publication. Arriba, un **aviso** enumera las terminadas que esperan su historia.
- **Write about this adventure** (`writeStory`): crea el borrador del report con el título, la portada, kicker «How it
  went» y los créditos de la actividad, slug `<slug>-story`, lo enlaza como `result` y abre su editor (banner, SEO, bloques).
- **Results**: solo historias, con la columna **About** (la actividad, enlazada). Se editan y se borran (Edit → Delete).
  **New story** pregunta de qué actividad es y lista solo las **terminadas sin historia**: no se escribe la historia de
  algo que no terminó. Una historia suelta (sin actividad) muestra un selector para enlazarla; en su editor, la tarjeta
  «Expedition/Workshop it tells about» la cambia (`StoryOf`).
- **Web**: la actividad terminada muestra «How it went» (`outcome`) y «Read the story →»; en la lista, su tarjeta lleva
  a la historia.

## 6. Página de una actividad (`src/components/public/PostView.tsx`, `ActivityGlance`)

Clara de un vistazo: **qué** (título y banner), **estado** con punto de color y «Starts in N days» / «Day N of M»,
**cuándo**, **dónde**, **quiénes** (retrato, nombre y rol). Después, una banda azul profundo con la **invitación**
(Excerpt grande, disponibilidad arriba y el botón a Contact o a la inscripción) junto a la foto. Terminada: banda arena
«How it went» y «Read the story →». Cancelada: no invita. El resto (cómo, por qué) lo cuentan los bloques.

### Lo propio de Workshops: sessions

- Un workshop tiene **una o más sessions** (`workshop_sessions`: título, descripción, lugar, fecha, imagen, orden). Una
  sola session es un encuentro (un día y un lugar, u «Online» como lugar); varias, un ciclo.
- **Fechas**: si el workshop no tiene `starts_on`/`ends_on`, se toman de sus sessions (primera y última fecha;
  `withSessionDates`). Así el estado automático también sigue a las sessions.
- **Dónde**: el lugar del workshop; si no tiene, el de sus sessions (uno solo, o «N places»).
- **Inscripción**: el botón es el email de inscripción (si Registration = Open y hay email) o Contact; Full y Closed lo
  ocultan y lo dicen. Formato, idioma, lugares y precio aparecen como datos chicos del vistazo.
- En `/workshops` cada workshop mantiene su pantalla fija con las sessions deslizables (prototipo); los grupos y el filtro
  se agregan arriba de esas pantallas.
