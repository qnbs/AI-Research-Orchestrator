# Hinweise für KI-Assistenten (Cursor / Copilot)

Dieses Repository ist eine **React-19-PWA** mit **Gemini** und **PubMed**; Daten liegen **nur lokal** (IndexedDB/Dexie).

## Runtime-Literaturschwarm (App, nicht IDE-Agent)

Die Orchestrierung läuft in **`src/services/geminiService.ts`** (AsyncGenerator `generateResearchReportStream`): Phasen wie Query-Generierung, PubMed-/optional arXiv-Fetch, Ranking, Streaming-Synthese. Grobe Zuordnung zu UI/Trace (`App.tsx`, `getAgentForPhase`): PubMed-/Suchphasen → **PubMedFetcher** bzw. Query-Erzeugung → **QueryGenerator**, Ranking → **Ranker**, Synthese/Streaming → **Synthesizer**. Das sind **konzeptionelle Rollen** (Prompts/Phasen), keine separaten SDK-Prozesse.

**InferenceMode:** `live` | `heuristic` — abgeleitet aus API-Key, `navigator.onLine` und optionalem Force-Toggle (`src/services/inferenceMode.ts`, Hook `useInferenceMode`). Heuristik-Implementierungen unter **`src/services/heuristics/`**. Ohne Key / offline wirft der Live-Pfad kein `NO_API_KEY`; es wird lokal inferiert (ADR 0007).

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

- **Single service:** Client-only PWA (no backend/DB/Docker). Vite dev server: `pnpm run dev` (port `3000`, host `0.0.0.0`). Preview: `pnpm run preview` (port `4173` after build). Keep long-running processes in **tmux**.
- **Package manager:** pnpm 11 (`packageManager` in `package.json`) + Node ≥22 (`.nvmrc`). Prefer `corepack enable` then `pnpm install --frozen-lockfile`. If Corepack/npm TLS to `registry.npmjs.org` fails, a standalone `pnpm-linux-x64` under `~/.local/bin` (GitHub release asset) often still works.
- **CDN at runtime:** `index.html` import-map loads React & Co. from `aistudiocdn.com` — browser needs egress; Vite only bootstraps.
- **Gemini key is not an env secret:** Entered in Settings → AI Configuration, AES-GCM encrypted in IndexedDB. Format: 39 chars, prefix `AIza`. Optional NCBI key uses the same vault.
- **AI without a key:** Orchestrator, Quick Add, Rapid Research Assistant, author/journal tools, and chat fall back to the **heuristic inference layer** (`src/services/heuristics/`) — never leave the user in an empty error-only state. Live Gemini is used automatically when a key and network are available (unless Force Heuristic Mode is on). Never commit real keys.
- **Coverage gate:** `pnpm run test:coverage` enforces logic-layer thresholds in `vitest.config.ts` (**80%** lines/statements). Use `pnpm run test:run` for fast loops.
- **Resilience:** External calls via `AppError` / circuit breaker (`src/lib/errors.ts`, `circuitBreaker.ts`) — see `.cursor/rules/102-resilience-external-calls.mdc`.
- **English content:** New docs, comments, commits, and default strings must be English (`.cursor/rules/010-english-content.mdc`). Product UI i18n DE values stay in `translations.ts`.
- **Automated review gate:** Resolve **all** PR review bot comments (CodeRabbit, CodeAntai, etc.), including nitpicks and out-of-diff, looping until clear (`.cursor/rules/011-coderabbit-pr-gate.mdc`).
- **Dependabot gate:** Process every open Dependabot PR (`.cursor/rules/012-dependabot-pr-gate.mdc`); disposition in `docs/dependabot-disposition.md`.
- **E2E:** Once: `pnpm exec playwright install chromium`, then `pnpm run test:e2e` (Playwright starts Vite and uses a fake key).
- **ADRs / Security:** `docs/adr/`, `SECURITY.md`, living backlog in `AUDIT.md`.
