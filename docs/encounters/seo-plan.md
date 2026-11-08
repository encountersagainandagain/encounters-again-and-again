# Plan de SEO (auditoría del 2026-11-08)

Resultado de la auditoría de SEO pedida por Juani. El sitio está bien armado en lo técnico (metadata, canonical, JSON-LD y
contenido en el HTML del servidor; un solo `<h1>` por página; 404 reales; redirecciones 308). Este plan ordena lo que falta.
Se marca cada punto al terminarlo, con qué se hizo y cómo se verificó.

## A. Código (se hace ahora)

- [x] **A1 · Sitemap completo y con fecha.** `app/sitemap.ts` ya es dinámico (se arma al pedirlo, desde la base: lo publicado
  aparece, lo despublicado o borrado desaparece). Falta incluir Home, Expeditions, Workshops, Meaningful Messages, About,
  Contact, cada expedición, cada workshop y cada historia de Results, y `lastModified` con la última edición de cada página.
  Los mensajes no van (su dirección redirige a un ancla de su página) ni las field notes (ocultas).
  Hecho: `app/sitemap.ts` lista Home, Art y categorías, cada obra, Expeditions y cada expedición, Workshops y cada workshop, cada historia de Results, Meaningful Messages, Crew y cada página personal, About y Contact, con `lastModified` (la última edición; en las listas, la más reciente de lo que muestran). Local: 32 páginas, 30 con fecha. Producción (2026-11-08): 23 páginas, todas con fecha.
- [x] **A2 · SEO de la Home.** Sección «Search engines (SEO)» en Home page, como el resto, con texto sugerido. La Home publica
  su título, descripción y temas; hoy dice solo el nombre y «Art, ocean, education and conservation.».
  Hecho: Home page → «Search engines (SEO)» (título, descripción y temas, con texto sugerido en `home-defaults.ts`); `app/page.tsx` publica título, descripción, temas e imagen para compartir. Probado: guardar un título lo publica; vaciarlo vuelve al sugerido.
- [x] **A3 · Títulos sin repetir la marca.** Un título de SEO propio se usa tal cual (`title.absolute`); los demás siguen con
  « | Encounters Again and Again». Hoy llegan a 76–86 caracteres; Google corta cerca de 60.
  Hecho: `editorialMetadata` usa `title.absolute` cuando hay título de SEO propio. Títulos medidos en local: 47–61 caracteres (antes 76–86). Las ayudas del admin ya no dicen que se agrega la marca.
- [x] **A4 · Descripciones de hasta ~155 caracteres.** Cortadas sin partir palabras. Hoy un workshop publica 468.
  Hecho: `clipDescription` (`seo-text.ts`, probada en `scripts/check-seo.mjs`) corta en ~155 sin partir palabras.
- [x] **A5 · Datos estructurados de cada detalle.** Expedición y workshop: `Event` (fechas, lugar, estado, organizador, imagen;
  sesiones como sub-eventos). Historia de Results: `Article` (fechas, autores del crew, imagen, de qué actividad trata).
  Hecho: `structured-data.ts` (`eventOf`, `articleOf`), usado por las listas y por cada expedición, workshop (con sus sesiones) e historia de Results.
- [x] **A6 · Organización completa.** `Organization` con descripción, email, redes de Settings (`sameAs`) y `WebSite` con su
  descripción.
  Hecho: la Home publica `Organization` (descripción, email, redes de Settings en `sameAs`, temas) y `WebSite` con `@id` compartido con el del layout.
- [x] **A7 · Imagen al compartir Meaningful Messages.** Portada de la página o, si no tiene, la primera ilustración.
  Hecho: portada de la página, si no la primera ilustración publicada, si no la imagen de diseño del banner.
- [x] **A8 · Lanzamiento en un solo interruptor.** Los tres bloqueos a buscadores (`robots.txt`, meta robots y la cabecera
  `X-Robots-Tag`) pasan a depender de `ENCOUNTERS_INDEXABLE=true` en Production. Sin la variable, todo sigue con `noindex`
  como hoy; los Previews nunca se indexan. El `robots.txt` abierto ya trae el sitemap y deja fuera admin, API y review.
  Hecho: `src/config/indexing.ts`; `robots.ts`, la meta robots del layout y la cabecera de `next.config.ts` dependen de `ENCOUNTERS_INDEXABLE=true` en Production. Admin, API y review llevan `noindex` siempre. Local: robots cerrado y `noindex` como antes.

## B. El día del lanzamiento (con Juani, ver `PENDIENTES.md` §1)

- [ ] `NEXT_PUBLIC_SITE_URL` con el dominio final (canonicals, sitemap y JSON-LD lo toman de ahí).
- [ ] `ENCOUNTERS_INDEXABLE=true` en Vercel → Production, y volver a desplegar. Eso abre robots (con el sitemap), la meta robots y la cabecera a la vez; no hay que tocar código.
- [ ] Search Console: verificar el dominio, enviar `/sitemap.xml`, revisar «Page indexing».
- [ ] Prueba de resultados enriquecidos de Google en una obra, una expedición, un workshop y una historia.
- [ ] PageSpeed Insights (móvil) de Home, Art, Expeditions y una obra; aligerar portadas pesadas si hace falta.

## C. Contenido (Juani, desde el admin)

- [ ] Descripción de la obra «Re-encounters…» (hoy «My experience encountering in the experience»).
- [ ] Descripción de la categoría Books (73 caracteres; mejor 120–160).
- [ ] Cargar las redes del colectivo en Settings (Instagram, YouTube, etc.): hoy no hay ninguna, y son las que la Home publica para que Google y las IAs reconozcan la marca (`sameAs`). También aparecen en Contact y en el pie.
- [ ] Revisar el SEO sugerido de la Home y de cada página, y reescribirlo con la voz del colectivo si hace falta.
