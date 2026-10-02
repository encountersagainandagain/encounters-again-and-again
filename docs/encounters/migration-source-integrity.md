# Integridad del snapshot editorial — 2026-10-02

Bloqueo del seed del PASO 3, no del bootstrap técnico.

Archivo original conservado, sin modificar: `Downloads/encounters-astra-starter-kit/migracion/encounters-content-snapshot.zip`.

- Tamaño real: 1.994.752 bytes.
- SHA-256: `35a4ba1ac4468fea3c49971c62f560d37debd1641cc35e42d92dd67ea15d598d`.
- Python zipfile rechaza el archivo con `BadZipFile: File is not a zip file`.
- La cabecera inicial es ZIP/deflate, pero falta el directorio central y su registro final.
- La copia anidada dentro de `encounters-astra-starter-kit.zip` coincide byte a byte: no ofrece una copia sana alternativa.
- Inspección de cabeceras locales: 12 entradas completas con CRC/tamaño válidos (README y 11 imágenes). La siguiente, `assets/images/DSC03691-scaled-2d4bc803f7.jpg`, está cortada; faltan 29.575 bytes para terminar esa entrada, además de lo que siguiera en el archivo original.
- `seed-content.json` no aparece en las entradas completas disponibles. No se recuperó ni inventó un seed parcial.

Las cantidades históricas de 11 páginas, 1 post, 161 bloques y 50 imágenes proceden de la documentación recibida; **no pudieron revalidarse contra este ZIP truncado**. El JSON de redirecciones permanece íntegro con su inventario y referencias, sin descartar las URLs.

Acción necesaria antes de importar contenido: volver a obtener el ZIP editorial completo del origen, verificar que abre, contiene seed-content.json y pasa CRC de todas sus entradas, y registrar su hash. No se necesita un backup privado de WordPress para reemplazar este archivo editorial.
