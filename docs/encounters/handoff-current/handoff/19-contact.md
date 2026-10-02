# 19 · Contact — /contact

Prototipo: **Contact.dc.html**

## Qué cuenta

Cómo escribirles. El formulario emerge desde abajo del banner, como si subiera del agua.

## Estructura

1. **Banner (100vh)** — "GET IN TOUCH" + una línea de expectativa ("we write back ourselves — usually within a couple of days, unless we are out at sea").
2. **Panel del formulario** — monta sobre el banner (`margin-top: -24vh`):
   - **4 tarjetas de motivo:** joining an expedition / workshops & talks / the book & the art / making something together. Selección única.
   - Campos: name, email, where from, when (línea simple con filete inferior) + message (textarea con borde).
   - Nota italic + botón "Send message".
   - **Estado enviado:** reemplaza el formulario por "Message sent" + agradecimiento + garabato; el texto del agradecimiento **depende del motivo elegido**.
3. **Otros caminos** — email directo, fundraiser, el libro.
4. **Pie**.

## Datos

- Motivos: `contact_topics` (`title`, `hint`, `reply_text`, `sort`). 2–6 tarjetas; la grilla es de 2 columnas y se apila en móvil.
- Envíos: `contact_submissions` (name, email, place, timing, message, topic_id, created_at) + notificación por email al equipo.
- Links del bloque "otros caminos": `site_settings`.

## Validación

Mínima y en la misma nota italic del formulario (no alerts, no toasts): si falta nombre o el email no tiene "@", la nota cambia a "We need a name and an email to write back." en color Coral.

## Animaciones

02-animations.md § 12: la imagen se hunde con desenfoque de brillo, el título sale, el panel queda montado encima con sombra hacia arriba. El garabato del estado enviado se traza con el scroll.
