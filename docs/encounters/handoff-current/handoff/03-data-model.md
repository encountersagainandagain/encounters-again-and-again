# 03 · Modelo de datos (Supabase)

Todo lo editable vive en Postgres. Las imágenes viven en Storage y se referencian por la tabla `media`.

## Principios

1. **Una tabla por tipo de contenido**, más `post_blocks` para el contenido de formato libre.
2. **Nada de HTML en la base.** Los textos son texto plano (o Markdown mínimo: negrita, itálica, link). El diseño lo pone el front.
3. **Orden explícito:** toda lista editable tiene `sort` (integer). Nunca se ordena por fecha de creación.
4. **Estado explícito:** `status` en ('draft','published') y, donde corresponde, `lifecycle` en ('upcoming','running','finished').
5. **Imágenes por referencia**, nunca URL suelta: así el punto focal y el alt viajan con la imagen.

## Tablas

### media
Toda imagen o archivo subido.

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| storage_path | text | ruta en el bucket |
| alt | text | **obligatorio**, en inglés |
| width, height | int | para evitar salto de layout |
| focal_x, focal_y | numeric(3,2) | 0–1, default 0.5 → `object-position` |
| fit | text | 'cover' \| 'contain' (default 'cover') |
| credit | text | opcional, fotógrafo/ilustradora |

### site_settings (una sola fila)
email de contacto, link del fundraiser, texto del footer, redes, `closing_line`.

Campos del banner y del arrecife de la Home: `hero_title`, `hero_subtitle`, `hero_tagline`, `hero_cue`, `reef_media_id` (→ media), `reef_caption`, `reef_place`.

### crew_members
| Campo | Tipo | Notas |
|---|---|---|
| id | uuid pk | |
| slug | text unique | ruta /crew/[slug] |
| name | text | |
| role | text | "Photographer & filmmaker" |
| portrait_id | uuid → media | retrato de la tira |
| sort | int | orden en la tira |
| has_page | bool | **si es false el retrato no linkea** |
| page_post_id | uuid → posts | la página del integrante, editada por bloques |
| quote | text | opcional, frase bajo el nombre |
| status | text | draft/published |

### expeditions
| Campo | Tipo | Notas |
|---|---|---|
| id, slug | | |
| title | text | "The first crossing" |
| kicker | text | italic del banner |
| lifecycle | text | upcoming / running / finished |
| starts_on, ends_on | date | |
| place | text | |
| meta_line | text | "Coqui · 11 days" |
| date_label | text | fecha como se muestra en la Home: "October 2026" |
| availability_label | text | chip de la Home: "Two spots left" |
| cta_label | text | texto del botón en la Home: "Ask about this leg" |
| home_rank | int | opcional, fuerza el orden en la agenda de la Home |
| cover_id | uuid → media | imagen de superficie del banner |
| underwater_id | uuid → media | imagen submarina de la disolución |
| report_post_id | uuid → posts | sólo si lifecycle = finished |
| sort, status | | |

### expedition_cards
Las cards que aparecen sobre la imagen submarina. **Entre 3 y 6** (con menos de 3 el banner se siente vacío; con más de 6 el pin se vuelve larguísimo: el front calcula el alto del pin como `220vh + 110vh por card`).

| Campo | Tipo | Notas |
|---|---|---|
| id, expedition_id, sort | | |
| kicker | text | "The boat" |
| title | text | |
| body | text | 2–3 oraciones, máx ~320 caracteres |
| signature | text | opcional, italic al pie ("Fabri, Juli, Majita and Hugo.") |
| bullets | jsonb | opcional, array de strings → lista numerada |
| media_id | uuid → media | |
| media_side | text | 'left' \| 'right' (el front alterna por default) |
| theme | text | 'light' \| 'dark' (la última suele ir dark con CTA) |
| cta_label, cta_url | text | opcional |

### workshops
| Campo | Tipo | Notas |
|---|---|---|
| id, slug | | |
| title | text | "Draw the ocean" |
| subtitle | text | "three sessions" (se genera si está vacío) |
| lifecycle | text | upcoming / running / finished |
| place | text | |
| starts_on, ends_on | date | |
| cover_id | uuid → media | |
| audience_note | text | bloque "Who it is for" de la columna izquierda |
| materials | jsonb | array de strings: materiales necesarios |
| signup_email | text | default site_settings.email |
| signup_subject | text | asunto precargado del mailto |
| signup_label | text | default "Join this workshop" |
| date_label | text | fecha como se muestra en la Home: "September 27" |
| availability_label | text | chip de la Home: "Free · drop in" |
| cta_label | text | texto del botón en la Home |
| home_rank | int | opcional, fuerza el orden en la agenda de la Home |
| report_post_id | uuid → posts | sólo si finished |
| sort, status | | |

**El botón de inscripción es un mailto:** `mailto:{signup_email}?subject={signup_subject}`. Si `signup_subject` está vacío el front arma "Workshop: {title}". Si el workshop está `finished` el botón se reemplaza por "See the result →" apuntando al post.

### workshop_sessions
Las etapas del carrusel vertical. 1..n por workshop.

| Campo | Tipo | Notas |
|---|---|---|
| id, workshop_id, sort | | |
| title | text | "Looking first" |
| body | text | máx ~300 caracteres (el riel no scrollea dentro de la sesión) |
| place | text | opcional, cada sesión puede tener lugar propio |
| held_on | date | opcional, fecha propia |
| media_id | uuid → media | la imagen que cruza al llegar a esta sesión |

### art_categories
| Campo | Tipo | Notas |
|---|---|---|
| id, slug, sort | | slug = ancla y filtro |
| name | text | "Books", "Films", "Podcasts"… **se crean libremente** |
| number_label | text | "01" (se autogenera por sort si está vacío) |
| title | text | titular de la sección |
| credit | text | "Words by Julian Lange · Illustrations by Georgia Webb" |
| lead | text | párrafo Garamond destacado |
| body | text | párrafo Archivo |
| cta_label, cta_url | text | |
| cover_id | uuid → media | card del carrusel de categorías |
| layout | text | 'gallery' \| 'feature' \| 'video' \| 'audio' (ver 16-art.md) |
| status | | |

### artworks
| Campo | Tipo | Notas |
|---|---|---|
| id, category_id, sort | | |
| title, caption | text | |
| media_id | uuid → media | |
| external_url | text | link a la obra |
| embed_kind | text | null \| 'youtube' \| 'spotify' |
| embed_id | text | id del video/episodio |
| span | int | 1–6: columnas que ocupa en la grilla de 6 |
| full_height | bool | si ocupa `calc(100vh - nav)` |

### messages (Meaningful Messages)
| Campo | Tipo | Notas |
|---|---|---|
| id, sort | | |
| message | text | el mensaje, en Garamond grande |
| body | text | opcional |
| illustration_id | uuid → media | dibujo de Georgia |
| credit | text | "Illustrated by Georgia Webb, inspired by Julian Lange" |

El pin se dimensiona como `120vh + 60vh por mensaje` (3 mensajes → 300vh, tal como el prototipo).

### posts + post_blocks
El formato libre. `kind` define dónde se usa:

| kind | Uso |
|---|---|
| expedition_report | resultado de una expedición terminada |
| workshop_report | resultado de un workshop terminado |
| crew_member | página de un integrante |
| news | post suelto / novedad |

**posts**

| Campo | Tipo | Notas |
|---|---|---|
| id, slug | | ruta /posts/[slug] |
| kind | text | ver tabla |
| title | text | título del banner |
| kicker | text | italic sobre el título |
| meta_line | text | "Coqui · 11 days \| March 2026" |
| cover_id | uuid → media | banner |
| excerpt | text | para listados |
| published_at | timestamptz | |
| status | text | |
| show_index | bool | muestra el bloque "In this post" |

**post_blocks**

| Campo | Tipo | Notas |
|---|---|---|
| id, post_id, sort | | |
| type | text | uno de los 17 tipos (ver 04-editor-de-bloques.md) |
| data | jsonb | payload según el tipo |
| anchor | text | opcional, id para el índice |

### contact_topics / contact_submissions
Los 4 motivos del formulario son editables (`title`, `hint`, `reply_text`), y las consultas se guardan en `contact_submissions` (name, email, place, timing, message, topic_id, created_at).

### about_page (una sola fila) y pages estáticas
About us es estable: título de banner, kicker, párrafos del manifiesto (jsonb array), set de fotos (jsonb array de media_id) y bloque de acciones. Cualquier página estática futura puede usar `posts.kind = 'news'` en vez de tabla nueva.

## La Home no tiene tablas propias

Todo lo que muestra sale de tablas existentes. Las consultas, en orden de aparición:

| Bloque | Consulta |
|---|---|
| Ongoing projects (3) | fijas en código. Sólo `media_id`, `status_label` y bajada son editables (guardar en `site_settings.home_projects` jsonb) |
| What is coming (4) | `expeditions` ∪ `workshops` con `lifecycle = 'upcoming'` y `status = 'published'`, orden `coalesce(home_rank, 999), starts_on`, límite **4** |
| What already happened (3) | `posts` con `status = 'published'` y `kind <> 'crew_member'`, orden `published_at desc`, límite 3 |
| New art (5) | `artworks` publicadas con su `art_category`, orden `sort`, límite 5 |
| Who is on board (6) | `crew_members` publicados, orden `sort`, límite 6 |

La agenda muestra **4 eventos** por defecto (límite de la consulta). Ya no es un requisito duro: sin pin, el diseño funciona de 2 a 6 (ver 02-animations.md § 4.5).

## SQL de arranque

    create type content_status  as enum ('draft','published');
    create type lifecycle_state as enum ('upcoming','running','finished');
    create type post_kind       as enum ('expedition_report','workshop_report','crew_member','news');

    create table media (
      id uuid primary key default gen_random_uuid(),
      storage_path text not null,
      alt text not null,
      width int, height int,
      focal_x numeric(3,2) not null default 0.5,
      focal_y numeric(3,2) not null default 0.5,
      fit text not null default 'cover',
      credit text,
      created_at timestamptz not null default now()
    );

    create table posts (
      id uuid primary key default gen_random_uuid(),
      slug text unique not null,
      kind post_kind not null,
      title text not null,
      kicker text, meta_line text, excerpt text,
      cover_id uuid references media(id),
      show_index boolean not null default true,
      status content_status not null default 'draft',
      published_at timestamptz,
      created_at timestamptz not null default now()
    );

    create table post_blocks (
      id uuid primary key default gen_random_uuid(),
      post_id uuid not null references posts(id) on delete cascade,
      sort int not null,
      type text not null,
      anchor text,
      data jsonb not null default '{}'::jsonb,
      unique (post_id, sort)
    );

    create table crew_members (
      id uuid primary key default gen_random_uuid(),
      slug text unique not null,
      name text not null,
      role text,
      quote text,
      portrait_id uuid references media(id),
      has_page boolean not null default false,
      page_post_id uuid references posts(id),
      sort int not null default 0,
      status content_status not null default 'draft'
    );

    -- expeditions, expedition_cards, workshops, workshop_sessions,
    -- art_categories, artworks, messages, contact_topics, contact_submissions
    -- siguen el mismo patrón: pk uuid, sort int, status, fk a media.

## Tipos TypeScript

    type Fit = 'cover' | 'contain';

    export type Media = {
      id: string; url: string; alt: string;
      width: number | null; height: number | null;
      focalX: number; focalY: number; fit: Fit; credit: string | null;
    };

    export type BlockType =
      | 'image' | 'two_images' | 'carousel' | 'youtube'
      | 'heading' | 'paragraph' | 'title_list' | 'quote'
      | 'quick_facts' | 'cost_breakdown' | 'faqs' | 'accordion'
      | 'tour_dive_center' | 'affiliate_link' | 'simple_link'
      | 'divider' | 'post_index';

    export type Block<T extends BlockType = BlockType> = {
      id: string; sort: number; type: T; anchor: string | null; data: BlockData[T];
    };

    export type Post = {
      id: string; slug: string;
      kind: 'expedition_report' | 'workshop_report' | 'crew_member' | 'news';
      title: string; kicker: string | null; metaLine: string | null;
      cover: Media | null; showIndex: boolean; blocks: Block[];
    };

`BlockData` se define tipo por tipo en 04-editor-de-bloques.md.

## Reglas de validación (para el panel)

- `media.alt` obligatorio: sin alt no se publica.
- Largos máximos sugeridos: título de card 60, body de card 320, body de sesión 300, caption 120. El diseño está calculado para esos rangos; pasarse rompe el encuadre de los pines.
- `expedition_cards`: mínimo 3, máximo 6.
- `workshop_sessions`: mínimo 1. Si el workshop es `finished`, las sesiones se ignoran y se muestra la card de resultado.
- `art_categories`: mínimo 1. Con más de 4, el carrusel de categorías se activa solo.
- `messages`: mínimo 2.
