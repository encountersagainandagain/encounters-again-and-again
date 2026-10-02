# Encounters again and again — Handoff de diseño

Este paquete describe **qué se muestra, cómo se ve y cómo se mueve** cada página, y **qué datos necesita** para ser editable desde el panel propio (Supabase).

No trae código de aplicación: lo escribe la AI de programación. Trae la especificación que tiene que respetar.

## Stack asumido

- Next.js (App Router) + TypeScript + Tailwind
- Supabase (Postgres + Storage para imágenes) como única fuente de datos
- Panel propio de administración (no headless CMS)
- Un solo idioma: **inglés** (todo el copy visible). Este handoff está en español; los textos de ejemplo van en inglés.

## Orden de lectura

| Archivo | Para quién | Qué contiene |
|---|---|---|
| 01-design-system.md | plan + código | Paleta, tipografía, escalas, navbar, componentes base |
| 02-animations.md | código | **Crítico.** Motor de scroll y cada animación con sus valores exactos |
| 03-data-model.md | plan | Tablas, relaciones, SQL y tipos TS |
| 04-editor-de-bloques.md | plan + código | Los 17 bloques del editor y su JSON |
| 10..19-*.md | ambos | Una página por archivo: contenido, layout, datos, animaciones |
| 90-checklist.md | ambos | Orden de migración y criterios de aceptación |

## Prototipos de referencia

Cada página tiene su prototipo HTML funcionando en la raíz del proyecto de diseño. Son la **verdad visual**: si este documento y el prototipo difieren, gana el prototipo.

| Página | Ruta Next | Prototipo |
|---|---|---|
| Home | / | Abismo Home.dc.html |
| About us | /about | About.dc.html |
| The crew | /crew | The Crew.dc.html |
| Integrante | /crew/[slug] | Wild Wonders.dc.html (Georgia) |
| Expeditions | /expeditions | Expeditions.dc.html |
| Workshops (Artsy Animals) | /workshops | Workshops.dc.html |
| Art | /art | Art.dc.html |
| Meaningful Messages | /meaningful-messages | Meaningful Messages.dc.html |
| Post (plantilla de bloques) | /posts/[slug] | Post.dc.html |
| Contact | /contact | Contact.dc.html |

## Reglas que no se negocian

1. **Todo movimiento se ata al scroll**, nunca a temporizadores. Las únicas animaciones por tiempo son las de entrada del banner (al cargar la página).
2. **Sin librerías de animación** (no GSAP, no Framer Motion, no ScrollTrigger). Un solo `requestAnimationFrame` por página, ver 02-animations.md.
3. **Nada de contenido hardcodeado** salvo lo que 10..19 marque como *estático*.
4. **Las imágenes nunca se deforman**: siempre `object-fit: cover` con punto focal editable, o `contain` cuando el asset es un dibujo/tapa.
5. **Respetar `prefers-reduced-motion`**: se salta el movimiento y se renderiza el estado final.
