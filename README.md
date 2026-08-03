# AI Research Orchestration Author

<p align="center">
  <img src="public/icons/icon-512.png" alt="AI Research Orchestrator — microscope research mark 🔬" width="128" height="128" />
</p>

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/qnbs/AI-Research-Orchestrator)

![Status](https://img.shields.io/badge/Status-Local--First_PWA-success?style=flat-square)
![Version](https://img.shields.io/badge/Version-0.4.1-blue?style=flat-square)
![Tech](https://img.shields.io/badge/Stack-React_19_|_TypeScript_|_Multi--Provider-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/Privacy-Local_First-green?style=flat-square)

> **A client-only, agentic PWA for biomedical literature synthesis, knowledge-base workflows, and scientometric exploration.**

**[🚀 Live Demo](https://qnbs.github.io/AI-Research-Orchestrator/)** | [Get Gemini API Key](https://aistudio.google.com/)

---

## 🇬🇧 English Documentation

### 🌌 Executive Overview

The **AI Research Orchestration Author** is a **client-only frontend application** that helps run literature reviews by coupling **PubMed** (and optional arXiv) retrieval with a pluggable AI provider layer — default live model **Google Gemini 2.5 Flash**, plus OpenAI, Anthropic, local Ollama, or a deterministic heuristic fallback.

Unlike conventional summarization tools, this system employs a **multi-agent orchestration pattern**. It decomposes research questions into pipeline phases, formulates Boolean search strategies, executes live API retrieval, ranks findings (semantic when live; lexical in heuristic mode), and synthesizes narrative reports with citations where available.

**Core Philosophy:**

- **Local-First Storage:** Reports, history, settings, and knowledge base live in the browser (IndexedDB). There is no app backend that stores your research. Live mode still sends prompts and article metadata to the **selected AI provider** and search queries to NCBI/arXiv — see [SECURITY.md](./SECURITY.md).
- **Progressive enhancement:** Live Gemini (or another configured provider) is the high-fidelity path; a first-class **heuristic inference layer** keeps every AI feature usable offline or without an API key (deterministic ranking, template synthesis, extractive TL;DR, report-grounded chat).
- **Agentic Reasoning:** Autonomous query formulation, decision-making, and relevance scoring.
- **Traceability & Grounding:** Ranked insights and exports are corpus-validated; live narrative synthesis is labeled **corpus-supported** or **unverified narrative draft** based on claim-level lexical evidence checks (see ADR 0012, ADR 0018). This is **not** a guarantee that every sentence is fully verified.

### Offline / Heuristic mode

Without a Gemini key (or while offline), the app automatically switches to **Heuristic mode**:

- Orchestrator runs with local Boolean/MeSH-style query building, PubMed fetch when online (demo corpus offline), lexical ranking, and structured markdown synthesis.
- TL;DR, similar articles, author/journal tools, and report chat use the same TypeScript types as the live path.
- Header badge shows `Heuristic · Offline/No-Key` (or `Live · Gemini` when a key + network are available).
- Settings → AI: optional **Force Heuristic Mode**; cost estimator shows `$0 · Heuristic mode`.
- First launch seeds educational demo Knowledge Base entries (dismissible).

See [ADR 0007](docs/adr/0007-heuristic-inference-layer.md).

---

### 🚀 Advanced Capabilities

#### 1. 🧠 The Orchestrator (Agentic Pipeline)

The application's core is a multi-stage generative pipeline that mimics the workflow of a human researcher:

- **Query Formulation Agent**: Analyzes natural language intent to construct high-precision Boolean search strings tailored to PubMed's MeSH taxonomy.
- **Live Retrieval Engine**: Interfaces directly with the NCBI E-utilities API to fetch metadata for candidate articles in real-time (subject to NCBI rate limits).
- **Semantic Ranking Agent**: Scores relevance (0–100) from **titles and available abstracts** (records without abstracts are metadata-only and ranked accordingly). Live providers may use a thinking/token budget; heuristic mode uses lexical ranking.
- **Synthesis Agent**: Streams a cited executive summary when possible, highlighting consensus, contradictions, and gaps. Treat unverified narrative sections as drafts pending primary-source review.

#### 2. 📚 Intelligent Knowledge Base

A persistent, self-organizing library for long-term research management.

- **Deduplication Engine**: Automatically merges duplicate entries while preserving the highest-fidelity metadata.
- **Semantic Filtering**: Advanced faceting allows filtering by AI-generated tags, article types, authors, and publication venues.
- **Data Visualization**: Integrated analytics visualize publication trends over time, journal impact distributions, and keyword frequency.

#### 3. 🔬 Rapid Research Assistant

A lightweight, high-speed tool for ad-hoc inquiry and validation.

- **Abstract Analysis**: Paste complex text to generate "TL;DR" summaries and extract key findings instantly.
- **Similarity Search**: Finds related papers via provider semantic search when live, or lexical/demo paths in heuristic mode.
- **Optional web grounding**: When using Gemini with search grounding enabled, some findings may be cross-checked against live web results — this is provider-dependent, not a universal guarantee.

#### 4. 👤 Scientometric Hubs (Authors & Journals)

- **Author Disambiguation**: Uses AI (or heuristic clustering) to group publications and help distinguish researchers with similar names via co-authorship and affiliation signals — treat results as assistive, not authoritative identity resolution.
- **Impact Metrics**: Surfaces **estimated** H-Index-style and career-concept signals from retrieved corpora; these are approximate scientometrics, not official bibliometric database values.
- **Journal Profiling**: AI- or heuristic-generated venue profiles (scope, Open Access heuristics, themes). PubMed `free full text` filters are **not** identical to all definitions of “open access” (see SECURITY.md).

---

### 🛠️ Technical Architecture

This application is a **Progressive Web App (PWA)** built on a modern, performance-oriented stack designed for the edge.

#### Technology Stack

- **Framework**: [React 19](https://react.dev/) (leveraging Suspense, Concurrent Mode, and refined Hooks).
- **Language**: [TypeScript](https://www.typescriptlang.org/) ensuring strict type safety and architectural robustness.
- **AI Integration**: Pluggable providers via lazy-loaded SDKs — default live model **Gemini `gemini-2.5-flash`**, plus OpenAI, Anthropic, Ollama, or heuristic fallback (ADR 0008 / ADR 0009).
- **State/Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper) for high-performance, offline-capable structured local storage.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom "Cybernetic" design system featuring glassmorphism and ambient animations.
- **Visualization**: [Recharts](https://recharts.org/) for reactive data analytics (Recharts-only; see ADR 0005).
- **Export**: [jsPDF](https://github.com/parallax/jsPDF) for client-side PDF report compilation.

#### Design Patterns

- **Streaming Responses**: Utilizes Gemini's streaming API to provide immediate feedback during long-running synthesis tasks.
- **Resilient Networking**: Implements exponential backoff strategies for robust interaction with public APIs.
- **Component Architecture**: Modular, lazy-loaded components ensure fast initial load times and efficient code splitting.
- **Accessibility**: Fully ARIA-compliant UI with keyboard navigation support (Command Palette `⌘+K`).

---

### ⚡ Getting Started

#### Quick Start (Live App)

1. Visit **[https://qnbs.github.io/AI-Research-Orchestrator/](https://qnbs.github.io/AI-Research-Orchestrator/)**
2. Click **Settings** (gear icon) → **API Key**
3. Enter your Gemini API Key (stored encrypted locally, never sent to any server)
4. Start researching!

#### Local Development

```bash
# Clone repository
git clone https://github.com/qnbs/AI-Research-Orchestrator.git
cd AI-Research-Orchestrator

# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build for production
pnpm run build
```

#### Tests & CI

```bash
pnpm run typecheck    # TypeScript (strict, no emit)
pnpm run lint         # ESLint (warning budget in package.json)
pnpm run test:coverage # Vitest + coverage thresholds (logic layers — vitest.config.ts)
pnpm run test:e2e     # Playwright E2E (one-time: pnpm exec playwright install chromium)
pnpm run build        # Production bundle
```

On every **push** to `main` and on **pull requests** targeting `main`, GitHub Actions runs install, typecheck, lint, tests with coverage, and production build (see `.github/workflows/deploy.yml`). Upload and deployment to GitHub Pages run only when the ref is `refs/heads/main` and the event is not a pull request.

#### Cursor / IDE setup

For AI-assisted work in Cursor, see [`AGENTS.md`](./AGENTS.md), [`.cursor/index.mdc`](./.cursor/index.mdc) (always-on manifest), `.cursor/rules/*.mdc`, and [CONTRIBUTING.md](./CONTRIBUTING.md).

#### Prerequisites

- Node.js 22+ and pnpm 11
- A modern browser (Chrome, Edge, Safari, Firefox)
- A **Google Gemini API Key** — [Get one here](https://aistudio.google.com/)

#### How to Set Your API Key

The app stores provider API keys **AES-GCM encrypted** in your browser's IndexedDB (Web Crypto). Encryption protects keys at rest in IndexedDB; it does **not** protect against malware or XSS in a compromised browser session — see [SECURITY.md](./SECURITY.md).

1. Open the app
2. Navigate to **Settings** → **AI Configuration**
3. Enter your provider API key(s)
4. Click **Save**

> ⚠️ **Security Note**: Keys never leave your browser except as Authorization to the **provider you selected** for inference. Research prompts and article metadata are sent to that provider in live mode.

---

### 🤖 Multi-Provider Setup

Besides Google Gemini, the app supports OpenAI, Anthropic, and local Ollama endpoints. Choose the backend in **Settings → AI → AI Provider**.

| Provider      | Key format   | Notes                                                                               |
| ------------- | ------------ | ----------------------------------------------------------------------------------- |
| Google Gemini | `AIza...`    | Default; supports live Google Search grounding.                                     |
| OpenAI        | `sk-...`     | Supports official API and OpenRouter-compatible proxies via the **Base URL** field. |
| Anthropic     | `sk-ant-...` | Claude models via the Messages API.                                                 |
| Ollama        | none         | Local inference at `http://localhost:11434` (or a custom Base URL).                 |
| Heuristic     | none         | Deterministic local fallback; zero cost, no network required.                       |

For OpenRouter, set the Base URL to `https://openrouter.ai/api/v1` and use an OpenRouter API key.

See [ADR 0008](docs/adr/0008-multi-provider-architecture.md) for the architecture rationale.

---

### ⚙️ Configuration & Customization

The application features a granular settings engine allowing precise tuning of the AI's cognitive profile.

- **AI Persona**: Switch between "Neutral Scientist", "Creative Synthesizer", or "Critical Reviewer" to adjust the rhetorical tone.
- **Temperature**: Fine-tune creativity (0.0 for deterministic facts, 0.8 for hypothesis generation).
- **Thinking Budget**: Allocate specific token counts for the model's internal reasoning process before output generation (enabled for Gemini 2.5/3.0 models).
- **Language**: Force output in specific languages (English, German, French, Spanish) regardless of input source language.

---

### 🛡️ Privacy & Security

**Local-first, zero-backend app:**

- **Local Storage**: Reports, history, settings, and knowledge base reside in your browser's IndexedDB — there is **no application server** that stores them.
- **Direct-to-API**: In live mode the browser talks directly to the selected AI provider, NCBI, and (optionally) arXiv. Prompts and retrieval queries leave the device for those destinations.
- **Data Portability**: Export complete datasets to JSON, CSV, RIS, BibTeX, or PDF at any time.

Threat model and residual risks: [SECURITY.md](./SECURITY.md).
---

### 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

### 🚀 Deployment

This app is configured for **GitHub Pages** deployment:

1. **Automatic Deployment**: Push to `main` branch triggers GitHub Actions workflow
2. **Manual Deployment**: Run `pnpm run build` and deploy `dist/` folder

#### GitHub Actions Setup

The repository includes `.github/workflows/deploy.yml` that:

- Runs install, TypeScript, ESLint, tests with coverage, and production build on every push to `main` and on pull requests targeting `main`
- Uploads and deploys to GitHub Pages only for pushes (or manual dispatch) on `main` — not for pull requests
- Handles SPA routing via `404.html` fallback

#### Self-Hosting

Build output is portable static assets. Configure deployment with `VITE_BASE_PATH` and optional `VITE_SITE_ORIGIN` before `pnpm run build`:

| Host scenario                    | `VITE_BASE_PATH`             | `VITE_SITE_ORIGIN` (canonical/OG) | Example URL                                        |
| -------------------------------- | ---------------------------- | --------------------------------- | -------------------------------------------------- |
| GitHub Pages (default CI)        | `/AI-Research-Orchestrator/` | `https://qnbs.github.io`          | `https://qnbs.github.io/AI-Research-Orchestrator/` |
| Root static host (custom domain) | `/`                          | `https://your-domain.example`     | `https://your-domain.example/`                     |
| Subpath on static host           | `/my-app/`                   | `https://your-domain.example`     | `https://your-domain.example/my-app/`              |

```bash
# Root host (Netlify/Vercel custom domain, nginx at site root)
VITE_BASE_PATH=/ VITE_SITE_ORIGIN=https://your-domain.example pnpm run build

# GitHub Pages subpath (same as CI — default when unset in production)
VITE_BASE_PATH=/AI-Research-Orchestrator/ VITE_SITE_ORIGIN=https://qnbs.github.io pnpm run build

# Deploy dist/ to any static hosting:
# - Netlify, Vercel, Cloudflare Pages
# - AWS S3 + CloudFront
# - Any web server (nginx, Apache)
```

For subpath hosts, configure the static server to serve `dist/` under that path and copy `dist/index.html` to `dist/404.html` for SPA deep-link recovery (GitHub Actions does this automatically).

---

### 🔧 Troubleshooting

- `"API Key Required" error`: Go to Settings -> API Key and enter your Gemini API key.
- `PubMed requests failing`: Check internet connection; NCBI may have rate limits.
- `PWA not installing`: Ensure HTTPS and a valid `manifest.json`.
- `Blank page after navigation`: Clear browser cache and reload.
- `CI fails on TypeScript or tests`: Run `pnpm run typecheck` and `pnpm run test:run` locally and fix reported errors.

---

## 🇩🇪 Deutsche Dokumentation

### 🌌 Überblick

Der **AI Research Orchestration Author** ist eine **client-seitige Frontend-Anwendung** für Literaturrecherchen: **PubMed** (optional arXiv) plus eine austauschbare KI-Schicht — Standard-Live-Modell **Google Gemini 2.5 Flash**, außerdem OpenAI, Anthropic, lokales Ollama oder eine deterministische Heuristik.

Im Gegensatz zu herkömmlichen Zusammenfassungstools verwendet dieses System ein **Multi-Agenten-Orchestrierungsmuster**. Es zerlegt Forschungsfragen in Pipeline-Phasen, formuliert boolesche Suchstrategien, führt Live-API-Abrufe durch, bewertet Ergebnisse (semantisch im Live-Modus; lexikalisch in der Heuristik) und synthetisiert narrative Berichte mit Zitationen, wo verfügbar.

**Kernphilosophie:**

- **Local-First-Speicher:** Berichte, Historie, Einstellungen und Wissensdatenbank liegen im Browser (IndexedDB). Es gibt kein App-Backend, das Ihre Recherche speichert. Im Live-Modus gehen Prompts und Artikelmetadaten an den **gewählten KI-Anbieter** sowie Suchanfragen an NCBI/arXiv — siehe [SECURITY.md](./SECURITY.md).
- **Progressive Enhancement:** Live-Gemini (oder ein anderer konfigurierter Anbieter) ist der High-Fidelity-Pfad; eine erstklassige **Heuristik-Inferenzschicht** hält alle KI-Funktionen offline und ohne API-Schlüssel nutzbar.
- **Agentisches Denken:** Autonome Abfrageformulierung, Entscheidungsfindung und Relevanzbewertung.
- **Rückverfolgbarkeit & Grounding:** Gerankte Insights und Exporte sind korpusvalidiert; narrative Synthese wird als **corpus-supported** oder **unverified narrative draft** gekennzeichnet (ADR 0012, ADR 0018). Das ist **keine** Garantie, dass jeder Satz vollständig verifiziert ist.

### Offline- / Heuristik-Modus

Ohne Gemini-Schlüssel (oder offline) wechselt die App automatisch in den **Heuristik-Modus**: lokale Query-Formulierung, Ranking, Synthese, TL;DR, Autoren-/Journal-Tools und report-gebundener Chat. Header-Badge und Settings-Toggle machen den Modus transparent. Details: [ADR 0007](docs/adr/0007-heuristic-inference-layer.md).

---

### 🚀 Erweiterte Funktionen

#### 1. 🧠 Der Orchestrator (Agenten-Pipeline)

Das Herzstück der Anwendung ist eine mehrstufige generative Pipeline, die den Arbeitsablauf eines menschlichen Forschers nachahmt:

- **Abfrageformulierungs-Agent**: Analysiert die natürliche Sprachabsicht, um hochpräzise boolesche Suchstrings zu konstruieren, die auf die MeSH-Taxonomie von PubMed zugeschnitten sind.
- **Live-Retrieval-Engine**: Interagiert direkt mit der NCBI E-utilities API, um Metadaten für Hunderte von Kandidatenartikeln in Echtzeit abzurufen.
- **Semantischer Ranking-Agent**: Liest Titel und Abstracts, um die Relevanz (0-100) für spezifische Forschungskontexte zu bewerten, wobei ein spezielles "Thinking Budget" für die Erkennung komplexer Nuancen genutzt wird.
- **Synthese-Agent**: Streamt eine umfassende, zitierte Zusammenfassung für Führungskräfte, die Konsens, Widersprüche und kritische Lücken in der Literatur hervorhebt.

#### 2. 📚 Intelligente Wissensdatenbank

Eine persistente, sich selbst organisierende Bibliothek für langfristiges Forschungsmanagement.

- **Deduplizierungs-Engine**: Führt doppelte Einträge automatisch zusammen und bewahrt dabei die hochwertigsten Metadaten.
- **Semantische Filterung**: Erlaubt das Filtern nach KI-generierten Tags, Artikeltypen, Autoren und Publikationsorten.
- **Datenvisualisierung**: Integrierte Analysen visualisieren Publikationstrends im Zeitverlauf, Impact-Verteilungen von Journalen und Keyword-Häufigkeiten.

#### 3. 🔬 Forschungsassistent (Rapid Research Assistant)

Ein leichtgewichtiges Hochgeschwindigkeitstool für Ad-hoc-Anfragen und Validierung.

- **Abstract-Analyse**: Fügen Sie komplexen Text ein, um "TL;DR"-Zusammenfassungen zu generieren und Schlüsselerkenntnisse sofort zu extrahieren.
- **Ähnlichkeitssuche**: Findet verwandte Papers über Anbieter-Suche im Live-Modus oder lexikalische/Demo-Pfade in der Heuristik.
- **Optionales Web-Grounding**: Bei Gemini mit aktiviertem Search-Grounding können Ergebnisse gegen Live-Webdaten geprüft werden — anbieterabhängig, keine Universalgarantie.

#### 4. 👤 Szientometrische Hubs (Autoren & Journale)

- **Autoren-Disambiguierung**: KI- oder Heuristik-Clustering als Hilfsmittel — keine autoritative Identitätsauflösung.
- **Impact-Metriken**: **Geschätzte** H-Index-/Karrieresignale aus dem abgerufenen Korpus, keine offiziellen Bibliometrie-Datenbankwerte.
- **Journal-Profiling**: KI-/Heuristik-Profile (Scope, Open-Access-Heuristiken, Themen). PubMed-`free full text` ist nicht identisch mit allen OA-Definitionen.

---

### 🛠️ Technische Architektur

Diese Anwendung ist eine **Progressive Web App (PWA)** auf einem modernen Stack für clientseitige Nutzung.

#### Technologie-Stack

- **Framework**: [React 19](https://react.dev/) (nutzt Suspense, Concurrent Mode und verfeinerte Hooks).
- **Sprache**: [TypeScript](https://www.typescriptlang.org/) für strikte Typsicherheit und architektonische Robustheit.
- **KI-Integration**: Austauschbare Anbieter (lazy-loaded) — Standard-Live-Modell **Gemini `gemini-2.5-flash`**, plus OpenAI, Anthropic, Ollama oder Heuristik (ADR 0008 / ADR 0009).
- **Status/Speicher**: [Dexie.js](https://dexie.org/) (IndexedDB-Wrapper) für hochperformante, offline-fähige strukturierte lokale Speicherung.
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) mit einem benutzerdefinierten "Cybernetic"-Designsystem mit Glassmorphismus und ambienten Animationen.
- **Visualisierung**: [Recharts](https://recharts.org/) für reaktive Datenanalysen (nur Recharts; ADR 0005).
- **Export**: [jsPDF](https://github.com/parallax/jsPDF) für clientseitige PDF-Berichterstellung.

---

### ⚡ Erste Schritte

#### Schnellstart (Live App)

1. Besuchen Sie **[https://qnbs.github.io/AI-Research-Orchestrator/](https://qnbs.github.io/AI-Research-Orchestrator/)**
2. Klicken Sie auf **Einstellungen** (Zahnrad-Icon) → **API Key**
3. Geben Sie Ihren Gemini API Key ein (wird verschlüsselt lokal gespeichert)
4. Starten Sie Ihre Recherche!

#### Lokale Entwicklung

```bash
# Repository klonen
git clone https://github.com/qnbs/AI-Research-Orchestrator.git
cd AI-Research-Orchestrator

# Abhängigkeiten installieren
pnpm install

# Entwicklungsserver starten
pnpm run dev

# Für Produktion bauen
pnpm run build
```

#### Tests & CI (Deutsch)

```bash
pnpm run typecheck    # TypeScript (strikt, ohne Emit)
pnpm run lint         # ESLint (Warnbudget in package.json)
pnpm run test:coverage # Vitest + Coverage-Schwellen (Logiklayer — vitest.config.ts)
pnpm run test:e2e     # Playwright E2E (einmalig: pnpm exec playwright install chromium)
pnpm run build        # Produktionsbundle
```

Bei jedem **Push** auf `main` und bei **Pull Requests** gegen `main` führt GitHub Actions Installation, Typecheck, Lint, Tests mit Coverage und Production-Build aus (`.github/workflows/deploy.yml`). Upload und Deploy nach GitHub Pages erfolgen nur auf `refs/heads/main`, nicht bei PRs.

#### Cursor / IDE

Für KI-gestützte Entwicklung in Cursor: [`AGENTS.md`](./AGENTS.md), [`.cursor/index.mdc`](./.cursor/index.mdc), `.cursor/rules/*.mdc` und [CONTRIBUTING.md](./CONTRIBUTING.md).

#### Voraussetzungen

- Node.js 22+ und pnpm 11
- Ein moderner Browser (Chrome, Edge, Safari, Firefox)
- Ein **Google Gemini API Key** — [Hier erhalten](https://aistudio.google.com/)

#### API Key einrichten

Die App speichert Ihren API Key **sicher verschlüsselt** in der IndexedDB Ihres Browsers (AES-GCM Verschlüsselung):

1. App öffnen
2. Navigieren Sie zu **Einstellungen** → **API Key**
3. Geben Sie Ihren Gemini API Key ein
4. Klicken Sie auf **Schlüssel speichern**

> ⚠️ **Sicherheitshinweis**: Keys werden mit Web Crypto AES-GCM in IndexedDB verschlüsselt. Das schützt Keys at rest, nicht vor Malware/XSS in einer kompromittierten Browser-Session — siehe [SECURITY.md](./SECURITY.md). Keys verlassen den Browser nur als Authorization an den **gewählten Anbieter**. Im Live-Modus gehen Recherche-Prompts und Artikelmetadaten an diesen Anbieter.

---

### ⚙️ Konfiguration & Anpassung

Die Anwendung verfügt über eine granulare Einstellungs-Engine, die eine präzise Abstimmung des kognitiven Profils der KI ermöglicht.

- **KI-Persona**: Wechseln Sie zwischen "Neutraler Wissenschaftler", "Kreativer Synthetisierer" oder "Kritischer Gutachter", um den rhetorischen Ton anzupassen.
- **Temperatur**: Feinabstimmung der Kreativität (0.0 für deterministische Fakten, 0.8 für Hypothesengenerierung).
- **Thinking Budget**: Weisen Sie spezifische Token-Anzahlen für den internen Denkprozess des Modells zu, bevor die Ausgabe generiert wird (aktiviert für Gemini 2.5/3.0 Modelle).
- **Sprache**: Erzwingen Sie die Ausgabe in bestimmten Sprachen (Englisch, Deutsch, Französisch, Spanisch) unabhängig von der Eingangssprache.

---

### 🛡️ Datenschutz & Sicherheit

**Local-First, Zero-Backend:**

- **Lokaler Speicher**: Berichte, Verlauf, Einstellungen und Wissensdatenbank liegen in der IndexedDB — es gibt **keinen Anwendungsserver**, der sie speichert.
- **Direkt-zu-API**: Im Live-Modus spricht der Browser direkt mit dem gewählten KI-Anbieter, NCBI und (optional) arXiv. Prompts und Suchanfragen verlassen das Gerät zu diesen Zielen.
- **Datenportabilität**: Exportieren Sie vollständige Datensätze jederzeit als JSON, CSV, RIS, BibTeX oder PDF.

Bedrohungsmodell und Restrisiken: [SECURITY.md](./SECURITY.md).
---

### 📄 Lizenz

Veröffentlicht unter der MIT-Lizenz. Siehe `LICENSE` für weitere Informationen.

---

> **Haftungsausschluss**: Dieses Tool nutzt generative KI. Obwohl es Grounding-Techniken (PubMed-Zitate) verwendet, können gelegentlich Ungenauigkeiten auftreten. Überprüfen Sie Ergebnisse immer anhand der in den Berichten verlinkten Originalquelldokumente.
