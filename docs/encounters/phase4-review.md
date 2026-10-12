# Revisión local de Art/Crew — 2026-10-09

Estado: preparada para revisión del usuario; no implica aprobación visual. Continúa exclusivamente PASO 4.0–4.2.

Continuidad y cierre documental: 2026-10-11. Las capturas y el reporte de navegador corresponden a la ejecución del 2026-10-09; no se presentan como pruebas nuevas del CMS.

Cierre de comprobaciones 2026-10-11: `npm run lint`, `npm test`, `npm run build` (incluye TypeScript) y `git diff --check`: PASS. Servidor de desarrollo reiniciado en 127.0.0.1:3218; `/review/art` respondió HTTP 200 tras compilar. La reanudación tuvo carga del sistema cercana a 500 y aviso de filesystem lento: las primeras solicitudes agotaron el tiempo de espera, luego respondieron. El build conserva el aviso heredado de antigüedad de Browserslist.

Checkpoint técnico 2026-10-12: el avance se conserva en Git y se publica únicamente en el repositorio privado de Encounters. Esto no constituye aprobación visual; la revisión del usuario continúa abierta. Sin despliegue ni cambios en servicios externos.

## Abrir la revisión

Servidor de desarrollo: **http://127.0.0.1:3218**. Si se detiene: `npm run dev -- --hostname 127.0.0.1 --port 3218`.

| Pantalla | Ruta | Qué mirar |
| --- | --- | --- |
| Art real | `/art` | Título, firma, navegación y estado vacío; no hay curación real. |
| Art de prueba | `/review/art` | Cinco categorías, flechas/contador, chips y vuelta a All. |
| Categoría de prueba | `/review/art/test-gallery` | Portada, introducción, tarjeta y enlace a la obra. |
| Obra de prueba | `/review/art/test-gallery/test-work` | Portada, dos responsables, índice, texto, imagen y carrusel. |
| Responsables ficticios | `/review/crew/test-person-a`, `/review/crew/test-person-b` | Enlaces desde la obra y regreso a las obras acreditadas. |
| Categoría vacía | `/review/art/test-empty` | Estado vacío dentro de una colección. |
| Otros layouts de muestra | `/review/art/test-books`, `/review/art/test-films`, `/review/art/test-audio` | Distribución de tarjetas feature/video/audio. No se simula reproducción externa ni publicación de esos medios. |
| Crew real | `/crew` | Portada fija al hacer scroll en escritorio, entrada del relato, biografías completas y tira de seis personas. |
| Wild Wonders real | `/crew/wild-wonders` | Portada, transición al papel, bloques importados, imágenes y lectura móvil. |

Las rutas canónicas reales siguen siendo `/art/[category]` y `/art/[category]/[slug]`. Hoy no hay slugs reales de categorías/obras curadas. Los ejemplos solo existen bajo `/review`.

## Separación de los datos de prueba

- Ruta disponible solo con `NODE_ENV=development` y Host `localhost` o `127.0.0.1`. En `next start`, incluso local, devuelve 404. También devuelve 404 para otro Host.
- Datos en memoria, importados únicamente por esa ruta. No hay API de escritura, persistencia, seeds, importación ni altas de Auth.
- Aviso fijo **LOCAL TEST DATA**, nombres Test y responsables ficticios A/B. Ninguna atribución ficticia se agrega al Crew real.
- Usa componentes públicos compartidos: portada, tarjetas, responsables, categorías, filtros, bloques, carruseles y breadcrumbs. La composición de las pantallas de muestra es de revisión; no es el CMS ni prueba el guardado en Supabase.
- Imágenes de muestra: assets públicos del handoff, nunca medios privados. El shell general sigue leyendo settings públicos mediante el cliente anónimo existente; la muestra no modifica esos settings.
- `/art`, `/crew` y `/crew/wild-wonders` conservan sus lecturas reales y permisos. Ningún fixture se agrega a esas consultas ni al sitemap. Se mantiene noindex global, metadata y `X-Robots-Tag`.

## Contraste con prototipos y handoff vigentes

Se contrastaron `Art.dc.html`, `The Crew.dc.html`, `Wild Wonders.dc.html`, `Post.dc.html`, sus capturas conservadas y handoff 00, 02, 12, 13, 16 y 18. Los HTML prevalecen para la apariencia; categoría/obra no tienen HTML dedicado y extienden Art/Post.

| Área | Resultado / diferencia que queda visible |
| --- | --- |
| Art: tipografía, firma, chips | Mantiene Garamond/Archivo, un solo trazo, chips en flujo y filtro con scroll. La muestra de cinco categorías permite revisar el carrusel requerido por handoff/16; el prototipo está poblado con cuatro. |
| Art: contenido y grillas | Los datos reales siguen vacíos. Las muestras no reemplazan la curación ni equivalen a aprobar una colección real. Las secciones genéricas conservan diferencias de proporción/altura respecto de las composiciones específicas del HTML. Revisar antes de cerrar la fidelidad visual. |
| Crew/Wild Wonders: portada | Se restaura 240vh + hijo sticky de 100vh + superposición del contenido claro de -100vh. Zoom, oscurecimiento/desaturación y salida del título usan las rampas del HTML vigente. En móvil <760px y reduced motion se libera el pin y se elimina la superposición. |
| Crew: relato y personas | Se conserva el texto importado y biografías editables, aunque difieran del copy del prototipo. Las tarjetas crecen con biografías largas. Solo enlazan perfiles habilitados y publicados. |
| Pares de imágenes dentro del relato | Los HTML también contienen pares internos con sticky/entradas y salidas encadenadas. La adaptación actual conserva pares y revelados en flujo; **no se declara paridad de esas coreografías internas**. Pendiente de revisión; la corrección de este turno se concentra en las portadas solicitadas. |
| Wild Wonders: bloques | Conserva grupos adaptados del contenido importado y portada de diseño. No se sustituyen textos o imágenes importados para copiar el contenido de ejemplo. |
| Obra/Post: bloques | Índice, responsables, imágenes y carrusel se pueden recorrer. El bloque de imagen genérico conserva diferencias de altura y no reproduce todo el parallax interno de la imagen grande de Post. Pendiente de revisión de fidelidad; las muestras no validan medios externos. |

## Por qué se había cambiado el pin

El checkpoint anterior solo registraba «portada de un viewport y flujo continuo con parallax/revelado, sin retener el scroll» como diferencia pendiente. **No se encontró una justificación de la decisión ni aprobación** en phase4-art-crew.md o design-decisions.md. Por eso no se atribuye el cambio a una decisión del usuario ni se inventa un motivo técnico: se revierte esa desviación según la instrucción actual.

Al probar el pin restaurado se encontró un problema concreto distinto: reglas heredadas `overflow-x:hidden` en `section` y `body` creaban un ancestro de scroll e impedían el sticky. Se corrige solo donde existe `.photo-hero-pin`, con overflow visible/clip, sin cambiar otras páginas. La animación de entrada y el movimiento por scroll tienen capas separadas para que sus transforms no se sobrescriban.

Se corrigió además el cálculo de offsets del carrusel y se centraron sus extremos: las flechas deben avanzar desde el primer elemento hasta el último. Se mantiene desplazamiento instantáneo con reduced motion.

## Verificación funcional y límite del CMS

**Actualización 2026-10-12:** Supabase CLI está disponible tanto en Homebrew (`2.120.0`) como en la dependencia fijada por el proyecto (`2.119.0`). No hay runtime de contenedores instalado: Docker, Podman, Colima y OrbStack están ausentes. Supabase local necesita uno para iniciar Postgres, Auth, PostgREST y Storage, por lo que el recorrido integrado todavía no se ejecutó.

La preparación del repositorio ya quedó lista para ese entorno:

- `npm run cms:local:prepare` inicia Supabase local con las 14 migraciones existentes, verifica que Auth mantenga el registro público desactivado y crea un administrador y dos integrantes de Crew estrictamente sintéticos.
- Las credenciales y claves locales se generan en `.encounters-work/local-cms.json`, ruta ignorada por Git. No modifica `.env.local`.
- `npm run cms:local:dev` inicia una segunda aplicación en `127.0.0.1:3219` con variables de proceso locales. El servidor habitual y la base remota conservan su configuración.
- El código solo admite el origen remoto confirmado o, con `ENCOUNTERS_ALLOW_LOCAL_SUPABASE=true` y fuera de producción, exactamente `127.0.0.1:54321`/`localhost:54321`. Los tests rechazan otros proyectos, otros puertos y Supabase local sin la bandera explícita.
- `npm run cms:local:stop` detiene únicamente el stack local. No se usa `db reset` remoto, importación del snapshot ni datos reales.

La opción gratuita preparada es Colima con Docker CLI. Instalación pendiente fuera del repositorio: `brew install colima docker`, seguida de `colima start --cpu 4 --memory 6 --disk 30`. Después se podrá ejecutar `npm run cms:local:prepare`, iniciar la app aislada y completar el recorrido desde navegador.

No se usó la base real como reemplazo. No se inició sesión administrativa, no se crearon categorías, obras o usuarios, no se publicó ni duplicó contenido real. Las pruebas SQL históricas con rollback siguen siendo evidencia histórica, no una prueba nueva desde navegador.

| Recorrido | Estado |
| --- | --- |
| Pantallas públicas, noindex, pin, móvil y reduced motion | Evidencia de esta revisión en `verification/review-2026-10-09/browser.json` y capturas. |
| Categoría → obra → dos responsables → obra | Se prueba con navegación real del navegador sobre fixtures en memoria. No prueba persistencia. |
| Crear categoría y obra, asignar responsables y guardar borrador en CMS | **PREPARADO, NO EJECUTADO**: falta instalar/iniciar Colima + Docker CLI. |
| Previsualizar borrador desde CMS y publicar | **PREPARADO, NO EJECUTADO**, mismo bloqueo de runtime. |
| Duplicar desde CMS y comprobar copia en borrador | **PREPARADO, NO EJECUTADO** en navegador. Los tests existentes de la función de duplicación comprueban draft, nuevos identificadores y limpieza de procedencia; no sustituyen esta prueba. |
| Anónimo no puede acceder al borrador/copias/medios privados | **PENDIENTE de prueba integrada** después de iniciar el entorno local. No se concluye RLS a partir de las rutas ficticias o de los tests de presentación. |

Para desbloquear: instalar e iniciar Colima + Docker CLI, ejecutar los comandos locales documentados y completar la secuencia desde navegador. No hace falta crear un proyecto alojado, servicio pago ni aportar credenciales remotas. No copiar datos reales ni repetir la importación para preparar ese entorno.

## Evidencia de navegador

[Reporte completo](verification/review-2026-10-09/browser.json): PASS en las comprobaciones enumeradas, sin errores JavaScript de página. Se utilizó Chrome headless aislado con Playwright local porque la herramienta del navegador integrado no estaba expuesta; sin sesión administrativa. Los avisos de desarrollo de Next Image sobre LCP/dimensiones no se clasifican como errores de página.

- Escritorio 1440×1000: pin de 2400px, portada de 1000px, top 0 tras desplazar 800px y papel en y=600px, en Crew y Wild Wonders.
- Reduced motion: pin liberado y texto visible. Móvil 390×844: seis pantallas sin desbordamiento horizontal y portadas en flujo.
- Clics: categoría → obra → ambos responsables → obra; filtros, flechas del carrusel, índice y carrusel de imágenes.
- Muestras: HTTP 404 en producción local y con Host no local, sin contenido ficticio en la respuesta.
- Art real sigue vacío; Tab → Skip to content → Enter transfiere el foco a main-content.

| Captura | Enlace |
| --- | --- |
| Crew | [Portada](verification/review-2026-10-09/crew-desktop.png) · [Pin](verification/review-2026-10-09/crew-pin.png) |
| Wild Wonders | [Portada](verification/review-2026-10-09/wild-wonders-desktop.png) · [Pin](verification/review-2026-10-09/wild-wonders-pin.png) |
| Art de prueba | [Portada](verification/review-2026-10-09/art-samples-desktop.png) · [Filtro](verification/review-2026-10-09/art-filtered.png) |
| Obra | [Índice](verification/review-2026-10-09/artwork-index.png) · [Móvil](verification/review-2026-10-09/-review-art-test-gallery-test-work-mobile.png) |

## Decisiones que requieren revisión visual

- Ritmo del pin restaurado, legibilidad y transición de portada a fondo claro en Crew/Wild Wonders.
- Composición de categorías y obras con contenido real aún por curar; tamaños de imágenes y lectura de créditos.
- Biografías largas, orden del relato y diferencias de copy respecto del prototipo.
- Fidelidad pendiente de los pares internos y del bloque de imagen de Post, descrita arriba.

No se avanzó con Home u otras páginas. Sin despliegues, emails, migraciones, importaciones ni cambios en DNS, WordPress o Katie.
