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

- **Ein einziger Service:** Reine Client-PWA, kein Backend/DB/Docker. Nur der Vite-Dev-Server läuft lokal: `pnpm run dev` (Port `3000`, Host `0.0.0.0`). Standardbefehle siehe `README.md` / `package.json`.
- **CDN-Abhängigkeit zur Laufzeit:** `index.html` nutzt eine Importmap, die React & Co. von `aistudiocdn.com` lädt. Der Browser braucht Egress zu dieser CDN, sonst rendert die App nicht (der Vite-Server selbst liefert nur den Bootstrap).
- **Gemini-Key ist kein Env-Secret:** Der Key wird zur Laufzeit über die UI (Settings → AI Configuration) eingegeben und AES-GCM-verschlüsselt in IndexedDB abgelegt. Gültiges Format: 39 Zeichen, Präfix `AIza`.
- **Alle KI-Features brauchen den Key:** Orchestrator-Recherche, Quick Add und der Rapid Research Assistant liefern ohne konfigurierten Key `NO_API_KEY`. Für eine echte End-to-End-KI-Recherche ist daher ein nutzereigener Gemini-Key nötig (nicht im Repo/Env hinterlegen).
- **Coverage gate:** `pnpm run test:coverage` enforces logic-layer thresholds in `vitest.config.ts` (Phase 0: **70%** lines/statements). Use `pnpm run test:run` for fast loops.
- **Resilience:** External calls via `AppError` / circuit breaker (`src/lib/errors.ts`, `circuitBreaker.ts`) — see `.cursor/rules/102-resilience-external-calls.mdc`.
- **English content:** New docs, comments, commits, and default strings must be English (`.cursor/rules/010-english-content.mdc`). Product UI i18n DE values stay in `translations.ts`.
- **E2E:** Once: `pnpm exec playwright install chromium`, then `pnpm run test:e2e` (Playwright starts Vite and uses a fake key).
- **ADRs / Security:** `docs/adr/`, `SECURITY.md`, living backlog in `AUDIT.md`.
