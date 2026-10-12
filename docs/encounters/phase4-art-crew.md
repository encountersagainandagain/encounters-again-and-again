# PASO 4 · checkpoints 4.0, 4.1 y 4.2

**Continuidad 2026-10-12:** [guía de revisión local, rutas, evidencias y bloqueo del CMS](phase4-review.md). El pin de portadas fue restaurado y probado; Art dispone de muestras solo locales bajo `/review`. Este avance se publica como checkpoint técnico para conservarlo, sin declarar aprobación visual. La aprobación visual y la prueba de escritura del CMS en una base aislada siguen pendientes.

Fecha: 2026-10-06. Alcance exclusivo: base compartida, Art/categoría/obra y Crew/perfil. Detenerse para revisión visual. Home, Expeditions, Workshops, Messages, About y Contact no reciben implementación visual en esta entrega.

Cierre de verificación: 2026-10-09, tras interrupciones de la sesión. Los reinicios no ejecutaron importaciones, seeds ni nuevas migraciones.

Publicación Git: `eec113e` (`feat: implement Art and Crew editorial journeys`) publicado en `origin/main`, repositorio `encountersagainandagain/encounters-again-and-again`, sin force push. El commit de documentación posterior registra este resultado. Sin despliegue.

## Punto de partida comprobado

Directorio local correcto, árbol limpio al iniciar, HEAD `2fe403f`, ancestro `28510a2` y único remoto `https://github.com/encountersagainandagain/encounters-again-and-again`. No se encontró AGENTS.md aplicable. Se leyeron los seis documentos de continuidad, los diez Markdown pedidos del handoff y los cuatro reportes históricos. Los prototipos Art, The Crew, Wild Wonders y Post se abrieron conservando support.js/assets.

Los informes históricos registran PASOS 1–3, 13 migraciones, 20 tablas con RLS, 12 documentos, 161 bloques, 6 Crew, 49 medios/50 referencias e importación idempotente. Las consultas de esta sesión confirman los seis Crew y el contenido publicado; no se volvió a importar ni ejecutar seeds. Las comprobaciones actuales adicionales están en `verification/phase4-http.json`. La configuración histórica de Resend y signup no se modifica ni se presume revalidada por estas pruebas.

## Implementación

- `/art`: portada y firma del prototipo, introducción/portada en settings, categorías ordenables y destacadas, chips, acceso rastreable a categorías, carrusel automático con cinco o más categorías. Estado vacío real mientras falta curación.
- `/art/[category]`: introducción, portada de entrada, crédito, lead/body y CTA opcionales; layouts gallery/feature/video/audio; obras publicadas, orden y destacados.
- `/art/[category]/[slug]`: portada, bloques, índice, medios con carga por acción, responsables múltiples y relaciones opcionales. Un único documento para cada obra.
- `/crew`: relato original del documento Team, pares de retratos y tira de seis integrantes desde Crew. Orden, biografías y visibilidad editables. Solo enlaza perfiles habilitados cuyo documento esté publicado.
- `/crew/[slug]`: plantilla genérica de bloques y adaptación visual de los grupos confirmados de Wild Wonders. Obras automáticas desde post_contributors, agrupadas por categoría; otros contenidos acreditados cuando existen. Sin cuentas Auth por persona.
- Navbar y footer de Art/Crew siguen los prototipos. Contacto/redes proceden exclusivamente de settings; vacíos ocultos. El resto de páginas conserva su presentación provisional.
- Tipografía, colores, tamaños fluidos, botones, fichas, carga/error/vacío, breadcrumbs, foco, skip link y reduced motion. Scroll mediante un rAF compartido en cada página, sin dependencias de animación.

## CMS

Se conserva `save_content` atómico, RLS, validación SQL y control de versión. El CMS añade preview visual con el renderer de bloques público; descarga imágenes de borrador mediante el bearer administrativo y usa object URLs temporales, revocadas al desmontar. No guarda signed URLs.

Duplicación: UUID, slug con sufijo único, bloques con IDs nuevos y estado draft; elimina procedencia importada/fechas de publicación. Categorías: featured, orden, layout, textos, portada y SEO. Crew: contacto/redes opcionales y botón para crear el documento de perfil como borrador y vincularlo en una única transacción. El editor detallado existente continúa disponible.

Settings agrega introducción/portada de Art, portada de Crew, cierre y footer. Revalidación administrativa incluye familias dinámicas y sitemap. Consultas públicas `no-store` y rutas dinámicas permiten nuevos slugs después del build sin deployment.

## Imágenes y fuentes

El bucket media sigue privado. Se reutiliza `/api/media/[id]`, RLS y `private, no-store`; las URLs de metadata son estables. La migración nueva incorpora la publicación de categoría/perfil a los permisos de posts y medios. La referencia de otra publicación mantiene visible una imagen compartida. El renderer omite el placeholder de Elementor identificado por metadata.

El handoff no incluye binarios de fuentes ni licencias: se descargaron EB Garamond normal/italic y Archivo del repositorio oficial google/fonts, junto con ambas licencias SIL OFL 1.1, que permiten redistribución. Archivos sin modificar en `public/fonts`, cargados con next/font/local. Sin cambio de familia ni actualización de dependencias.

El build estándar original con Turbopack pasó durante el diagnóstico; no se reprodujo el fallo histórico de descarga. Tras añadir settings al layout se detectó una incompatibilidad de prerender estático con fetch no-store. Se corrigió declarando el layout dinámico. El build estándar final ya no descarga fuentes. Permanece la advertencia heredada de antigüedad de Browserslist.

Las portadas vigentes `crew-banner.jpg` y `ww-banner.webp` se conservan en `public/design`. Son assets públicos del handoff, no copias de borradores privados. Crew tiene override editable en settings. Wild Wonders usa su portada de diseño mientras la portada importada siga siendo el retrato automático; una portada distinta elegida desde CMS tiene prioridad. No se modificaron imágenes ni textos importados en la base.

## Migración y URLs

`20261006000100_art_crew_publication.sql` es la migración 14, aplicada por el wrapper CLI solo tras verificar `lzwmwofxoegkxykglneq` y pasar preflight transaccional. Añade featured a categorías, función de publicación pública, ajuste RLS/media, creación atómica de perfil e historial de cambios de slug/categoría.

El resolver solo devuelve destinos publicados de Art/Crew. Se activan las dos entradas históricas cuyos destinos están terminados: `/elementor-page-3462` → `/crew` y `/elementor-2907` → `/crew/wild-wonders`. No se activa el mapa hacia páginas pendientes. Se conserva el JSON original.

Canonical, Open Graph, Twitter y breadcrumbs en las cinco rutas. Sitemap dinámico limitado a Art/Crew y contenido publicado. **Se conserva el noindex global del entorno previo al lanzamiento**, incluyendo X-Robots-Tag y robots.txt. No se habilita indexación de producción ni se despliega.

## Validación y límites

- `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`.
- `npx tsx scripts/check-phase4-render.tsx`: fixtures solo en memoria; enlaces categoría/obra/dos perfiles, perfil no enlazable, vacíos, carrusel 5+, saltos originales y vídeo sin iframe inicial.
- `node scripts/verify-phase4-db.mjs --preflight --transaction-pooler` y luego sin `--preflight`: PASS. SQL real, fixtures dentro de transacción revertida, nunca visibles para otras sesiones. Publicación/despublicación, media compartida, dos responsables, RLS anon/no-admin/admin, slugs y rollback. Cero fixtures comprometidos, cero usuarios creados. El puerto de sesión 5432 dio timeout; funcionó el pooler transaccional 6543 del mismo proyecto, manteniendo prepare:false.
- No hay Docker/Podman: no se dispone de una base local independiente. **Crear/publicar/duplicar mediante navegador contra una base de pruebas queda pendiente**; no se publicaron obras ficticias ni se alteró contenido importado. La sesión administrativa de inspección usa un fundador existente, sin enviar correo, y se revoca al terminar.
- Capturas y comprobaciones HTTP en `verification/phase4-*`. La prueba HTTP distingue las rutas terminadas, inexistentes, sin perfil y legacy pendientes.

### Resultados finales y capturas

Lint, `npm run typecheck`, tests y build estándar: PASS. Aislamiento HTTP: PASS (26 rutas desactivadas, 10 páginas propias, newsletter deshabilitada, ningún suscriptor creado). Reportes [HTTP](verification/phase4-http.json) y [SQL](verification/phase4-db.json). La revisión React se aplicó con caché por request, consultas paralelas, limpieza de efectos y controles accesibles.

Navegador: sin errores de consola en Art, Crew y Wild Wonders durante las comprobaciones satisfactorias; sin desbordamiento a 390 px (Art/Crew), 768 px (Crew) y 360 px (perfil). Cero imágenes visibles rotas en perfil. Tab enfoca Skip to content y Enter transfiere foco a main-content; reduced motion comprobado. Tras una interrupción hubo timeouts de red del servidor local; reiniciado con acceso autorizado, las rutas volvieron a responder. No se atribuye ese fallo a fuentes ni al código de contenido.

La inspección administrativa llegó al listado autenticado y confirmó lectura de borradores mediante API; el recorrido interactivo completo de edición/preview quedó pendiente tras la interrupción. La sesión temporal se revocó y su archivo local se eliminó el 2026-10-09. No se guardaron cambios editoriales durante esa inspección.

| Vista | Desktop 1440×1000 | Móvil 390×844 |
| --- | --- | --- |
| Art | [Implementación](verification/phase4-art-desktop.png) · [Prototipo](verification/phase4-prototype-art-desktop.png) | [Implementación](verification/phase4-art-mobile.png) · [Prototipo](verification/phase4-prototype-art-mobile.png) |
| Crew | [Implementación](verification/phase4-crew-desktop.png) · [Prototipo](verification/phase4-prototype-crew-desktop.png) | [Implementación](verification/phase4-crew-mobile.png) · [Prototipo](verification/phase4-prototype-crew-mobile.png) |
| Wild Wonders | [Implementación](verification/phase4-profile-desktop.png) · [Prototipo](verification/phase4-prototype-profile-desktop.png) | [Implementación](verification/phase4-profile-mobile.png) · [Prototipo](verification/phase4-prototype-profile-mobile.png) |

[Crew tablet 768×1024](verification/phase4-crew-tablet.png), [contenido Crew](verification/phase4-crew-content-desktop.png) y [segundo par de perfiles](verification/phase4-crew-profiles-desktop.png). Las capturas no equivalen a aprobación visual del usuario.

## Diferencias y pendientes para revisión

Los HTML vigentes prevalecen sobre los Markdown: Crew y Wild Wonders tienen portada oscura y lectura clara; Art usa chips redondeados y el nav alterna etiquetas como el prototipo. Se conserva texto original del snapshot aunque difiera del copy del prototipo.

El checkpoint original omitía el pin de 240vh de las portadas de Crew/perfil, sin motivo ni aprobación documentados. En la revisión local se restauró el patrón del HTML vigente: 240vh, sticky de 100vh y papel superpuesto -100vh, liberado en móvil y reduced motion. Geometría comprobada en navegador; ritmo pendiente de aprobación visual. Las tarjetas crecen con biografías largas, evitando recortes de texto en móvil. La organización del relato conserva todos los bloques originales usados; las biografías duplicadas en Team se muestran desde crew_members, su fuente editable.

Art permanece sin categorías ni obras reales. Por eso las capturas públicas muestran el estado vacío y el recorrido poblado está validado con fixtures SQL revertidos/renderizado en memoria; **no hay aprobación visual de una colección real**. Pendiente definir categorías, atribuciones, portadas y relaciones editoriales. Solo Georgia tiene perfil habilitado; no se habilitan los otros cinco automáticamente. No se inventan correos, fechas ni relaciones. Vídeo ausente encounters_expeditions_009 y tercer fundador siguen fuera de esta entrega.

No se modificaron Katie, WordPress, DNS, Hostinger ni Vercel. No se enviaron emails, no se habilitó ENCOUNTERS_EMAIL_ENABLED, no se resetearon datos ni se editaron migraciones aplicadas. Próxima acción: revisión visual del usuario, sin avanzar con otras páginas.
