# AI Research Orchestration Author

<p align="center">
  <img src="public/icons/icon-512.png" alt="AI Research Orchestrator logo" width="128" height="128" />
</p>

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/qnbs/AI-Research-Orchestrator)

![Status](https://img.shields.io/badge/Status-Local--First_PWA-success?style=flat-square)
![Version](https://img.shields.io/badge/Version-0.4.1-blue?style=flat-square)
![Tech](https://img.shields.io/badge/Stack-React_19_|_TypeScript_|_Multi--Provider-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/Privacy-Local_First-green?style=flat-square)

> **Client-only PWA for biomedical literature review:** PubMed/arXiv retrieval, multi-provider AI (or heuristic fallback), a local knowledge base, and scientometric exploration.

**[Live Demo](https://qnbs.github.io/AI-Research-Orchestrator/)** · [SECURITY.md](./SECURITY.md) · [CONTRIBUTING.md](./CONTRIBUTING.md) · [CHANGELOG.md](./CHANGELOG.md) · [AGENTS.md](./AGENTS.md)

Provider keys (optional): [Gemini](https://aistudio.google.com/) · OpenAI · Anthropic · or run **Ollama / Heuristic** with no cloud key.

---

## English Documentation

### Executive overview

**AI Research Orchestration Author** is a **client-only** React Progressive Web App. It couples **PubMed** (NCBI E-utilities) and optional **arXiv** retrieval with a pluggable AI layer — default live model **Google Gemini `gemini-2.5-flash`**, plus OpenAI, Anthropic, local **Ollama**, or a deterministic **heuristic** engine.

The orchestrator runs a multi-phase pipeline: natural-language intent → Boolean/MeSH-oriented query formulation → live fetch → relevance ranking (semantic when live; lexical in heuristic mode) → streaming, cited synthesis where the runtime supports it.

**Core principles**

- **Local-first storage** — Reports, history, settings, collections, and the knowledge base live in IndexedDB (Dexie). There is **no application backend** that stores your research. In live mode the browser still sends prompts and article metadata to the **selected AI provider**, and search traffic to NCBI/arXiv — see [SECURITY.md](./SECURITY.md).
- **Progressive enhancement** — A configured live provider is the high-fidelity path; the heuristic layer keeps every AI-backed surface usable offline or without a cloud key (ADR [0007](docs/adr/0007-heuristic-inference-layer.md) / [0009](docs/adr/0009-non-ai-programmatic-research-engine.md)).
- **Agentic pipeline** — Conceptual agent roles (query, fetch, rank, synthesize) for the debugger UI map to phases of one stream, not separate OS processes.
- **Grounding with honest labels** — Ranked insights and exports are corpus-validated **where implemented**. Narrative synthesis is labeled **corpus-supported** / **claim-supported** or **unverified narrative draft** from claim-level lexical checks (ADR [0012](docs/adr/0012-corpus-citation-grounding.md), [0018](docs/adr/0018-synthesis-trust-terminology.md)). That is **not** a guarantee that every sentence is fully verified against primary literature.

### Offline / heuristic mode

Without a usable live-provider key, while offline, or with **Force Heuristic Mode** enabled (Settings → AI Configuration):

- Orchestrator uses local query building, PubMed fetch when online (or an explicit **Educational Demo** corpus path — never a silent substitute for failed live retrieval; ADR [0016](docs/adr/0016-synthetic-demo-quarantine.md)), lexical ranking, and structured markdown synthesis.
- TL;DR, similar articles, author/journal tools, and report chat share the same TypeScript contracts as the live path.
- The header badge reflects mode (e.g. heuristic vs live + provider).
- Cost estimator reports `$0 · Heuristic mode` when heuristic is active.
- First launch may seed dismissible educational demo Knowledge Base entries.

### Features

#### 1. Orchestrator (agentic pipeline)

- **Query formulation** — Natural language → Boolean strings oriented toward PubMed/MeSH.
- **Live retrieval** — NCBI E-utilities (and optional arXiv), with rate limits and backoff.
- **Relevance ranking** — Scores 0–100 from titles and available abstracts (metadata-only records ranked accordingly). Live providers may use model reasoning budgets; heuristic mode uses lexical ranking.
- **Synthesis** — Streams a cited executive summary when possible. Treat unverified narrative sections as drafts pending primary-source review.

#### 2. Knowledge Base

- Deduplicating library for articles and reports (highest-fidelity metadata wins on merge).
- Faceted filtering (tags, article types, authors, venues).
- Charts for publication trends, journal distributions, and keyword frequency (**Recharts** only — ADR [0005](docs/adr/0005-chart-library-recharts.md)).

#### 3. Rapid Research Assistant

- Paste text for extractive/generative TL;DR (live or heuristic).
- Similar articles via provider search when live, or lexical/demo paths in heuristic mode.
- Optional Gemini web grounding when enabled — **provider-dependent**, not a universal guarantee.

#### 4. Scientometric hubs (authors & journals)

- Author clustering from co-authorship/affiliation signals — **assistive**, not authoritative identity resolution.
- **Estimated** H-index-style and career signals from the retrieved corpus — not official bibliometric database values.
- Journal profiles (scope, OA heuristics, themes). PubMed `free full text` is **not** identical to every definition of “open access”.

### Technical architecture

Progressive Web App (service worker, installable, GitHub Pages SPA via `404.html`).

| Area   | Choice                                                                                                                                    |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------- |
| UI     | React 19, TypeScript strict, Tailwind CSS v4 (“Cybernetic” glassmorphism), Framer Motion                                                  |
| State  | Redux Toolkit + RTK Query; Dexie/IndexedDB persistence                                                                                    |
| AI     | Lazy-loaded providers (`gemini`, `openai`, `anthropic`, `ollama`, `heuristic`) — ADR [0008](docs/adr/0008-multi-provider-architecture.md) |
| Charts | Recharts only                                                                                                                             |
| Export | JSON, CSV, RIS, BibTeX, PDF (jsPDF); HTML/Markdown sanitized with DOMPurify                                                               |
| Build  | Vite 8; CSP hash patched on build; no CDN import map (ADR [0011](docs/adr/0011-remove-cdn-import-map.md))                                 |

**Design notes:** streaming synthesis where the provider supports it; exponential backoff / circuit breakers on external calls; lazy-loaded views; WCAG-oriented UI with `⌘+K` command palette.

### Getting started

#### Quick start (live demo)

1. Open **[https://qnbs.github.io/AI-Research-Orchestrator/](https://qnbs.github.io/AI-Research-Orchestrator/)**.
2. **Settings** (gear) → **AI Configuration**.
3. Choose a provider and save a key **or** use **Local AI (Ollama)** / **Heuristic (local)** without a cloud key.
4. Start from Orchestrator or Rapid Research.

Keys are AES-GCM encrypted in IndexedDB (Web Crypto). Encryption protects keys at rest; it does **not** protect against malware or XSS in a compromised session — [SECURITY.md](./SECURITY.md).

#### Local development

```bash
git clone https://github.com/qnbs/AI-Research-Orchestrator.git
cd AI-Research-Orchestrator
pnpm install --frozen-lockfile   # Node ≥22, pnpm 11
pnpm run dev                     # http://localhost:3000
pnpm run build                   # production bundle + CSP hash patch → dist/
```

#### Prerequisites

- Node.js **22+** and **pnpm 11**
- A modern browser (Chrome, Edge, Firefox, Safari)
- Optional: Gemini / OpenAI / Anthropic API key, or Ollama locally, or heuristic-only use

#### Tests & CI

```bash
pnpm run typecheck      # TypeScript (strict, no emit)
pnpm run lint           # ESLint (zero-warning gate)
pnpm run test:coverage  # Vitest + logic-layer coverage floors
pnpm run test:e2e       # Playwright — prefer scoped local runs; full suite in CI
pnpm run build
```

On every **push** to `main` and every **PR** targeting `main`, GitHub Actions runs:

| Gate                                                                            | Workflow                               |
| ------------------------------------------------------------------------------- | -------------------------------------- |
| Typecheck, lint, format, coverage, docs-drift, build, bundle budget, Lighthouse | `deploy.yml`                           |
| Playwright E2E (Chromium, seven specs)                                          | `e2e.yml` (**blocking**)               |
| Cross-browser E2E (Firefox, WebKit, mobile Chrome — same seven specs)           | `e2e-cross-browser.yml` (**blocking**) |
| Axe critical/serious smoke                                                      | `a11y.yml` (**blocking**)              |
| CodeQL, Dependency Review, `pnpm audit` (high+), gitleaks                       | `security.yml`                         |

GitHub Pages upload/deploy runs only on `refs/heads/main` (not on pull requests). Required checks, PR-only `cancel-in-progress`, and ruleset expectations: [`docs/ci-branch-governance.md`](./docs/ci-branch-governance.md). Contributor review loop: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

#### Cursor / IDE

[`AGENTS.md`](./AGENTS.md), [`.cursor/index.mdc`](./.cursor/index.mdc), `.cursor/rules/*.mdc`, and [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### Multi-provider setup

**Settings → AI Configuration → AI Provider**

| Provider          | Key format | Notes                                                                                                 |
| ----------------- | ---------- | ----------------------------------------------------------------------------------------------------- |
| Google Gemini     | `AIza…`    | Default live model `gemini-2.5-flash`; optional Google Search grounding                               |
| OpenAI            | `sk-…`     | Official API or OpenRouter-compatible proxies via **Base URL**                                        |
| Anthropic         | `sk-ant-…` | Claude models via the Messages API                                                                    |
| Local AI (Ollama) | none       | Default `http://localhost:11434` (or custom Base URL); PubMed/arXiv still use the network when online |
| Heuristic (local) | none       | Deterministic fallback; `$0`; no provider network                                                     |

OpenRouter example: Base URL `https://openrouter.ai/api/v1` + an OpenRouter API key.

Architecture: [ADR 0008](docs/adr/0008-multi-provider-architecture.md).

### Configuration

Granular AI settings (provider-dependent where noted):

- **AI persona** — Neutral Scientist, Concise Expert, Detailed Analyst, or Creative Synthesizer
- **Temperature** — creativity vs. determinism
- **Thinking budget** — internal reasoning tokens where the selected model supports it (e.g. Gemini 2.5 Flash)
- **Output language** — English, German, French, Spanish (independent of UI locale)
- **Force Heuristic Mode** — stay on the deterministic engine even when a live key is present

### Privacy & security

- **Local storage** — research data in IndexedDB; no app server stores it.
- **Direct-to-API** — live mode talks to the selected AI provider, NCBI, and optionally arXiv.
- **Portability** — export JSON, CSV, RIS, BibTeX, or PDF anytime.

Threat model and residual risks: [SECURITY.md](./SECURITY.md).

### Deployment

Configured for **GitHub Pages**:

1. **Automatic** — merge/push to `main` runs quality gates, then Pages deploy (`deploy.yml`).
2. **Manual** — `pnpm run build` and host the `dist/` folder.

SPA deep links use a `404.html` → `index.html` fallback (CI generates this). Blocking E2E/a11y/security workflows run alongside deploy quality jobs — see [`docs/ci-branch-governance.md`](./docs/ci-branch-governance.md).

#### Self-hosting

Set `VITE_BASE_PATH` and optional `VITE_SITE_ORIGIN` before build:

| Host scenario             | `VITE_BASE_PATH`             | `VITE_SITE_ORIGIN`            | Example URL                                        |
| ------------------------- | ---------------------------- | ----------------------------- | -------------------------------------------------- |
| GitHub Pages (default CI) | `/AI-Research-Orchestrator/` | `https://qnbs.github.io`      | `https://qnbs.github.io/AI-Research-Orchestrator/` |
| Root static host          | `/`                          | `https://your-domain.example` | `https://your-domain.example/`                     |
| Subpath static host       | `/my-app/`                   | `https://your-domain.example` | `https://your-domain.example/my-app/`              |

```bash
VITE_BASE_PATH=/ VITE_SITE_ORIGIN=https://your-domain.example pnpm run build
# or GitHub Pages defaults:
VITE_BASE_PATH=/AI-Research-Orchestrator/ VITE_SITE_ORIGIN=https://qnbs.github.io pnpm run build
```

Serve `dist/` under the chosen base path; copy `dist/index.html` to `dist/404.html` for SPA recovery on hosts that need it (GitHub Actions does this automatically).

### Troubleshooting

| Symptom                     | What to try                                                                                                                                                               |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Blocked / no-key UX         | Settings → AI Configuration: add a provider key, use Ollama, or rely on Heuristic mode                                                                                    |
| PubMed failures             | Check network; respect NCBI rate limits; optional NCBI API key in settings                                                                                                |
| Ollama “unavailable”        | Ensure Ollama is running; check Base URL / loopback; see Settings health panel                                                                                            |
| PWA install missing         | HTTPS + valid `manifest.json`; try a Chromium-based browser                                                                                                               |
| Blank page after navigation | Hard reload; clear site data if a stale service worker is stuck                                                                                                           |
| CI red                      | `pnpm run typecheck`, `pnpm run lint`, scoped `vitest` / Playwright; read job logs (cancelled ≠ suite failure — see [`docs/e2e-ci-backlog.md`](./docs/e2e-ci-backlog.md)) |

### License

MIT — see [`LICENSE`](./LICENSE).

### Further reading

- [CHANGELOG.md](./CHANGELOG.md) — what shipped
- [docs/ci-branch-governance.md](./docs/ci-branch-governance.md) — CI / ruleset
- [docs/adr/README.md](./docs/adr/README.md) — architecture decisions
- [docs/release-policy.md](./docs/release-policy.md) — version / deploy identity

---

## Deutsche Dokumentation

> **Bilingual product exception** (rule `010`): this German section is maintained for end users alongside the English documentation above. English remains authoritative for CI, agent, and governance facts.

### Überblick

**AI Research Orchestration Author** ist eine **clientseitige** Progressive Web App für biomedizinische Literaturrecherchen: **PubMed** (NCBI) und optional **arXiv**, plus austauschbare KI — Standard-Live-Modell **Google Gemini `gemini-2.5-flash`**, außerdem OpenAI, Anthropic, lokales **Ollama** oder eine deterministische **Heuristik**.

Die Pipeline: natürliche Sprache → boolesche/MeSH-orientierte Query → Live-Abruf → Relevanzranking (semantisch live; lexikalisch in der Heuristik) → gestreamte, zitierte Synthese, soweit der Runtime-Pfad das unterstützt.

**Kernprinzipien**

- **Local-First-Speicher** — Berichte, Historie, Einstellungen, Collections und Wissensdatenbank in IndexedDB. Es gibt **kein Anwendungs-Backend**, das Ihre Recherche speichert. Im Live-Modus gehen Prompts und Artikelmetadaten an den **gewählten KI-Anbieter** sowie Suchtraffic an NCBI/arXiv — siehe [SECURITY.md](./SECURITY.md).
- **Progressive Enhancement** — Live-Anbieter für hohe Treue; die Heuristik hält alle KI-Flächen offline/ohne Cloud-Key nutzbar (ADR [0007](docs/adr/0007-heuristic-inference-layer.md) / [0009](docs/adr/0009-non-ai-programmatic-research-engine.md)).
- **Agentische Pipeline** — Debugger-Rollen entsprechen Phasen eines Streams, nicht separaten OS-Prozessen.
- **Grounding mit ehrlichen Labels** — Korpusvalidierung **wo umgesetzt**. Narrative Synthese heißt **corpus-supported** / **claim-supported** oder **unverified narrative draft** (ADR [0012](docs/adr/0012-corpus-citation-grounding.md), [0018](docs/adr/0018-synthesis-trust-terminology.md)) — **keine** Garantie, dass jeder Satz vollständig verifiziert ist.

### Offline- / Heuristik-Modus

Ohne nutzbaren Live-Key, offline oder mit **Force Heuristic Mode** (Einstellungen → AI Configuration / KI-Konfiguration): lokale Query-Formulierung, PubMed wenn online (expliziter **Educational-Demo**-Pfad — kein stilles Ersetzen fehlgeschlagener Live-Läufe; ADR [0016](docs/adr/0016-synthetic-demo-quarantine.md)), lexikalisches Ranking, Template-Synthese, TL;DR, Autoren-/Journal-Tools und report-gebundener Chat. Details: ADR 0007.

### Funktionen

#### 1. Orchestrator

- Query-Formulierung, NCBI-/arXiv-Abruf mit Rate-Limits, Ranking 0–100 aus Titel/Abstracts, gestreamte Synthese. Unverifizierte Narrative als Entwurf behandeln.

#### 2. Wissensdatenbank

- Deduplizierung, Facettenfilter, Charts (nur Recharts).

#### 3. Forschungsassistent

- TL;DR, Ähnlichkeitssuche (live oder lexikalisch), optionales Gemini-Web-Grounding (**anbieterabhängig**).

#### 4. Szientometrische Hubs

- Autoren-Clustering als Hilfsmittel; **geschätzte** Impact-Signale; Journal-Profile. PubMed-`free full text` ≠ jede OA-Definition.

### Technische Architektur

PWA (Service Worker, installierbar, GitHub Pages mit `404.html`-Fallback).

| Bereich | Wahl                                                                                                                              |
| ------- | --------------------------------------------------------------------------------------------------------------------------------- |
| UI      | React 19, TypeScript strict, Tailwind CSS v4, Framer Motion                                                                       |
| State   | Redux Toolkit + RTK Query; Dexie/IndexedDB                                                                                        |
| KI      | Lazy Provider (`gemini`, `openai`, `anthropic`, `ollama`, `heuristic`) — ADR [0008](docs/adr/0008-multi-provider-architecture.md) |
| Charts  | nur Recharts                                                                                                                      |
| Export  | JSON, CSV, RIS, BibTeX, PDF; DOMPurify                                                                                            |
| Build   | Vite 8; CSP-Hash beim Build; kein CDN-Import-Map (ADR [0011](docs/adr/0011-remove-cdn-import-map.md))                             |

### Erste Schritte

#### Schnellstart (Live-Demo)

1. **[https://qnbs.github.io/AI-Research-Orchestrator/](https://qnbs.github.io/AI-Research-Orchestrator/)** öffnen.
2. **Einstellungen** → **AI Configuration** / KI-Konfiguration.
3. Anbieter + Key **oder** Ollama / Heuristik ohne Cloud-Key.
4. Orchestrator oder Rapid Research starten.

Keys: AES-GCM in IndexedDB — schützt at rest, nicht vor Malware/XSS ([SECURITY.md](./SECURITY.md)).

#### Lokale Entwicklung

```bash
git clone https://github.com/qnbs/AI-Research-Orchestrator.git
cd AI-Research-Orchestrator
pnpm install --frozen-lockfile   # Node ≥22, pnpm 11
pnpm run dev
pnpm run build
```

#### Voraussetzungen

- Node.js **22+** und **pnpm 11**
- Moderner Browser
- Optional: Gemini-/OpenAI-/Anthropic-Key, lokales Ollama, oder nur Heuristik

#### Tests & CI

```bash
pnpm run typecheck
pnpm run lint
pnpm run test:coverage
pnpm run test:e2e    # lokal eher scoped; volle Suite in CI
pnpm run build
```

Push/PR gegen `main`: `deploy.yml`, blockierendes Chromium-E2E, blockierendes Cross-Browser-E2E (Firefox/WebKit/mobile Chrome), Axe-A11y, Security. Pages-Deploy nur auf `main`. Details: [`docs/ci-branch-governance.md`](./docs/ci-branch-governance.md).

#### Cursor / IDE

[`AGENTS.md`](./AGENTS.md), [`.cursor/index.mdc`](./.cursor/index.mdc), `.cursor/rules/*.mdc`, [`CONTRIBUTING.md`](./CONTRIBUTING.md).

### Multi-Provider

**Einstellungen → AI Configuration → AI Provider** — gleiche Tabelle wie im englischen Abschnitt (Gemini / OpenAI / Anthropic / Ollama / Heuristik). Architektur: [ADR 0008](docs/adr/0008-multi-provider-architecture.md).

### Konfiguration

- **KI-Persona** — Neutral Scientist, Concise Expert, Detailed Analyst, Creative Synthesizer
- **Temperatur**, **Thinking Budget** (wo das Modell es unterstützt, z. B. Gemini 2.5 Flash)
- **Ausgabesprache** — EN/DE/FR/ES
- **Force Heuristic Mode**

### Datenschutz & Sicherheit

Local-First, kein App-Backend für Forschungsdaten; Live-Modus = Direkt-zu-API (Anbieter + NCBI/arXiv); Export jederzeit. Bedrohungsmodell: [SECURITY.md](./SECURITY.md).

### Deployment & Self-Hosting

Wie im englischen Abschnitt: GitHub Pages über `deploy.yml`; portable `dist/` mit `VITE_BASE_PATH` / `VITE_SITE_ORIGIN`. Governance: [`docs/ci-branch-governance.md`](./docs/ci-branch-governance.md).

### Fehlerbehebung

| Symptom              | Hinweis                                                           |
| -------------------- | ----------------------------------------------------------------- |
| Kein Key / blockiert | AI Configuration: Key, Ollama oder Heuristik                      |
| PubMed-Fehler        | Netz / NCBI-Limits; optionaler NCBI-Key                           |
| Ollama unavailable   | Dienst + Base URL; Health-Panel in Settings                       |
| CI rot               | Lokal typecheck/lint; Job-Logs lesen (`cancelled` ≠ Suite-Fehler) |

### Lizenz

MIT — siehe [`LICENSE`](./LICENSE).

### Haftungsausschluss

Dieses Tool nutzt generative KI und lexikalisches Grounding. Es können Ungenauigkeiten auftreten. Prüfen Sie Ergebnisse immer anhand der verlinkten Primärquellen in den Berichten.
