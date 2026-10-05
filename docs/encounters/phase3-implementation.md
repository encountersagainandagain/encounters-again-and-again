# PASO 3 — esquema y CMS mínimo

Destino exclusivo lzwmwofxoegkxykglneq. Reportes en verification/phase3-*.json distinguen preflight, esquema aplicado, API e importación. Sin cambios en Katie, WordPress, DNS, Resend ni Vercel.

## Migraciones y relaciones

Secuencia en supabase/migrations:

1. 20261004000100_administration.sql: pgcrypto, helpers, admin_users/is_admin.
2. 20261004000200_settings_media.sql: configuración editable y catálogo.
3. 20261004000300_posts_blocks.sql: posts, bloques, medios, relaciones, URLs.
4. 20261004000400_expeditions.sql: expediciones, presentación y necesidades.
5. 20261004000500_workshops.sql: workshops y sesiones.
6. 20261004000600_crew_art.sql: Crew, categorías, obras y responsables.
7. 20261004000700_messages_upcoming.sql: poemas/reflexiones y próximos.
8. 20261004000800_newsletter.sql: consentimiento, alta/baja y privacidad.
9. 20261004000900_storage.sql: bucket privado y policies.
10. 20261004001000_constraints_atomic_save.sql: índices, triggers, RPC atómica.
11. 20261004001100_structural_settings.sql: configuración inicial propia.
12. 20261005000100_content_identity.sql: tipo inmutable y perfil Crew válido.
13. 20261005000200_snapshot_svg.sql: MIME del logo presente en snapshot.

| Tablas | Relación / uso |
|---|---|
| admin_users | UUID → auth.users; independiente de Crew |
| site_settings, media | Configuración JSON; catálogo/hash/alt/foco/crédito |
| posts, post_blocks, post_media | Documento, bloques ordenados, imágenes asociadas |
| expeditions, workshops, artworks, messages | Extensiones 1:1 con campos propios |
| expedition_needs, expedition_cards, workshop_sessions | Hijos 1:N; conservar necesidades conseguidas |
| crew_members, art_categories | Entidades independientes, publicación propia |
| post_contributors | N:M obras/publicaciones ↔ Crew |
| post_relations | Actividad → varios resultados; otras relaciones opcionales |
| upcoming_items | Publicación existente o anuncio independiente |
| newsletter_subscribers | Email único normalizado, consentimiento, estado, token |
| route_history | URLs antiguas y destinos; reglas aún no activadas |

## Autorización

20 tablas con RLS. is_admin usa auth.uid y admin_users, SECURITY DEFINER con search_path vacío y grants explícitos. La tabla de permisos no admite accesos anon/authenticated. authenticated y user_metadata no conceden permisos. Dos fundadores cargados por script server-only; tercero documentado en sql-runbook.

Public lee contenido publicado y sus bloques/relaciones. Anon y no admin no escriben. CMS/Storage requieren admin. save_content SECURITY INVOKER guarda cabecera, bloques, detalles, responsables e hijos transaccionalmente, con control de versión; un error revierte todo. Newsletter no expone emails públicamente; alta/baja HTTP validada llama RPC solo del servidor.

## CMS y frontend provisional

/admin/content: formularios por entidad, borradores/publicación, bloques con orden/duplicación, preview textual, responsables múltiples, resultados, necesidades, sesiones y medios. Editor detallado heredado disponible. /admin/settings: ajustes y Home con orden/ocultamiento/fijados. Comercio archivado y desactivado centralmente.

Rutas públicas leen Supabase/RLS con plantillas mínimas, sin diseño visual ni animaciones finales. Art tiene categoría, detalle y aparición en ambos perfiles responsables. Home oculta secciones vacías. Noindex y sitemap vacío conservados hasta lanzamiento.

## Mapeo editorial

11 páginas + 1 story → 12 posts; 161 blocks → 161 post_blocks en posición/texto original. Presentaciones institucionales de expediciones/workshops permanecen páginas, sin inventar actividades individuales. Wild Wonders es perfil Crew. Story clasificada como reflexión ilustrada en Meaningful Messages, sin duplicación en noticias. Seis fichas Crew se extraen de bloques identificados de Team, sin nuevas cuentas Auth.

8 core publicados; Services legacy, Shop future_disabled, Dashboard/Checkout system_disabled en draft. Constraint impide publicar clasificaciones pendientes sin revisión explícita. sections/curated_groups quedan metadatos organizativos, raw respaldo. Obras/categorías concretas necesitan curación; no se infieren duplicando bloques.

source_url/current_slug/hash/IDs y mapa original preservados. Enlaces propios se traducen solo con destino conocido; wp-admin se conserva como procedencia pero no se renderiza. Vídeos ausentes del ZIP pendientes, no cargados desde WordPress. Placeholder Elementor conservado para revisión. Email en texto del snapshot se conserva literalmente y no se asume como destinatario operativo.

Pendiente PASO 4: fidelidad visual, preview visual completo, curación de Art, vídeo faltante y revisión de contactos/enlaces heredados. Entrega de newsletter pendiente dominio Resend. Redirecciones, historial automático al cambiar slug/categoría y SEO de lanzamiento antes del cambio de dominio.

## FASE 3B — importación ejecutada

Checkpoint previo: 28510a2217b468eb577bbeb98a73cd6bf9c94702. Dry-run seguido de ejecución real: 12 documentos y 161 bloques, 6 Crew y 1 extensión Messages; 8 publicados y 4 draft. Cero documentos ignorados: el contenido excluido queda archivado como borrador sin ruta pública.

50 referencias de imágenes, 49 archivos únicos subidos, 1 reutilizado, 0 fallidos. image_029 e image_030 tienen bytes idénticos. El manifiesto conserva ambos asset_id y su único media_id/path. Todos los textos originales siguen en bloques; no se expandieron sections/curated_groups. Las demás entidades estructurales quedan vacías hasta curación o nueva creación desde CMS.

Vídeo pendiente: encounters_expeditions_009 referencia YOUTUBESHORT.mp4, no incluido en el ZIP. No se descargó de WordPress ni se carga como dependencia del sitio. Evidencia definitiva: verification/phase3-import.json, phase3-import-repeat.json y phase3-final.json. Segunda ejecución reutilizó 12 documentos, 6 Crew y 50 referencias, sin escribir imágenes nuevas ni duplicar bloques. La validación final comparó todos los textos, posiciones y asset_id y comprobó las rutas, publicación y signup desactivado.

Lint/TypeScript/tests y aislamiento HTTP PASS. Build con Webpack PASS; descarga de fuentes falló intermitentemente en Turbopack. Ningún fallo de site_settings. El navegador confirmó creación/persistencia de borrador y carga de las siete imágenes del perfil desde /api/media; captura phase3-imported-crew.png. No se considera aprobación del diseño visual.
