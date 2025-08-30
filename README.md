# AI Research Orchestrator

An expert system that manages a swarm of specialized AI agents to conduct comprehensive literature reviews using the PubMed database. It collects, curates, and synthesizes scientific research based on user-defined criteria, acting as an intelligent partner for researchers to accelerate discovery.

This application significantly reduces the manual effort of literature reviews by allowing users to quickly identify relevant articles, extract key insights, and build a structured, searchable knowledge base.

***

<!-- ENGLISH DOCUMENTATION -->

## Table of Contents

1.  [Key Features](#key-features)
2.  [Core Workflows](#core-workflows)
3.  [Technology Stack](#technology-stack)
4.  [Getting Started](#getting-started)
5.  [Usage Guide](#usage-guide)
6.  [Important Disclaimers](#important-disclaimers)

---

## Key Features

-   **🤖 AI Research Orchestration:** Generates comprehensive reports from a simple research topic. The AI formulates advanced PubMed queries, scans articles, and ranks them by relevance with detailed explanations.

-   **💡 Quick Analysis with the Research Assistant:** Paste any text—a question, abstract, or topic—to get an instant summary, a list of key findings, and suggestions for related articles and online discussions.

-   **🧠 Centralized & Intelligent Knowledge Base:** All articles from saved reports are aggregated into a single, searchable library. Duplicates are automatically removed, keeping the version with the highest relevance score.

-   **🔍 Powerful Data Exploration:** The Knowledge Base features robust search, multi-faceted filtering (by keyword, report, custom tags, open-access status, journal), and multiple sorting options.

-   **📊 Data Visualization Dashboard:** Provides charts and graphs (treemaps, bar charts) to visualize trends in the knowledge base, such as top keywords, publication years, and top journals.

-   **💾 Robust Data Management & Export:**
    -   **PDF:** Generate comprehensive, professionally formatted PDFs for reports and knowledge base selections, with a customizable cover page and content sections.
    -   **CSV:** Export raw article data with configurable columns and delimiters for spreadsheets.
    -   **Citations:** Get enhanced citation files (**BibTeX**, **RIS**) with abstracts and keywords for reference managers like Zotero or Mendeley.
    -   **JSON:** Back up and restore your entire research history or settings with a single click.

-   **⚙️ Deep Customization:** A detailed settings panel allows users to manage themes, AI behavior (persona, language, creativity), form defaults, and perform data management tasks like backups and cleaning.

-   **✨ Modern, Cybernetic UI/UX:** A completely redesigned user interface with a technological design, subtle animations, and improved readability for a first-class user experience.

-   **🔒 Privacy-First Architecture:** All data, including research history and settings, is stored **exclusively in your local browser storage**. No data is ever uploaded to a server, ensuring complete privacy.

## Core Workflows

The application is built around two primary, interconnected workflows:

### Workflow 1: The Comprehensive Literature Review (Orchestrator)

This is for deep dives into a new topic. You provide a broad research question, and the AI orchestrates a multi-agent process to build a full report. This is the primary way to populate your Knowledge Base with high-quality, relevant articles.

### Workflow 2: The Quick Inquiry (Research Assistant)

This is for fast, focused analysis. You can paste an abstract to get a summary, ask a specific question, or explore a tangent without committing to a full review. If the results are promising, you can seamlessly transition the topic to the Orchestrator for a deep dive.

## Technology Stack

-   **Frontend:** React, TypeScript
-   **AI Model:** Google Gemini API (`@google/genai`)
-   **Styling:** Tailwind CSS
-   **Charts:** Chart.js, react-chartjs-2, chartjs-chart-treemap
-   **PDF Generation:** jsPDF
-   **Module Loading:** No build step required; uses modern browser `importmap`.

## Getting Started

This is a client-side web app that requires no build step and can be run by serving the files from any static web server.

### Prerequisites

-   A modern web browser that supports ES modules and import maps (e.g., Chrome, Firefox, Safari, Edge).
-   A valid **API key** for the Google Gemini API.

### API Key Setup

The Gemini API key is accessed via `process.env.API_KEY`. You must make this variable available to the browser before the application scripts load.

**For Local Development:**

1.  **Serve the project folder:** Use a tool like the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code, or run `npx serve` in your terminal from the project's root directory.

2.  **Provide the API Key:** Open `index.html` and add the following `<script>` tag inside the `<head>` section, **before** the `importmap` script:

    ```html
    <!-- Add this script tag for local development -->
    <script>
      window.process = {
        env: {
          // IMPORTANT: Replace with your actual API key for local testing
          API_KEY: 'YOUR_GEMINI_API_KEY_HERE'
        }
      };
    </script>
    ```

    > **⚠️ Warning:** Do not commit your API key to version control. This method is for local development only.

**For Deployment:**

When deploying to a hosting provider (e.g., Vercel, Netlify), you must use their system for managing environment variables. Configure an environment variable named `API_KEY` and use your provider's features to inject it into your `index.html` at build/deploy time.

> **🔒 Security Notice:** The API key is used directly by the client-side code. This is a potential security risk. It is **critical** that you implement security measures for your key as per Google's guidelines, such as restricting the key's usage to your specific domain.

## Usage Guide

1.  **The Orchestrator (Define & Launch):**
    -   Navigate to the `Orchestrator` tab.
    -   Define your topic with as much detail as possible. Use boolean-like operators (`AND`, `OR`, `NOT`) for precision.
    -   Set filters for date range, article types, and the synthesis focus.
    -   Click `Start Research` and monitor the AI's progress.
    -   Once complete, review the report. If valuable, click `Save to Knowledge Base` to add its articles to your permanent library.

2.  **The Research Assistant (Ask & Analyze):**
    -   Go to the `Research` tab for quick queries.
    -   Enter any text: a question, an abstract, or a topic you're exploring.
    -   Click `Analyze` to receive a summary, key findings, and related content.
    -   If the results are promising, use the "Start Full Review" button to transfer the topic to the Orchestrator.

3.  **The Knowledge Base (Explore & Manage):**
    -   Go to the `Knowledge Base` tab after saving reports.
    -   Use the left-hand panel to filter your entire library of articles.
    -   Click any article to open a side panel with its full details. Add custom tags here to organize your work.
    -   Use the checkboxes to select articles for bulk actions like deletion or export.

4.  **Dashboard & History (Visualize & Revisit):**
    -   Navigate to the `Dashboard` (under the "More" menu) to see your knowledge base visualized.
    -   Go to the `History` tab to browse, search, and revisit all your previously saved reports.

5.  **Settings & Data (Customize & Export):**
    -   Visit the `Settings` tab (gear icon).
    -   Customize the theme, AI persona, and default form values.
    -   Configure the content of your PDF, CSV, and citation exports.
    -   In "Data & Privacy," export your entire history or settings to a JSON file for backup.

## Important Disclaimers

### 🔴 AI Accuracy

-   The AI-generated content is for informational and discovery purposes only. It is a powerful assistant, but it is **not infallible** and may contain inaccuracies, omissions, or "hallucinations" (information that sounds plausible but is incorrect).
-   This application is a tool to **accelerate research, not a substitute for scholarly review and critical evaluation.**
-   **ALWAYS VERIFY CRITICAL INFORMATION BY READING THE ORIGINAL SOURCE ARTICLES PROVIDED.** Links to PubMed are included for every article.

### 🔵 Data Privacy

-   All your data, including the knowledge base and settings, is stored **locally in your browser's storage** (`localStorage`).
-   **No data is ever uploaded to any external server.** Your research is completely private to you and the browser you are using.
-   To back up your data or move it to another machine, you **must** use the export features in `Settings > Data & Privacy`. Clearing your browser data will permanently delete your work unless you have a backup.

***
***

<!-- GERMAN DOCUMENTATION -->

## Inhaltsverzeichnis (Deutsch)

1.  [Hauptfunktionen](#hauptfunktionen)
2.  [Zentrale Arbeitsabläufe](#zentrale-arbeitsabläufe)
3.  [Technologie-Stack](#technologie-stack-de)
4.  [Erste Schritte](#erste-schritte)
5.  [Bedienungsanleitung](#bedienungsanleitung)
6.  [Wichtige Hinweise](#wichtige-hinweise)

---

## Hauptfunktionen

-   **🤖 KI-Forschungsorchestrierung:** Erstellt umfassende Berichte aus einem einfachen Forschungsthema. Die KI formuliert erweiterte PubMed-Anfragen, scannt Artikel und ordnet sie nach Relevanz mit detaillierten Erklärungen.

-   **💡 Schnellanalyse mit dem Forschungsassistenten:** Fügen Sie einen beliebigen Text ein – eine Frage, einen Abstract oder ein Thema – um eine sofortige Zusammenfassung, eine Liste der wichtigsten Erkenntnisse und Vorschläge für verwandte Artikel und Online-Diskussionen zu erhalten.

-   **🧠 Zentrale & Intelligente Wissensdatenbank:** Alle Artikel aus gespeicherten Berichten werden in einer einzigen, durchsuchbaren Bibliothek zusammengefasst. Duplikate werden automatisch entfernt, wobei die Version mit der höchsten Relevanzbewertung beibehalten wird.

-   **🔍 Leistungsstarke Datenexploration:** Die Wissensdatenbank bietet eine robuste Suche, vielseitige Filter (nach Schlüsselwort, Bericht, benutzerdefinierten Tags, Open-Access-Status, Journal) und mehrere Sortieroptionen.

-   **📊 Datenvisualisierungs-Dashboard:** Bietet Diagramme und Grafiken (Treemaps, Balkendiagramme) zur Visualisierung von Trends in der Wissensdatenbank, wie z. B. Top-Schlüsselwörter, Publikationsjahre und Top-Journale.

-   **💾 Robuste Datenverwaltung & Export:**
    -   **PDF:** Erstellen Sie umfassende, professionell formatierte PDFs für Berichte und Auswahlen aus der Wissensdatenbank, mit anpassbarer Titelseite und Inhaltsbereichen.
    -   **CSV:** Exportieren Sie Rohdaten von Artikeln mit konfigurierbaren Spalten und Trennzeichen für Tabellenkalkulationen.
    -   **Zitate:** Erhalten Sie erweiterte Zitatdateien (**BibTeX**, **RIS**) mit Abstracts und Schlüsselwörtern für Literaturverwaltungsprogramme wie Zotero oder Mendeley.
    -   **JSON:** Sichern und stellen Sie Ihren gesamten Forschungsverlauf oder Ihre Einstellungen mit einem Klick wieder her.

-   **⚙️ Umfassende Anpassungsmöglichkeiten:** Ein detailliertes Einstellungsfeld ermöglicht es Benutzern, Themes, das KI-Verhalten (Persona, Sprache, Kreativität), Formular-Standardwerte zu verwalten und Datenverwaltungsaufgaben wie Backups und Bereinigungen durchzuführen.

-   **✨ Modernes, kybernetisches UI/UX:** Eine komplett überarbeitete Benutzeroberfläche mit einem technologischen Design, subtilen Animationen und verbesserter Lesbarkeit für ein erstklassiges Benutzererlebnis.

-   **🔒 Datenschutz-orientierte Architektur:** Alle Daten, einschließlich des Forschungsverlaufs und der Einstellungen, werden **ausschließlich im lokalen Speicher Ihres Browsers** abgelegt. Es werden niemals Daten auf einen Server hochgeladen, was vollständige Privatsphäre gewährleistet.

## Zentrale Arbeitsabläufe

Die Anwendung ist um zwei primäre, miteinander verbundene Arbeitsabläufe herum aufgebaut:

### Arbeitsablauf 1: Die umfassende Literaturrecherche (Orchestrator)

Dies ist für tiefgehende Recherchen zu einem neuen Thema. Sie geben eine breite Forschungsfrage an, und die KI orchestriert einen Multi-Agenten-Prozess, um einen vollständigen Bericht zu erstellen. Dies ist der primäre Weg, um Ihre Wissensdatenbank mit hochwertigen, relevanten Artikeln zu füllen.

### Arbeitsablauf 2: Die schnelle Anfrage (Forschungsassistent)

Dies ist für schnelle, fokussierte Analysen. Sie können einen Abstract einfügen, um eine Zusammenfassung zu erhalten, eine spezifische Frage stellen oder einen Nebengedanken erkunden, ohne sich auf eine vollständige Recherche festzulegen. Wenn die Ergebnisse vielversprechend sind, können Sie das Thema nahtlos an den Orchestrator für eine tiefgehende Analyse übergeben.

## Technologie-Stack (DE)

-   **Frontend:** React, TypeScript
-   **KI-Modell:** Google Gemini API (`@google/genai`)
-   **Styling:** Tailwind CSS
-   **Diagramme:** Chart.js, react-chartjs-2, chartjs-chart-treemap
-   **PDF-Erzeugung:** jsPDF
-   **Modul-Laden:** Kein Build-Schritt erforderlich; verwendet moderne Browser-`importmap`.

## Erste Schritte

Dies ist eine clientseitige Web-App, die keinen Build-Schritt erfordert und durch Bereitstellung der Dateien von jedem statischen Webserver aus ausgeführt werden kann.

### Voraussetzungen

-   Ein moderner Webbrowser, der ES-Module und Import-Maps unterstützt (z. B. Chrome, Firefox, Safari, Edge).
-   Ein gültiger **API-Schlüssel** für die Google Gemini API.

### API-Schlüssel-Einrichtung

Der Gemini-API-Schlüssel wird über `process.env.API_KEY` aufgerufen. Sie müssen diese Variable dem Browser zur Verfügung stellen, bevor die Anwendungsskripte geladen werden.

**Für die lokale Entwicklung:**

1.  **Projektordner bereitstellen:** Verwenden Sie ein Tool wie die [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)-Erweiterung in VS Code oder führen Sie `npx serve` in Ihrem Terminal im Stammverzeichnis des Projekts aus.

2.  **API-Schlüssel bereitstellen:** Öffnen Sie `index.html` und fügen Sie den folgenden `<script>`-Tag im `<head>`-Abschnitt **vor** dem `importmap`-Skript hinzu:

    ```html
    <!-- Fügen Sie diesen Script-Tag für die lokale Entwicklung hinzu -->
    <script>
      window.process = {
        env: {
          // WICHTIG: Ersetzen Sie dies durch Ihren tatsächlichen API-Schlüssel für lokale Tests
          API_KEY: 'IHR_GEMINI_API_SCHLÜSSEL_HIER'
        }
      };
    </script>
    ```

    > **⚠️ Warnung:** Committen Sie Ihren API-Schlüssel nicht in die Versionskontrolle. Diese Methode ist nur für die lokale Entwicklung vorgesehen.

**Für das Deployment:**

Wenn Sie die Anwendung bei einem Hosting-Anbieter (z. B. Vercel, Netlify) bereitstellen, müssen Sie deren System zur Verwaltung von Umgebungsvariablen verwenden. Konfigurieren Sie eine Umgebungsvariable namens `API_KEY` und nutzen Sie die Funktionen Ihres Anbieters, um sie zur Build-/Deployment-Zeit in Ihre `index.html` einzufügen.

> **🔒 Sicherheitshinweis:** Der API-Schlüssel wird direkt vom clientseitigen Code verwendet. Dies ist ein potenzielles Sicherheitsrisiko. Es ist **entscheidend**, dass Sie Sicherheitsmaßnahmen für Ihren Schlüssel gemäß den Richtlinien von Google implementieren, wie z. B. die Beschränkung der Schlüsselnutzung auf Ihre spezifische Domain.

## Bedienungsanleitung

1.  **Der Orchestrator (Definieren & Starten):**
    -   Gehen Sie zum `Orchestrator`-Tab.
    -   Definieren Sie Ihr Thema so detailliert wie möglich. Verwenden Sie boolesche Operatoren (`AND`, `OR`, `NOT`) für Präzision.
    -   Legen Sie Filter für den Datumsbereich, Artikeltypen und den Fokus der Zusammenfassung fest.
    -   Klicken Sie auf `Forschung starten` und verfolgen Sie den Fortschritt der KI.
    -   Überprüfen Sie nach Abschluss den Bericht. Wenn er wertvoll ist, klicken Sie auf `In Wissensdatenbank speichern`, um die Artikel dauerhaft zu Ihrer Bibliothek hinzuzufügen.

2.  **Der Forschungsassistent (Fragen & Analysieren):**
    -   Gehen Sie für schnelle Anfragen zum `Forschung`-Tab.
    -   Geben Sie einen beliebigen Text ein: eine Frage, einen Abstract oder ein Thema.
    -   Klicken Sie auf `Analysieren`, um eine Zusammenfassung, wichtige Erkenntnisse und verwandte Inhalte zu erhalten.
    -   Wenn die Ergebnisse vielversprechend sind, verwenden Sie die Schaltfläche "Vollständige Recherche starten", um das Thema an den Orchestrator zu übergeben.

3.  **Die Wissensdatenbank (Erkunden & Verwalten):**
    -   Gehen Sie zum `Knowledge Base`-Tab, nachdem Sie Berichte gespeichert haben.
    -   Verwenden Sie das linke Panel, um Ihre gesamte Artikelbibliothek zu filtern.
    -   Klicken Sie auf einen Artikel, um eine Seitenleiste mit allen Details zu öffnen. Fügen Sie hier benutzerdefinierte Tags hinzu, um Ihre Arbeit zu organisieren.
    -   Verwenden Sie die Kontrollkästchen, um Artikel für Massenaktionen wie Löschen oder Exportieren auszuwählen.

4.  **Dashboard & Verlauf (Visualisieren & Wiederfinden):**
    -   Navigieren Sie zum `Dashboard` (unter dem Menü "Mehr"), um Ihre Wissensdatenbank visualisiert zu sehen.
    -   Gehen Sie zum `Verlauf`-Tab, um alle zuvor gespeicherten Berichte zu durchsuchen und erneut aufzurufen.

5.  **Einstellungen & Daten (Anpassen & Exportieren):**
    -   Besuchen Sie den `Einstellungen`-Tab (Zahnrad-Symbol).
    -   Passen Sie das Theme, die KI-Persona und die Standard-Formularwerte an.
    -   Konfigurieren Sie den Inhalt Ihrer PDF-, CSV- und Zitat-Exporte.
    -   Exportieren Sie unter "Daten & Datenschutz" Ihren gesamten Verlauf oder Ihre Einstellungen zur Sicherung in eine JSON-Datei.

## Wichtige Hinweise

### 🔴 KI-Genauigkeit

-   Die von der KI generierten Inhalte dienen nur zu Informations- und Entdeckungszwecken. Sie ist ein leistungsstarker Assistent, aber **nicht unfehlbar** und kann Ungenauigkeiten, Auslassungen oder "Halluzinationen" (Informationen, die plausibel klingen, aber falsch sind) enthalten.
-   Diese Anwendung ist ein Werkzeug zur **Beschleunigung der Forschung, kein Ersatz für wissenschaftliche Überprüfung und kritische Bewertung.**
-   **ÜBERPRÜFEN SIE KRITISCHE INFORMATIONEN IMMER, INDEM SIE DIE ORIGINALEN QUELLARTIKEL LESEN.** Links zu PubMed sind für jeden Artikel enthalten.

### 🔵 Datenschutz

-   Alle Ihre Daten, einschließlich der Wissensdatenbank und der Einstellungen, werden **lokal im Speicher Ihres Browsers** (`localStorage`) gespeichert.
-   **Es werden niemals Daten auf einen externen Server hochgeladen.** Ihre Forschung ist für Sie und den von Ihnen verwendeten Browser völlig privat.
-   Um Ihre Daten zu sichern oder auf einen anderen Rechner zu übertragen, **müssen** Sie die Exportfunktionen unter `Einstellungen > Daten & Datenschutz` verwenden. Das Löschen Ihrer Browserdaten wird Ihre Arbeit dauerhaft löschen, es sei denn, Sie haben ein Backup.