# Verificación del PASO 1 — 2026-10-02

Entorno: Node 23.6.1, Next 16.2.6, aplicación local en 127.0.0.1:3210, sin .env.local ni credenciales de servicios.

| Comprobación | Resultado real |
|---|---|
| npm ci --ignore-scripts --no-audit --no-fund | PASS, 304 paquetes, lockfile conservado |
| npm run lint | PASS |
| npm run typecheck | PASS |
| npm test | PASS: rutas, flags, rechazo antes de fetch, 61 hashes y numeración 1–22 |
| npm run build | PASS, incluidas 23 páginas estáticas; sin credenciales. Descarga de fuentes requirió red autorizada al repetir |
| TEST_BASE_URL=http://127.0.0.1:3210 node scripts/check-isolation.mjs | PASS: 26 rutas/API desactivadas 404; diez páginas/manifest 200 sin marca Katie; detalles 404; validación newsletter y configuración 400/404/503; revalidación no autorizada 401; sitemap vacío y noindex |
| Accesos/remote | Katie lectura; destino privado pull/push y vacío antes de importación. Origin único Encounters. Push de 8560222 a main confirmado |
| Lockfile | Comparación JSON contra git show de fuente: mismas versiones, integridades y dependencias; solo nombre raíz diferente |
| Identidad activa | Sin Katie/whatkatieseas/wks/tracking heredado en src/app/public/config activos; legado documentado fuera de compilación |
| Archivos a versionar | Sin .env reales, .vercel, dependencias ni caches; exploración de patrones de secretos sin coincidencias. No equivale a auditoría criptográfica |
| Fuente | Katie HEAD 102fc91 y git status limpio después de trabajar |
| ZIP de diseño | 61 archivos idénticos y dependencias locales de 13 HTML presentes |
| Snapshot editorial | FALLA: ZIP truncado, bloquea seed posterior; ver migration-source-integrity.md |

## Navegador

La herramienta del navegador integrado no estaba expuesta; se usó agent-browser con sesiones exclusivas y URL local.

- Home carga con navegación, título y suscripción; marca propia, sin página vacía ni errores de consola reportados.
- Viewport 360×800: scrollWidth 352, sin overflow horizontal ni overlay de error.
- Login final: Encounters administration, campos Email/Password, botón Sign in deshabilitado al faltar Supabase; estado de configuración visible. No se intentó login real.
- Durante una reconstrucción hubo errores de carga de chunks en una sesión anterior; con el servidor del build final y una sesión nueva no se reprodujeron. La captura final de login corresponde al estado correcto.
- Newsletter: formulario hidratado y válido; submit nativo y clic en Subscribe con viewport 1280×1200 mostraron “Newsletter subscriptions are not available yet.”; POST 503 confirmado, sin servicios ni envíos. El primer clic automatizado no disparó submit cuando el botón quedó fuera del viewport; la repetición con el botón visible pasó. La prueba HTTP independiente también confirma el 503 esperado.

Capturas de bootstrap, NO aprobación del diseño final: [desktop](verification/encounters-step1-desktop.png), [móvil](verification/encounters-step1-mobile.png), [login](verification/encounters-step1-login.png).

No comprobado por falta de servicios/esquema: login real, RLS, CRUD, guardado transaccional, Storage, alta/baja persistida y entrega de correo. No migraciones, envíos, deploys ni cambios DNS/WordPress. Las rutas dinámicas están preparadas pero no publican contenido hasta PASO 3/4.
