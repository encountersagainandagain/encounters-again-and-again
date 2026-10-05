# Runbook de PASO 3 — actualizado 2026-10-05

Único destino permitido: `lzwmwofxoegkxykglneq`. Los scripts rechazan otra URL, project ref o usuario del pooler. SQL histórico de Katie y handoff son referencias; nunca ejecutarlos contra servicios.

`.env.local` ignorado por Git: URL/clave pública, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAILS`, `SUPABASE_ACCESS_TOKEN` y `SUPABASE_DB_PASSWORD`. No hace falta DATABASE_URL: link obtiene el pooler y el script añade la contraseña solo en memoria. El token personal autentica CLI/Management API; su vencimiento requiere renovarlo para administración, no para servir la web. No se publica en Vercel ni en el navegador.

```sh
node scripts/encounters-cli.mjs link
node scripts/encounters-cli.mjs plan
node scripts/encounters-cli.mjs apply
node scripts/encounters-cli.mjs history
node scripts/encounters-admins.mjs --apply
node scripts/verify-encounters-db.mjs
```

CLI fijada por package-lock. Migraciones incrementales; no db reset remoto. Corregir migraciones aplicadas con una nueva. El preflight inicial y el verificador crean fixtures transaccionales y los revierten.

Para incorporar al tercer fundador: crear su usuario confirmado en Auth sin habilitar registro público, agregar el email a ADMIN_EMAILS local y ejecutar encounters-admins primero sin --apply y luego con --apply. Valida todas las coincidencias antes de agregar UUIDs. Es aditivo: quitar un email de la variable no revoca permisos ya otorgados; la revocación se hace explícitamente en admin_users. Crew no requiere Auth. No hay roles parciales.

Después del build, preview en puerto 3211 y `node scripts/verify-encounters-api.mjs`. Usa sesión real de fundador y usuario temporal no admin; elimina fixtures, no envía emails ni habilita signup. generateLink genera internamente el enlace sin entregarlo por correo.

Antes de importar: checkpoint Git FASE 3A y SHA en verification/phase3a-checkpoint.json. `node scripts/encounters-import.mjs` genera dry-run; después `node scripts/encounters-import.mjs --apply` dos veces. Requiere evidencias PASS y checkpoint ancestral. IDs/hashes estables, RPC/upsert y reutilización de documentos existentes protegen trabajo editorial; un snapshot cambiado exige revisión. Fallos parciales reanudables. sections/curated_groups/raw no crean bloques adicionales.

Storage privado media, 10 MiB, JPEG/PNG/WebP/GIF/SVG; prefijos crew, expeditions, workshops, art, posts, settings. Importador rechaza SVG activo/externo. /api/media/[id] usa RLS del visitante y CSP sandbox, sin caché. Catálogo deduplicado SHA-256.

Newsletter: endpoints server con validación/límites, RPC reservada a service_role; no enumeración pública de emails/tokens. Envíos bloqueados salvo ENCOUNTERS_EMAIL_ENABLED=true; mantener false hasta autorización posterior y dominio verificado.

Fuentes: [CLI migrations](https://supabase.com/docs/guides/deployment/database-migrations), [Storage privado](https://supabase.com/docs/guides/storage/buckets/fundamentals), [generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink).

## Plan histórico del PASO 1 (estado de aquella fecha)

No hay migraciones nuevas generadas ni aplicadas en PASO 1. SQL histórico de Katie es referencia, no secuencia ejecutable. No aplicar el SQL parcial del handoff como reemplazo.

1. Confirmar project ref y URL de Supabase nuevo con Juani, base vacía y entorno. Rechazar identidad Katie; no usar dumps ni usuarios de origen.
2. Elegir Supabase CLI con historial versionado (preferido) o SQL Editor ordenado, documentando archivos/hash/fecha/entorno aplicados. Credencial SQL solo por canal local seguro si el método la requiere.
3. Construir baseline core: set_updated_at, admin_users/is_admin, posts/post_blocks compatibles, site_settings, newsletter; RLS activada y políticas seguras desde creación, sin email predefinido.
4. Añadir entidades/relaciones de Encounters según schema-map, validación y restricciones, evitando duplicar motor editorial.
5. Storage propio y catálogo de medios; permisos admin; RPC de guardado transaccional y grants mínimos. Las tablas no disponibles deben permanecer cerradas hasta completar políticas.
6. Seed settings neutros y contenido editorial idempotente por IDs de origen/asset_id. Nunca usuarios/suscriptores/pedidos de Katie.
7. Probar público, admin y autenticado no admin; borradores, relaciones y bloques; guardado fallido conserva versión previa; newsletter no expone lista/tokens; obra con dos responsables aparece en ambos perfiles.

Antes de cada aplicación: revisar SQL y destino; respaldo apropiado al entorno. No db reset remoto. Recuperación por migración correctiva o restauración del entorno nuevo autorizado; conservar registro y nunca ejecutar dos veces por cambiar de herramienta.

Precondición de integridad del archivo cumplida el 2026-10-02: copia completa verificada en docs/encounters/migration-source/encounters-content-snapshot.zip; ver migration-source-integrity.md. Usar esa copia canónica en el PASO 3. Todavía no se generó seed SQL ni se importó contenido o ejecutaron migraciones.
