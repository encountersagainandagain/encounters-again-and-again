# Encounters Again and Again — checklist de seguimiento

Última actualización: 2026-10-13.

**Handoff de continuidad:** [estado técnico completo para Claude Code](CLAUDE_CODE_HANDOFF_2026-10-12.md) y [prompt autocontenido](CLAUDE_CODE_PROMPT_2026-10-12.md), preparados en el checkpoint `ad883d8`. Mantener el freno de revisión visual indicado abajo.

**Fidelidad visual de `/crew` (2026-10-13):** [detalle, verificaciones y capturas](phase4-review.md). Implementado: relato, par de fotos pineado, tarjetas, «More about us», tira, navbar, footer y cue según `The Crew.dc.html`, con contenido del CMS. Verificado con límites de tiempo: TypeScript y eslint de lo modificado, desktop y móvil de `/crew`, pines contra el prototipo, teclado, reduced motion, navbar/footer en `/art` y `/review/art`. Pendiente: recarga en bucle de `/crew/wild-wonders` en desarrollo (anterior a esta entrega, sin investigar), tests/lint/build completos y anchos intermedios. **Esperando revisión visual de Juani; sin aprobación.**

**Revisión local de Art/Crew:** [guía y evidencia](phase4-review.md). Checkpoint visual `63299c4` publicado únicamente en Encounters; no implica aprobación. Pin de portadas, muestras, filtros, carruseles, índice, móvil y reduced motion comprobados. Supabase local aislado quedó operativo con las 14 migraciones y datos sintéticos; desde navegador pasaron crear, guardar draft, preview, publicar, relacionar dos responsables, duplicar y privacidad anónima. `.env.local` y la base remota no cambiaron. Curación y aprobación visual siguen pendientes.

Documento de seguimiento del checklist de 22 pasos acordado. El detalle funcional y técnico se mantiene en `encounters-arquitectura-y-plan.md` (versión 2). Este archivo registra avances, pendientes y decisiones de ejecución. Para el arranque local, `INSTRUCCIONES_ASTRA_ENCOUNTERS.md` incorpora las decisiones del 30/09 y prevalece sobre referencias anteriores cuando difieran. La integración del handoff se documenta en `encounters-handoff-review-y-arranque.md`; las rutas y disposiciones propuestas, en `encounters-redirects-plan.json`.

**Foco actual: PASO 4.0–4.2; `/crew` corregida según el prototipo y detenida para revisión visual de Juani. El resto de Art/Crew espera esa respuesta.** PASOS 1–3 conservados. Base visual, recorridos y CMS ampliados; migración 14 aplicada con pruebas SQL revertidas. Art sin categorías/obras curadas; no se inventó contenido. Ver phase4-art-crew.md y bootstrap-status. No continuar con otras páginas ni Home. Resend, WordPress, DNS y Vercel sin cambios.


## Cómo actualizarlo

- Marcar `[x]` solo cuando esté terminado y confirmado. Una tarea parcialmente hecha conserva `[ ]` y se describe como EN CURSO.
- Mantener la numeración 1–22 para referirnos a los mismos pasos en la conversación.
- Registrar lo que falta, quién debe aportarlo y la próxima acción concreta.
- Diferenciar “solicitado”, “creado”, “configurado” y “probado”.
- No guardar contraseñas, claves ni códigos de recuperación en este documento.
- Actualizar este mismo archivo con cada avance; evitar copias divergentes del checklist.

## Situación actual

| Elemento | Estado confirmado | Próxima acción |
|---|---|---|
| Acceso a WordPress | Disponible nuevamente, confirmado por Juani el 30/09. | Revisar plugins, ajustes, contenido y Google sin modificar la web activa. |
| Dominio / DNS | Acceso solicitado; aún no confirmado. | Identificar proveedor y permisos. Acceder a Hostinger no confirma por sí solo control del dominio/DNS. |
| Hosting | Acceso a Hostinger disponible; plan y servicios aún no revisados. | Descargar respaldo coherente de archivos/DB e identificar DNS/correo. |
| Email público de comunicaciones | Contact irá al correo principal del colectivo, confirmado por Juani; dirección exacta pendiente. | Confirmar dirección para Settings, contacto y Reply-To; separada de la cuenta técnica. |
| Cuenta de servicios | Confirmada: `encounters.services@outlook.com`; Supabase y Resend propios conectados. | Separarla del correo público/Reply-To; Vercel después. |
| Texto e imágenes del sitio | Snapshot importado y validado: 12 documentos, 161 bloques, 6 Crew, 50 referencias/49 archivos únicos. | Bloqueo resuelto. ZIP definitivo: docs/encounters/migration-source/encounters-content-snapshot.zip. Curación visual/editorial en PASO 4. |
| Backup restaurable de WordPress | Pendiente; snapshot editorial disponible. | Descargar desde Hostinger archivos y DB de la misma copia/fecha; guardar fuera del hosting. |
| Analytics y Search Console | Existencia/configuración y accesos aún no comprobados. | Revisar plugins/etiquetas y confirmar propiedades/cuentas. |
| Diseño | Entrega vigente verificada el 01/10: 61 archivos completos, Home v2; antiguo archivado. | Implementar y validar por página en PASO 4; diferencias en design-decisions.md. |
| Rutas y SEO | Mapa inicial de 12 URLs del snapshot y 50 imágenes preparado; sin reglas desplegadas. | Confirmar destinos, ampliar inventario y probar al implementar. |
| Base Katie | Acceso confirmado; revisión parcial del commit `102fc91acd4dd312dc15436e8e3de22643b84ce7`, incluyendo SQL central, bloques y newsletter. | Astra confirma referencia y copia código versionado, sin datos/servicios de Katie. |
| Repo nuevo | Acceso pull/push confirmado como juanimolfino; privado y vacío antes de importación. Único remoto origin de Encounters. | Publicación de cierre registrada en bootstrap-status.md. |
| Servicios nuevos | Supabase Auth/DB/Storage y claves probados; Resend autentica, dominio pendiente. | No envío ni deploy; tercero cuando corresponda. |
| Implementación nueva | 13 migraciones, 20 tablas con RLS, CMS mínimo, importación idempotente y rutas públicas provisionales verificadas. | PASO 4: implementación visual por página. |

La cuenta `encounters.services@outlook.com` se usará para registrar y administrar GitHub, Vercel, Supabase, Resend y los servicios necesarios. No se asume que sea el correo público del colectivo, ni que deba reemplazar el que ya usan para comunicarse. El remitente de newsletter se configurará posteriormente según el dominio y el proveedor de envío. Tener la cuenta creada no implica que los demás servicios ya estén configurados.

## Checklist general

- [ ] **1. Reunir accesos y materiales — EN CURSO.** WordPress, Hostinger y snapshot disponibles; cuenta de servicios y repo destino informados. Falta confirmar acceso Git local, control de dominio/DNS, dirección pública y Google.
- [ ] **2. Respaldar la web actual — PENDIENTE.** Accesos recuperados; descargar respaldo de archivos/DB y copia DNS. Snapshot editorial ya disponible. No bloquea el arranque local.
- [ ] **3. Definir el diseño — EN CURSO.** Entrega vigente recibida y verificada, prototipos y assets íntegros, Home v2. Contact tiene destinatario principal acordado, interfaz a resolver con diseño actual. No hay revisión visual aprobada aquí.
- [x] **4. Duplicar Katie en un GitHub nuevo — COMPLETO.** Importación independiente y remoto correcto verificados; commit 8560222 publicado en main del destino privado el 2026-10-02. Katie permanece intacto.
- [ ] **5. Configurar servicios propios — PARCIAL.** Supabase nuevo conectado y probado; Resend autentica. Dominio Resend, Vercel y deploy pospuestos por instrucción.
- [ ] **6. Configurar tres administradores — PARCIAL.** Dos fundadores confirmados registrados en admin_users con RLS. Tercero pendiente de alta; mecanismo aditivo documentado en sql-runbook. Crew independiente de Auth.
- [x] **7. Reemplazar la identidad anterior — BASE IMPLEMENTADA.** Marca/URL/defaults/metadata/JSON-LD/emails/manifest/assets propios en aplicación activa; código histórico fuera de rutas. Contenido editorial real y diseño final pendientes.
- [x] **8. Organizar y documentar módulos — BASE IMPLEMENTADA.** Registro central, rechazo de rutas/consultas, admin core, scripts/cron/integraciones ajenos aislados y código archivado con reactivación documentada.
- [ ] **9. Adaptar el CMS compartido — BASE IMPLEMENTADA.** Posts/bloques y campos específicos, categorías, responsables, borradores, preview textual, duplicación y guardado atómico. Preview visual completo y revisión final durante PASO 4.
- [ ] **10. Completar Art y Crew — IMPLEMENTADO, REVISIÓN VISUAL PENDIENTE.** Recorridos visuales/CMS/SEO y relaciones implementados; escritura, preview, publicación, duplicación y privacidad probadas desde navegador contra Supabase local aislado. Capturas desktop/móvil y evidencia del CMS disponibles. Curación de Art y aprobación visual pendientes; ver phase4-review.md. 2026-10-13: `/crew` rehecha con mayor fidelidad al prototipo, esperando revisión; bucle de recarga de `/crew/wild-wonders` en desarrollo pendiente, por lo que el recorrido no se da por cerrado.
- [ ] **11. Construir Expeditions — BASE IMPLEMENTADA.** Esquema/CMS de presentación, fichas, responsables y necesidades pendiente/conseguido. Visual pendiente.
- [ ] **12. Construir Workshops — BASE IMPLEMENTADA.** Campos opcionales, sesiones y estados independientes probados. Visual pendiente.
- [ ] **13. Incorporar resultados y Messages — BASE IMPLEMENTADA.** Relaciones múltiples y poemas con saltos preservados. Visual pendiente.
- [ ] **14. Completar Próximamente y Home — BASE IMPLEMENTADA.** Configuración editable de orden/fijados/ocultamiento, listas y anuncios. Visual pendiente.
- [ ] **15. Completar About, Contact y Newsletter — PENDIENTE.** Settings editables, suscripción, envío de prueba, envío manual y baja.
- [x] **16. Importar contenido existente — COMPLETO (SNAPSHOT).** 12 documentos, 161 bloques exactos, 6 Crew, 1 Messages, 8 publicados/4 draft. 49 imágenes únicas subidas + 1 referencia reutilizada; repetición sin duplicados. Vídeo no incluido en ZIP y curación de Art pendientes de PASO 4; sincronización WordPress futura en punto 20.
- [ ] **17. Preparar SEO y redirecciones — EN CURSO (PLAN).** Mapa inicial preparado desde URLs reales del snapshot. Faltan inventario final, implementación y pruebas de reglas, canonicals, sitemap, robots, metadata y publicación sin deploy.
- [ ] **18. Validar con los fundadores — PENDIENTE.** Diseño, móvil, edición, publicación, resultados, necesidades y newsletter.
- [ ] **19. Preparar Analytics y Search Console — PENDIENTE.** En el punto 1 se investiga qué existe; aquí se configura/valida la medición de la web nueva.
- [ ] **20. Sincronizar cambios finales de WordPress — PENDIENTE.** Incorporar novedades desde el snapshot y acordar la ventana de lanzamiento.
- [ ] **21. Apuntar el dominio existente a Vercel — PENDIENTE.** Cambiar registros web preservando correo/verificaciones, con posibilidad de volver atrás.
- [ ] **22. Verificar y entregar — PENDIENTE.** HTTPS, www/raíz, redirecciones, admin, newsletter, métricas, sitemap y guía; WordPress recuperable durante estabilización.

## Punto 1 — accesos, materiales y Google

### Avances y pendientes

- [x] Acceso a WordPress recuperado, confirmado por Juani el 30/09.
- [x] Acceso al dominio y hosting solicitado al cliente.
- [x] Email principal de comunicaciones consultado al cliente.
- [x] Relevamiento de contenido disponible en `encounters-content-snapshot.zip`.
- [x] Cuenta de servicios confirmada por Juani: `encounters.services@outlook.com`.
- [ ] Recibir acceso al dominio/DNS e identificar quién lo gestiona.
- [x] Acceso a Hostinger disponible, informado por Juani.
- [x] Repo privado nuevo creado y URL compartida por Juani.
- [x] Verificar acceso local: fuente lectura; destino privado lectura/escritura como juanimolfino tras colaboración. Katie conserva estado limpio.
- [ ] Identificar el plan de Hostinger y los servicios que administra esa cuenta.
- [ ] Confirmar email público, WhatsApp y canales definitivos.
- [ ] Comprobar qué integraciones de Google existen y quién tiene acceso a sus propiedades.

### Dónde comprobar Analytics y Search Console

**Acceso recuperado:** se puede realizar esta revisión junto con los respaldos, sin cambiar la configuración de la web activa.

WordPress puede mostrar conexiones y etiquetas instaladas. Revisar primero **Plugins → Plugins instalados** y el menú lateral. Si está Site Kit by Google, revisar sus servicios conectados; este plugin permite integrar Analytics y Search Console en WordPress. [Site Kit oficial](https://wordpress.org/plugins/google-site-kit/).

Si no hay Site Kit, revisar otros plugins de estadísticas/SEO, Tag Manager o inserción de código. La ausencia de un plugin concreto no prueba que no exista una propiedad de Google.

La confirmación de propiedades, historial y permisos corresponde a las cuentas de Google. En Search Console, el propietario puede gestionar usuarios. Hosting/DNS puede aportar pruebas de verificación, pero no sustituye el acceso a Google. [Permisos de Search Console](https://support.google.com/webmasters/answer/7687615?hl=es).

Registrar por separado: servicio detectado, propiedad/ID si es visible, cuenta administradora si se conoce y acceso pendiente. No conectar una propiedad nueva ni sustituir etiquetas durante esta comprobación.

**Próxima comprobación:** una captura de Plugins instalados con el menú lateral y la pantalla de copias de seguridad de Hostinger. En paralelo, ejecutar Paso 1 del instructivo de Astra.

## Punto 2 — respaldo de WordPress, paso a paso

El ZIP editorial sirve para importar contenido a Next.js. No contiene necesariamente todo lo requerido para restaurar la instalación WordPress. El backup completo requiere base de datos y archivos —incluidos temas, plugins, medios y configuración—, guardados de forma coherente. [Backups de WordPress](https://developer.wordpress.org/advanced-administration/security/backup/).

**Restaurar significa recuperar WordPress si se pierde o se daña. No es un paso necesario para construir la nueva web.** Podemos conservar la instalación actual en Hostinger mientras desarrollamos y validamos Encounters en Vercel. El respaldo permite recuperar la versión anterior incluso si la instalación original deja de estar disponible; conservar únicamente el sitio activo no reemplaza ese respaldo.

- [x] Snapshot editorial completo conservado y validado. **Bloqueo resuelto el 02/10:** checksum esperado, CRC y JSON correctos; 11 páginas, 1 story, 161 bloques y 50 imágenes. Ruta: docs/encounters/migration-source/encounters-content-snapshot.zip.
- [ ] Identificar qué respaldos de archivos y base de datos ofrece el plan de Hostinger. Alternativa: herramienta de WordPress ya disponible si sirve para generar el respaldo.
- [ ] Opcional como complemento: descargar exportación XML desde **Herramientas → Exportar → Todo el contenido → Descargar archivo de exportación**. Es un respaldo complementario del contenido; no incluye los archivos binarios de medios ni sustituye una copia completa. No bloquea esta etapa si obtenemos un backup completo del hosting. [Exportación oficial](https://wordpress.org/documentation/article/tools-export-screen/).
- [ ] Generar y descargar backup de base de datos y archivos con la herramienta disponible. El método exacto se define después de ver el panel.
- [ ] Registrar fecha, herramienta utilizada, archivos obtenidos y procedimiento de restauración. Verificar que no sea solo una copia guardada dentro del mismo hosting.
- [ ] Comprobar el respaldo; idealmente probar restauración en una copia aislada, sin sobrescribir la web activa.
- [ ] Con acceso a dominio/DNS, guardar la zona y registrar los servicios que dependen de ella.

**Estado de esta etapa:** pendiente, con accesos disponibles. Revisar y descargar desde Hostinger sin restaurar ni modificar el sitio activo. El instructivo de Astra incluye una lista de comprobaciones de WordPress, DNS, correo y Google. No se revisaron todavía los paneles autenticados.

### Dominio, Hostinger y Vercel

Recomendación de trabajo: mantener Vercel para la nueva aplicación Next.js, en línea con el stack previsto. Hostinger puede seguir alojando WordPress durante la transición y conservar los servicios de dominio, DNS o correo que efectivamente gestione. Estos servicios se deben identificar; todavía no sabemos cuáles están contratados allí.

Hostinger también permite desplegar Next.js en planes compatibles con Node.js. No se descarta técnicamente; comparar esa alternativa requeriría conocer su plan y validar las funciones usadas por el proyecto. [Hostinger: aplicaciones Node.js y planes compatibles](https://www.hostinger.com/support/how-to-deploy-a-nodejs-website-in-hostinger/). [Next.js en Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs).

En el lanzamiento, el mismo dominio `encountersagainandagain.com` se configura en Vercel y se ajustan sus registros web en el proveedor DNS. El visitante conserva esa dirección; no necesita ser enviado a una URL `.vercel.app`. No es obligatorio transferir el dominio ni cambiar de proveedor DNS. Preservar los registros de correo y verificaciones. [Dominios personalizados en Vercel](https://vercel.com/docs/domains/working-with-domains/add-a-domain).

Cambiar el destino DNS no borra los archivos ni la base de datos de WordPress. Sí cambia qué aplicación recibe las visitas al dominio, incluido `/wp-admin`; si necesitamos consultar la instalación anterior después del cambio, prepararemos una vía de acceso de prueba o privada. Las redirecciones de rutas antiguas de WordPress hacia sus equivalentes se implementan en la web nueva, en el punto 17.

Conservar WordPress durante la estabilización. Más adelante, decidir si se da de baja su hosting, después de verificar el respaldo y las dependencias de correo/dominio. No hay cambios de DNS, bajas ni restauraciones ejecutados en esta etapa.

## Punto 3 — diseño en Claude Design

### Avances y orden de trabajo

- [x] Banner y navbar de Home trabajados en Claude Design, informado por Juani.
- [x] Decidido continuar con páginas internas y retomar Home después.
- [x] Handoff Markdown recibido y revisado el 23/09; el 30/09 Juani aclara que ya es una versión anterior y que sigue actualizándolo.
- [x] Recibir los 16 Markdown del handoff.
- [x] Recibir los prototipos `.dc.html`, support.js, image-slot.js y assets: 61 archivos verificados contra ZIP vigente el 01/10. Revisión visual de aplicación pendiente.
- [x] Inventariar las páginas, componentes y comportamientos descritos en los Markdown; identificada la ausencia de HTML y assets.
- [x] Contrastar la documentación con el alcance acordado y registrar diferencias en `encounters-handoff-review-y-arranque.md`.
- [x] Confirmar destinatario de Contact: correo principal del colectivo.
- [ ] Obtener la dirección exacta; resolver interfaz de Contact y navbar con el handoff vigente. El formulario del documento anterior no se considera automáticamente aprobado.
- [ ] Completar relaciones Art–Crew, necesidades, estados/etapas/resultados, Próximamente y Newsletter omitidos o incompletos en el handoff.
- [ ] Confirmar rutas propuestas y completar plantillas de detalle de categoría/obra, actividad y mensaje.
- [ ] Contrastar las inconsistencias de animación móvil y scroll con los prototipos.
- [ ] Revisar el listado `/crew` y completar su diseño si no está incluido.
- [ ] Revisar un perfil representativo, inicialmente `/crew/wild-wonders`, y completar si falta.
- [ ] Comprobar desktop y móvil, estados con poco contenido y enlaces entre perfiles/obras.
- [ ] Mapear cada sección visual a campos del admin, bloques editables o relaciones automáticas; registrar faltantes y diferencias respecto del plan.
- [ ] Revisar con Juani y marcar únicamente los diseños efectivamente aprobados. Un handoff preparado no implica implementación terminada.

La propuesta inicial fue diseñar Crew → Art → Expeditions → Workshops → Messages → About/Contact → Home, incluyendo Próximamente y Newsletter. La entrega vigente guiará cada página; la versión recibida se conserva como referencia. Implementar frontend, inputs admin y datos de cada página juntos, después de preparar el CMS mínimo. Las cuatro etapas de Astra agrupan estos 22 pasos, sin reemplazar su numeración.

**Criterios de referencia:** las indicaciones de Crew y el brief siguientes documentan lo acordado previamente. Las diferencias con los Markdown recibidos se registraron en la revisión adjunta. Falta contrastar los prototipos; no se han aprobado visualmente pantallas ni implementado componentes.

### Qué debe comunicar The Crew

Quiénes son, qué aporta cada persona y dónde ver lo que crea. La historia extensa del colectivo corresponde a About; aquí interesan las personas y sus contribuciones.

**Listado `/crew`:**

1. Navbar ya diseñada, adaptando solo el estado activo de The Crew.
2. Título “The Crew” y una introducción breve, con una ilustración discreta si aporta al estilo existente.
3. Retratos y fichas de los integrantes. Propuesta inicial: tres columnas en desktop, dos en tablet y una en móvil; ordenar los fundadores primero manteniendo un tratamiento visual coherente para todos.
4. Cada ficha muestra nombre, alias/marca si existe, rol/especialidades, una bio corta y enlace “Meet Georgia” o equivalente al perfil.
5. Footer común con los contactos y enlaces disponibles.

Usar las personas, textos y retratos del snapshot; no inventar integrantes ni credenciales. No hace falta buscador o filtros para los seis perfiles del relevamiento inicial. Una foto de equipo puede complementar la página si ya existe un recurso adecuado.

**Perfil `/crew/[slug]`:**

1. Presentación con retrato, nombre, marca personal opcional y biografía. En Wild Wonders, la identidad de Georgia y su marca conviven en la misma ficha.
2. Contenido personal flexible: texto, fotografías o ilustraciones con el editor compartido.
3. “Selected work” o “Their creations”: obras asociadas a la persona, agrupadas por categoría. Puede incluir libros escritos o ilustrados, podcasts, películas e ilustraciones; cada tarjeta lleva a la obra única de Art.
4. Actividades y relatos relacionados cuando existan, en una sección secundaria.
5. Contacto/redes personales si se cargaron y enlace para volver a The Crew.

La autoría puede incluir funciones distintas: Georgia puede aparecer como ilustradora de un libro y Flaco como autor. Las obras se cargan en Art y se relacionan; no se vuelven a crear en el perfil. No exigir que tengan expediciones para mostrar una página completa.

### Qué se carga después desde el admin

| Campos del perfil | Bloques automáticos por relación |
|---|---|
| Nombre, alias y slug. | Obras por categoría y función acreditada. |
| Rol/especialidades y bio corta. | Workshops en que participa. |
| Biografía extensa y bloques personales. | Expediciones relacionadas, si existen. |
| Retrato y fotografías. | Mensajes y relatos acreditados. |
| Redes/contacto público opcionales. | Destacados seleccionados entre contenido ya existente. |
| Orden y visibilidad. | Ocultación de grupos vacíos. |

En el diseño comprobar tres situaciones: persona con varios tipos de obra, persona con una sola obra y persona que solo tiene biografía. Todas deben verse completas y cuidadas sin tarjetas de relleno ni secciones vacías.

### Brief inicial para Claude Design — referencia para revisión

Diseñar primero el listado The Crew y luego la plantilla de perfil usando Georgia / Wild Wonders como ejemplo. Mantener la identidad visual y navbar ya trabajadas. El contenido y la navegación pública estarán en inglés.

La página debe transmitir cercanía, creatividad y relación con el océano. Dar protagonismo a retratos, ilustraciones y obras reales; adaptar tipografía, color y espaciado al diseño existente. Trabajar con el snapshot proporcionado; identificar cualquier texto provisional y no inventar biografías, créditos ni obras.

En el listado: título, introducción breve y perfiles con retrato, nombre, especialidad, bio corta y acceso al detalle. En el perfil: presentación personal, contenido libre, obras agrupadas por categorías, actividades relacionadas opcionales y contacto disponible. Las obras enlazan a Art, donde se mantienen sus datos.

Preparar desktop y móvil. Mostrar el comportamiento de perfiles con mucho y poco contenido. Las secciones opcionales desaparecen cuando no hay información. Entregar ambas vistas y sus decisiones de diseño para revisión con Juani; Home se retomará después.

## Registro de cambios

### 2026-10-02 — resolución del bloqueo editorial

- Recibidos ZIP completo y carpeta extraída en Downloads; ambos coinciden byte a byte en sus 56 archivos. Originales conservados.
- Copia definitiva: docs/encounters/migration-source/encounters-content-snapshot.zip; SHA-256 `2c5fee58cdadbf98a444380c9fcf98c857c4c16335004e3f25e3fafc2ccabbc6`.
- CRC completo, JSON válido, CSV/raw presentes y conteos verificados: 11 páginas, 1 story, 161 bloques y 50 imágenes. Inventarios y tamaños coinciden.
- Bloqueo del snapshot resuelto; punto 16 permanece pendiente para PASO 3. Listo para iniciar PASO 2. Sin seed SQL, importaciones, subidas a Storage ni migraciones.

### 2026-10-02 — implementación y comprobación del PASO 1

- Publicado commit 8560222 en main del destino privado; cierre del PASO 1 y punto 4 completado. El acceso de colaboración ya permite push.
- Acceso al repo destino confirmado como colaborador con escritura; vacío, sin trabajo que sobrescribir. Historial nuevo y origin exclusivo de Encounters.
- Importada base SHA 102fc91 sin credenciales, datos privados, fixtures ni fotos de Katie; stack y resoluciones lockfile conservados.
- Implementados identidad, metadata/manifest/JSON-LD, defaults, fuentes/tokens, shell y mapa de rutas. Core CMS/Auth/medios/newsletter reutilizado; contratos y modelo ampliado documentados sin SQL ejecutado.
- Archivo legacy conserva módulos ajenos; guards bloquean rutas/consultas, no hay cron ni conexiones comerciales/tracking activos. Newsletter rechaza campañas y no envía automáticamente al suscribir.
- Pasan lint, TypeScript, tests y build; HTTP comprueba 26 rutas desactivadas, páginas propias y estados sin servicios. Fuentes requirieron red autorizada al repetir build. Ver verification.md.
- Comprobado snapshot editorial truncado, sin seed JSON recuperable; copiar el archivo anidado no soluciona, es idéntico. Se necesita exportación editorial completa para PASO 3.
- No se ejecutó migración, envío real, deploy, cambio DNS ni modificación de Katie.



### 2026-10-01 — auditoría y preparación del PASO 1

- Leído instructivo; Katie HEAD/main 102fc91 confirmado, estado local limpio. Sin modificaciones a fuente.
- Git local usa juanimolfino. Destino privado devuelve 404 en Git y API; lectura/escritura/contenido pendientes, no asumir vacío. Solicitada colaboración entre cuentas.
- Carpeta independiente creada en Desktop/developer/encounters-again-and-again, con docs/encounters y referencias vigentes completas; handoff viejo archivado.
- Documentados módulos, schema-map, diferencias, servicios, runbook SQL y mapa de rutas; inventario JSON de 12 URLs y 50 medios preservado íntegro.
- Preparados .env.example sin secretos, identidad, rutas compartidas, política de módulos, contratos y tokens. TypeScript estricto y pruebas de estas funciones pasan; no son pruebas de aplicación.
- No se importó aplicación aún ni se ejecutó SQL, envío, deploy o DNS. Puntos 4/7/8 permanecen abiertos hasta implementación y pruebas.


### 2026-09-30 — arranque local con Astra

- WordPress y Hostinger disponibles nuevamente según Juani; reactivado relevamiento de respaldo, plugins, DNS/correo y Google.
- Registrado repo destino privado y vacío según Juani. Conector GitHub devuelve 404; acceso local pendiente, sin necesidad de hacerlo público.
- Revisado parcialmente Katie en commit `102fc91acd4dd312dc15436e8e3de22643b84ce7`: SQL/core, configuración y newsletter. No se ejecutó la aplicación.
- Fijadas cuatro etapas: copia/aislamiento → servicios → SQL/CMS → visual por página. Vercel queda para más adelante.
- Confirmado uso de nuevas rutas con redirecciones desde las antiguas; conservar SEO desde las primeras plantillas.
- Confirmada newsletter simple con registro por email y envío manual desde admin; Contact al email principal del colectivo.
- Handoff anterior marcado como orientativo; diseño vigente sigue en desarrollo.
- Creado `INSTRUCCIONES_ASTRA_ENCOUNTERS.md` y paquete de arranque con contexto, referencias y snapshot. Código, SQL y conexiones siguen pendientes de ejecución local.

### 2026-09-23 — recepción y revisión del handoff

- Leídos los 16 Markdown de Claude Design; documentado inventario y diferencias con el alcance.
- Identificados prototipos HTML/assets faltantes; revisión visual sigue pendiente.
- Preparadas rutas recomendadas: `/meaningful-messages` y `/posts/[slug]`, manteniendo detalles propios de Art y actividades. Propuesta sin desplegar.
- Preparado mapa de 12 URLs del snapshot y 50 imágenes para migración; inventario final de SEO aún pendiente.
- Confirmado acceso al repo privado Katie; detectadas reglas de dominio propio y limitación de nuevos slugs en la ruta del blog.
- Documentada duplicación independiente y primer recorrido funcional Art → responsables → perfiles. No se creó repo, servicio ni código en esta revisión.

### 2026-09-23

- Confirmada la cuenta de servicios `encounters.services@outlook.com`; reemplaza la dirección Gmail prevista.
- Actualizado WordPress: temporalmente inaccesible, revisión en pausa por indicación de Juani.
- Registrado acceso a Hostinger. Plan, respaldos y control de dominio/DNS aún no verificados.
- Aclarado que el respaldo es una medida de recuperación; no hace falta restaurar WordPress para migrar a Next.js.
- Mantenida la recomendación de Vercel para la nueva web, conservando WordPress en Hostinger durante la transición y usando el mismo dominio público.
- Registrado handoff completo preparado en Claude Design, pendiente de recepción y revisión. La próxima acción pasa a ser analizar esa entrega y actualizar cobertura/faltantes.

### 2026-09-13

- Creado el archivo de seguimiento con los 22 pasos estables.
- Registrado acceso a WordPress y solicitudes pendientes de dominio/hosting/email público.
- Registrada la cuenta de servicios como prevista, todavía sin creación confirmada.
- Reconocido el snapshot como avance editorial, manteniendo pendiente el backup restaurable.
- Registrado banner/navbar de Home y nueva prioridad de diseño: The Crew y perfil antes de completar Home.
- Preparadas las siguientes acciones de WordPress y el brief inicial para Claude Design.

Próxima actualización: revisión visual de checkpoints 4.0–4.2. No avanzar automáticamente con páginas restantes/Home v2. SQL/RLS/Storage, importación y CMS conservados; deploy/DNS y entrega de email siguen pendientes.

### 2026-10-13 — fidelidad visual de `/crew`

- Feedback de Juani: la estructura va, falta apego estético al diseño. Se comparó `The Crew.dc.html` con la implementación en navegador y se corrigió solo `/crew`, más navbar, footer y cue compartidos.
- Implementado: titular y antetítulo del relato, jerarquía tipográfica, par de fotos sticky de 150vh, titular «A project to unite them all», tarjetas a sangre, «More about us», tira de retratos, garabatos del prototipo, navbar y footer. Contenido desde el CMS, sin textos ni imágenes fijos.
- Verificado con tiempos límite: TypeScript, eslint de lo modificado, capturas desktop/móvil, pines, teclado, reduced motion y navbar/footer en `/art` y `/review/art`. No ejecutados: tests, lint completo, build y anchos intermedios.
- Pendiente separado: `/crew/wild-wonders` se recarga en bucle en desarrollo; ocurre también sin estos cambios. Documentado en phase4-review.md, sin investigar.
- Sin cambios en CMS, datos, migraciones, Auth, RLS, Storage, correos ni despliegues. Sin aprobación visual. Próxima acción: revisión de Juani.

### 2026-10-06 — PASO 4.0–4.2

- Implementados base visual y recorridos Art/categoría/obra, Crew/perfil; datos reales y vacíos, sin categorías ni autores inventados.
- CMS con preview visual, duplicación draft con IDs/slug nuevos, redes Crew, creación atómica de perfil y settings de presentación. Categorías/destacados/orden administrables.
- Migración 14: publicación de categoría/perfil vinculada a RLS y medios, historial automático de URLs. Bucket privado intacto, imágenes compartidas conservadas.
- Fuentes originales locales con OFL; build estándar Turbopack pasa. Lint, TypeScript, tests, render y SQL transaccional validados; detalles en phase4-art-crew.md.
- SEO dinámico para las rutas de esta entrega; noindex de preparación conservado. Solo dos redirects de Crew activados. Sin despliegue ni cambios de contenido importado.
- Se detiene aquí para revisión visual. Prueba de creación/publicación por navegador pendiente de entorno seguro, sin fixtures publicados en la base compartida.

### 2026-10-05 — cierre PASO 3

- 13 migraciones propias aplicadas por CLI exclusivamente a Encounters. 20 tablas con RLS, 106 constraints, 43 índices, 29 FKs. Dos admins reales; registro público desactivado y tercero documentado.
- CMS atómico y campos específicos; anon/no-admin/admin, Storage privado, publicación/borradores, obra con dos responsables en sus perfiles y guardado desde navegador: PASS. Fixtures/sesión eliminados; cero emails.
- Checkpoint 3A 28510a2217b468eb577bbeb98a73cd6bf9c94702 antes de importar. Dry-run y dos ejecuciones; 12 documentos/161 bloques, 6 Crew, 1 Messages, 8 publicados/4 draft, 49 archivos únicos para 50 imágenes. Segunda ejecución reutiliza todo. Textos/posiciones/hashes y rutas comprobados.
- Lint, TypeScript y tests PASS. Build Webpack PASS; Turbopack sufrió fallos de descarga de Google Fonts. No fallo de site_settings. Aislamiento HTTP de 26 rutas PASS.
- Estado y evidencia en bootstrap-status.md, phase3-implementation.md y verification/phase3-final.json. Diseño final, vídeo faltante, curación, redirecciones/SEO y entrega Resend pendientes; WordPress/DNS/Vercel/Katie sin cambios.
