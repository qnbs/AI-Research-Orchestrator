
# AI Research Orchestration Author

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/qnbs/AI-Research-Orchestrator)

![Status](https://img.shields.io/badge/Status-Production_Ready-success)
![Tech](https://img.shields.io/badge/Built_With-React_19_|_TypeScript_|_Gemini_2.5-blueviolet)
![License](https://img.shields.io/badge/License-MIT-blue)
![Privacy](https://img.shields.io/badge/Privacy-Local_First-green)

> **A sophisticated, agentic expert system for high-dimensional literature synthesis and automated knowledge discovery.**

[Start Building](https://aistudio.google.com/apps?source=user) | [View Live App](https://ai.studio/apps/drive/19FB9X7ftbg4kXoKVBgPpsGwKDWU4Gvmp)

---

## 🌌 Overview

The **AI Research Orchestration Author** is a state-of-the-art frontend application designed to revolutionize how scientific literature reviews are conducted. By coupling the **PubMed** biomedical database with the cognitive reasoning capabilities of **Google's Gemini 2.5 Flash** model, it acts as an autonomous research partner.

Unlike simple summarizers, this system employs a **multi-agent orchestration pattern**. It breaks down complex research topics into search strategies, executes live retrieval, ranks findings using semantic understanding, and synthesizes narrative reports with academic rigor.

**Core Philosophy:**
*   **Local-First:** Total privacy with IndexedDB storage.
*   **Agentic:** Autonomous query formulation and decision-making.
*   **Transparent:** Full traceability to source PMIDs (PubMed IDs).

---

## 🚀 Key Capabilities

### 1. 🧠 The Orchestrator (Agentic Workflow)
The heart of the application is a multi-step generative pipeline:
1.  **Query Formulation Agent**: Analyzes the user's natural language intent and constructs advanced Boolean search strings optimized for PubMed's MeSH taxonomy.
2.  **Retrieval & Filtering**: Executes live API calls to the NCBI E-utilities interface to fetch metadata for hundreds of candidate articles.
3.  **Semantic Ranking Agent**: Reads titles and abstracts to score relevance (0-100) against the specific research context, filtering out noise.
4.  **Synthesis Agent**: Streams a comprehensive, cited executive summary, highlighting consensus, contradictions, and gaps in the literature.

### 2. 📚 Intelligent Knowledge Base
A persistent, self-organizing library for your research.
*   **Deduplication Engine**: Automatically merges duplicate entries, preserving the highest-fidelity metadata.
*   **Semantic Search**: Filter your library not just by keywords, but by AI-generated tags, article types, and derived insights.
*   **Data Visualization**: Integrated charts visualize publication trends over time and top journal sources.

### 3. 🔬 Rapid Research Assistant
A lightweight tool for ad-hoc inquiry.
*   **Abstract Analysis**: Paste complex text to get "TL;DR" summaries and key finding extraction.
*   **Similarity Search**: Uses latent semantic understanding to find related papers based on content, not just keywords.
*   **Grounding**: Cross-references findings with live web search data to provide broader context.

### 4. 👤 Author & Journal Hubs
*   **Author Disambiguation**: Uses AI to cluster publications and distinguish between researchers with identical names.
*   **Impact Metrics**: Estimates H-Index and citation flows based on available metadata.
*   **Journal Profiling**: AI-generated profiles of publication venues, including scope, Open Access policies, and impact factors.

---

## 🛠️ Technical Architecture

### Technology Stack
*   **Framework**: [React 19](https://react.dev/) (leveraging Suspense and concurrent features).
*   **Language**: [TypeScript](https://www.typescriptlang.org/) for type safety and architectural robustness.
*   **AI Integration**: [`@google/genai`](https://www.npmjs.com/package/@google/genai) SDK connecting to Gemini 2.5 Flash.
*   **State/Storage**: [Dexie.js](https://dexie.org/) (IndexedDB wrapper) for high-performance, offline-capable local storage.
*   **Styling**: [Tailwind CSS](https://tailwindcss.com/) with a custom "Cybernetic" design system.
*   **Visualization**: [Chart.js](https://www.chartjs.org/) for analytics rendering.
*   **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) for client-side report compilation.

### Design Patterns
*   **Streaming Responses**: Utilizes Gemini's streaming API to provide immediate feedback during long-running synthesis tasks.
*   **Resilient Networking**: Implements exponential backoff strategies for robust interaction with public APIs (PubMed).
*   **Component Architecture**: Modular, lazy-loaded components ensure fast initial load times and code splitting.
*   **Accessibility**: Fully ARIA-compliant UI with keyboard navigation support (Command Palette `⌘+K`).

---

## ⚡ Getting Started

### Prerequisites
*   A modern browser (Chrome, Edge, Safari, Firefox).
*   A **Google Gemini API Key**. [Get one here](https://aistudio.google.com/).

### Installation
This project is built to run directly in a browser environment that supports ES Modules.

1.  **Clone the repository** (or download source).
2.  **Configure Environment**:
    *   The application expects `process.env.API_KEY` to be available.
    *   *Note: In a production build, inject this via your build tool or environment configuration.*
3.  **Serve**:
    *   Use any static file server (e.g., `npx serve`, `python -m http.server`).
    *   Access `index.html` in your browser.

---

## ⚙️ Configuration & Customization

The application features a granular settings engine allowing you to tailor the AI's cognitive profile.

*   **AI Persona**: Switch between "Neutral Scientist", "Creative Synthesizer", or "Critical Reviewer" to adjust the tone of reports.
*   **Temperature**: Fine-tune the model's creativity (0.0 for deterministic facts, 0.8 for hypothesis generation).
*   **Language**: Force output in specific languages (English, German, French, Spanish) regardless of input source language.
*   **Thinking Budget**: (Experimental) Allocation of tokens for the model's internal reasoning process before output generation.

---

## 🛡️ Privacy & Security

**Zero-Knowledge Architecture:**
*   **Local Storage**: All user data (reports, history, settings) resides in your browser's IndexedDB.
*   **Direct-to-API**: The app communicates directly with Google's Gemini API and NCBI's PubMed API. No intermediate backend server collects your data.
*   **Exportable**: You own your data. Export complete datasets to JSON, CSV, or PDF at any time.

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

> **Disclaimer**: This tool utilizes generative AI. While it employs grounding techniques (PubMed citations), it may occasionally produce inaccuracies. Always verify findings against the original source documents linked in the reports.
