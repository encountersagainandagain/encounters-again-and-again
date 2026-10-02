# 17 · Meaningful Messages — /meaningful-messages

Prototipo: **Meaningful Messages.dc.html**

## Qué cuenta

Los mensajes que el proyecto quiere dejar, uno por vez, con la ilustración de Georgia al lado. Nada compite: un mensaje ocupa la pantalla entera hasta que el siguiente lo reemplaza.

## Estructura

1. **Banner** — título + la línea de crédito "Illustrated by Georgia Webb, inspired by Julian Lange".
2. **Escenario pineado (300vh)** — la ilustración ocupa **el alto completo del viewport**, el texto se centra al lado. Los mensajes alternan lado (izquierda/derecha) y se cruzan: el que sale se va hacia arriba mientras el que entra sube desde abajo.
3. **Cierre** — frase + garabato + footer.

## Datos

Tabla `messages` (ver 03-data-model.md): `message`, `body`, `illustration_id`, `credit`, `sort`. Mínimo 2.

**Alto del pin:** `120vh + 60vh × cantidad de mensajes` (3 → 300vh). Las ventanas de `data-stage` se reparten en partes iguales sobre ese recorrido, con estas reglas:

- El **primer** mensaje arranca en negativo (entra durante la aproximación, antes de que el pin se tome).
- La imagen entra ~0.03 antes que su texto, y sale ~0.03 después.
- El **último** sale justo al final del pin (outTo = 1.0).

## Animaciones

02-animations.md § 8, con la tabla de ventanas exacta del prototipo de 3 mensajes como referencia de ritmo. Dos cosas que se probaron y quedaron así:

1. El progreso admite valores **negativos** (hasta -0.3): sin eso hay una pantalla vacía después del crédito.
2. El recorrido total es 300vh, no 470vh: con más recorrido cada mensaje se quedaba demasiado en pantalla.
