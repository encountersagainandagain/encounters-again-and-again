# Encounters Again and Again

Base independiente de Next.js para arte, océano, educación y conservación. Dominio previsto: https://encountersagainandagain.com.

## Desarrollo

```sh
npm ci
npm run dev
```

Arranca sin servicios con páginas provisionales, admin sin sesión y respuestas explícitas de configuración. Las páginas visuales completas, el modelo nuevo y sus animaciones corresponden a los PASOS 3/4.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run preview -- --hostname 127.0.0.1 --port 3210
# En otra terminal, sin credenciales reales:
TEST_BASE_URL=http://127.0.0.1:3210 node scripts/check-isolation.mjs
```

Build descarga las fuentes EB Garamond y Archivo de Google mediante next/font. Pruebas auxiliares requieren Node >=22.6 con soporte de TypeScript stripping; verificación realizada con Node 23.6.1. Dependencias conservadas del lockfile original, sin actualización de stack.

Copiar .env.example a .env.local solo para configurar **servicios nuevos de Encounters** en PASO 2. No reutilizar credenciales ni datos de Katie. SQL histórico en legacy/sql NO es una secuencia de migraciones. No desplegar ni cambiar DNS en esta etapa.

[Documentación y seguimiento](docs/encounters/README.md) · [Servicios](docs/encounters/services-setup.md) · [Módulos](docs/encounters/modules.md) · [Procedencia](docs/encounters/source-provenance.md).
