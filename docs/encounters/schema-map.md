# Mapeo de esquema

PASO 4.0–4.2, 2026-10-06: 14 migraciones aplicadas, mismas 20 tablas con RLS. Incremento `art_categories.featured`; `content_is_public` condiciona obras a categoría publicada y documentos Crew a perfil habilitado/publicado. `media_is_published` usa esa elegibilidad sin romper referencias compartidas. RPC `create_crew_profile` crea/vincula borrador sin Auth. Triggers reutilizan route_history para cambios de slug/categoría; resolver público limitado a destinos Art/Crew publicados. Ver phase4-art-crew.md. No se modifica el modelo ni el contenido del snapshot.

Actualización PASO 3, 2026-10-05: modelo implementado en 13 migraciones propias y aplicado únicamente a Encounters. Resolución final en phase3-implementation.md: posts/bloques conservados, entidades con extensiones tipadas, sesiones y necesidades en tablas, admin_users/RLS y guardado atómico. Dos admins actuales, alta del tercero documentada. El mapeo comparativo siguiente conserva la auditoría original del PASO 1; ya no representa SQL pendiente salvo visual, historial automático de cambios de URL y decisiones de lanzamiento.

Snapshot importado: 12 documentos, 161 bloques, 6 fichas Crew, 1 Messages. 50 referencias de imágenes → 49 archivos únicos por SHA-256; image_029 e image_030 comparten archivo. Presentaciones institucionales conservadas sin inventar expediciones/workshops individuales. Source IDs/URLs/slugs y grupos editoriales trazables. Ver verification/phase3-import.json; repetición y validación final se registran por separado.

## Auditoría histórica del PASO 1

Auditado código del SHA base y SQL histórico versionado; no se consultó ninguna DB. El esquema realmente instalado en Katie no se presume idéntico a estos archivos.

| Modelo requerido (handoff/03) | Base real | Reutilización / cambios PASO 3 |
|---|---|---|
| posts | id,title,slug,subtitle,excerpt,meta_description,cover_image,cover_alt,status,categories[],tags[],read_time,destination,country,continent,published_at(date),created_by,created_at,updated_at | Conservar núcleo; kind, kicker/meta_line, cover_id, show_index, orden/SEO y detalles tipados. created_by es editor Auth, no autoría pública. Evaluar timestamp editorial sin pérdida. |
| post_blocks | id,post_id,type,position,content jsonb,created_at,updated_at | Conservar position/content; adaptar sort/data en frontera. Añadir anchor y referencias de medios donde corresponda; conservar IDs estables. |
| media | bucket Storage media; adminMedia procesa y devuelve URL; gallery_items es galería pública, no catálogo universal | Crear/ampliar catálogo mínimo de archivos con storage_path, alt, dimensiones, focal 0..1, fit, credit. No obligar a habilitar galería pública para editor. Migrar URLs propias con trazabilidad. |
| site_settings | key/value jsonb/updated_at; key=site | Extender value para hero, reef, footer, redes, donación externa, Home editable. Eliminar defaults de Katie, mantener un único origen de configuración. |
| about_page / introducciones | Settings existentes y páginas hardcodeadas | Ampliar settings.pages o posts institucionales; elegir una única fuente, sin duplicar tabla por comodidad visual. |
| crew_members | inexistente | Nueva entidad pública, slug, name, alias, role, bio, portrait_id, sort,status,has_page,page_post_id,quote,redes/contacto. Sin crear Auth por perfil. |
| expeditions | inexistente como entidad; posts de viajes | posts.kind=expedition + detalles específicos: lifecycle, fechas opcionales, place, meta/date/availability/CTA/home_rank, cover/underwater, necesidades con IDs y estado. Presentación del programa separada de viajes. |
| expedition_cards | bloques genéricos reutilizables | Cards estructuradas de presentación: kicker,title,body,signature,bullets,media,side,theme,CTA,orden; decidir JSON validado vs tabla por consultas. |
| workshops/workshop_sessions | inexistentes | posts.kind=workshop + detalles y sesiones JSON con IDs estables, title/body/place/held_on/media. Mantener inscripción separada de lifecycle; audience/materials/idioma/modalidad/precio/contacto opcionales. |
| art_categories | categorías de blog fijas en código | Tabla propia editable: slug,name,sort,number_label,title,credit,lead,body,CTA,cover,layout,status,SEO. No reciclar enum de viajes. |
| artworks | posts+bloques reutilizables | posts.kind=artwork + categoría principal, caption,media,external_url,embed_kind/id,span,full_height. Añadir slug,status y autoría estructurada que faltan en handoff. |
| messages | posts+bloques | kind=message, texto con estrofas, body,illustration,credit,sort,slug,status,SEO; permitir un solo mensaje. |
| report_post_id | sin relación genérica | post_relations para uno o varios relatos por actividad; resultado destacado opcional sin limitar otros. |
| responsables | author único en configuración; created_by Auth | post_contributors(post_id,crew_member_id,role,position), FK e integridad, no nombres como IDs. |
| upcoming_items | inexistente | Referencia a ficha o anuncio independiente, fecha/imagen opcionales, estado,orden; evitar duplicar ficha al vincular. |
| contact_topics/submissions | endpoint email existente | Persistencia no autorizada todavía; pendiente funcional de Contact, no requisito automático del SQL. |
| newsletter | newsletter_subscribers(id,email,status,source,unsubscribe_token,subscribed_at,unsubscribed_at,created_at,updated_at) | Reutilizar con lista vacía. RPC pública heredada devuelve email/token: restringir a servidor y respuestas no enumerables; alta/baja y envío manual deben funcionar sin comercio. |
| admin_users/is_admin | allowlist por email + helper SQL | Nueva allowlist vacía hasta confirmar 3 emails. RLS segura desde baseline; Auth, API y DB concordantes. |
| historial de rutas | JSON de migración externo + referencias blog | Conservar JSON origen; agregar historial de cambios de slug/categoría y constructor canónico compartido. |

## Bloques

| Handoff | Base | Adaptación de payload |
|---|---|---|
| image | image | media_id → src/alt/caption mediante resolver; no perder focal/crédito |
| two_images | image-pair | left/right → src/srcSecondary y captions/alts |
| carousel | carousel | slides → carouselImages |
| youtube | youtube | video_id → youtubeUrl validada; carga al click |
| heading | heading | title → text; kicker/number/anchor adicionales |
| paragraph | paragraph | lead/body → contenido validado; conservar párrafos y saltos |
| title_list | list | title + items, showNumbers |
| quote | quote | quote → text + attribution |
| quick_facts | quick_facts | facts → quickFactItems |
| cost_breakdown | costs | rows → costItems, total/nota requieren ampliar |
| faqs | faq | q/a → question/answer |
| accordion | accordion | label/body → title/text; IDs estables |
| tour_dive_center | tour | colaborador genérico, revisar campos útiles |
| affiliate_link | affiliate_link | Conservado pero afiliación apagada; no activar por aparecer en prototipo |
| simple_link | link | label/url → label/href |
| divider | divider | Sin payload |
| post_index | toc | Índice de headings + anchor estable |

Base tiene 18 tipos incluyendo stay. No renombrar indiscriminadamente. Audio/documentos/poemas se agregan según contenido real.

Riesgos confirmados: replaceAdminPostBlocks hace delete e insert separados; cabecera se guarda por otra operación. Preparar RPC atómica de cabecera/bloques/relaciones en PASO 3. SQL inicial habilita escritura amplia a autenticados y endurece después; el baseline propio debe nacer cerrado. admin-security depende de gallery_items y Storage, incluye email de Katie: no ejecutar intacto. Newsletter debe revocar también EXECUTE de PUBLIC para funciones sensibles, además de anon/authenticated.
