# Cobertura por página

Continuidad 2026-10-11: [revisión local de Art/Crew](phase4-review.md) preparada. Pin de portadas restaurado y comprobado en escritorio, móvil y reduced motion; navegación poblada con muestras en memoria bajo `/review/art`. La escritura desde CMS sigue bloqueada por falta de Supabase de pruebas aislado. Sin cambios de datos reales ni aprobación visual.

Actualización 2026-10-06: Art, categoría, obra, Crew y perfil ya tienen frontend/CMS/SEO visual de PASO 4.0–4.2, pendientes de revisión del usuario. Art sin curación real; pruebas pobladas solo con fixtures revertidos/en memoria. Capturas y diferencias en [phase4-art-crew.md](phase4-art-crew.md). Base de pasos anteriores conservada. **No continuar con otras páginas ni Home.**

## Registro histórico — PASO 1

Referencias conservadas, shell provisional implementado (marca/navegación/colores/fuentes/newsletter) y páginas de preparación; sin páginas visuales completas ni animaciones implementadas. Datos/admin/SEO por página pendientes PASOS 3/4; no validado contra servicios.

| Rutas | Prototipo en handoff-current | Preparación / faltante |
|---|---|---|
| / | Abismo Home v2.dc.html | Tokens y contratos; Home v1 histórico; conectar entidades y newsletter después |
| /about | About.dc.html | Contenido institucional editable, sin biografía Katie |
| /contact | Contact.dc.html | Confirmar formulario/destinatario, almacenamiento no aprobado |
| /crew | The Crew.dc.html | Crew variable, perfiles opcionales |
| /crew/[slug] | Wild Wonders.dc.html | Bloques + obras automáticas por responsables |
| /expeditions | Expeditions.dc.html | Programa/velero separado de viajes |
| /expeditions/[slug] | Sin prototipo dedicado | Reutilizar lenguaje visual; datos/necesidades/resultados acordados |
| /workshops | Workshops.dc.html | Inscripción/lifecycle separados, etapas persistentes |
| /workshops/[slug] | Sin prototipo dedicado | Ficha canónica con programa e historial |
| /art | Art.dc.html | Categorías dinámicas y obras |
| /art/[category], /art/[category]/[slug] | Sin prototipo dedicado | Extender lenguaje de Art/Post, una URL canónica |
| /meaningful-messages | Meaningful Messages.dc.html | 0/1/n mensajes |
| /meaningful-messages/[slug] | Sin prototipo dedicado | Plantilla de bloques y estrofas |
| /posts/[slug] | Post.dc.html | Motor compartido; perfiles no duplicados |
| /upcoming | Sin prototipo dedicado | Opcional, anuncios/fichas sin duplicación |
| /admin, /unsubscribe/[token] | Base técnica Katie | Adaptar identidad y comprobar con servicios propios |

Brand System.dc.html y Navbar options.dc.html son referencias adicionales. Tokens handoff/01: Abismo/Marea/Laguna/Oro/Arena/Coral/Alga/Espuma, ink/ink-strong/paper. Fuentes EB Garamond 400/500 e italic 400 y Archivo 400/500/600/700. Estructura recomendada: src/config (marca/módulos/rutas), src/features/encounters (contratos/adapters), componentes compartidos y App Router delgado. Motor de scroll queda expresamente para PASO 4.

Pruebas de estructura: Home/About/Contact/Crew/Art/Expeditions/Workshops/Messages responden 200 noindex; detalles responden 404 sin contenido inventado, dynamicParams=true. Admin conserva el editor/preview y funciones core. La navegación visual definitiva y disposición del prototipo aún no se implementaron; las capturas de bootstrap no equivalen a aprobación de diseño.
