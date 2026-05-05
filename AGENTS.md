# Hinweise für KI-Assistenten (Cursor / Copilot)

Dieses Repository ist eine **React-19-PWA** mit **Gemini** und **PubMed**; Daten liegen **nur lokal** (IndexedDB/Dexie).

## Runtime-Literaturschwarm (App, nicht IDE-Agent)

Die Orchestrierung läuft in **`src/services/geminiService.ts`** (AsyncGenerator `generateResearchReportStream`): Phasen wie Query-Generierung, PubMed-/optional arXiv-Fetch, Ranking, Streaming-Synthese. Grobe Zuordnung zu UI/Trace (`App.tsx`, `getAgentForPhase`): PubMed-/Suchphasen → **PubMedFetcher** bzw. Query-Erzeugung → **QueryGenerator**, Ranking → **Ranker**, Synthese/Streaming → **Synthesizer**. Das sind **konzeptionelle Rollen** (Prompts/Phasen), keine separaten SDK-Prozesse.

## Pflichtlektüre

1. **`.github/copilot-instructions.md`** — aktueller Stack, Ordnerstruktur, State-Management, Testing, Safety-Regeln.
2. **`.cursor/index.mdc`** — Always-On-Projektmanifest (Stack, Architektur, Konventionen).
3. **`.cursor/rules/*.mdc`** — kontextbezogene Regeln (Security, APIs, UI, Tests, Meta — siehe `000-cursor-rules.mdc`).

## Checks vor Änderungen am Kernfluss

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run test:coverage` (Schwellen siehe `vitest.config.ts`)
- Bei End-to-End: `pnpm exec playwright install chromium` (einmalig), dann `pnpm run test:e2e`

## CI

Workflow: `.github/workflows/deploy.yml` — bei **Push** und **Pull Request** auf `main`: `pnpm install --frozen-lockfile`, `pnpm audit --audit-level=high`, Typecheck, ESLint, Vitest mit Coverage (Schwellen siehe `vitest.config.ts`), Production-Build. **GitHub Pages**-Upload und Deploy nur auf `refs/heads/main`, nicht bei PRs.

## Dokumentation für Menschen

- `README.md` — Überblick, Setup (EN/DE)
- `CONTRIBUTING.md` — Beiträge, Branching, Qualitätssicherung
- `CHANGELOG.md`, `AUDIT.md`
