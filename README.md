[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/qnbs/AI-Research-Orchestrator)

> **Built with AI Studio** — [Start building](https://aistudio.google.com/apps?source=user) | [View App](https://ai.studio/apps/drive/19FB9X7ftbg4kXoKVBgPpsGwKDWU4Gvmp)
>
> The fastest path from prompt to production with Gemini.

# AI Research Orchestration Author

An expert system for authoring comprehensive literature reviews by managing a swarm of specialized AI agents. It uses the PubMed database to collect, curate, and synthesize scientific research based on user-defined criteria, acting as an intelligent partner for researchers to accelerate discovery.

This application significantly reduces the manual effort of literature reviews by allowing users to quickly identify relevant articles, extract key insights, and build a structured, searchable knowledge base.

***

## Table of Contents

1.  [Core Features](#core-features)
2.  [Primary Workflows](#primary-workflows)
3.  [Technology Stack](#technology-stack)
4.  [Getting Started](#getting-started)
5.  [Privacy-First Architecture](#privacy-first-architecture)
6.  [Important Disclaimers](#important-disclaimers)

---

## Core Features

-   **🤖 AI Research Orchestration:** Generates comprehensive reports from a simple research topic. The AI formulates advanced PubMed queries, scans articles, and ranks them by relevance with detailed explanations.

-   **💡 Quick Analysis (Research Tab):** Paste any text—a question, abstract, or topic—to get an instant summary, a list of key findings, and suggestions for related articles and online discussions.

-   **👤 Author Hub:** Analyze an author's intellectual development, collaborative ecosystem, and impact on their field by searching for their publications and generating an AI-powered career summary and profile.

-   **📖 Journal Hub (New!):** Discover and analyze scientific journals. Get AI-generated profiles including a journal's scope, open-access policy, and key focus areas. Find recent open-access articles within a journal on a specific topic.

-   **🧠 Centralized & Intelligent Knowledge Base:** All articles from saved reports are aggregated into a single, searchable library. Duplicates are automatically removed, keeping the version with the highest relevance score.

-   **🔍 Powerful Data Exploration:** The Knowledge Base features robust search, multi-faceted filtering (by keyword, report, custom tags, open-access status, journal), and multiple sorting options.

-   **📊 Data Visualization Dashboard:** Provides charts and graphs to visualize trends in the knowledge base, such as publication years and top journals.

-   **🛠️ Intelligent Knowledge Base Maintenance:**
    -   **Merge Duplicates:** Automatically find and merge duplicate articles, keeping only the entry with the highest relevance score.
    -   **Prune by Relevance:** Clean your library by removing articles below a specified relevance score threshold.

-   **💾 Robust Data Management & Export:**
    -   **PDF:** Generate comprehensive, professionally formatted PDFs for reports and knowledge base selections, with a customizable cover page and content sections.
    -   **CSV:** Export raw article data with configurable columns and delimiters for spreadsheets.
    -   **Citations:** Get enhanced citation files (**BibTeX**, **RIS**) with configurable content (abstracts, keywords, tags) for reference managers like Zotero or Mendeley.
    -   **JSON:** Back up and restore your entire research history, knowledge base, or settings with a single click.

-   **⚙️ Deep Customization:** A detailed settings panel allows users to manage themes, UI density, AI behavior (persona, language, creativity), form defaults, and export configurations.

-   **✨ Modern, Cybernetic UI/UX:** A redesigned user interface with a technological design, subtle animations, and improved readability for a first-class user experience.

-   **⌨️ Command Palette:** Access any part of the application or perform key actions instantly with a powerful command palette (`⌘+K`).

---

## Primary Workflows

The application is built around four primary, interconnected workflows:

### 1. The Quick Inquiry (Research Tab)
This is for fast, focused analysis. You can paste an abstract to get a summary, ask a specific question, or explore a tangent without committing to a full review. If the results are promising, you can seamlessly transition the topic to the Orchestrator for a deep dive.

### 2. The Comprehensive Literature Review (Orchestrator)
This is for deep dives into a new topic. You provide a broad research question, and the AI orchestrates a multi-agent process to build a full report. This is the primary way to populate your Knowledge Base with high-quality, relevant articles.

### 3. The Author Analysis (Author Hub)
This is for understanding the work of a specific researcher. Provide an author's name, and the AI will find their publications, disambiguate them from others with the same name, and generate a career profile, including their core topics and publication timeline.

### 4. The Journal Analysis (Journal Hub)
This is for exploring publication venues. Provide a journal's name to get an AI-generated profile, and optionally search for open-access articles on a specific topic published within it.

---

## Technology Stack

-   **Frontend:** React, TypeScript
-   **AI Model:** Google Gemini API (`@google/genai`)
-   **Local Database:** Dexie.js (IndexedDB Wrapper)
-   **Styling:** Tailwind CSS
-   **Charts:** Chart.js, react-chartjs-2
-   **PDF Generation:** jsPDF
-   **Module Loading:** No build step required; uses modern browser `importmap`.

---

## Getting Started

This is a client-side web app that requires no build step and can be run by serving the files from any static web server.

### Prerequisites

-   A modern web browser that supports ES modules and import maps (e.g., Chrome, Firefox, Safari, Edge).
-   A valid **API key** for the Google Gemini API.

### API Key Setup

The Gemini API key is accessed via `process.env.API_KEY`. You must make this variable available in the execution environment where the application is run.

When deploying, you must use your hosting provider's system for managing environment variables. Configure an environment variable named `API_KEY` in your provider's settings.

---

## Privacy-First Architecture

This application is designed with privacy as a core principle.

-   **All data is stored exclusively in your local browser's IndexedDB database.**
-   This includes your research history, saved articles, custom tags, and all settings.
-   **No information is ever uploaded to a server or shared.** Your research is completely private to the browser you are using.
-   To back up your data or move it to another machine, you **must** use the export features in `Settings > Data Management & Privacy`. Clearing your browser data will permanently delete your work unless you have a backup.

---

## Important Disclaimers

### 🔴 AI Accuracy

-   The AI-generated content is for informational and discovery purposes only. It is a powerful assistant, but it is **not infallible** and may contain inaccuracies, omissions, or "hallucinations" (information that sounds plausible but is incorrect).
-   This application is a tool to **accelerate research, not a substitute for scholarly review and critical evaluation.**
-   **ALWAYS VERIFY CRITICAL INFORMATION BY READING THE ORIGINAL SOURCE ARTICLES PROVIDED.** Links to PubMed are included for every article.

### 🔵 API Usage & Costs

-   This application makes calls to the Google Gemini API, which may be subject to usage quotas and could incur costs depending on your plan.
-   Be mindful of the settings that trigger API calls, such as generating reports, using the Research Assistant, and analyzing authors. Manage your API key and monitor your usage in the Google AI Studio dashboard.
