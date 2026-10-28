# Guía de carga editorial — prueba manual del admin

Para que Juani cargue y edite como lo harían los fundadores, con el contenido original del sitio anterior. La carga la hace una persona desde el admin: esta guía no la ejecuta.

## Antes de empezar

### Dónde se carga
- **Admin:** https://encounters-again-and-again-gamma.vercel.app/admin
- **Base:** el admin de gamma trabaja sobre el **proyecto real de Supabase `lzwmwofxoegkxykglneq`**, el mismo del sitio público de gamma. Verificado el 2026-10-24 en el JavaScript publicado y en `.env.local`.
  - **Todo lo que se guarde o publique se ve en https://encounters-again-and-again-gamma.vercel.app** al instante: el guardado invalida la caché.
  - El sitio sigue con `noindex` y no tiene dominio propio.
- **Acceso:** hay dos administradores, `ju…@hotmail.com` (Juani) y `en…@gmail.com`, que todavía nunca entró. El registro público está desactivado.
  - Si falta una contraseña, avisar antes de pedir un correo de recuperación: no se habilita ningún envío de correo sin decidirlo.

### Qué no hacer
- No usar **Newsletter → enviar**: los envíos dependen de una configuración del Vercel del cliente que no está confirmada.
- **Contact → «Send message»** no envía nada desde el servidor: abre el programa de correo de quien escribe (`mailto:`).
- No se corren seeds, reinicios, limpiezas masivas ni otra importación del snapshot. Todo se hace a mano desde el admin.

### Material original
- **Snapshot:** `docs/encounters/migration-source/encounters-content-snapshot.zip` (SHA-256 verificado, [integridad](migration-source-integrity.md)).
  - Los textos están en `seed-content.json` («content → pages / stories → blocks», textos literales) y en `content-blocks.csv` (para abrir en una planilla).
  - Las imágenes están en `assets/images/` y `image-inventory.csv` dice en qué página se usaba cada una.
- **Las imágenes originales ya están en el admin,** en **Site → Media library**: 49 archivos importados.
  - En cada campo de imagen, **«Choose from library»** permite buscarlas por nombre. Solo si falta alguna, se sube desde `assets/images/` con «Upload new image».
- **No inventar** lo que el original no tiene (fechas, lugares, roles, precios): se deja vacío.

### Ejemplos y contenido de práctica
- **Ejemplos:** la base tiene **ejemplos** ficticios (27 registros con huella) que el admin marca con la insignia **«Example»** (ids `de000000-…`). Son:
  - 3 personas «Demo Maker» con sus páginas;
  - 3 obras y 3 categorías de Art;
  - 3 expediciones y 3 workshops con sus resultados;
  - 3 mensajes;
  - 1 noticia;
  - 3 anuncios;
  - 43 imágenes.
- **Para conservar un ejemplo** como propio, basta con editarlo. Al cambiar su huella, cualquier limpieza futura lo deja en paz.
- **Para retirarlo:** abrirlo y usar **«Unpublish»**. Vuelve a borrador, deja de verse en el sitio y no se borra. Se hace de a uno.
- **Lo que se cree para practicar** conviene titularlo con el prefijo **«PRUEBA —»** y dejarlo en **Draft** (o despublicarlo al terminar). Así se distingue del contenido real y se retira de a uno, sin tocar nada más.
- **Borrar definitivamente** no está en este admin: se decide aparte.
- **Ajustes de la página:**
  - Los textos de About, Contact y Home, y el email público, son hoy **ejemplos o textos del diseño** (`hello@encounters.example`, «Demo photos from the design handoff»).
  - Al reemplazarlos con los originales se pisan esos ejemplos, no contenido real.

---

## 1. Crew y página personal
- **Ya existe, para editar:**
  - **Crew · People:** Julian Lange, Fabrizio Ferrari, Georgia Webb (alias Wild Wonders), Hugo Delgado, Maja Koronska y Alexis Menage, todas publicadas.
  - **Georgia** tiene la página personal **Wild Wonders** y **Fabrizio** tiene una página personal creada durante la revisión del
    CMS. No borrar ni “corregir” esa página sin pedido de Juani.
- **Falta crear:**
  - Nada obligatorio. El original no tiene páginas personales del resto, así que no se crean.
  - Para practicar la creación: «New crew member» con «PRUEBA —» en borrador.
- **Original:**
  - Página «Meet The Team» del snapshot: nombre, rol, biografía y «FAVOURITE ANIMAL» de cada persona.
  - La página «Wild Wonders», para Georgia.
  - Imágenes: `DSC…`, `FabrizioFerrari-4-…`, `georgia-selfie-…` (ver `image-inventory.csv`, página `elementor-page-3462`).
- **Campos (Crew → persona):**
  - Name, Role (p. ej. «Co Founder», tal cual en el original), Biography, Favourite animal, Portrait.
  - Publication = estado general de la persona.
  - The Crew page → Position ordena la tarjeta en `/crew` y Home; Show on The Crew page permite quitarla de esas listas sin
    romper su página personal ni sus créditos.
  - La tarjeta Personal page muestra el estado y las acciones. `Enable profile page` ya no se muestra porque duplicaba el estado
    de la propia página.
- **Página personal (Wild Wonders):**
  - Se edita en Crew → Personal pages → Wild Wonders: Banner, SEO y Below the banner con Main title, Opening text, fotos y los
    demás bloques de perfil.
  - Textos e imágenes en la página «Wild Wonders» del snapshot (`georgia-selfie`, `encounters-cover-small`, `Backcover_encounters`, logos).
- **Dónde se ve:** /crew (filas por persona) y /crew/wild-wonders. La persona también aparece como responsable en obras y mensajes.

## 2. Libro «Encounters» en Art, con sus responsables confirmados
- **Ya existe:** en Art hay solo ejemplos (categorías «Books», «Drawings» y «Listening», y obras como «The Tide Notebook»). No hay ninguna obra real.
- **Falta crear:**
  1. **Una categoría real** (Art · Categories → New):
     - el nombre lo deciden los fundadores; el original habla de «little big book»;
     - layout `feature` para un libro;
     - portada `encounters-cover-small-…`.
     - El slug `books` está ocupado por el ejemplo: usar otro, o retirar antes el ejemplo.
  2. **La obra «Encounters»** («New artwork»):
     - Art category: la nueva;
     - Main image: `encounters-cover-small-…` (también está `Backcover_encounters-…`);
     - Caption / texto: del original.
- **Original** (literal):
  - **Wild Wonders:** «Illustrations of a little big book: ENCOUNTERS» y «While on Heron Island. Georgia met so many creative people, including Julian Lange.. He was writing a book about the how he felt in the moments he encountered nature at its fullest and and how those encounters shaped his life. So with Georgia's love for art and nature, they created the book together.»
  - **Home:** «Encounters again and again's first little big book. Exploring here will take you to our first website where you can read all about it and download it for free..»
  - **Enlace externo:** https://www.encountersagainandagain.org/ («A Little Big Book»), como External link.
- **Responsables confirmados por el original:** **Julian Lange** (escribía el libro), **Georgia Webb** (ilustraciones) y «they created the book together».
  - Se marcan en las casillas de personas (Crew) del formulario de la obra.
  - No agregar a nadie más ni roles que el texto no dice.
- **Dónde se ve:** /art (categoría y obra), la página de la obra, y las páginas de Julian y de Georgia como sus obras.

## 3. Presentación de Expeditions
- **Ya existe:**
  - la página del programa «Encounters Expeditions» (Site → Imported pages), con su texto original en bloques;
  - la portada, una foto del velero de 963 px;
  - **0 tarjetas de presentación**. Por eso hoy el sitio arma las 4 tarjetas desde el texto de esa página.
- **Para editar:**
  - **Expeditions → Expeditions page:** «Surface image» (conviene una foto de más resolución, si la hay), «Underwater image», «Title» (vacío = «Expeditions»), «Small line above the title», y los textos de la lista y del cierre.
  - **Texto de la página:** Site → Imported pages → Encounters Expeditions. Ahí conviene corregir dos detalles del original: tres líneas repetidas en «TO CONSERVE OUR SEAS» y «Australia.She» sin espacio.
- **Falta crear (opcional): tarjetas de presentación** (Expeditions → Presentation cards, de 3 a 6).
  - Cuando existe al menos una, reemplazan a las tarjetas armadas desde el texto.
  - Campos: Shown on = Encounters Expeditions; Kicker; Title; Text; List (una línea por ítem); Image; Image side; Theme (`dark` para la de cierre con enlace); Link label / Link URL.
- **Original:**
  - **Texto:** página «Encounters Expeditions» del snapshot (Meet Coquitlam · TO CONSERVE OUR SEAS · Join the expedition · The ocean is vast…).
  - **Enlace de apoyo:** https://www.gofundme.com/f/encounters-expedition-help-our-sailboat-to-help-the-ocean.
  - **Imágenes:** `PHOTO-2026-02-26-…`, `WhatsApp-Image-2026-02-07…`, `WhatsApp-Image-2026-03-12…` (página `elementor-3062`).
- **Dónde se ve:** /expeditions (banner con tarjetas). La lista «On the water» de abajo muestra expediciones; hoy son solo ejemplos.

## 4. Workshop original con etapas
- **Ya existe:**
  - la página del programa «Artsy Animals» (Imported pages) y **Workshops → Workshops page** (portada, kicker, cierre);
  - los 3 workshops actuales son ejemplos.
- **Falta crear:** **un workshop** («New workshop»), con **3 sesiones**, que son los tres episodios del original:
  1. «episode 1. Green Sea Turtles.»
  2. «episode 2. Dolphin family»
  3. «episode 3. RAY FEVER»
- **Original:**
  - **Introducción:** página «Artsy Animals» del snapshot: «The little big book "ENCOUNTERS" expanded into another way… Each workshop is a journey of creativity…».
  - **Cada sesión:** su título y su texto literal.
  - **Cierre:** «if youd like to come along, contact us…» y el botón «Get In Touch — call or text Georgia», con el teléfono que figura en el original. Publicarlo es decisión de ustedes.
  - **Imagen:** `encounters_vector_refined_text-…svg`. Para la portada y las sesiones conviene elegir de la biblioteca: el original no tiene una foto por episodio, así que no se inventan.
- **Campos:**
  - **Workshop:** título, Excerpt, Cover, Activity status, Registration (`not_applicable` si no hay inscripción), Contact button label.
  - **Sessions:** Session title, Description, Image (opcional).
  - Fechas y lugar **vacíos**: el original no los tiene.
- **Dónde se ve:**
  - /workshops (lista) y la página del workshop, con sus etapas;
  - si se publica, también en la agenda de la Home cuando corresponda por estado.

## 5. Meaningful Message original
- **Ya existe, para revisar y editar:** «You never know what encounter could change your life», publicado. Los otros 3 mensajes son ejemplos.
- **Falta crear:** nada.
- **Original:**
  - el post del snapshot: «illustrated by Georgia Webb, inspired by Julian Lange»;
  - las tres frases «Even the smallest ripple…», «Even a small effort…», «Even a small action…»;
  - el párrafo «Even something small like creating a little big book…»;
  - «This Comic was the first creation between Julian LANGE and Georgia Webb.»;
  - imagen `The_Little_Things_-…jpg`.
- **Campos:** Message / poem (las frases, una por línea), Additional text, Illustration, Credit («illustrated by Georgia Webb, inspired by Julian Lange»), y las casillas de personas (Georgia, Julian).
- **Dónde se ve:** /meaningful-messages y la página del mensaje. También puede aparecer en la Home si se marca como destacado.

## 6. Home, About y Contact
- **Ya existe, para editar:** **Overview → Home page**, **Site → About page**, **Site → Contact page** y **Settings** (email público, redes, donación). Hoy tienen textos de ejemplo o del diseño.
- **Falta crear:** nada; son ajustes.
- **Home (original):**
  - **Portada:** «WELCOME TO ENCOUNTERS AGAIN AND AGAIN», «A space for our connection to nature. A space to feel and create with nature», «follow the current …where will it lead you..». Estas frases ya están cargadas.
  - **Proyectos:** «ongoing projects» con los textos de Encounters Expeditions («We bought a sail boat…»), Artsy Animals Workshop («if you also love wildlife…») y Wild Wonders («Wild Wonders is Georgia's space…»).
  - Imágenes de la página `/` del inventario.
  - Las secciones de la Home que el original no tiene (descenso, arrecife) quedan con su texto del diseño, o se ocultan desde la lista de secciones de Home page.
- **About (original):**
  - «WHAT IS OUR MISSION ?» / «To connect people with nature.»;
  - «HOW ?» «Through telling our stories and through our actions»;
  - «Through Storytelling» y «Through Actions», con sus listas;
  - «We believe that every action / no matter how small makes a difference»;
  - imágenes `manta-…`, `Underwater-adventure-logo-design-…`;
  - el crédito «Photo by SpottedFabri».
  - Las fotos de la galería y el crédito actual son **de ejemplo**: reemplazarlas.
- **Contact (original):**
  - «Talk To Us !», «with a creative idea for art, collaboration work, or just want to meet up and go for a snorkel…»;
  - email **encountersagainandagain@gmail.com** y teléfono (decidir si se publica);
  - redes: YouTube https://www.youtube.com/@Encountersagainandagain e Instagram https://www.instagram.com/encountersagainandagain/.
  - El email se carga en **Settings**: reemplaza al de ejemplo y el formulario lo usa como destino del `mailto:`.
- **Dónde se ve:** /, /about, /contact y el pie de todas las páginas (email y redes).

---

## Después de cada carga
- **Revisar:** guardar y abrir `Full preview`; si ya está publicada, revisar también la página pública en gamma. Las páginas
  permanentes y personales no tienen el preview integrado ni botones duplicados de publicación.
- **Anotar** lo que resulte confuso en la interfaz: ese es el objetivo de esta prueba.
- **Al terminar:** despublicar lo que tenga «PRUEBA —» y decidir qué ejemplos se retiran.
