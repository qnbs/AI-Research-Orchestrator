# AI Research Orchestrator

## Overview

The AI Research Orchestrator is an expert system designed to manage a swarm of specialized AI agents to conduct comprehensive literature reviews using the PubMed database. The primary objective of the application is to streamline and automate the process of collecting, curating, and synthesizing scientific research based on user-defined criteria.

The application allows researchers to quickly identify relevant articles, extract key insights, and build a structured knowledge base, significantly reducing the manual effort involved in literature reviews.

## Key Features

-   **AI-Powered Reporting:** Generates comprehensive reports based on a research topic, date range, and article types.
-   **Advanced PubMed Queries:** AI agents formulate and explain complex PubMed queries for targeted searches.
-   **Article Ranking:** Articles are scored and ranked by relevance, complete with an explanation for their score.
-   **Synthesis & Insights:** Creates a narrative summary of top articles and answers AI-generated key questions with evidence from the literature.
-   **Central Knowledge Base:** Stores articles from all reports in a single, searchable location. Duplicates are automatically removed.
-   **Powerful Filtering & Search:** Search the knowledge base by keywords, authors, reports, custom tags, or filter for open-access articles.
-   **Detailed Article View:** Dive deep into individual articles, add custom tags, and see related AI insights from across different reports.
-   **Data Export:** Export selected articles as a PDF summary, a CSV file, or in BibTeX (.bib) and RIS (.ris) citation formats for reference managers like Zotero, Mendeley, or EndNote.
-   **Customizable Settings:** Tailor the appearance (light/dark), AI parameters (e.g., language, persona), and form defaults to fit your workflow.

## Technology Stack

-   **Frontend:** React, TypeScript
-   **Styling:** Tailwind CSS
-   **AI Model:** Google Gemini API (`@google/genai`)
-   **PDF Generation:** jsPDF

## Setup and Configuration

This application is a client-side web app built with React and TypeScript, utilizing an `importmap` in `index.html` for dependency management. It requires no build step and can be run by serving the files with any static web server.

### Prerequisites

-   A modern web browser that supports ES modules and import maps (e.g., Chrome, Firefox, Safari, Edge).
-   A valid API key for the Google Gemini API.

### Configuration

The Gemini API key is accessed via `process.env.API_KEY` in the code. Because this is a client-side application without a build process, you must make this variable available to the browser when serving the files.

**For Local Development:**

The easiest way to run the app locally is to use a simple static server and inject the API key.

1.  **Serve the project folder:** Use a tool like the [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension in VS Code, or run `npx serve` in your terminal from the project's root directory.

2.  **Provide the API Key:** Before you load the app, you need to set your API key. Open `index.html` and add the following `<script>` tag inside the `<head>` section, **before** the `importmap` script:

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
    <!-- The importmap script should be after the key injection -->
    <script type="importmap">
    ...
    </script>
    ```

    **Note:** Do not commit your API key to version control. This method is for local development only.

**For Deployment:**

In your hosting environment (e.g., Vercel, Netlify, Firebase Hosting), configure an environment variable named `API_KEY`. You will need to use your hosting provider's features to inject this variable into your `index.html` at deploy time, similar to the local development method.

**Important:** The API key is used directly by the client-side code. Ensure you implement any necessary security measures for your key as per Google's guidelines (e.g., restricting the key's usage to your specific domain).

## Usage

1.  **Define Research Parameters:** Enter your research topic and criteria (date range, article types, etc.) in the form on the "Orchestrator" tab.
2.  **Start Research:** Click "Start Research". The AI agents will begin analyzing and searching for articles. Progress will be shown in phases.
3.  **Analyze Report:** Once complete, a detailed report is displayed. Expand the sections to view the synthesis, AI insights, and ranked articles.
4.  **Save Report:** Click "Save to Knowledge Base" to store all articles from the report in your personal library. (This can be automated in Settings).
5.  **Explore Knowledge Base:** Switch to the "Knowledge Base" tab to see all your saved articles. Use the filter and search tools to refine your results.
6.  **Export Data:** Select articles in the Knowledge Base and use the toolbar to delete them or export them as a PDF, CSV, or citation file.

## Important Notes & Disclaimer

-   **Data Storage:** All your data, including the knowledge base and settings, is stored **locally in your browser's storage** (`localStorage`). No data is uploaded to an external server. Your research is private. To back up your data, use the export feature in Settings.
-   **AI Accuracy:** The AI-generated content is for informational purposes only and may contain inaccuracies or errors. **Always verify critical information by reading the original source articles provided.** This application is a tool to assist research, not a substitute for critical evaluation.
