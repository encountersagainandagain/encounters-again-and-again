# Revisión integrada de Encounters — guía para Juani

Una sola ronda para revisar todo el sitio. Cada página tiene su prototipo, un ejemplo editable, qué mirar y una casilla de aprobación. **Las casillas las marca solo Juani**; las únicas marcadas son las aprobaciones anteriores que siguen vigentes.

Estado técnico de cada módulo: [page-progress.md](page-progress.md).

## Dónde se revisa

| Qué | Dirección | Notas |
|---|---|---|
| Sitio completo (producción local) | http://127.0.0.1:3221 | Build de producción contra Supabase local, con los ejemplos. El commit que sirve figura en el resumen de la entrega. |
| Admin conectado a esos datos | http://127.0.0.1:3221/admin | Usuario y contraseña locales en `.encounters-work/local-cms.json` (no versionado). Todo lo que se edita es local. |
| Prototipos | http://127.0.0.1:3220/ | `docs/encounters/handoff-current`, servidos tal cual. |
| Crew y Wild Wonders con datos reales | http://127.0.0.1:3218/crew · http://127.0.0.1:3218/crew/wild-wonders | Solo lectura de la base real; nada se escribe. |
| Desarrollo (mismos datos que 3221) | http://127.0.0.1:3219 | Alternativa si 3221 no está levantado. |

Para volver a levantar: `npm run cms:local:prod` (producción, 3221), `npm run cms:local:dev` (3219) y el servidor de prototipos de `handoff-current` en 3220.

Los ejemplos llevan «(demo)» en el título. Los creados desde el admin durante las pruebas también («UI journey …», «Tide pools …», «Rock pool study …») y están adoptados: `npm run demo:local:plan` los lista y `demo:local:clean` los quitaría.

En el navegador, la herramienta de diseño de pantalla (`Cmd+Opt+I` → icono de teléfono) sirve para mirar 390 px (teléfono) y 1024 px (tablet).

## Páginas

### Home — http://127.0.0.1:3221/ · prototipo `Abismo Home v2.dc.html`
- **Ejemplo y edición:** Admin → Home page (orden y visibilidad de secciones, textos). La agenda, las historias, el arte y la tripulación salen del contenido publicado.
- **Qué mirar:** descenso con el agua (resolución adaptativa), criaturas, agenda pineada, carrusel de arte, cierre. Fluidez del scroll en tu pantalla.
- **Diferencias conocidas:** textos de diseño o de ejemplo. El agua usa resolución adaptativa (decisión pendiente tuya).
- [x] Conformidad visual (2026-10-18, sobre `5762076`)
- [ ] Fluidez y resolución adaptativa del agua
- [ ] Aprobación editorial

### The Crew — http://127.0.0.1:3218/crew (real) · prototipo `The Crew.dc.html`
- **Edición:** Admin → People y Admin → Crew page (secciones).
- **Qué mirar:** sin cambios visuales desde lo aprobado. Navbar en teléfono: cada enlace se toca cómodo, sin activar el vecino.
- [x] Aprobada (`cbea565`, 2026-10-13)
- [ ] Editor de secciones de la página Team (no cambia el aspecto)

### Perfil (Wild Wonders) — http://127.0.0.1:3218/crew/wild-wonders (real) · prototipo `Wild Wonders.dc.html`
- **Ejemplo local:** http://127.0.0.1:3221/crew/demo-maker-coral (obras, actividades y mensajes acreditados).
- **Qué mirar:** igual que lo aprobado; navbar en teléfono.
- [x] Wild Wonders aprobado (2026-10-14)
- [ ] Editor de secciones del perfil

### Expeditions — http://127.0.0.1:3221/expeditions · prototipo `Expeditions.dc.html`
- **Ejemplos:** «Ningaloo crossing (demo)» (próxima, con necesidades) → http://127.0.0.1:3221/expeditions/demo-ningaloo-crossing · «UI journey crossing (demo)» (terminada, con resultado) → http://127.0.0.1:3221/expeditions/ui-journey-crossing-demo
- **Edición:** Admin → Expeditions; cards del banner en Admin → Presentation cards (preview en vivo de la card).
- **Qué mirar:** disolución en franjas del banner, cards encadenadas, navbar que pasa a claro; lista con próximas y terminadas.
- **Diferencias:** la lista de expediciones no está en el prototipo; botón de donación oculto si no hay enlace.
- [ ] Aprobación visual

### Workshops — http://127.0.0.1:3221/workshops · prototipo `Workshops.dc.html`
- **Ejemplos:**
  - una sesión: http://127.0.0.1:3221/workshops/ui-journey-drawing-day-0231-demo
  - varias sesiones: http://127.0.0.1:3221/workshops/demo-draw-the-ocean
  - inscripción completa: http://127.0.0.1:3221/workshops/demo-encounters-market
  - terminado con resultado: http://127.0.0.1:3221/workshops/demo-wild-wonders-coledale
- **Edición:** Admin → Workshops (estado de la actividad e inscripción por separado; sesiones).
- **Qué mirar:** hero que se hunde, un pin por workshop con riel de sesiones (también con AvPág), tarjeta terminada con «See the result».
- **Diferencias:** títulos «(demo)», imágenes sintéticas, enlace al detalle agregado.
- [ ] Aprobación visual

### Art — http://127.0.0.1:3221/art · prototipo `Art.dc.html`
- **Ejemplos:**
  - 8 categorías (carrusel con contador);
  - Drawings (obras apiladas junto a una grande);
  - Films (miniatura de YouTube);
  - Books (libro);
  - obra con dos autores: http://127.0.0.1:3221/art/demo-wire-art/demo-wire-manta;
  - categoría en borrador creada desde el admin: «Tide pools (demo)».
- **Edición:** Admin → Categories (diseño gallery, feature, video o audio) y Admin → Works (categoría, autores, tamaño).
- **Qué mirar:** firma que se dibuja, tiles y chips que filtran y bajan a la sección, galería, video al click, cierre «More to come».
- **Diferencias:** pie `[ título ]` bajo cada obra (abre su página); flechas del carrusel solo donde hay más.
- [ ] Aprobación visual

### Meaningful Messages — http://127.0.0.1:3221/meaningful-messages · prototipo `Meaningful Messages.dc.html`
- **Ejemplos:** tres mensajes publicados; detalle con créditos: http://127.0.0.1:3221/meaningful-messages/demo-own-ripple; «UI journey message (demo)» en borrador.
- **Edición:** Admin → Messages (frase, texto, ilustración, crédito, orden) y Admin → Messages page (banner, introducción, crédito, cierre).
- **Qué mirar:** banner pineado, introducción con garabato, mensajes que se cruzan (sube, crece y se enfoca; el que sale se desenfoca), en teléfono cada bloque entra solo.
- **Diferencias:** «Read the message →» agregado; en teléfono el texto queda dentro del margen (el prototipo lo corta).
- [ ] Aprobación visual

### Post (noticias y resultados) — http://127.0.0.1:3221/posts/demo-post-blocks · prototipo `Post.dc.html`
- **Ejemplos:** todos los bloques en «All post blocks (demo)»; resultado de expedición http://127.0.0.1:3221/posts/demo-first-crossing; resultado de workshop http://127.0.0.1:3221/posts/demo-coledale-result; noticia http://127.0.0.1:3221/posts/demo-colony-came-to-us.
- **Edición:** cualquier contenido → Content blocks (agregar, subir/bajar, duplicar, quitar) con Visual preview y Full preview.
- **Qué mirar:** imagen grande con parallax, índice, carrusel, YouTube al click, costos, FAQs y acordeón.
- **Diferencias:** sin bloques de tour, alojamiento ni afiliados (fuera de alcance); sin etiquetas al margen (eran ayudas del prototipo).
- [ ] Aprobación visual

### About — http://127.0.0.1:3221/about · prototipo `About.dc.html`
- **Edición:** Admin → About page.
- **Qué mirar:** foto que se encoge en banda con las tres columnas, fotos que cambian, manifiesto, filas con lista y foto, «We believe…», contacto.
- **Para decidir:** en una columna (teléfono y tablet angosta) la segunda fila muestra la foto antes del texto y la primera no, como el prototipo ejecutable; su CSS dice «la foto siempre arriba». ¿Lo dejamos así o foto arriba en las dos?
- **Pendiente editorial:** la presentación real (hoy en la base real se ve el texto importado).
- [ ] Aprobación visual

### Contact — http://127.0.0.1:3221/contact · prototipo `Contact.dc.html`
- **Edición:** Admin → Settings (email, WhatsApp, página de donación y su texto, redes) y Admin → Contact page (motivos, textos).
- **Qué mirar:** imagen que se hunde, panel que monta, motivos.
  - Sin email local el botón aparece desactivado y explica por qué. Para probarlo, cargá un email en Settings y luego borralo.
  - «Open my email app» abre tu correo con el mensaje armado y la página dice que falta enviarlo.
- **Diferencias:** botón y estado posterior distintos al prototipo, porque el sitio no envía mensajes.
- [ ] Aprobación visual

### Newsletter — sección de Home (sin prototipo)
- **Qué mirar:** mensajes de cada caso: email inválido, falta el consentimiento, alta.
  - El alta dice que no se manda confirmación.
  - El admin (Admin → Newsletter) muestra que el envío está apagado.
- **Pendiente para más adelante:** borradores, prueba de envío y dominio verificado (lista en page-progress).
- [ ] Aprobación visual y de textos

## Recorridos de relaciones (10 minutos)

1. **Obra ↔ autores:**
   - abrí http://127.0.0.1:3221/art/demo-wire-art/demo-wire-manta y seguí cada autor a su perfil;
   - en el perfil, volvé a la obra.
2. **Expedición ↔ resultado:**
   - en http://127.0.0.1:3221/expeditions/ui-journey-crossing-demo seguí el resultado;
   - en el resultado, «Keep reading · The expedition: …» vuelve.
3. **Workshop ↔ resultado ↔ facilitadores:**
   - http://127.0.0.1:3221/workshops/demo-wild-wonders-coledale → «See the result» → vuelta al workshop;
   - en «UI journey drawing day», «With» lleva al perfil de la facilitadora.
4. **Mensaje ↔ créditos:**
   - en Admin → Messages, acreditá a una persona en un mensaje publicado, guardá y abrí su perfil;
   - quitá el crédito al terminar.
5. **Publicar no destaca:**
   - en Admin → Workshops, abrí «Encounters at the market», marcá «Featured on Home» con orden 1 y mirá que pasa primero en la agenda de Home;
   - desmarcá al terminar.
6. **Privacidad:** pasá cualquier ejemplo a Draft y comprobá que su página da 404 y desaparece de listas, perfiles y Home. Volvé a publicarlo.
7. **Ida y vuelta:** recorré el navbar de punta a punta y volvé con el botón Atrás. Cada página arranca arriba con su título y sus animaciones.

## Diferencias conocidas y pendientes editoriales (resumen)

- Ejemplos con «(demo)» e imágenes sintéticas.
- Datos reales por cargar: cards de Expeditions, workshops y expediciones reales, obras, presentación de About, email, WhatsApp y donación en Settings, textos de Messages.
- Pendiente en la base real, con aprobación: las migraciones `20261017000100` y `20261017000200`, y la conversión del perfil real a secciones.
- Funciones agregadas que el prototipo no dibuja: enlaces a detalles y resultados, créditos, pie de las obras, «Read the message».

## Aprobación por página

| Página | Estado |
|---|---|
| Home | Conformidad visual ✔ · fluidez y agua ☐ · editorial ☐ |
| The Crew | ✔ (`cbea565`) · editor de secciones ☐ |
| Wild Wonders | ✔ (2026-10-14) · editor de secciones ☐ |
| Expeditions y detalle | ☐ |
| Workshops y detalle | ☐ |
| Art, categorías y obras | ☐ |
| Meaningful Messages y detalle | ☐ |
| Post (noticias y resultados) | ☐ |
| About | ☐ |
| Contact | ☐ |
| Newsletter | ☐ |
