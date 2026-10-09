# Rutas y SEO

## PASO 4.0–4.2 — 2026-10-06

Art/Crew incorporan canonical, metadata, OG/Twitter y breadcrumbs. Sitemap dinámico solo con estas familias y publicados; perfil deshabilitado o documento draft excluidos. Sin generateStaticParams restrictivo, sin caché persistente de consultas y con revalidación administrativa de ambas familias. Se conserva noindex global hasta lanzamiento. Las URLs absolutas respetan NEXT_PUBLIC_SITE_URL: el entorno local aún configura localhost:3000; en producción se deberá usar el dominio confirmado.

Historial incremental de cambios de slug/categoría reutiliza route_history. Resolver solo de destinos Art/Crew publicados; soporta barras finales del mapa WordPress. Entradas de Crew habilitadas: `/elementor-page-3462/` y `/elementor-2907/`. Entradas de Expeditions/Workshops/Contact/Messages permanecen sin activar. Detalles sin publicar/inexistentes responden 404, sin boundary de carga que convierta el error en respuesta streaming 200. Los estados de carga se limitan a los índices.

Los apartados siguientes conservan el registro histórico del arranque; sus referencias a sitemap vacío y redirects sin activar describen PASO 1.

Dominio previsto: https://encountersagainandagain.com. Sin DNS ni publicación. Metadata/canonical/JSON-LD deben derivar de configuración común; identidad Organization del colectivo, sin Person de Katie ni sus verificaciones.

Rutas objetivo: /, /about, /contact; /crew y /crew/[slug]; /expeditions y /expeditions/[slug]; /workshops y /workshops/[slug]; /art, /art/[category], /art/[category]/[slug]; /meaningful-messages y /meaningful-messages/[slug]; /posts/[slug]; /upcoming solo si hace falta; /admin y operaciones CMS/newsletter; /unsubscribe/[token]. Perfil con has_page=false responde 404. Nunca duplicar perfil bajo /posts.

`encounters-redirects-plan.json` conserva íntegro el inventario: 12 URLs de páginas/posts y 50 imágenes, todavía propuesto y no activado. No se descartan destinos pendientes ni medios. /messages y /stories son propuestas antiguas, no rutas publicadas comprobadas. /wp-admin no se redirige al admin nuevo. .org fuera de alcance.

Activar 301/308 por correspondencia solo cuando destino publicado responda 200. No redirigir todo a Home ni producir autorredirección /about→/about. Slugs nuevos sin deploy; sitemap solo publicados/módulos activos, updated_at real. Previews/proyecto en preparación fuera de indexación. Borradores protegidos por consultas y RLS, no por robots.

Auditoría fuente: next.config.ts y vercel.json redirigen a whatkatieseas.com; layout trae verificaciones Google/Pinterest; sitemap incluye destinos, galería, gear y soporte. Eliminar de configuración activa de Encounters al importar. Revalidación debe invalidar ruta, índices, Home, perfiles y sitemap; conservar historial al cambiar slug/categoría.

Pruebas HTTP de bootstrap realizadas: páginas preparatorias 200, detalles no implementados 404, módulos apagados 404, noindex global, robots bloquea indexación y sitemap vacío. Ninguna redirección legacy se activó ni se declaró validada.

Confirmado en la referencia actual: `app/blog/[slug]/page.tsx:21` conserva `dynamicParams = false`; no se heredó esa restricción: nuevas plantillas tienen dynamicParams=true. Publicación real sin deploy se validará cuando exista esquema/contenido en PASO 3.

Los prototipos no se publican en public: permanecen bajo docs para referencia. Canonicals provisionales usan rutas propias y dominio central. Deshabilitar noindex global y completar sitemap solo al preparar lanzamiento, con contenido publicado y tests de borradores. Rutas legales de Katie archivadas: redactar textos propios antes de lanzamiento.
