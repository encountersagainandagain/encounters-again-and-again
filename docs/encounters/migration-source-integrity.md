# Integridad del snapshot editorial — 2026-10-02

**RESUELTO.** La copia completa provista por Juani pasa todas las verificaciones. El proyecto está listo para iniciar el PASO 2; la importación sigue pendiente para PASO 3.

## Fuente canónica

- Ruta definitiva desde la raíz del repositorio: `docs/encounters/migration-source/encounters-content-snapshot.zip`.
- Origen conservado: `/Users/juanimolfino/Downloads/encounters-content-snapshot.zip`.
- Tamaño: 12.902.905 bytes.
- SHA-256 esperado y obtenido: `2c5fee58cdadbf98a444380c9fcf98c857c4c16335004e3f25e3fafc2ccabbc6`.
- Informe estructurado: [validation.json](migration-source/validation.json).

## Validación real

- ZIP íntegro: lectura y CRC correctos de los 56 archivos, sin nombres duplicados ni rutas inseguras.
- `encounters-content-snapshot/seed-content.json` presente y JSON válido: 11 páginas, 1 story, 161 bloques editoriales y 50 entradas de imágenes.
- `content-blocks.csv`: presente, 161 filas de datos.
- `image-inventory.csv`: presente, 50 filas de datos.
- `raw/wordpress-pages.json` y `raw/wordpress-posts.json`: presentes y JSON válido, con 11 páginas y 1 publicación respectivamente.
- `assets/images/`: 50 archivos; sus rutas y tamaños coinciden con seed e inventario CSV.
- La carpeta extraída `/Users/juanimolfino/Downloads/encounters-content-snapshot` coincide byte a byte con las 56 entradas del ZIP.

Se conservó el ZIP sin alterarlo. No se generó seed SQL, importó contenido, subió imágenes a Storage ni ejecutó migraciones. Este snapshot editorial no sustituye un backup restaurable de WordPress.

## Antecedente — copia anterior descartada como fuente canónica

Lo siguiente registra el diagnóstico previo, ya resuelto por la nueva copia descrita como fuente canónica:

Bloqueo histórico del seed del PASO 3; resuelto con la nueva copia.

Archivo original conservado, sin modificar: `Downloads/encounters-astra-starter-kit/migracion/encounters-content-snapshot.zip`.

- Tamaño real: 1.994.752 bytes.
- SHA-256: `35a4ba1ac4468fea3c49971c62f560d37debd1641cc35e42d92dd67ea15d598d`.
- Python zipfile rechaza el archivo con `BadZipFile: File is not a zip file`.
- La cabecera inicial es ZIP/deflate, pero falta el directorio central y su registro final.
- La copia anidada dentro de `encounters-astra-starter-kit.zip` coincide byte a byte: no ofrece una copia sana alternativa.
- Inspección de cabeceras locales: 12 entradas completas con CRC/tamaño válidos (README y 11 imágenes). La siguiente, `assets/images/DSC03691-scaled-2d4bc803f7.jpg`, está cortada; faltan 29.575 bytes para terminar esa entrada, además de lo que siguiera en el archivo original.
- `seed-content.json` no aparece en las entradas completas disponibles. No se recuperó ni inventó un seed parcial.

Las cantidades históricas de 11 páginas, 1 post, 161 bloques y 50 imágenes proceden de la documentación recibida; **no pudieron revalidarse contra este ZIP truncado**. El JSON de redirecciones permanece íntegro con su inventario y referencias, sin descartar las URLs.

Acción requerida en ese momento (ya cumplida): volver a obtener el ZIP editorial completo del origen, verificar que abre, contiene seed-content.json y pasa CRC de todas sus entradas, y registrar su hash. No se necesita un backup privado de WordPress para reemplazar este archivo editorial.
