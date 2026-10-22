# Entornos de Encounters

| Entorno | Dirección | Datos | Para qué |
|---|---|---|---|
| Revisión online (Vercel Preview) | https://encounters-review-juanimolfinos-projects.vercel.app | Supabase de pruebas (staging). **Pendiente:** el proyecto todavía no existe. | Que Juani revise la web y el admin desde cualquier dispositivo. |
| Producción local | http://127.0.0.1:3221 | Supabase local (Docker) | Revisión en la Mac, con medición de rendimiento. |
| Desarrollo local | http://127.0.0.1:3219 | Supabase local | Trabajo diario. |
| Datos reales, solo lectura | http://127.0.0.1:3218 | Supabase real `lzwmwofxoegkxykglneq` | Comparar Crew y Wild Wonders con lo importado; nunca se escribe. |
| Prototipos | http://127.0.0.1:3220 | `docs/encounters/handoff-current` | Referencia visual. |

El lanzamiento (producción con el dominio del cliente) **no está configurado**: no hay dominio asociado ni despliegue de producción.

## Revisión online

### Vercel
- **Proyecto:** `encounters-review`, en la cuenta `juanimolfinos-projects` (plan Hobby).
  - Es independiente: no es ninguno de los dos proyectos de 2024 (`encounters-again-and-again` y `encountersagainandagain`), que están vinculados a repositorios personales anteriores, y uno de ellos al dominio `.org`.
  - No tiene Git conectado: un push a `main` nunca genera un despliegue.
- **Despliegues:** siempre Preview, desde la rama `review` de `encountersagainandagain/encounters-again-and-again`, con `npm run review:deploy`. El script:
  - exige rama `review`, árbol limpio y publicado, y la carpeta vinculada a `encounters-review`;
  - despliega sin `--prod`;
  - apunta el alias estable al nuevo despliegue;
  - comprueba que el alias pida login. Si no lo pide, lo quita y falla.
- **Acceso privado:** Vercel Authentication. Se abre la URL, se inicia sesión en Vercel con la cuenta dueña del proyecto y se ve el sitio, desde cualquier dispositivo.
  - Quien no tiene sesión es redirigido al login de Vercel.
  - La contraseña por despliegue es un extra pago y no se usa.
  - Para mostrarlo a alguien sin cuenta, el botón **Share** del despliegue en el panel de Vercel genera un enlace temporal. Decisión tuya.
  - **Cuidado:** los alias `*.vercel.app` libres y el dominio por defecto del proyecto **no** quedan protegidos. El primero creado (`encounters-review.vercel.app`) respondía sin login y se eliminó a los pocos minutos, cuando el sitio todavía no tenía base de datos. Solo se usa el alias con el sufijo del equipo (`…-juanimolfinos-projects.vercel.app`).
- **Qué se sube:** `.vercelignore` deja fuera `docs/`, `legacy/`, `.encounters-work/`, los builds locales y todo `.env*` (salvo `.env.example`). Comprobado en el primer despliegue: 0 archivos de esas carpetas.
  - El build es el normal (`next build`); no corre migraciones ni seeds.
  - Las imágenes salen de Supabase Storage a través de `/api/media/:id`, y las del diseño, de `public/`. Nada depende del disco de la Mac.
- **`/review`:** la revisión visual local, con sus fixtures y los assets del prototipo, responde 404 en cualquier despliegue de Vercel (`proxy.ts`), además de su cierre previo fuera de localhost.
- **noindex:** se conserva en todas las respuestas (`X-Robots-Tag: noindex, nofollow` y la meta de robots). No reemplaza la protección de acceso.

### Variables del entorno Preview de `encounters-review`

| Variable | Estado | Notas |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | configurada | La URL de revisión, para enlaces y callbacks. |
| `ENCOUNTERS_EMAIL_ENABLED` | `false` | Además no hay `RESEND_API_KEY`: ningún envío real es posible. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pendientes | Del proyecto de pruebas; las carga `npm run staging -- env --apply`. |
| `SUPABASE_SERVICE_ROLE_KEY` | pendiente | Del proyecto de pruebas; se guarda como sensible. |

No se configuran `ENCOUNTERS_ALLOW_LOCAL_SUPABASE`, `ENCOUNTERS_LOCAL_PRODUCTION_CHECK`, `ENCOUNTERS_LOCAL_REVIEW`, `ADMIN_EMAILS` ni ninguna clave del proyecto real. `.env.local` no se sube ni se modifica.

### Validación del destino Supabase
`src/lib/encountersSupabaseTarget.ts` y `src/config/staging.json`:
- en un despliegue Preview de Vercel (`VERCEL_ENV=preview`), solo se acepta el proyecto de pruebas cuyo ref figura en `staging.json`. El proyecto real y el local se rechazan;
- en cualquier otro entorno, el proyecto de pruebas se rechaza;
- mientras el ref esté vacío, el Preview no acepta ninguna base;
- el cliente con clave de servicio también falla cerrado ante un destino no permitido;
- `check-isolation` (en `npm test`) cubre estos casos.

### Supabase de pruebas (staging)

**Estado:** no existe. El token de Encounters solo ve el proyecto real. El plan gratuito permite un segundo proyecto activo sin costo.

**Crearlo (Juani, una vez):**
1. Entrar en https://supabase.com/dashboard con la cuenta de servicios de Encounters y elegir la organización donde está el proyecto actual (plan Free).
2. **New project**:
   - nombre `encounters-staging`;
   - región **East US (North Virginia)**, la más cercana a las funciones de Vercel;
   - contraseña de base de datos generada (guardala);
   - confirmar que dice **$0/month**. Si pide un plan pago, detenerse.
3. Cuando esté listo, crear el archivo `.encounters-work/staging.env` (ignorado por Git, no se sube) con:
   ```
   STAGING_SUPABASE_URL=https://<ref>.supabase.co
   STAGING_SUPABASE_ANON_KEY=<Project Settings → API Keys: anon / publishable>
   STAGING_SUPABASE_SERVICE_ROLE_KEY=<Project Settings → API Keys: service_role / secret>
   STAGING_SUPABASE_DB_PASSWORD=<la contraseña del paso 2>
   ```
   Si el proyecto quedara en otra cuenta, agregar `STAGING_SUPABASE_ACCESS_TOKEN=<token personal de esa cuenta>`.
4. Pasar solo el **ref** (no es secreto). Se escribe en `src/config/staging.json`.

Los proyectos Free se pausan tras una semana sin uso; se reanudan desde el panel.

**Cargarlo (procedimiento de staging, nunca automático):** cada comando verifica el ref de `staging.json`, que no sea el real y que las claves pertenezcan a ese proyecto. Sin `--apply` solo muestra lo que haría; no imprime secretos.

```
npm run staging -- check              # proyecto, Auth, Storage, esquema
npm run staging -- migrate --apply    # migraciones versionadas en orden (supabase db push, con historial)
npm run staging -- auth --apply       # registro público desactivado; Site URL y redirects = URL de revisión
npm run staging -- admin --apply      # administrador de prueba review-admin@encounters.example
npm run staging -- seed --apply       # ejemplos + 6 fichas originales + Wild Wonders, con relaciones y medios
npm run staging -- env --apply        # variables Supabase del Preview en Vercel
npm run staging -- verify             # borradores, medios privados y registro, sin sesión
npm run review:deploy                 # nuevo despliegue para que tome las variables
```

- Los scripts de contenido (`demo-local.mjs`, `crew-local-restore.mjs`) eligen el destino de forma explícita (`scripts/cms-target.mjs`): local por defecto, con su comprobación de localhost intacta, o `--target=staging`.
- Cada destino tiene su propio estado (`.encounters-work/` y `.encounters-work/staging/`). Así, la carga es idempotente y nunca sobrescribe una edición hecha desde el admin: `npm run demo:staging:plan` muestra qué es ejemplo intacto y qué fue editado.
- **Qué no se copia:** sesiones, contraseñas locales, el usuario admin local ni suscriptores reales. Los tres suscriptores del set de ejemplos usan dominios reservados (`example.com/.org/.net`).
- **Datos de contacto:** los de los ejemplos (`hello@encounters.example`, enlace de donación de ejemplo) usan dominios reservados y se identifican con la nota del pie. No son definitivos: se reemplazan en Admin → Settings cuando el equipo confirme los reales.

### Publicar una actualización de la revisión
1. Llevar los cambios a la rama `review`: `git checkout review && git merge main`, o trabajar sobre ella.
2. `git push origin review`.
3. `npm run review:deploy`. Al terminar indica la URL, el despliegue y el commit.
4. Si cambió el esquema: `npm run staging -- migrate` (revisar) y luego `-- migrate --apply`, antes del despliegue.
