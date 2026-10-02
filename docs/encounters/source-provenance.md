# Procedencia de la base

Referencia elegida: `https://github.com/juanimolfino/katie-blog`, `main`, commit `102fc91acd4dd312dc15436e8e3de22643b84ce7`. Comprobado por `git ls-remote` el 01/10/2026; coincide con HEAD de `/Users/juanimolfino/Desktop/developer/what-katie-seas`, cuyo estado Git estaba limpio. Inspección de Katie exclusivamente de lectura.

Destino: `https://github.com/encountersagainandagain/encounters-again-and-again.git`, privado. Git local autenticado como `juanimolfino`; tras agregar colaboración, Git ls-remote y API confirmaron acceso de lectura/escritura (`pull=true`, `push=true`), tamaño 0 y ausencia de refs. No había trabajo remoto que sobrescribir. El 404 inicial quedó resuelto antes de importar.

Carpeta independiente preparada: `/Users/juanimolfino/Desktop/developer/encounters-again-and-again`. Los otros proyectos `Desktop/PROGRAMACION/encountersagainandagain` y `Desktop/PROGRAMACION/encounters-again-and-again/encounters-again-and-again-app` apuntan a repos de `juanimolfino`, no al destino; se preservan. El primero tiene una modificación en `src/app/lib/constants.js`.

Stack de la referencia: Next ^16.2.6, React ^19.2.0, TypeScript ~5.9.3, Tailwind ^3.4.19, Supabase JS ^2.105.1, Zod ^4.3.5. Conservar package-lock y dependencias; no incorporar ORM ni CMS externo.

Importación realizada: git archive del SHA, historial nuevo en destino vacío. Excluir .git, variables reales, .vercel, caches, node_modules, .next, reportes operativos con referencias a recursos reales y fotografías/contenido de Katie. Preservar código técnico de módulos apagados y atribuciones. No hay LICENSE propio versionado en la referencia; no inventar una licencia ni eliminar avisos de terceros.

Actualizaciones futuras: selección manual de cambios técnicos de Katie, sin sincronización automática, remotes de push ni mezcla de datos. Registrar cada SHA reutilizado.

El único remoto del repositorio local nuevo es origin de Encounters (fetch y push). Nunca se añadió Katie como remoto. Importación exacta/exclusiones: import-manifest.json; clasificación del código conservado: archived-code.json. Se excluyeron fixtures personales, assets de Katie, variables reales y reportes de recursos. Los SQL de referencia conservan estructura, pero se quitaron seeds de administrador y settings de Katie. Scripts operativos archivados fallan antes de leer configuración o ejecutar efectos.

package-lock conserva el árbol de dependencias y versiones; cambia únicamente el nombre raíz a encounters-again-and-again. No existe LICENSE propia en el SHA fuente; se conserva procedencia, no se atribuye licencia inventada al código.
