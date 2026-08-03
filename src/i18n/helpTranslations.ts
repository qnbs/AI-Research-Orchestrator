const HELP_VERSION = '0.4.0';

export const helpTranslations = {
  en: {
    // ── Help ──
    'help.title': 'Help & Documentation',
    'help.subtitle': 'Find answers and learn how to get the most out of the application.',
    'help.search.placeholder': 'Search documentation...',
    'help.scroll_top': 'Scroll to top',
    'help.tabs.guide': 'User Guide',
    'help.tabs.faq': 'FAQ & Shortcuts',
    'help.tabs.glossary': 'Glossary',
    'help.tabs.about': 'About',
    'help.empty.guide': 'No help topics match your search.',
    'help.empty.faq': 'No FAQs match your search.',
    'help.empty.glossary': 'No glossary terms match your search.',
    'help.note.pro_tip_advanced': 'Pro-Tip: Advanced Topics',
    'help.note.author_disambiguation': 'What is Author Disambiguation?',
    'help.note.unique_articles': "What does 'Unique Articles' mean?",
    'help.note.back_up': 'Back Up Your Data',
    'help.guide.workflows.title': 'Understanding the Core Workflows',
    'help.guide.workflows.intro':
      'This app offers three distinct but interconnected paths for conducting research:',
    'help.guide.workflows.research.label': 'Research Tab:',
    'help.guide.workflows.research.desc':
      'For quick, focused analysis of a specific question, abstract, or piece of text. It is perfect for exploring a single idea before committing to a full review.',
    'help.guide.workflows.orchestrator.label': 'The Orchestrator:',
    'help.guide.workflows.orchestrator.desc':
      'For comprehensive literature reviews on a broad topic. This is your starting point for building out a new area of your knowledge base by analyzing many articles at once.',
    'help.guide.workflows.author.label': 'The Author Hub:',
    'help.guide.workflows.author.desc':
      'For deep dives into the work of a specific researcher. It helps you understand their impact, collaborations, and the evolution of their research focus over time.',
    'help.guide.workflows.keywords': 'workflow orchestrator research author hub core concept',
    'help.guide.orchestrator.title': 'Using the Orchestrator',
    'help.guide.orchestrator.intro.start': 'The',
    'help.guide.orchestrator.intro.strong': 'Orchestrator',
    'help.guide.orchestrator.intro.end':
      'tab is where you conduct large-scale literature reviews. Here is how to fill out the form effectively:',
    'help.guide.orchestrator.topic.label': 'Primary Research Topic:',
    'help.guide.orchestrator.topic.start': 'Be as specific as possible. Instead of',
    'help.guide.orchestrator.topic.bad': 'coffee',
    'help.guide.orchestrator.topic.middle': ', try',
    'help.guide.orchestrator.topic.good':
      'the effects of caffeine on sleep quality in young adults',
    'help.guide.orchestrator.topic.end': '. This helps the AI agents focus their search.',
    'help.guide.orchestrator.date.label': 'Publication Date:',
    'help.guide.orchestrator.date.desc': 'Choose a timeframe relevant to your topic.',
    'help.guide.orchestrator.types.label': 'Article Types:',
    'help.guide.orchestrator.types.start': 'Select the types of evidence you trust most.',
    'help.guide.orchestrator.types.systematic': 'Systematic Reviews',
    'help.guide.orchestrator.types.and': 'and',
    'help.guide.orchestrator.types.meta': 'Meta-Analyses',
    'help.guide.orchestrator.types.end':
      'provide high-quality summaries and are considered strong forms of evidence.',
    'help.guide.orchestrator.focus.label': 'Synthesis Focus:',
    'help.guide.orchestrator.focus.desc':
      'This tells the AI what angle to take when summarizing the findings. Are you interested in a general overview, or specifically looking for gaps in the research?',
    'help.guide.orchestrator.config.label': 'AI Agent Configuration:',
    'help.guide.orchestrator.config.desc':
      'The sliders control the scope. "Max Articles to Scan" is the initial pool of papers the AI will consider. "Top Articles to Synthesize" is the number of highest-ranked papers that will be used for the detailed report.',
    'help.guide.orchestrator.tip.start': 'Use boolean operators',
    'help.guide.orchestrator.tip.and': 'AND',
    'help.guide.orchestrator.tip.or': 'OR',
    'help.guide.orchestrator.tip.not': 'NOT',
    'help.guide.orchestrator.tip.middle': 'in your topic for more precise control, e.g.,',
    'help.guide.orchestrator.tip.example':
      '(intermittent fasting OR time-restricted eating) AND cognitive function NOT Alzheimer',
    'help.guide.orchestrator.tip.end': '.',
    'help.guide.orchestrator.after':
      'After you click "Start Research", a detailed report will appear. If you like the results, click "Save" to permanently store the articles in your Knowledge Base. You can also edit the report title before saving.',
    'help.guide.orchestrator.keywords':
      'research parameters topic date type synthesis focus start new report save',
    'help.guide.research.title': 'Using the Research Tab',
    'help.guide.research.intro.start': 'The',
    'help.guide.research.intro.strong': 'Research',
    'help.guide.research.intro.end': 'tab is for quick analysis. This tool is ideal for:',
    'help.guide.research.use.summary':
      "Getting a quick summary of a paper's abstract before you read it.",
    'help.guide.research.use.question': 'Asking a specific scientific question.',
    'help.guide.research.use.exploration':
      'Exploring a new topic to see if it is worth a full literature review.',
    'help.guide.research.analyze':
      'Simply paste your text or question into the box and click "Analyze". The AI provides a summary, extracts key findings, and, based on your settings, can automatically search for related PubMed articles and online news/discussions.',
    'help.guide.research.full_review':
      'If the results are promising, use the "Start Full Review on This Topic" button to seamlessly transfer the AI-synthesized topic to the Orchestrator for a deeper dive.',
    'help.guide.research.keywords': 'assistant analyze summary key findings similar online',
    'help.guide.authors.title': 'Using the Author Hub',
    'help.guide.authors.intro.start': 'The',
    'help.guide.authors.intro.strong': 'Authors',
    'help.guide.authors.intro.end': "tab lets you analyze a researcher's body of work.",
    'help.guide.authors.search.label': 'Search or Suggest:',
    'help.guide.authors.search.desc':
      'You can either directly search for an author by name or ask the AI to suggest prominent researchers in a field of study (e.g., "mRNA vaccine technology").',
    'help.guide.authors.disambiguate.label': 'Disambiguate:',
    'help.guide.authors.disambiguate.desc':
      'The AI will search PubMed and may find multiple potential authors with similar names. It presents you with distinct profiles based on co-authors, affiliations, and research topics. Select the correct one to proceed.',
    'help.guide.authors.profile.label': 'View Profile:',
    'help.guide.authors.profile.desc':
      'Once confirmed, the app generates a complete profile, including an AI-written career summary, key research concepts, estimated metrics, and an interactive publication timeline.',
    'help.guide.authors.note':
      'This is a crucial step to ensure you are analyzing the correct person. Many researchers share common names. The AI groups publications into clusters that likely belong to a single individual to prevent mixing up their work.',
    'help.guide.authors.keywords': 'author hub profile career summary disambiguation disambiguate',
    'help.guide.knowledge.title': 'Mastering the Knowledge Base',
    'help.guide.knowledge.intro.start': 'Saved reports contribute their articles to your personal',
    'help.guide.knowledge.intro.strong': 'Knowledge Base',
    'help.guide.knowledge.intro.end':
      'This view consolidates all unique articles from all your reports into a single, powerful interface.',
    'help.guide.knowledge.search.label': 'Search & Filter:',
    'help.guide.knowledge.search.desc':
      'Use the extensive options on the left to narrow down hundreds of articles. You can filter by keywords from the text, report topics, your own custom tags, or show only open-access articles.',
    'help.guide.knowledge.manage.label': 'Manage Articles:',
    'help.guide.knowledge.manage.desc':
      'Select one or more articles via the checkboxes to perform bulk actions, such as deleting them or exporting citation data for your reference manager.',
    'help.guide.knowledge.details.label': 'Article Details:',
    'help.guide.knowledge.details.desc':
      'Click on any article title to open a side panel. Here, you can add custom tags, read the full summary, and use the "Discovery Tools" to find even more related articles or online discussions.',
    'help.guide.knowledge.note':
      'The Knowledge Base automatically de-duplicates articles. If two different reports find the same article (based on its PMID), it will only appear once in your Knowledge Base. The version with the highest relevance score is retained by default.',
    'help.guide.knowledge.keywords':
      'knowledge base library search filter manage delete export unique tags details',
    'help.guide.export.title': 'Exporting Your Data',
    'help.guide.export.intro.start':
      'You can export data from several places in the app, with all options configurable in the',
    'help.guide.export.settings': 'Settings → Export',
    'help.guide.export.intro.end': 'tab.',
    'help.guide.export.report.label': 'From a Report:',
    'help.guide.export.report.desc':
      'Export a single report as a PDF, its article data as a CSV, or just the AI Insights as a CSV.',
    'help.guide.export.kb.label': 'From the Knowledge Base:',
    'help.guide.export.kb.desc':
      'Select articles and export them as a summary PDF, a data-rich CSV, or a citation file.',
    'help.guide.export.pdf.label': 'PDF:',
    'help.guide.export.pdf.desc':
      'Creates a clean, summary report of the selected articles. Ideal for sharing.',
    'help.guide.export.csv.label': 'CSV:',
    'help.guide.export.csv.desc': 'Exports the raw data for spreadsheets or other analysis tools.',
    'help.guide.export.citations.label': 'Citations:',
    'help.guide.export.citations.start': 'Get files in',
    'help.guide.export.citations.bib': 'BibTeX (.bib)',
    'help.guide.export.citations.or': 'or',
    'help.guide.export.citations.ris': 'RIS (.ris)',
    'help.guide.export.citations.end':
      'format for reference managers like Zotero, Mendeley, or EndNote.',
    'help.guide.export.keywords': 'export pdf csv citations bibtex ris zotero mendeley data',
    'help.guide.navigation.title': 'General Features & Navigation',
    'help.guide.navigation.intro':
      'Several features are available throughout the app to enhance your workflow.',
    'help.guide.navigation.command.label': 'Command Palette:',
    'help.guide.navigation.command.start': 'Press',
    'help.guide.navigation.command.middle': '(or',
    'help.guide.navigation.command.end':
      'on Windows) to open a powerful search bar. From here, you can instantly navigate to any section, change the theme, or perform context-aware actions like saving a report.',
    'help.guide.navigation.quick_add.label': 'Quick Add:',
    'help.guide.navigation.quick_add.desc':
      'Use the "Quick Add" button in the header to add a single article to your Knowledge Base using its PMID, DOI, or PubMed URL. The AI will analyze it and create a single-article report.',
    'help.guide.navigation.header.label': 'Header Navigation:',
    'help.guide.navigation.header.desc':
      'The main header provides quick access to all core workflows. The "More" dropdown contains secondary views like the Dashboard and History, which become active once you have saved your first report.',
    'help.guide.navigation.keywords': 'navigation command palette quick add header more',
    'help.faq.privacy.title': 'Is my data private?',
    'help.faq.privacy.answer.label': 'Yes.',
    'help.faq.privacy.answer.start':
      "All data, including your research history, saved articles, and settings, is stored exclusively in your browser's",
    'help.faq.privacy.storage': 'IndexedDB',
    'help.faq.privacy.answer.end':
      'database. There is no app backend that stores your research. In live mode, prompts and article metadata go to the AI provider you configure, and search queries go to NCBI/arXiv.',
    'help.faq.privacy.backup.start':
      'Because the data is stored locally, it can be lost if you clear your browser data. Use the export features in',
    'help.faq.privacy.backup.settings': 'Settings → Data Management & Privacy',
    'help.faq.privacy.backup.end': 'regularly to create JSON backups.',
    'help.faq.trust.title': "Can I fully trust the AI's output?",
    'help.faq.trust.answer.label': 'No.',
    'help.faq.trust.answer':
      'The AI is a powerful assistant, but it is not infallible. It can make mistakes, misinterpret data, or "hallucinate" information that sounds plausible but is incorrect. The content generated by the AI is for informational and discovery purposes only.',
    'help.faq.trust.verify':
      'Always verify critical information by reading the original source articles.',
    'help.faq.trust.review':
      'This application is a tool to accelerate research, not a substitute for scholarly review and critical evaluation.',
    'help.faq.pubmed.title': 'How does the app access PubMed?',
    'help.faq.pubmed.answer':
      'The application interacts directly with the public NCBI E-utilities API to search for and retrieve article data from PubMed. It acts as a client, sending requests from your browser to the NCBI servers. No intermediary server is involved.',
    'help.faq.cost.title': 'Will this cost me money to use?',
    'help.faq.cost.answer':
      "The application itself is free. You can use heuristic/offline mode without any API key, or connect a live provider such as Gemini, OpenAI, Anthropic, or Ollama for higher-fidelity AI features. Live cloud providers may incur costs depending on your usage and the vendor's pricing.",
    'help.faq.cost.responsibility':
      'Monitor usage and billing in the dashboard for whichever provider you configure. Local heuristic mode and local Ollama endpoints do not create cloud API charges.',
    'help.faq.missing.title': "Why isn't an article I know exists showing up?",
    'help.faq.missing.intro': 'There could be several reasons:',
    'help.faq.missing.reason.query':
      'The AI search queries may not have been broad or specific enough to capture it.',
    'help.faq.missing.reason.filters':
      'The article might fall outside the specified date range or article type filters.',
    'help.faq.missing.reason.ranking':
      'The article abstract may not have contained enough relevant keywords for the AI to rank it highly, causing it to fall below your chosen "Top N" articles for synthesis.',
    'help.faq.missing.try':
      'Try broadening your research topic or adjusting the filters. You can also review the "Generated PubMed Queries" in a report to see how the AI searched.',
    'help.faq.shortcuts.title': 'Keyboard Shortcuts',
    'help.faq.shortcuts.intro': 'Speed up your workflow with these keyboard shortcuts:',
    'help.faq.shortcuts.command_palette': 'Open Command Palette',
    'help.faq.shortcuts.submit': 'Submit Research Form',
    'help.faq.shortcuts.close': 'Close modal / panel / palette',
    'help.glossary.ai_persona.title': 'AI Persona',
    'help.glossary.ai_persona.desc':
      'A setting that guides the AI tone and style. For example, "Concise Expert" will produce shorter, more direct text than "Detailed Analyst". This is configured in the AI settings.',
    'help.glossary.author_disambiguation.title': 'Author Disambiguation',
    'help.glossary.author_disambiguation.desc':
      'The process by which the AI distinguishes between different researchers who may share the same name. It does this by analyzing co-authors, institutional affiliations, and publication topics to group articles into distinct profiles.',
    'help.glossary.bibtex_ris.title': 'BibTeX / RIS',
    'help.glossary.bibtex_ris.desc':
      'Standard file formats for bibliographic citations. Files with `.bib` (BibTeX) or `.ris` extensions can be imported into most reference management software like Zotero, Mendeley, or EndNote.',
    'help.glossary.knowledge_base.title': 'Knowledge Base',
    'help.glossary.knowledge_base.desc':
      'The central library within the app that stores all unique articles from all of your saved reports. It provides a de-duplicated, searchable, and filterable view of your entire research collection.',
    'help.glossary.pmid.title': 'PMID (PubMed ID)',
    'help.glossary.pmid.desc':
      'A unique numerical identifier assigned to each article in the PubMed database. It is the most reliable way to reference a specific paper.',
    'help.glossary.relevance.title': 'Relevance Score',
    'help.glossary.relevance.desc':
      'A score from 1-100 generated by the AI, indicating how relevant an article title and abstract are to your original research query. It serves as an initial filter to prioritize the most promising articles.',
    'help.glossary.synthesis.title': 'Synthesis Focus',
    'help.glossary.synthesis.desc':
      'A setting in the Orchestrator form that directs the AI on what aspect of the research to focus on when writing its summary. For example, focusing on "Clinical Implications" will yield a different synthesis than "Gaps in Research".',
    'help.about.title': 'About AI Research Orchestration Author',
    'help.about.description':
      'This application is a tool designed to accelerate the process of scientific literature review. It leverages generative AI to automate the tedious tasks of searching, filtering, and synthesizing information from the PubMed database.',
    'help.about.version.label': 'Version:',
    'help.about.version.value': HELP_VERSION,
    'help.about.principles.title': 'Core Principles',
    'help.about.principles.privacy.label': 'Privacy First:',
    'help.about.principles.privacy.desc':
      'Reports, history, and settings stay in your browser (IndexedDB). There is no app backend storing your research. In live mode, prompts and article metadata are sent to the AI provider you configure, and search queries go to NCBI/arXiv — see Settings and SECURITY.md.',
    'help.about.principles.assistant.label': 'AI as an Assistant:',
    'help.about.principles.assistant.desc':
      'The AI is a powerful tool, but it is meant to augment, not replace, human intelligence. Always critically evaluate its output.',
    'help.about.principles.traceability.label': 'Traceability:',
    'help.about.principles.traceability.desc':
      'Ranked insights and exports are corpus-validated where implemented; narrative synthesis is labeled corpus-supported or unverified narrative draft. Always verify against primary sources.',
    'help.about.disclaimer.title': 'Disclaimer',
    'help.about.disclaimer.desc':
      'This tool is for informational and research assistance purposes only. It is not a substitute for professional medical or scientific advice. The AI can make mistakes; always verify information from the primary source articles.',
  },
  de: {
    // ── Help ──
    'help.title': 'Hilfe & Dokumentation',
    'help.subtitle': 'Finden Sie Antworten und erfahren Sie, wie Sie die Anwendung optimal nutzen.',
    'help.search.placeholder': 'Dokumentation durchsuchen...',
    'help.scroll_top': 'Nach oben scrollen',
    'help.tabs.guide': 'Benutzerhandbuch',
    'help.tabs.faq': 'FAQ & Tastenkürzel',
    'help.tabs.glossary': 'Glossar',
    'help.tabs.about': 'Über',
    'help.empty.guide': 'Keine Hilfethemen passen zu Ihrer Suche.',
    'help.empty.faq': 'Keine FAQs passen zu Ihrer Suche.',
    'help.empty.glossary': 'Keine Glossarbegriffe passen zu Ihrer Suche.',
    'help.note.pro_tip_advanced': 'Profi-Tipp: Erweiterte Themen',
    'help.note.author_disambiguation': 'Was ist Autorendisambiguierung?',
    'help.note.unique_articles': "Was bedeutet 'Eindeutige Artikel'?",
    'help.note.back_up': 'Sichern Sie Ihre Daten',
    'help.guide.workflows.title': 'Die zentralen Workflows verstehen',
    'help.guide.workflows.intro':
      'Diese App bietet drei unterschiedliche, aber miteinander verbundene Wege für die Recherche:',
    'help.guide.workflows.research.label': 'Recherche-Tab:',
    'help.guide.workflows.research.desc':
      'Für schnelle, fokussierte Analysen einer konkreten Frage, eines Abstracts oder eines Textabschnitts. Ideal, um eine einzelne Idee zu erkunden, bevor Sie eine vollständige Übersicht starten.',
    'help.guide.workflows.orchestrator.label': 'Der Orchestrator:',
    'help.guide.workflows.orchestrator.desc':
      'Für umfassende Literaturübersichten zu einem breiten Thema. Dies ist Ihr Ausgangspunkt, um einen neuen Bereich Ihrer Wissensdatenbank aufzubauen, indem viele Artikel auf einmal analysiert werden.',
    'help.guide.workflows.author.label': 'Der Autoren-Hub:',
    'help.guide.workflows.author.desc':
      'Für vertiefte Analysen der Arbeit eines bestimmten Forschers. Er hilft Ihnen, Wirkung, Kollaborationen und die Entwicklung des Forschungsschwerpunkts im Zeitverlauf zu verstehen.',
    'help.guide.workflows.keywords': 'workflow orchestrator recherche autoren hub konzept',
    'help.guide.orchestrator.title': 'Den Orchestrator verwenden',
    'help.guide.orchestrator.intro.start': 'Der',
    'help.guide.orchestrator.intro.strong': 'Orchestrator',
    'help.guide.orchestrator.intro.end':
      'Tab ist der Ort für groß angelegte Literaturübersichten. So füllen Sie das Formular wirkungsvoll aus:',
    'help.guide.orchestrator.topic.label': 'Primäres Forschungsthema:',
    'help.guide.orchestrator.topic.start': 'Seien Sie so spezifisch wie möglich. Statt',
    'help.guide.orchestrator.topic.bad': 'Kaffee',
    'help.guide.orchestrator.topic.middle': ', versuchen Sie',
    'help.guide.orchestrator.topic.good':
      'die Effekte von Koffein auf die Schlafqualität bei jungen Erwachsenen',
    'help.guide.orchestrator.topic.end': '. Das hilft den KI-Agenten, ihre Suche zu fokussieren.',
    'help.guide.orchestrator.date.label': 'Publikationsdatum:',
    'help.guide.orchestrator.date.desc': 'Wählen Sie einen Zeitraum, der zu Ihrem Thema passt.',
    'help.guide.orchestrator.types.label': 'Artikeltypen:',
    'help.guide.orchestrator.types.start':
      'Wählen Sie die Evidenztypen aus, denen Sie am meisten vertrauen.',
    'help.guide.orchestrator.types.systematic': 'Systematische Reviews',
    'help.guide.orchestrator.types.and': 'und',
    'help.guide.orchestrator.types.meta': 'Meta-Analysen',
    'help.guide.orchestrator.types.end':
      'liefern hochwertige Zusammenfassungen und gelten als starke Evidenzformen.',
    'help.guide.orchestrator.focus.label': 'Synthesefokus:',
    'help.guide.orchestrator.focus.desc':
      'Dies gibt der KI vor, welchen Blickwinkel sie beim Zusammenfassen der Ergebnisse einnehmen soll. Interessieren Sie sich für einen allgemeinen Überblick oder suchen Sie gezielt nach Forschungslücken?',
    'help.guide.orchestrator.config.label': 'KI-Agenten-Konfiguration:',
    'help.guide.orchestrator.config.desc':
      'Die Regler steuern den Umfang. "Max. zu scannende Artikel" ist der anfängliche Pool von Papers, den die KI berücksichtigt. "Top-Artikel für die Synthese" ist die Anzahl der höchstbewerteten Papers, die für den Detailbericht verwendet werden.',
    'help.guide.orchestrator.tip.start': 'Verwenden Sie boolesche Operatoren',
    'help.guide.orchestrator.tip.and': 'AND',
    'help.guide.orchestrator.tip.or': 'OR',
    'help.guide.orchestrator.tip.not': 'NOT',
    'help.guide.orchestrator.tip.middle': 'in Ihrem Thema für präzisere Kontrolle, z. B.',
    'help.guide.orchestrator.tip.example':
      '(intermittierendes Fasten OR zeitbeschränktes Essen) AND kognitive Funktion NOT Alzheimer',
    'help.guide.orchestrator.tip.end': '.',
    'help.guide.orchestrator.after':
      'Nachdem Sie auf "Recherche starten" klicken, erscheint ein detaillierter Bericht. Wenn Ihnen die Ergebnisse gefallen, klicken Sie auf "Speichern", um die Artikel dauerhaft in Ihrer Wissensdatenbank abzulegen. Sie können den Berichtstitel vor dem Speichern auch bearbeiten.',
    'help.guide.orchestrator.keywords':
      'recherche parameter thema datum typ synthese fokus starten neuer bericht speichern',
    'help.guide.research.title': 'Den Recherche-Tab verwenden',
    'help.guide.research.intro.start': 'Der',
    'help.guide.research.intro.strong': 'Recherche',
    'help.guide.research.intro.end':
      'Tab ist für schnelle Analysen gedacht. Dieses Werkzeug eignet sich ideal für:',
    'help.guide.research.use.summary':
      'Eine schnelle Zusammenfassung eines Paper-Abstracts, bevor Sie ihn lesen.',
    'help.guide.research.use.question': 'Eine konkrete wissenschaftliche Frage stellen.',
    'help.guide.research.use.exploration':
      'Ein neues Thema erkunden, um zu sehen, ob sich eine vollständige Literaturübersicht lohnt.',
    'help.guide.research.analyze':
      'Fügen Sie einfach Ihren Text oder Ihre Frage in das Feld ein und klicken Sie auf "Analysieren". Die KI liefert eine Zusammenfassung, extrahiert Kernergebnisse und kann je nach Einstellungen automatisch nach verwandten PubMed-Artikeln sowie Online-Nachrichten oder Diskussionen suchen.',
    'help.guide.research.full_review':
      'Wenn die Ergebnisse vielversprechend sind, nutzen Sie die Schaltfläche "Vollständige Übersicht zu diesem Thema starten", um das KI-synthetisierte Thema nahtlos für eine tiefere Analyse an den Orchestrator zu übergeben.',
    'help.guide.research.keywords':
      'assistent analysieren zusammenfassung kernergebnisse ähnlich online',
    'help.guide.authors.title': 'Den Autoren-Hub verwenden',
    'help.guide.authors.intro.start': 'Der',
    'help.guide.authors.intro.strong': 'Autoren',
    'help.guide.authors.intro.end': 'Tab ermöglicht die Analyse des Gesamtwerks eines Forschers.',
    'help.guide.authors.search.label': 'Suchen oder Vorschlagen:',
    'help.guide.authors.search.desc':
      'Sie können direkt nach einem Autorennamen suchen oder die KI bitten, einflussreiche Forschende in einem Fachgebiet vorzuschlagen (z. B. "mRNA-Impfstofftechnologie").',
    'help.guide.authors.disambiguate.label': 'Disambiguieren:',
    'help.guide.authors.disambiguate.desc':
      'Die KI durchsucht PubMed und kann mehrere mögliche Autoren mit ähnlichen Namen finden. Sie zeigt unterschiedliche Profile auf Basis von Co-Autoren, Affiliationen und Forschungsthemen. Wählen Sie das richtige Profil aus, um fortzufahren.',
    'help.guide.authors.profile.label': 'Profil ansehen:',
    'help.guide.authors.profile.desc':
      'Nach der Bestätigung erzeugt die App ein vollständiges Profil, einschließlich KI-geschriebener Karrierezusammenfassung, zentraler Forschungskonzepte, geschätzter Metriken und interaktiver Publikations-Timeline.',
    'help.guide.authors.note':
      'Dies ist ein wichtiger Schritt, damit Sie die richtige Person analysieren. Viele Forschende teilen häufige Namen. Die KI gruppiert Publikationen in Cluster, die wahrscheinlich zu einer einzelnen Person gehören, um Verwechslungen zu vermeiden.',
    'help.guide.authors.keywords':
      'autoren hub profil karriere zusammenfassung disambiguierung disambiguieren',
    'help.guide.knowledge.title': 'Die Wissensdatenbank meistern',
    'help.guide.knowledge.intro.start':
      'Gespeicherte Berichte tragen ihre Artikel zu Ihrer persönlichen',
    'help.guide.knowledge.intro.strong': 'Wissensdatenbank',
    'help.guide.knowledge.intro.end':
      'bei. Diese Ansicht konsolidiert alle eindeutigen Artikel aus all Ihren Berichten in einer einzigen, leistungsfähigen Oberfläche.',
    'help.guide.knowledge.search.label': 'Suchen & Filtern:',
    'help.guide.knowledge.search.desc':
      'Nutzen Sie die umfangreichen Optionen links, um Hunderte von Artikeln einzugrenzen. Sie können nach Schlüsselwörtern aus dem Text, Berichtsthemen, eigenen Tags filtern oder nur Open-Access-Artikel anzeigen.',
    'help.guide.knowledge.manage.label': 'Artikel verwalten:',
    'help.guide.knowledge.manage.desc':
      'Wählen Sie einen oder mehrere Artikel per Checkbox aus, um Sammelaktionen auszuführen, etwa Löschen oder Export von Zitationsdaten für Ihren Literaturmanager.',
    'help.guide.knowledge.details.label': 'Artikeldetails:',
    'help.guide.knowledge.details.desc':
      'Klicken Sie auf einen Artikeltitel, um ein Seitenpanel zu öffnen. Dort können Sie eigene Tags hinzufügen, die vollständige Zusammenfassung lesen und die "Discovery Tools" nutzen, um weitere verwandte Artikel oder Online-Diskussionen zu finden.',
    'help.guide.knowledge.note':
      'Die Wissensdatenbank dedupliziert Artikel automatisch. Wenn zwei verschiedene Berichte denselben Artikel finden (basierend auf der PMID), erscheint er nur einmal in Ihrer Wissensdatenbank. Standardmäßig bleibt die Version mit dem höchsten Relevanzwert erhalten.',
    'help.guide.knowledge.keywords':
      'wissensdatenbank bibliothek suche filter verwalten löschen export eindeutig tags details',
    'help.guide.export.title': 'Ihre Daten exportieren',
    'help.guide.export.intro.start':
      'Sie können Daten an mehreren Stellen der App exportieren; alle Optionen sind im Tab',
    'help.guide.export.settings': 'Einstellungen → Export',
    'help.guide.export.intro.end': 'konfigurierbar.',
    'help.guide.export.report.label': 'Aus einem Bericht:',
    'help.guide.export.report.desc':
      'Exportieren Sie einen einzelnen Bericht als PDF, seine Artikeldaten als CSV oder nur die KI-Insights als CSV.',
    'help.guide.export.kb.label': 'Aus der Wissensdatenbank:',
    'help.guide.export.kb.desc':
      'Wählen Sie Artikel aus und exportieren Sie sie als Zusammenfassungs-PDF, datenreiche CSV oder Zitationsdatei.',
    'help.guide.export.pdf.label': 'PDF:',
    'help.guide.export.pdf.desc':
      'Erstellt einen übersichtlichen Zusammenfassungsbericht der ausgewählten Artikel. Ideal zum Teilen.',
    'help.guide.export.csv.label': 'CSV:',
    'help.guide.export.csv.desc':
      'Exportiert die Rohdaten für Tabellenkalkulationen oder andere Analysewerkzeuge.',
    'help.guide.export.citations.label': 'Zitationen:',
    'help.guide.export.citations.start': 'Erhalten Sie Dateien im Format',
    'help.guide.export.citations.bib': 'BibTeX (.bib)',
    'help.guide.export.citations.or': 'oder',
    'help.guide.export.citations.ris': 'RIS (.ris)',
    'help.guide.export.citations.end': 'für Literaturmanager wie Zotero, Mendeley oder EndNote.',
    'help.guide.export.keywords': 'export pdf csv zitationen bibtex ris zotero mendeley daten',
    'help.guide.navigation.title': 'Allgemeine Funktionen & Navigation',
    'help.guide.navigation.intro':
      'Mehrere Funktionen stehen in der gesamten App bereit, um Ihren Workflow zu verbessern.',
    'help.guide.navigation.command.label': 'Befehlspalette:',
    'help.guide.navigation.command.start': 'Drücken Sie',
    'help.guide.navigation.command.middle': '(oder',
    'help.guide.navigation.command.end':
      'unter Windows), um eine leistungsfähige Suchleiste zu öffnen. Von dort können Sie sofort zu jedem Bereich navigieren, das Design wechseln oder kontextbezogene Aktionen wie das Speichern eines Berichts ausführen.',
    'help.guide.navigation.quick_add.label': 'Schnell-Hinzufügen:',
    'help.guide.navigation.quick_add.desc':
      'Nutzen Sie die Schaltfläche "Schnell-Hinzufügen" im Header, um einen einzelnen Artikel per PMID, DOI oder PubMed-URL zu Ihrer Wissensdatenbank hinzuzufügen. Die KI analysiert ihn und erstellt einen Einzelartikel-Bericht.',
    'help.guide.navigation.header.label': 'Header-Navigation:',
    'help.guide.navigation.header.desc':
      'Der Haupt-Header bietet schnellen Zugriff auf alle zentralen Workflows. Das Dropdown "Mehr" enthält sekundäre Ansichten wie Dashboard und Verlauf, die aktiv werden, sobald Sie Ihren ersten Bericht gespeichert haben.',
    'help.guide.navigation.keywords': 'navigation befehlspalette schnell hinzufügen header mehr',
    'help.faq.privacy.title': 'Sind meine Daten privat?',
    'help.faq.privacy.answer.label': 'Ja.',
    'help.faq.privacy.answer.start':
      'Alle Daten, einschließlich Rechercheverlauf, gespeicherter Artikel und Einstellungen, werden ausschließlich in der Browser-Datenbank',
    'help.faq.privacy.storage': 'IndexedDB',
    'help.faq.privacy.answer.end':
      'gespeichert. Es gibt kein App-Backend, das Ihre Recherche speichert. Im Live-Modus gehen Prompts und Artikelmetadaten an den konfigurierten KI-Anbieter sowie Suchanfragen an NCBI/arXiv.',
    'help.faq.privacy.backup.start':
      'Da die Daten lokal gespeichert werden, können sie verloren gehen, wenn Sie Browserdaten löschen. Nutzen Sie regelmäßig die Exportfunktionen unter',
    'help.faq.privacy.backup.settings': 'Einstellungen → Datenverwaltung & Datenschutz',
    'help.faq.privacy.backup.end': 'regelmäßig, um JSON-Backups zu erstellen.',
    'help.faq.trust.title': 'Kann ich den KI-Ausgaben vollständig vertrauen?',
    'help.faq.trust.answer.label': 'Nein.',
    'help.faq.trust.answer':
      'Die KI ist ein leistungsfähiger Assistent, aber nicht unfehlbar. Sie kann Fehler machen, Daten falsch interpretieren oder Informationen "halluzinieren", die plausibel klingen, aber falsch sind. Von der KI erzeugte Inhalte dienen nur Informations- und Entdeckungszwecken.',
    'help.faq.trust.verify':
      'Prüfen Sie kritische Informationen immer durch Lesen der Originalartikel.',
    'help.faq.trust.review':
      'Diese Anwendung ist ein Werkzeug zur Beschleunigung der Recherche, kein Ersatz für wissenschaftliche Prüfung und kritische Bewertung.',
    'help.faq.pubmed.title': 'Wie greift die App auf PubMed zu?',
    'help.faq.pubmed.answer':
      'Die Anwendung interagiert direkt mit der öffentlichen NCBI-E-utilities-API, um Artikeldaten aus PubMed zu suchen und abzurufen. Sie agiert als Client und sendet Anfragen aus Ihrem Browser an die NCBI-Server. Es ist kein zwischengeschalteter Server beteiligt.',
    'help.faq.cost.title': 'Kostet mich die Nutzung Geld?',
    'help.faq.cost.answer':
      'Die Anwendung selbst ist kostenlos. Sie können den Heuristik-/Offline-Modus ohne API-Schlüssel nutzen oder einen Live-Anbieter wie Gemini, OpenAI, Anthropic oder Ollama für hochwertigere KI-Funktionen verbinden. Live-Cloud-Anbieter können je nach Nutzung und Anbieterpreisen Kosten verursachen.',
    'help.faq.cost.responsibility':
      'Überwachen Sie Nutzung und Abrechnung im Dashboard des jeweils konfigurierten Anbieters. Lokaler Heuristik-Modus und lokale Ollama-Endpunkte verursachen keine Cloud-API-Kosten.',
    'help.faq.missing.title':
      'Warum erscheint ein Artikel nicht, von dem ich weiß, dass er existiert?',
    'help.faq.missing.intro': 'Dafür kann es mehrere Gründe geben:',
    'help.faq.missing.reason.query':
      'Die KI-Suchanfragen waren möglicherweise nicht breit oder spezifisch genug, um ihn zu erfassen.',
    'help.faq.missing.reason.filters':
      'Der Artikel liegt eventuell außerhalb des angegebenen Datumsbereichs oder der Artikeltyp-Filter.',
    'help.faq.missing.reason.ranking':
      'Der Abstract des Artikels enthielt möglicherweise nicht genug relevante Schlüsselwörter, damit die KI ihn hoch einstuft, sodass er unter Ihre gewählten "Top N" Artikel für die Synthese fiel.',
    'help.faq.missing.try':
      'Versuchen Sie, Ihr Forschungsthema zu erweitern oder die Filter anzupassen. Sie können auch die "Generierten PubMed-Suchanfragen" in einem Bericht prüfen, um zu sehen, wie die KI gesucht hat.',
    'help.faq.shortcuts.title': 'Tastenkürzel',
    'help.faq.shortcuts.intro': 'Beschleunigen Sie Ihren Workflow mit diesen Tastenkürzeln:',
    'help.faq.shortcuts.command_palette': 'Befehlspalette öffnen',
    'help.faq.shortcuts.submit': 'Rechercheformular absenden',
    'help.faq.shortcuts.close': 'Modal / Panel / Palette schließen',
    'help.glossary.ai_persona.title': 'KI-Persona',
    'help.glossary.ai_persona.desc':
      'Eine Einstellung, die Ton und Stil der KI steuert. Zum Beispiel erzeugt "Prägnanter Experte" kürzere und direktere Texte als "Detaillierter Analyst". Dies wird in den KI-Einstellungen konfiguriert.',
    'help.glossary.author_disambiguation.title': 'Autorendisambiguierung',
    'help.glossary.author_disambiguation.desc':
      'Der Prozess, mit dem die KI zwischen unterschiedlichen Forschenden unterscheidet, die denselben Namen haben können. Sie analysiert Co-Autoren, institutionelle Zugehörigkeiten und Publikationsthemen, um Artikel in getrennte Profile zu gruppieren.',
    'help.glossary.bibtex_ris.title': 'BibTeX / RIS',
    'help.glossary.bibtex_ris.desc':
      'Standarddateiformate für bibliografische Zitationen. Dateien mit den Erweiterungen `.bib` (BibTeX) oder `.ris` können in die meisten Literaturverwaltungen wie Zotero, Mendeley oder EndNote importiert werden.',
    'help.glossary.knowledge_base.title': 'Wissensdatenbank',
    'help.glossary.knowledge_base.desc':
      'Die zentrale Bibliothek in der App, die alle eindeutigen Artikel aus all Ihren gespeicherten Berichten speichert. Sie bietet eine deduplizierte, durchsuchbare und filterbare Ansicht Ihrer gesamten Forschungssammlung.',
    'help.glossary.pmid.title': 'PMID (PubMed-ID)',
    'help.glossary.pmid.desc':
      'Eine eindeutige numerische Kennung, die jedem Artikel in der PubMed-Datenbank zugewiesen wird. Sie ist die zuverlässigste Art, ein bestimmtes Paper zu referenzieren.',
    'help.glossary.relevance.title': 'Relevanzwert',
    'help.glossary.relevance.desc':
      'Ein von der KI erzeugter Wert von 1 bis 100, der angibt, wie relevant Titel und Abstract eines Artikels für Ihre ursprüngliche Recherchefrage sind. Er dient als erste Filterung, um die vielversprechendsten Artikel zu priorisieren.',
    'help.glossary.synthesis.title': 'Synthesefokus',
    'help.glossary.synthesis.desc':
      'Eine Einstellung im Orchestrator-Formular, die der KI vorgibt, auf welchen Aspekt der Forschung sie sich beim Schreiben der Zusammenfassung konzentrieren soll. Ein Fokus auf "Klinische Implikationen" erzeugt beispielsweise eine andere Synthese als "Forschungslücken".',
    'help.about.title': 'Über AI Research Orchestration Author',
    'help.about.description':
      'Diese Anwendung ist ein Werkzeug, das den Prozess wissenschaftlicher Literaturrecherche beschleunigen soll. Sie nutzt generative KI, um aufwendige Aufgaben wie Suchen, Filtern und Synthetisieren von Informationen aus der PubMed-Datenbank zu automatisieren.',
    'help.about.version.label': 'Version:',
    'help.about.version.value': HELP_VERSION,
    'help.about.principles.title': 'Grundprinzipien',
    'help.about.principles.privacy.label': 'Datenschutz zuerst:',
    'help.about.principles.privacy.desc':
      'Berichte, Historie und Einstellungen bleiben in Ihrem Browser (IndexedDB). Es gibt kein App-Backend, das Ihre Recherche speichert. Im Live-Modus gehen Prompts und Artikelmetadaten an den konfigurierten KI-Anbieter sowie Suchanfragen an NCBI/arXiv — siehe Einstellungen und SECURITY.md.',
    'help.about.principles.assistant.label': 'KI als Assistent:',
    'help.about.principles.assistant.desc':
      'Die KI ist ein leistungsfähiges Werkzeug, soll menschliche Intelligenz aber ergänzen, nicht ersetzen. Bewerten Sie ihre Ausgaben immer kritisch.',
    'help.about.principles.traceability.label': 'Nachvollziehbarkeit:',
    'help.about.principles.traceability.desc':
      'Gerankte Insights und Exporte sind korpusvalidiert, wo umgesetzt; narrative Synthese wird als corpus-supported oder unverified narrative draft gekennzeichnet. Prüfen Sie immer die Primärquellen.',
    'help.about.disclaimer.title': 'Haftungsausschluss',
    'help.about.disclaimer.desc':
      'Dieses Werkzeug dient nur Informations- und Rechercheunterstützungszwecken. Es ist kein Ersatz für professionelle medizinische oder wissenschaftliche Beratung. Die KI kann Fehler machen; überprüfen Sie Informationen immer anhand der primären Quellenartikel.',
  },
} as const;

export type HelpTranslationKey = keyof typeof helpTranslations.en;
