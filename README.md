
# AI Research Orchestration Author

![Status](https://img.shields.io/badge/Status-Production_Ready-success?style=flat-square)
![Version](https://img.shields.io/badge/Version-2.0.0-blue?style=flat-square)
![Tech](https://img.shields.io/badge/Stack-React_19_|_TypeScript_|_Gemini_Pro-blueviolet?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![Privacy](https://img.shields.io/badge/Privacy-Local_First-green?style=flat-square)

> **A sophisticated, agentic expert system for high-dimensional literature synthesis, automated knowledge discovery, and scientometric analysis.**

[Start Building](https://aistudio.google.com/apps?source=user) | [View Live App](https://ai.studio/apps/drive/19FB9X7ftbg4kXoKVBgPpsGwKDWU4Gvmp)

---

## 🇬🇧 English Documentation

### 🌌 Executive Overview

The **AI Research Orchestration Author** represents a paradigm shift in scientific inquiry tools. It is a **state-of-the-art frontend application** designed to autonomously conduct rigorous literature reviews by coupling the vast biomedical corpus of **PubMed** with the advanced cognitive reasoning capabilities of **Google's Gemini 2.5 Flash** and **Gemini 3 Pro** models.

Unlike conventional summarization tools, this system employs a **multi-agent orchestration pattern**. It decomposes complex research questions into constituent logic streams, autonomously formulates Boolean search strategies, executes live API retrieval, ranks findings using semantic understanding, and synthesizes narrative reports with academic precision.

**Core Philosophy:**
*   **Local-First Sovereignty:** A zero-knowledge architecture where all data resides within the user's browser (IndexedDB).
*   **Agentic Reasoning:** Autonomous query formulation, decision-making, and relevance scoring.
*   **Traceability & Grounding:** Every AI assertion is inextricably linked to a verified PubMed ID (PMID).

---

### 🚀 Advanced Capabilities

#### 1. 🧠 The Orchestrator (Agentic Pipeline)
The application's core is a multi-stage generative pipeline that mimics the workflow of a human researcher:
*   **Query Formulation Agent**: Analyzes natural language intent to construct high-precision Boolean search strings tailored to PubMed's MeSH taxonomy.
*   **Live Retrieval Engine**: Interfaces directly with the NCBI E-utilities API to fetch metadata for hundreds of candidate articles in real-time.
*   **Semantic Ranking Agent**: Reads titles and abstracts to score relevance (0-100) against specific research contexts, utilizing a dedicated "Thinking Budget" for complex nuance detection.
*   **Synthesis Agent**: Streams a comprehensive, cited executive summary, highlighting consensus, contradictions, and critical gaps in the literature.

#### 2. 📚 Intelligent Knowledge Base
A persistent, self-organizing library for long-term research management.
*   **Deduplication Engine**: Automatically merges duplicate entries while preserving the highest-fidelity metadata.
*   **Semantic Filtering**: Advanced faceting allows filtering by AI-generated tags, article types, authors, and publication venues.
*   **Data Visualization**: Integrated analytics visualize publication trends over time, journal impact distributions, and keyword frequency.

#### 3. 🔬 Rapid Research Assistant
A lightweight, high-speed tool for ad-hoc inquiry and validation.
*   **Abstract Analysis**: Paste complex text to generate "TL;DR" summaries and extract key findings instantly.
*   **Latent Similarity Search**: Uses semantic understanding to discover related papers based on conceptual overlap rather than just keyword matching.
*   **Cross-Modal Grounding**: Cross-references scientific findings with live web search data to provide broader societal or clinical context.

#### 4. 👤 Scientometric Hubs (Authors & Journals)
*   **Author Disambiguation**: Leverages AI to cluster publications and distinguish between researchers with identical names based on co-authorship networks and affiliation patterns.
*   **Impact Metrics**: Estimates H-Index, citation flows, and identifies core research concepts over a career.
*   **Journal Profiling**: AI-generated profiles of publication venues, analyzing scope, Open Access policies, and thematic focus areas.

---

### 🛠️ Technical Architecture

This application is a **Progressive Web App (PWA)** built on a modern, performance-oriented stack designed for the edge.

#### Technology Stack
*   **Framework**: [React 19](https://react.dev/) (leveraging Suspense, Concurrent Mode, and refined Hooks).
*   **Language**: [TypeScript](https://www.typescriptlang.org/) ensuring strict type safety and architectural robustness.
*   **AI Integration**: [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK connecting to Gemini 2.5 Flash (for speed) and Gemini 3 Pro (for reasoning).
*   **State/Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper) for high-performance, offline-capable structured local storage.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom "Cybernetic" design system featuring glassmorphism and ambient animations.
*   **Visualization**: [Chart.js](https://www.chartjs.org/) for reactive data analytics.
*   **Export**: [jsPDF](https://github.com/parallax/jsPDF) for client-side PDF report compilation.

#### Design Patterns
*   **Streaming Responses**: Utilizes Gemini's streaming API to provide immediate feedback during long-running synthesis tasks.
*   **Resilient Networking**: Implements exponential backoff strategies for robust interaction with public APIs.
*   **Component Architecture**: Modular, lazy-loaded components ensure fast initial load times and efficient code splitting.
*   **Accessibility**: Fully ARIA-compliant UI with keyboard navigation support (Command Palette `⌘+K`).

---

### ⚡ Getting Started

#### Prerequisites
*   A modern browser (Chrome, Edge, Safari, Firefox).
*   A **Google Gemini API Key**. [Get one here](https://aistudio.google.com/).

#### Installation
This project is built to run directly in a browser environment supporting ES Modules.

1.  **Clone the repository** (or download source).
2.  **Configure Environment**:
    *   The application expects `process.env.API_KEY` to be available.
    *   *Note: In a production build, inject this via your build tool (Vite/Webpack) or environment configuration.*
3.  **Serve**:
    *   Use any static file server (e.g., `npx serve`, `python -m http.server`).
    *   Access `index.html` in your browser.

---

### ⚙️ Configuration & Customization

The application features a granular settings engine allowing precise tuning of the AI's cognitive profile.

*   **AI Persona**: Switch between "Neutral Scientist", "Creative Synthesizer", or "Critical Reviewer" to adjust the rhetorical tone.
*   **Temperature**: Fine-tune creativity (0.0 for deterministic facts, 0.8 for hypothesis generation).
*   **Thinking Budget**: Allocate specific token counts for the model's internal reasoning process before output generation (enabled for Gemini 2.5/3.0 models).
*   **Language**: Force output in specific languages (English, German, French, Spanish) regardless of input source language.

---

### 🛡️ Privacy & Security

**Zero-Knowledge Architecture:**
*   **Local Storage**: All user data (reports, history, settings) resides exclusively in your browser's IndexedDB.
*   **Direct-to-API**: The app communicates directly with Google's Gemini API and NCBI's PubMed API. No intermediate backend server collects, stores, or analyzes your data.
*   **Data Portability**: You own your data. Export complete datasets to JSON, CSV, RIS, BibTeX, or PDF at any time.

---

### 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

<br/>

## 🇩🇪 Deutsche Dokumentation

### 🌌 Überblick

Der **AI Research Orchestration Author** markiert einen Paradigmenwechsel bei Werkzeugen für wissenschaftliche Recherche. Es handelt sich um eine **hochmoderne Frontend-Anwendung**, die entwickelt wurde, um rigorose Literaturrecherchen autonom durchzuführen. Hierbei wird der riesige biomedizinische Korpus von **PubMed** mit den fortschrittlichen kognitiven Fähigkeiten der Modelle **Google Gemini 2.5 Flash** und **Gemini 3 Pro** gekoppelt.

Im Gegensatz zu herkömmlichen Zusammenfassungstools verwendet dieses System ein **Multi-Agenten-Orchestrierungsmuster**. Es zerlegt komplexe Forschungsfragen in logische Teilströme, formuliert autonom boolesche Suchstrategien, führt Live-API-Abrufe durch, bewertet Ergebnisse mittels semantischem Verständnis und synthetisiert narrative Berichte mit akademischer Präzision.

**Kernphilosophie:**
*   **Local-First-Souveränität:** Eine Zero-Knowledge-Architektur, bei der alle Daten ausschließlich im Browser des Nutzers (IndexedDB) verbleiben.
*   **Agentisches Denken:** Autonome Abfrageformulierung, Entscheidungsfindung und Relevanzbewertung.
*   **Rückverfolgbarkeit & Grounding:** Jede KI-Aussage ist untrennbar mit einer verifizierten PubMed-ID (PMID) verknüpft.

---

### 🚀 Erweiterte Funktionen

#### 1. 🧠 Der Orchestrator (Agenten-Pipeline)
Das Herzstück der Anwendung ist eine mehrstufige generative Pipeline, die den Arbeitsablauf eines menschlichen Forschers nachahmt:
*   **Abfrageformulierungs-Agent**: Analysiert die natürliche Sprachabsicht, um hochpräzise boolesche Suchstrings zu konstruieren, die auf die MeSH-Taxonomie von PubMed zugeschnitten sind.
*   **Live-Retrieval-Engine**: Interagiert direkt mit der NCBI E-utilities API, um Metadaten für Hunderte von Kandidatenartikeln in Echtzeit abzurufen.
*   **Semantischer Ranking-Agent**: Liest Titel und Abstracts, um die Relevanz (0-100) für spezifische Forschungskontexte zu bewerten, wobei ein spezielles "Thinking Budget" für die Erkennung komplexer Nuancen genutzt wird.
*   **Synthese-Agent**: Streamt eine umfassende, zitierte Zusammenfassung für Führungskräfte, die Konsens, Widersprüche und kritische Lücken in der Literatur hervorhebt.

#### 2. 📚 Intelligente Wissensdatenbank
Eine persistente, sich selbst organisierende Bibliothek für langfristiges Forschungsmanagement.
*   **Deduplizierungs-Engine**: Führt doppelte Einträge automatisch zusammen und bewahrt dabei die hochwertigsten Metadaten.
*   **Semantische Filterung**: Erlaubt das Filtern nach KI-generierten Tags, Artikeltypen, Autoren und Publikationsorten.
*   **Datenvisualisierung**: Integrierte Analysen visualisieren Publikationstrends im Zeitverlauf, Impact-Verteilungen von Journalen und Keyword-Häufigkeiten.

#### 3. 🔬 Forschungsassistent (Rapid Research Assistant)
Ein leichtgewichtiges Hochgeschwindigkeitstool für Ad-hoc-Anfragen und Validierung.
*   **Abstract-Analyse**: Fügen Sie komplexen Text ein, um "TL;DR"-Zusammenfassungen zu generieren und Schlüsselerkenntnisse sofort zu extrahieren.
*   **Latente Ähnlichkeitssuche**: Nutzt semantisches Verständnis, um verwandte Arbeiten basierend auf konzeptionellen Überschneidungen statt reiner Keyword-Übereinstimmung zu entdecken.
*   **Cross-Modal Grounding**: Vergleicht wissenschaftliche Erkenntnisse mit Live-Websuchdaten, um breiteren gesellschaftlichen oder klinischen Kontext zu liefern.

#### 4. 👤 Szientometrische Hubs (Autoren & Journale)
*   **Autoren-Disambiguierung**: Nutzt KI, um Publikationen zu clustern und Forscher mit identischen Namen anhand von Co-Autorschaftsnetzwerken und Affiliationsmustern zu unterscheiden.
*   **Impact-Metriken**: Schätzt den H-Index, Zitationsflüsse und identifiziert Kernforschungskonzepte über eine gesamte Karriere hinweg.
*   **Journal-Profiling**: KI-generierte Profile von Publikationsorten, die Umfang, Open-Access-Richtlinien und thematische Schwerpunkte analysieren.

---

### 🛠️ Technische Architektur

Diese Anwendung ist eine **Progressive Web App (PWA)**, die auf einem modernen, leistungsorientierten Stack basiert und für Edge-Umgebungen konzipiert ist.

#### Technologie-Stack
*   **Framework**: [React 19](https://react.dev/) (nutzt Suspense, Concurrent Mode und verfeinerte Hooks).
*   **Sprache**: [TypeScript](https://www.typescriptlang.org/) für strikte Typsicherheit und architektonische Robustheit.
*   **KI-Integration**: [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK zur Verbindung mit Gemini 2.5 Flash (für Geschwindigkeit) und Gemini 3 Pro (für Reasoning).
*   **Status/Speicher**: [Dexie.js](https://dexie.org/) (IndexedDB-Wrapper) für hochperformante, offline-fähige strukturierte lokale Speicherung.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) mit einem benutzerdefinierten "Cybernetic"-Designsystem mit Glassmorphismus und ambienten Animationen.
*   **Visualisierung**: [Chart.js](https://www.chartjs.org/) für reaktive Datenanalysen.
*   **Export**: [jsPDF](https://github.com/parallax/jsPDF) für clientseitige PDF-Berichterstellung.

---

### ⚡ Erste Schritte

#### Voraussetzungen
*   Ein moderner Browser (Chrome, Edge, Safari, Firefox).
*   Ein **Google Gemini API Key**. [Hier erhalten](https://aistudio.google.com/).

#### Installation
Dieses Projekt ist so konzipiert, dass es direkt in einer Browserumgebung ausgeführt werden kann, die ES-Module unterstützt.

1.  **Repository klonen** (oder Quellcode herunterladen).
2.  **Umgebung konfigurieren**:
    *   Die Anwendung erwartet, dass `process.env.API_KEY` verfügbar ist.
    *   *Hinweis: In einem Produktions-Build injizieren Sie dies über Ihr Build-Tool (Vite/Webpack) oder die Umgebungskonfiguration.*
3.  **Ausführen**:
    *   Verwenden Sie einen beliebigen statischen Dateiserver (z. B. `npx serve`, `python -m http.server`).
    *   Rufen Sie `index.html` in Ihrem Browser auf.

---

### ⚙️ Konfiguration & Anpassung

Die Anwendung verfügt über eine granulare Einstellungs-Engine, die eine präzise Abstimmung des kognitiven Profils der KI ermöglicht.

*   **KI-Persona**: Wechseln Sie zwischen "Neutraler Wissenschaftler", "Kreativer Synthetisierer" oder "Kritischer Gutachter", um den rhetorischen Ton anzupassen.
*   **Temperatur**: Feinabstimmung der Kreativität (0.0 für deterministische Fakten, 0.8 für Hypothesengenerierung).
*   **Thinking Budget**: Weisen Sie spezifische Token-Anzahlen für den internen Denkprozess des Modells zu, bevor die Ausgabe generiert wird (aktiviert für Gemini 2.5/3.0 Modelle).
*   **Sprache**: Erzwingen Sie die Ausgabe in bestimmten Sprachen (Englisch, Deutsch, Französisch, Spanisch) unabhängig von der Eingangssprache.

---

### 🛡️ Datenschutz & Sicherheit

**Zero-Knowledge-Architektur:**
*   **Lokaler Speicher**: Alle Benutzerdaten (Berichte, Verlauf, Einstellungen) befinden sich ausschließlich in der IndexedDB Ihres Browsers.
*   **Direkt-zu-API**: Die App kommuniziert direkt mit der Google Gemini API und der NCBI PubMed API. Kein zwischengeschalteter Backend-Server sammelt, speichert oder analysiert Ihre Daten.
*   **Datenportabilität**: Ihre Daten gehören Ihnen. Exportieren Sie vollständige Datensätze jederzeit als JSON, CSV, RIS, BibTeX oder PDF.

---

### 📄 Lizenz

Veröffentlicht unter der MIT-Lizenz. Siehe `LICENSE` für weitere Informationen.

---

> **Haftungsausschluss**: Dieses Tool nutzt generative KI. Obwohl es Grounding-Techniken (PubMed-Zitate) verwendet, können gelegentlich Ungenauigkeiten auftreten. Überprüfen Sie Ergebnisse immer anhand der in den Berichten verlinkten Originalquelldokumente.
