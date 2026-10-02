# Diseño vigente y diferencias

Fuente: `Efecto agua al scrollear Next.js (2).zip`, carpeta `entrega/`; SHA y archivos en design-manifest.json. Los 61 archivos coinciden con la referencia extraída del starter kit. Estructura conservada. 13 HTML, 16 Markdown, 30 assets y 2 scripts. No se ha aprobado visualmente la implementación de ninguna página.

| Archivos | Diferencia y consecuencia | Resolución / recomendación |
|---|---|---|
| Instructivo §0/§2 vs ZIP real / handoff/00 | Decía que faltaban prototipos. | Actualización de Juani resuelve: entrega vigente completa; Home v2. |
| Instructivo 3B vs handoff/03 | Núcleo posts/bloques compartido vs tabla por tipo y bloques sort/data. | Mantener posts + position/content; adapters y detalles tipados. SQL se decide y ejecuta en PASO 3. |
| Instructivo PASO 2 vs handoff/19, 03 y Contact.dc.html | Formulario con persistencia de consultas vs envío simple al equipo, sin CRM confirmado. | Apariencia vigente conservada como referencia; dejar pendiente confirmar formulario y almacenamiento. No crear contact_submissions automáticamente. Email del prototipo no se toma como destinatario confirmado. |
| Instructivo Crew/Art vs handoff/03,13,16 | Credits libres sin autores múltiples; perfil podría duplicarse en /posts. | post_contributors con FK a Crew; una obra canónica, perfil en /crew; ampliar modelo en PASO 3. |
| Instructivo Workshops/resultados vs handoff/03,15 | Un resultado y ocultación de sesiones al terminar. | Preservar programa histórico y relaciones múltiples; estado de inscripción independiente. Ajustar presentación final en PASO 4. |
| Instructivo Próximamente/Home vs handoff/03,10 | Agenda limitada a actividades; entradas/orden parcialmente fijos. | Incluir anuncios y arte futuro; orden y visibilidad editables, ocultar vacíos. No eliminar newsletter por ausencia visual. |
| Instructivo contenido real vs handoff/03,17 | Messages exige mínimo 2; snapshot contiene 1. | Admitir 0/1/n, sin texto ficticio. No bloquear publicación por cantidad visual. |
| handoff/00 vs 02 §4.4/4.7 y Home v2 | Regla global de movimiento solo scroll vs nieve, aletas y vaivén por tiempo. | Prototipo vigente define apariencia; recomendar excepciones decorativas explícitas, todas quietas con reduced-motion. Implementación pendiente PASO 4. |
| handoff/02 §1.4 vs §10,15 | Pines móviles liberados vs riel móvil propio; overscroll contain no devuelve automáticamente scroll al padre. | Verificar interacción mouse/touch/teclado y salida del riel, conservar contenido accesible; no implementar fórmula a ciegas. Pendiente solo esta interacción. |
| handoff/02 §9 vs 14 | Pin 660vh vs fórmula 220+110n (770 con 5). | Calibrar ventanas con prototipo y cantidad variable en PASO 4; documentar medida elegida. |
| handoff/90 vs instrucción actual | Checklist propone SQL y páginas antes del CMS. | Instrucción actual manda: ahora preparación; servicios PASO 2, SQL/CMS PASO 3, visual PASO 4. |

La navegación vigente incluye Contact; adoptarla como referencia visual (no conservar la propuesta antigua solo por estar documentada antes). Los enlaces externos, textos del prototipo y fechas ficticias no constituyen contenido confirmado para seed.
