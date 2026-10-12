# Prompt para continuar en Claude Code

Continuá el proyecto Encounters Again and Again en el repositorio abierto. No empieces desde cero, no resetees el árbol y no repitas la importación. Leé primero:

- `docs/encounters/CLAUDE_CODE_HANDOFF_2026-10-12.md`
- `docs/encounters/phase4-review.md`
- `docs/encounters/phase4-art-crew.md`
- `docs/encounters/bootstrap-status.md`
- `docs/encounters/encounters-checklist-seguimiento.md`

Verificá `git status --short`, `git log --oneline -8` y `git remote -v`. El punto de partida documentado es `main` en `ad883d8`; el único remoto debe ser el repositorio privado de Encounters. Si encontrás cambios posteriores, preservalos y entendelos antes de editar.

El estado actual es PASO 4.0–4.2: Art y Crew están implementados y preparados para revisión, pero **Juani no aprobó todavía el diseño**. No avances con Home ni con ninguna otra página. Tu tarea actual es mantener disponibles las pantallas, verificar el estado y aplicar solamente el feedback visual que Juani dé sobre Art/Crew. No declares aprobación por inferencia.

La revisión visual habitual está en `http://127.0.0.1:3218`; si no responde, iniciá `npm run dev -- --hostname 127.0.0.1 --port 3218`. Revisá `/art`, `/review/art`, `/review/art/test-gallery`, `/review/art/test-gallery/test-work`, `/crew` y `/crew/wild-wonders`. Las rutas `/review` son fixtures locales en memoria, solo desarrollo/localhost, no persistentes y fuera del sitemap; deben conservar ese aislamiento.

Para pruebas de escritura usá exclusivamente el entorno local aislado:

```bash
colima start
npm run cms:local:prepare
npm run cms:local:dev
npm run cms:local:status
npm run cms:local:verify
```

La app de pruebas corre en `http://127.0.0.1:3219` y Supabase local en `127.0.0.1:54321`. No modifiques `.env.local`, no apuntes ensayos a la base remota y no muestres ni versiones `.encounters-work/local-cms.json`. El flujo crear, guardar, previsualizar, publicar, relacionar dos responsables, duplicar y verificar privacidad ya pasó con `remote_writes: 0` y `emails_sent: 0`; no lo repitas salvo que un cambio lo justifique. Si Next reescribe `next-env.d.ts` o `tsconfig.json` por `.next-cms-local`, no incluyas esos cambios generados.

Restricciones: sin deploy, DNS, WordPress, Hostinger, Vercel, Katie, correos, newsletter, servicios pagos ni nuevas páginas. No inventes contenido de Art. Publicá commits únicamente en Encounters y excluí secretos y temporales.

Cuando recibas feedback visual, implementalo solo dentro de Art/Crew, comprobá lo afectado en desktop y móvil y, si corresponde, teclado y reduced motion. Actualizá `phase4-review.md` y `encounters-checklist-seguimiento.md` con resultados reales. Hacé commit y push claros al repositorio de Encounters y volvé a detenerte para revisión; la siguiente página requiere autorización explícita.

