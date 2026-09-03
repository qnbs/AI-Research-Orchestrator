/** First-run onboarding screen (NOW-P0-JOURNEY-01). */
export const onboardingTranslations = {
  en: {
    'onboarding.welcome_prefix': 'Welcome to',
    'onboarding.welcome_highlight': 'AI Research Orchestrator',
    'onboarding.subtitle': 'A client-only PWA for biomedical literature reviews.',
    'onboarding.step1.title': 'Define Your Topic',
    'onboarding.step1.desc':
      'Enter a research query. The pipeline searches PubMed (and optionally arXiv), ranks the hits, and streams a cited synthesis.',
    'onboarding.step2.title': 'Receive a cited synthesis',
    'onboarding.step2.desc':
      'Live mode uses your chosen AI provider. Offline or without a key, the built-in heuristic engine still runs the same phases.',
    'onboarding.step3.title': 'Leverage Your Knowledge',
    'onboarding.step3.desc':
      'Build a personal, de-duplicated knowledge base and export your findings for any workflow.',
    'onboarding.start': 'Start Researching',
    'onboarding.startSample': 'Start with a sample topic (heuristic)',
    'onboarding.modePreview':
      'No API key required. The heuristic engine runs the same phases. Add a provider key later in Settings.',
    'onboarding.sampleTopic':
      'GLP-1 receptor agonists and cardiovascular outcomes in type 2 diabetes',
    'onboarding.privacy':
      'Research stays in this browser. Live mode still sends prompts and article metadata to your AI provider, and queries PubMed/arXiv.',
    'onboarding.language': 'Language',
    'onboarding.theme': 'Theme',
  },
  de: {
    'onboarding.welcome_prefix': 'Willkommen beim',
    'onboarding.welcome_highlight': 'AI Research Orchestrator',
    'onboarding.subtitle': 'Eine clientseitige PWA für biomedizinische Literaturrecherchen.',
    'onboarding.step1.title': 'Thema definieren',
    'onboarding.step1.desc':
      'Geben Sie eine Forschungsfrage ein. Die Pipeline durchsucht PubMed (optional arXiv), bewertet die Treffer und streamt eine zitierte Synthese.',
    'onboarding.step2.title': 'Zitierte Synthese erhalten',
    'onboarding.step2.desc':
      'Im Live-Modus nutzt die App Ihren gewählten KI-Anbieter. Offline oder ohne Schlüssel übernimmt die eingebaute heuristische Engine dieselben Phasen.',
    'onboarding.step3.title': 'Wissen nutzen',
    'onboarding.step3.desc':
      'Bauen Sie eine persönliche, deduplizierte Wissensdatenbank auf und exportieren Sie Ihre Ergebnisse für jeden Workflow.',
    'onboarding.start': 'Recherche starten',
    'onboarding.startSample': 'Mit einem Beispielthema starten (heuristisch)',
    'onboarding.modePreview':
      'Kein API-Schlüssel nötig. Die heuristische Engine durchläuft dieselben Phasen. Einen Anbieter-Schlüssel später in den Einstellungen hinzufügen.',
    'onboarding.sampleTopic':
      'GLP-1-Rezeptoragonisten und kardiovaskuläre Endpunkte bei Typ-2-Diabetes',
    'onboarding.privacy':
      'Recherche bleibt in diesem Browser. Im Live-Modus gehen Prompts und Artikelmetadaten an Ihren KI-Anbieter, Suchanfragen an PubMed/arXiv.',
    'onboarding.language': 'Sprache',
    'onboarding.theme': 'Design',
  },
} as const;
