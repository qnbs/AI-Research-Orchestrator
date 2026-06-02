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

## Cursor Cloud specific instructions

Einzelne **React-19-PWA** (kein Monorepo, kein Backend). Paketmanager: **pnpm 11** (`packageManager` in `package.json`, Lockfile: `pnpm-lock.yaml`). Node **≥22** (`.nvmrc`: `22`).

### pnpm in Cloud-VMs

Standard: `corepack enable` + `pnpm install --frozen-lockfile` (wie CI/Devcontainer). Scheitert **Corepack/npm** beim TLS-Handshake zu `registry.npmjs.org`, funktioniert oft trotzdem **`pnpm install`** mit einem **standalone-pnpm** unter `~/.local/bin` (Release `pnpm-linux-x64.tar.gz` von GitHub, z. B. per `gh api` + `Accept: application/octet-stream`, falls `release-assets.githubusercontent.com` blockiert ist). Danach: `export PATH="$HOME/.local/bin:$PATH"`.

### Services

| Service      | Port | Befehl                                     |
| ------------ | ---- | ------------------------------------------ |
| Vite Dev     | 3000 | `pnpm run dev` (`host: 0.0.0.0`)           |
| Vite Preview | 4173 | `pnpm run preview` (nach `pnpm run build`) |

Lang laufende Prozesse in **tmux** starten (z. B. Session `vite-dev-server`). Playwright E2E startet den Dev-Server bei Bedarf selbst (`playwright.config.ts`).

### Checks (Reihenfolge wie CI)

Siehe `package.json` / `.github/workflows/deploy.yml`: `pnpm run typecheck`, `pnpm run lint`, `pnpm run test:coverage`, `pnpm run build`. E2E (optional): einmalig `pnpm exec playwright install chromium`, dann `pnpm run test:e2e` (mocks für Gemini/PubMed).

**Hinweis:** `test:coverage` kann knapp an der globalen Schwellwertgrenze scheitern (z. B. Lines ~64,4 % vs. 65 % in `vitest.config.ts`); `pnpm run test:run` läuft ohne Coverage-Gate.

### Secrets / KI-Funktionen

Gemini-Key in der App unter **Settings → API Key** (lokal verschlüsselt). Optional: `GEMINI_API_KEY` in der Umgebung (Devcontainer/Codespaces). Ohne Key: UI und Navigation testbar; echte Literatursynthese benötigt einen Key.
