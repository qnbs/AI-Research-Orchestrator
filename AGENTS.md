# Hinweise für KI-Assistenten (Cursor / Copilot)

Dieses Repository ist eine **React-19-PWA** mit **Gemini** und **PubMed**; Daten liegen **nur lokal** (IndexedDB/Dexie).

## Pflichtlektüre

1. **`.github/copilot-instructions.md`** — aktueller Stack, Ordnerstruktur, State-Management, Testing, Safety-Regeln.
2. **`.cursor/rules/ai-research-orchestrator.mdc`** — kurze Projektregeln (immer aktiv in Cursor).

## Checks vor Änderungen am Kernfluss

- `npm run typecheck`
- `npm run test:run`
- Bei End-to-End: `npx playwright install chromium` (einmalig), dann `npm run test:e2e`

## CI

Workflow: `.github/workflows/deploy.yml` — bei **Push** und **Pull Request** auf `main`: Install, TypeScript, Vitest, Build. **GitHub Pages**-Upload und Deploy nur auf `refs/heads/main`, nicht bei PRs.

## Dokumentation für Menschen

- `README.md` — Überblick, Setup (EN/DE)
- `CONTRIBUTING.md` — Beiträge, Branching, Qualitätssicherung
- `CHANGELOG.md`, `AUDIT.md`
