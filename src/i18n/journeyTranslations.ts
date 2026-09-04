/** Home launchpad, empty-state teaching, chrome shorts, provider status. */
export const journeyTranslations = {
  en: {
    'nav.more': 'More',
    'nav.library': 'Library',
    'nav.explore': 'Explore',
    'nav.orchestrator.short': 'Review',
    'nav.research.short': 'Assistant',
    'nav.requires_report': 'Available after you save a literature review.',
    'nav.search_commands': 'Search commands',
    'nav.overflow': 'More destinations',

    'home.welcome': 'Start a literature review, or take a quick look at one paper.',
    'home.hero.title': 'New literature review',
    'home.hero.desc':
      'Full pipeline: topic → PubMed/arXiv → rank → cited synthesis. Works without an API key.',
    'home.secondary.title': 'Quick research',
    'home.secondary.desc':
      'TL;DR, similar articles, and a focused look at one question or abstract.',
    'home.status.mode': 'Inference',
    'home.status.library': '{count} articles in the library',
    'home.status.library_one': '{count} article in the library',
    'home.status.library_empty': 'Library is empty',
    'home.status.last_report': 'Last review: {title}',
    'home.status.no_report': 'No saved review yet',
    'home.how.title': 'How this app works',
    'home.how.1': 'Describe a biomedical topic. Defaults are already set for a literature review.',
    'home.how.2': 'The pipeline retrieves PubMed (and optional arXiv), then ranks and synthesizes.',
    'home.how.3': 'Heuristic mode needs no key. Add a provider in Settings when you want live AI.',
    'home.how.4':
      'Keyboard: Ctrl+K or ⌘K opens commands. On a phone, More → Search commands. There is no extra command-palette walkthrough (first-run onboarding is separate).',

    'empty.cta.review': 'Start a literature review',
    'empty.cta.sample': 'Open sample topic',
    'welcome.cta': 'Focus the topic field above',

    'inputForm.options': 'Review options',
    'inputForm.options.hint':
      'Date range, article types, scan caps, arXiv, educational demo, presets.',
    'inputForm.hint.heuristic':
      'Heuristic engine is active. Same phases, local ranking — not a live model.',
    'inputForm.chip.covid': 'Long-term neurocognitive effects of COVID-19',
    'inputForm.chip.glp1': 'GLP-1 receptor agonists and cardiovascular outcomes',
    'inputForm.chip.sleep': 'Sleep restriction and insulin resistance',

    'provider.status.configure': 'Configure',
    'provider.status.heuristic': 'Heuristic engine · no API key required',
    'provider.status.live': 'Live · {provider}',
    'provider.status.forced': 'Heuristic · forced in Settings',
    'provider.status.offline': 'Heuristic · offline',
    'provider.status.ollama': 'Local Ollama · {model}',
    'provider.status.ollama_privacy':
      'Generation stays on this machine. PubMed and arXiv retrieval still use the network when you are online.',
    'provider.status.ollama_privacy_remote':
      'Generation is sent to the configured Ollama endpoint. PubMed and arXiv retrieval still use the network when you are online.',
  },
  de: {
    'nav.more': 'Mehr',
    'nav.library': 'Bibliothek',
    'nav.explore': 'Entdecken',
    'nav.orchestrator.short': 'Recherche',
    'nav.research.short': 'Assistent',
    'nav.requires_report': 'Verfügbar, nachdem Sie eine Literaturrecherche gespeichert haben.',
    'nav.search_commands': 'Befehle suchen',
    'nav.overflow': 'Weitere Ziele',

    'home.welcome':
      'Starten Sie eine Literaturrecherche oder werfen Sie einen schnellen Blick auf ein Paper.',
    'home.hero.title': 'Neue Literaturrecherche',
    'home.hero.desc':
      'Volle Pipeline: Thema → PubMed/arXiv → Ranking → zitierte Synthese. Funktioniert ohne API-Schlüssel.',
    'home.secondary.title': 'Schnellrecherche',
    'home.secondary.desc':
      'TL;DR, ähnliche Artikel und ein gezielter Blick auf eine Frage oder ein Abstract.',
    'home.status.mode': 'Inferenz',
    'home.status.library': '{count} Artikel in der Bibliothek',
    'home.status.library_one': '{count} Artikel in der Bibliothek',
    'home.status.library_empty': 'Bibliothek ist leer',
    'home.status.last_report': 'Letzte Recherche: {title}',
    'home.status.no_report': 'Noch keine gespeicherte Recherche',
    'home.how.title': 'So funktioniert diese App',
    'home.how.1':
      'Beschreiben Sie ein biomedizinisches Thema. Die Standardwerte passen für eine Literaturrecherche.',
    'home.how.2': 'Die Pipeline holt PubMed (optional arXiv), bewertet und synthetisiert.',
    'home.how.3':
      'Der Heuristikmodus braucht keinen Schlüssel. Einen Anbieter später in den Einstellungen hinzufügen.',
    'home.how.4':
      'Tastatur: Strg+K oder ⌘K öffnet Befehle. Am Telefon: Mehr → Befehle suchen. Es gibt keine extra Befehlspaletten-Tour (das Erststart-Onboarding ist getrennt).',

    'empty.cta.review': 'Literaturrecherche starten',
    'empty.cta.sample': 'Beispielthema öffnen',
    'welcome.cta': 'Themenfeld oben fokussieren',

    'inputForm.options': 'Rechercheoptionen',
    'inputForm.options.hint':
      'Zeitraum, Artikeltypen, Scan-Limits, arXiv, Bildungs-Demo, Vorgaben.',
    'inputForm.hint.heuristic':
      'Heuristische Engine aktiv. Dieselben Phasen, lokales Ranking — kein Live-Modell.',
    'inputForm.chip.covid': 'Langfristige neurokognitive Effekte von COVID-19',
    'inputForm.chip.glp1': 'GLP-1-Rezeptoragonisten und kardiovaskuläre Endpunkte',
    'inputForm.chip.sleep': 'Schlafrestriktion und Insulinresistenz',

    'provider.status.configure': 'Konfigurieren',
    'provider.status.heuristic': 'Heuristische Engine · kein API-Schlüssel nötig',
    'provider.status.live': 'Live · {provider}',
    'provider.status.forced': 'Heuristik · in den Einstellungen erzwungen',
    'provider.status.offline': 'Heuristik · offline',
    'provider.status.ollama': 'Lokales Ollama · {model}',
    'provider.status.ollama_privacy':
      'Die Generierung bleibt auf diesem Rechner. PubMed- und arXiv-Abfragen nutzen weiterhin das Netzwerk, solange Sie online sind.',
    'provider.status.ollama_privacy_remote':
      'Die Generierung geht an den konfigurierten Ollama-Endpunkt. PubMed- und arXiv-Abfragen nutzen weiterhin das Netzwerk, solange Sie online sind.',
  },
} as const;
