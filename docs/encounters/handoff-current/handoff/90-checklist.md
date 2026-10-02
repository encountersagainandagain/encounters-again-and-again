# 90 · Checklist de migración

## Orden sugerido

1. **Base:** tokens de color y tipografía en Tailwind, fuentes, layout raíz, navbar + velo, footer.
2. **Motor de scroll:** un hook `useScrollStage` que implemente 02-animations.md § 1 (reloj suavizado, `ramp`, `data-seq`, progreso de pin) y se reutilice en todas las páginas. **Hacer esto antes de cualquier página con efectos.**
3. **Supabase:** tablas de 03-data-model.md, bucket de media, panel de `media` con alt y punto focal.
4. **Páginas estáticas:** Home, About, Contact (las de contenido más estable).
5. **Listados:** Crew, Art (con categorías dinámicas y carrusel), Meaningful Messages.
6. **Pines complejos:** Expeditions, Workshops. Son los de mayor riesgo: dejarlos cuando el motor ya esté probado.
7. **Editor de bloques + /posts/[slug]:** los 17 bloques, y recién después conectar `report_post_id` y `page_post_id`.

## Criterios de aceptación por página

- **Home:** el fondo se desenfoca progresivamente y el profundímetro llega a 30.0 m y sigue. La marca del navbar pasa de logo grande a logo + wordmark sin saltos. Ningún bloque después del banner frena el scroll. Las tarjetas de Ongoing projects emergen desenfocadas y se aclaran; la agenda abre cada foto desde una franja y el profundímetro de la derecha marca el evento activo. La nieve marina se estira al scrollear rápido y sigue moviéndose con la página quieta; el HUD reemplaza al profundímetro central sin que se vean los dos. Sin saltos al hacer scroll rápido; sin WebGL la página sigue siendo legible y navegable.
- **About:** las fotos cambian con el scroll, no con temporizador. Título del banner en mayúsculas.
- **Crew:** un integrante con `has_page = false` no linkea ni muestra hover. Los garabatos se completan (ninguno queda a medias).
- **Expeditions:** el banner no se suelta hasta que pasó la última card; las 6 franjas se revelan en dos pasadas intercaladas; las cards se encadenan.
- **Workshops:** con el cursor sobre la card se pasan las sesiones y la página **no** se mueve; al terminar la última, el scroll sigue a la página.
- **Art:** con 5+ categorías aparece el carrusel con flechas y contador; los chips siguen filtrando; la firma del título se dibuja una sola vez al cargar.
- **Meaningful Messages:** el primer mensaje ya está en pantalla cuando el crédito sale; ninguna pantalla en blanco entre mensajes.
- **Post:** el bloque de imagen mide 95vw × 95vh con aire a los lados; el iframe de YouTube no se carga hasta el click.
- **Contact:** el panel monta sobre el banner; el agradecimiento cambia según el motivo.
- **Todas:** `prefers-reduced-motion` deja todo legible y quieto; sin errores de consola; sin scroll horizontal a 360px de ancho.

## Riesgos conocidos

- **Alturas de viewport en iOS:** `100vh` salta con la barra de direcciones. Usar `100dvh` para los pines y `svh` donde el salto se note, y volver a medir los pines en `resize`.
- **Pines anidados:** ninguna página debe tener un pin dentro de otro. Workshops usa pines hermanos, no anidados.
- **Cantidad de contenido:** los pines se dimensionan por cantidad (fórmulas en 14, 15 y 17). Si se ignoran, agregar una card o un mensaje rompe el ritmo. La agenda de la Home ya no tiene pin: acepta de 2 a 6 eventos sin tocar fórmulas.
- **Textos largos:** respetar los máximos de 03-data-model.md; el diseño de los pines no crece con el texto.
