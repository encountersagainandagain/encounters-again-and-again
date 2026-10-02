# Módulos — auditoría y política inicial

Implementado: `src/config/modules.ts` define alcance; `module-policy.ts` mapea rutas y tablas; `proxy.ts` devuelve 404 antes de ejecutar módulos desactivados; moduleFetch protege los clientes compartidos. El código ajeno al arranque vive en `legacy/`, fuera de App Router y de imports activos. Auth y RLS siguen siendo obligatorios: flags no autorizan usuarios.

Layout/Home no importan campañas; dashboard no consulta pedidos/comentarios/reseñas; newsletter no importa AdminShopCampaigns ni emite cupones. Sitemap está vacío mientras las páginas son provisionales. vercel.json no contiene cron ni redirects de Katie. Los scripts con efectos están archivados y lanzan error antes de actuar. `archived-code.json` identifica rutas, componentes, bibliotecas y scripts retenidos.


| Área | Acción | Código y superficies auditadas |
|---|---|---|
| CMS posts/bloques | Reutilizar/adaptar | adminPosts, AdminPostForm, renderizador de BlogPost; conservar editor y tipos position/content; nuevas entidades en PASO 3 |
| Auth/admin | Reutilizar/endurecer | ProtectedAdminRoute, adminAccess, adminApiAuth; eliminar admin predeterminado, API valida token y allowlist, RLS efectiva en PASO 3 |
| Medios/Storage | Reutilizar/adaptar | adminMedia, bucket media; marca de agua optativa propia, sin imágenes personales de Katie; no depende de página Gallery |
| Settings/páginas | Reutilizar/adaptar | siteSettings key=site, configuración propia, eliminar fotos/bios/redes y estadísticas heredadas |
| Newsletter | Activo, adaptar | subscribe, unsubscribe y admin/newsletter/send; separar descuentos de alta normal, sin Resend real en PASO 1 |
| Contacto | Página activa, formulario apagado | /contact lee settings propios cuando hay servicios; email vacío no muestra un mailto falso. /api/contact 404; decisión del formulario pendiente |
| SEO | Reutilizar mecanismos | Metadata, JSON-LD, sitemap, robots, revalidación; rutas/identidad/verificaciones propias |
| Crew/Art/actividades/Messages/relatos/Próximamente | Nuevos contratos sobre CMS | Alcance activo; datos y visuales se implementan PASOS 3/4 |
| Tienda/carrito/checkout/pedidos | Apagar | /shop/**, /cart, /checkout, /api/shop/**, /api/admin/orders/**, /api/admin/products/**; publicProducts/ecommerceOrders y dashboard |
| Stripe/donaciones internas | Apagar | /support-us, /api/create-checkout-session, /api/stripe/**; mantener donación externa como setting |
| Printful/Tapstitch/proveedores | Apagar | /api/admin/pod/**, /admin/providers, src/lib/pod, fulfillment y scripts printful-* |
| Campañas/descuentos/popups | Apagar | fetchActivePublicShopCampaign en layout, ShopNewsletterCampaignPopup, campaignId en newsletter; no ejecutar consulta por ocultar popup |
| Reseñas/QR | Apagar | /r/**, /shop/review/**, /api/shop/reviews/**, /api/admin/reviews/**, /admin/reviews |
| Gear/afiliados | Apagar negocio | /gear, /admin/gear, /affiliate-disclosure, scripts Travelpayouts y IDs en ConsentManagedScripts; conservar bloques útiles sin afiliación activa |
| Destinations | Apagar sección autónoma | /destinations/**, /admin/countries, consultas de countries y enlaces; campos históricos conservados como compatibilidad |
| Comentarios/likes | Apagar | /api/post-comments, /api/post-likes, /admin/comments, PostEngagement y consultas de contadores |
| Galería independiente | Apagar | /gallery, /admin/gallery, fetch gallery_items; conservar bloques image/carousel y Storage |
| Rutas legacy Katie | Desmontar del público inicial | /blog/**, /category/**, /videos/** y redirecciones a Katie; no son URLs legacy de Encounters |
| Tareas programadas | Apagar | vercel.json cron cleanup-pending-orders, /api/cron/**, scripts de pedidos/reminders |
| Analytics/trackers | Desconectado hasta IDs propios | Sin Google/Pinterest/Meta/Travelpayouts de Katie; GA4/GSC se investigan con propietario, Vercel Analytics posterior |

Reactivación futura: decisión de alcance, configurar servicios y tablas propios, revisar identidad del código conservado, habilitar módulo central y todas sus dependencias, restaurar superficies solo con pruebas. No basta cambiar un booleano: código conservado no implica listo para operar.

Scripts con efectos: export-supabase-backup, optimize-existing-media y quarantine-media operan recursos externos. Deben quedar fuera de comandos activos y exigir entorno propio confirmado. verify-return-policy-version se conserva archivado y fuera del build activo; reactivarlo únicamente junto al módulo comercial y políticas propias.

Privacidad al importar: no copiar .env.local, .vercel, node_modules, .next, reportes de media con URLs/IDs reales, exports ni bases de datos. Preservar licencias y atribuciones técnicas. SQL histórico debe quedar marcado como referencia no ejecutable del baseline.

Inventario exacto de 72 entradas App Router de la fuente: `source-route-inventory.json`. No confundir estas rutas heredadas con el mapa WordPress de Encounters.

## Reactivación

1. Aprobar alcance y cambiar configuración central del módulo.
2. Restaurar selectivamente sus entrypoints desde legacy/app y dependencias desde legacy/src; no restaurar defaults/servicios/identidad fuente. Rutas siguen bloqueadas si su módulo está false.
3. Adaptar esquema, claves propias, identidades y pruebas; auditar toda la cadena compartida. Ejecutar migraciones propias mediante runbook, nunca SQL histórico en bloque.
4. Reintegrar navegación, dashboard, sitemap y tareas solo después de verificar efectos. Scripts archivados exigen adaptación deliberada; quitar su guard no está autorizado por un flag de UI.

No se eliminaron los bloques reutilizables image/carousel/tour/costs/quick_facts/FAQ. Afiliación se filtra del selector y renderer, y el guardado rechaza affiliate_link con el módulo apagado. La biblioteca de medios sigue disponible desde el editor; no se reactivó la galería pública.
