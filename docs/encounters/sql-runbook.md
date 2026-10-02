# Runbook propuesto para PASO 3

No hay migraciones nuevas generadas ni aplicadas en PASO 1. SQL histórico de Katie es referencia, no secuencia ejecutable. No aplicar el SQL parcial del handoff como reemplazo.

1. Confirmar project ref y URL de Supabase nuevo con Juani, base vacía y entorno. Rechazar identidad Katie; no usar dumps ni usuarios de origen.
2. Elegir Supabase CLI con historial versionado (preferido) o SQL Editor ordenado, documentando archivos/hash/fecha/entorno aplicados. Credencial SQL solo por canal local seguro si el método la requiere.
3. Construir baseline core: set_updated_at, admin_users/is_admin, posts/post_blocks compatibles, site_settings, newsletter; RLS activada y políticas seguras desde creación, sin email predefinido.
4. Añadir entidades/relaciones de Encounters según schema-map, validación y restricciones, evitando duplicar motor editorial.
5. Storage propio y catálogo de medios; permisos admin; RPC de guardado transaccional y grants mínimos. Las tablas no disponibles deben permanecer cerradas hasta completar políticas.
6. Seed settings neutros y contenido editorial idempotente por IDs de origen/asset_id. Nunca usuarios/suscriptores/pedidos de Katie.
7. Probar público, admin y autenticado no admin; borradores, relaciones y bloques; guardado fallido conserva versión previa; newsletter no expone lista/tokens; obra con dos responsables aparece en ambos perfiles.

Antes de cada aplicación: revisar SQL y destino; respaldo apropiado al entorno. No db reset remoto. Recuperación por migración correctiva o restauración del entorno nuevo autorizado; conservar registro y nunca ejecutar dos veces por cambiar de herramienta.

Precondición del seed: reemplazar el snapshot truncado identificado en migration-source-integrity.md por una copia editorial completa y verificada. No usar las entradas parciales como fuente canónica.
