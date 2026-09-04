/** Settings tabs + confirm/toast chrome. General (wave 1) + AI/KB/Export/Data/shell (wave 2). */
export const settingsTranslations = {
  en: {
    'settings.tab.knowledgeBase': 'Knowledge Base',
    'settings.tab.export': 'Export',
    'settings.tab.data': 'Data Management & Privacy',
    'settings.aria.categories': 'Settings categories',
    'settings.nav.about': 'About & Features',
    'settings.nav.faq': 'FAQ & Shortcuts',

    'settings.language.en': 'English',
    'settings.language.en_hint': 'Default',
    'settings.language.de': 'Deutsch',
    'settings.language.de_hint': 'German',

    'settings.appearance.desc': 'Customize the look and feel of the application.',
    'settings.appearance.density_tooltip':
      "Adjust the spacing and size of UI elements. 'Compact' is useful for smaller screens or fitting more information.",
    'settings.appearance.density.comfortable': 'Comfortable',
    'settings.appearance.density.compact': 'Compact',
    'settings.appearance.custom_colors': 'Enable Custom Colors',
    'settings.appearance.color.primary': 'Primary color',
    'settings.appearance.color.secondary': 'Secondary color',
    'settings.appearance.color.accent': 'Accent color',
    'settings.appearance.color.picker_aria': '{color} color picker',
    'settings.appearance.color.hex_aria': '{color} color hex value',

    'settings.pwa.title': 'Application',
    'settings.pwa.desc': "Manage the application's installation status and offline capabilities.",
    'settings.pwa.installed': 'App is installed and ready for offline use.',
    'settings.pwa.brand_status': 'PWA · Offline-ready · 🔬',
    'settings.pwa.install_cta': 'Install App on this Device',
    'settings.pwa.install_hint':
      'Install for a native-like experience, including an icon on your home screen or desktop.',
    'settings.pwa.install_unavailable':
      'This app can be installed on your device. Your browser may offer an install option in the address bar or settings menu.',

    'settings.notifications.title': 'Notifications',
    'settings.notifications.desc': 'Control how and where notifications appear.',
    'settings.notifications.position': 'Position',
    'settings.notifications.duration': 'Duration (ms)',
    'settings.notifications.position.bottom_right': 'Bottom Right',
    'settings.notifications.position.bottom_left': 'Bottom Left',
    'settings.notifications.position.top_right': 'Top Right',
    'settings.notifications.position.top_left': 'Top Left',

    'settings.performance.title': 'Performance',
    'settings.performance.desc':
      'Manage performance-related settings. Disabling animations may improve responsiveness on older devices.',
    'settings.performance.enable_animations': 'Enable UI Animations',

    'settings.developerMode.title': 'Developer Mode',
    'settings.developerMode.desc':
      'Shows internal diagnostic tooling, such as the Agent Debugger, in the header. Intended for development and troubleshooting.',
    'settings.developerMode.toggle': 'Show Agent Debugger in header',

    // ── AI tab ──
    'settings.ai.desc': "Fine-tune the AI's behavior, language, and core instructions.",
    'settings.ai.persona': 'AI Persona',
    'settings.ai.persona.neutral': 'Neutral Scientist',
    'settings.ai.persona.neutral_desc':
      'Adopts a neutral, objective, and strictly scientific tone.',
    'settings.ai.persona.concise': 'Concise Expert',
    'settings.ai.persona.concise_desc':
      'Be brief and to the point. Focuses on delivering the most critical information without verbosity.',
    'settings.ai.persona.detailed': 'Detailed Analyst',
    'settings.ai.persona.detailed_desc':
      'Provides in-depth analysis. Explores nuances, methodologies, and potential implications thoroughly.',
    'settings.ai.persona.creative': 'Creative Synthesizer',
    'settings.ai.persona.creative_desc':
      'Identifies and highlights novel connections, cross-disciplinary links, and innovative perspectives found in the literature.',
    'settings.ai.temperature': 'AI Creativity (Temperature)',
    'settings.ai.temperature_tooltip':
      "Controls randomness in the AI's output. Lower values are more focused, higher values are more creative.",
    'settings.ai.temperature_protip': 'Pro-Tip:',
    'settings.ai.temperature_tip_low': '0.0 - 0.3: Best for factual, predictable tasks.',
    'settings.ai.temperature_tip_mid': '0.4 - 0.7: A good balance for most tasks.',
    'settings.ai.temperature_tip_high': '0.8 - 1.0: Ideal for brainstorming or creative insights.',
    'settings.ai.output_language': 'AI Language (Output)',
    'settings.ai.output_language_desc':
      'Controls the language of generated reports, independent of the interface language.',
    'settings.ai.lang.english': 'English',
    'settings.ai.lang.german': 'German',
    'settings.ai.lang.french': 'French',
    'settings.ai.lang.spanish': 'Spanish',
    'settings.ai.preamble': 'Custom Preamble (Advanced)',
    'settings.ai.preamble_tooltip':
      'This text will be added to the beginning of every AI prompt, allowing you to give overriding instructions.',
    'settings.ai.preamble_placeholder':
      'e.g., Focus specifically on studies involving human trials.',
    'settings.ai.tldr_desc':
      'Adds a button in the article detail view to generate an ultra-short (1-2 sentence) summary of an abstract. This will make an additional API call.',
    'settings.ai.hub.title': 'Research & Author Hub',
    'settings.ai.hub.desc': 'Configure the behavior of the specialized research tools.',
    'settings.ai.hub.auto_similar': 'Automatically Find Similar Articles',
    'settings.ai.hub.auto_online': 'Automatically Find Online Discussions',
    'settings.ai.hub.author_limit': 'Author Search Limit',
    'settings.ai.hub.author_limit_tooltip':
      'Controls the maximum number of publications to fetch for an author search. Higher values are more thorough but slower and use more API credits.',
    'settings.ai.formDefaults.title': 'Form Defaults',
    'settings.ai.formDefaults.desc':
      'Set default values for the Research Parameters form to speed up your workflow.',
    'settings.ai.formDefaults.max_scan': 'Default Max Articles to Scan',
    'settings.ai.formDefaults.top_synth': 'Default Top Articles to Synthesize',
    'settings.ai.formDefaults.date': 'Default Publication Date',
    'settings.ai.formDefaults.focus': 'Default Synthesis Focus',
    'settings.ai.formDefaults.article_types': 'Default Article Types',
    'settings.ai.formDefaults.auto_save': 'Automatically Save New Reports',
    'settings.cost.tier_heuristic': 'Heuristic',
    'settings.ai.base_url_desc.ollama':
      'Loopback Local AI (default http://localhost:11434). Generation stays on this machine. Remote LAN Ollama is not first-class and needs a tailored CSP / self-host build. Approve a non-default origin before requests are sent.',
    'settings.ai.ollama.fail.cors':
      'The browser could not reach Ollama (network or CORS). First-class Local AI is loopback (localhost, 127.0.0.1, or [::1] on port 11434). A remote host needs a tailored CSP. Detail: {message}',
    'settings.ai.ollama.fail.timeout':
      'Ollama did not answer in time. A slow or overloaded server is not the same as “not installed”. Detail: {message}',
    'settings.ai.ollama.fail.unavailable':
      'Ollama is not running or not reachable at this URL. Start the local server, then refresh. Detail: {message}',
    'settings.ai.ollama.fail.invalid_endpoint':
      'This base URL is not a permitted Local AI endpoint. Use http://localhost:11434 unless you have approved another origin that the CSP allows. Detail: {message}',
    'settings.ai.ollama.fail.http':
      'Ollama returned an HTTP error. Check the server logs and the selected origin. Detail: {message}',
    'settings.ai.ollama.fail.aborted': 'Health check cancelled. Refresh to try again.',
    'settings.ai.ollama.fail.model_list':
      'Connected, but listing models failed. The selected model was not checked against the server. Detail: {message}',
    'settings.ai.ollama.budget_info':
      'Estimated prompt-input budget ≈ {budget} tokens ({source}). Ranking and synthesis omit articles that do not fit; if none fit, the run errors instead of truncating silently.',
    'settings.ai.ollama.budget_source.context_length': 'reported context window',
    'settings.ai.ollama.budget_source.parameter_heuristic': 'parameter-size hint',
    'settings.ai.ollama.budget_source.default': 'default estimate',

    // ── Knowledge Base tab ──
    'settings.kb.display.title': 'Display Defaults',
    'settings.kb.display.desc':
      'Configure the default appearance and behavior of the Knowledge Base.',
    'settings.kb.view': 'Default View Mode',
    'settings.kb.view.grid': 'Grid View',
    'settings.kb.view.list': 'List View',
    'settings.kb.sort': 'Default Sort Order',
    'settings.kb.sort.relevance': 'Sort by Relevance',
    'settings.kb.sort.newest': 'Sort by Newest',
    'settings.kb.per_page': 'Articles Per Page',
    'settings.kb.cleaning.title': 'Data Cleaning Tools',
    'settings.kb.cleaning.desc':
      'Perform powerful maintenance actions. Merge duplicate articles to keep your library clean, or prune low-relevance articles to focus on the highest quality data.',
    'settings.kb.merge.title': 'Merge Duplicates',
    'settings.kb.merge.desc':
      'Harmonize tags and relevance scores for duplicate PMIDs across saved entries. Historical report snapshots stay intact; the library view already deduplicates by PMID.',
    'settings.kb.prune.title': 'Prune by Relevance Score',
    'settings.kb.prune.desc':
      'Permanently remove low-scoring articles from saved research reports only. Author and journal profiles are not pruned.',
    'settings.kb.notification.no_duplicates': 'No duplicate articles found to merge.',
    'settings.kb.notification.already_canonical':
      'Duplicate articles already share canonical metadata.',
    'settings.kb.notification.harmonized':
      'Harmonized metadata for {count} duplicate article copy(ies). Historical report snapshots were preserved.',
    'settings.kb.notification.merge_failed': 'Failed to merge duplicates.',
    'settings.kb.notification.pruned': '{count} research article(s) pruned.',
    'settings.kb.notification.no_prune_candidates':
      'No research articles found with a score below {score}.',
    'settings.kb.notification.prune_failed': 'Failed to prune articles.',
    'settings.kb.presets.title': 'Research Presets',
    'settings.kb.presets.desc': 'Manage your saved research form settings for quick access.',
    'settings.kb.presets.empty':
      'You have no saved presets. Save one from the Literature review form.',
    'settings.kb.presets.delete_aria': 'Delete preset {name}',

    // ── Export tab ──
    'settings.export.pdf.title': 'PDF Export Settings',
    'settings.export.pdf.desc': 'Customize the content and appearance of your PDF exports.',
    'settings.export.pdf.cover': 'Include Cover Page',
    'settings.export.pdf.toc': 'Include Table of Contents',
    'settings.export.pdf.header': 'Include Header on each page',
    'settings.export.pdf.footer': 'Include Footer with page numbers',
    'settings.export.pdf.prepared_for': '“Prepared For” Name (Optional)',
    'settings.export.pdf.sections': 'Include Report Sections',
    'settings.export.pdf.synthesis': 'Executive Synthesis',
    'settings.export.pdf.insights': 'AI-Generated Insights',
    'settings.export.pdf.queries': 'Generated PubMed Queries',
    'settings.export.csv.title': 'CSV Export Settings',
    'settings.export.csv.desc': 'Choose which data fields to include in CSV exports.',
    'settings.export.csv.delimiter': 'Delimiter',
    'settings.export.csv.delimiter.comma': 'Comma (,)',
    'settings.export.csv.delimiter.semicolon': 'Semicolon (;)',
    'settings.export.csv.delimiter.tab': 'Tab',
    'settings.export.csv.columns': 'Include Columns',
    'settings.export.csv.select_all': 'Select All',
    'settings.export.csv.deselect_all': 'Deselect All',
    'settings.export.csv.column.pmid': 'PMID',
    'settings.export.csv.column.pmcId': 'PMC ID',
    'settings.export.csv.column.title': 'Title',
    'settings.export.csv.column.authors': 'Authors',
    'settings.export.csv.column.journal': 'Journal',
    'settings.export.csv.column.pubYear': 'Publication Year',
    'settings.export.csv.column.summary': 'Summary',
    'settings.export.csv.column.aiSummary': 'AI Summary',
    'settings.export.csv.column.relevanceScore': 'Relevance Score',
    'settings.export.csv.column.relevanceExplanation': 'Relevance Explanation',
    'settings.export.csv.column.keywords': 'Keywords',
    'settings.export.csv.column.customTags': 'Custom Tags',
    'settings.export.csv.column.sourceTitle': 'Source Title',
    'settings.export.csv.column.isOpenAccess': 'Open Access',
    'settings.export.csv.column.articleType': 'Article Type',
    'settings.export.csv.column.URL': 'URL',
    'settings.export.csv.column.PMCID_URL': 'PMCID URL',
    'settings.export.citation.title': 'Citation Export Settings',
    'settings.export.citation.desc': 'Customize BibTeX and RIS citation file contents.',
    'settings.export.citation.abstract': 'Include Abstract',
    'settings.export.citation.keywords': 'Include Keywords',
    'settings.export.citation.tags': 'Include Custom Tags',
    'settings.export.citation.pmcid': 'Include PMCID (PubMed Central ID)',

    // ── Data tab ──
    'settings.data.storage.title': 'Local Storage Usage',
    'settings.data.storage.desc':
      'This application stores all data in your browser. Monitor your usage here.',
    'settings.data.storage.used': 'Storage Used',
    'settings.data.storage.quota': '{used} MB / ~{quota} MB',
    'settings.data.backup.title': 'Data Backup & Restore',
    'settings.data.backup.desc':
      'You have {reports} reports containing {articles} unique articles.',
    'settings.data.backup.export_history': 'Export History (All Reports)',
    'settings.data.backup.export_kb': 'Export Knowledge Base (All Articles)',
    'settings.data.backup.import': 'Import History / KB',
    'settings.data.settings_backup.title': 'Settings Backup & Restore',
    'settings.data.settings_backup.desc':
      'Backup your settings or transfer them to another browser.',
    'settings.data.settings_backup.export': 'Export Settings',
    'settings.data.settings_backup.import': 'Import Settings',
    'settings.data.danger.title': 'Danger Zone',
    'settings.data.danger.desc': 'These actions are irreversible and will permanently delete data.',
    'settings.data.danger.clear_kb': 'Clear Entire Knowledge Base',
    'settings.data.danger.reset': 'Reset All Settings',

    // ── Confirm modals ──
    'settings.modal.clear.title': 'Clear Knowledge Base?',
    'settings.modal.clear.message':
      'Are you sure you want to delete all {count} articles from your knowledge base? This action cannot be undone.',
    'settings.modal.clear.confirm': 'Yes, Delete All',
    'settings.modal.reset.title': 'Reset All Settings?',
    'settings.modal.reset.message':
      'Are you sure you want to reset all application settings to their default values? This cannot be undone.',
    'settings.modal.reset.confirm': 'Yes, Reset All',
    'settings.modal.import.title': 'Import Knowledge Base',
    'settings.modal.import.message':
      'Import {count} sanitized knowledge-base entries? External files are re-validated on import; corpus-supported synthesis trust cannot be preserved.',
    'settings.modal.import.quarantine':
      'Trust downgraded: {trustDowngraded}. Invalid citations stripped: {invalidCitations}. Rejected before import: {rejected}.',
    'settings.modal.import.confirm': 'Yes, Import',
    'settings.modal.prune.title': 'Prune by Relevance Score',
    'settings.modal.prune.desc':
      'This will permanently delete all articles from your knowledge base with a relevance score below the value you select.',
    'settings.modal.prune.score_aria': 'Prune score',
    'settings.modal.prune.warning': 'This action will permanently delete {count} article(s).',
    'settings.modal.prune.confirm': 'Prune Articles',
    'settings.modal.prune.processing': 'Pruning...',
    'settings.modal.merge.title': 'Merge Duplicates',
    'settings.modal.merge.message':
      'This harmonizes duplicate PMIDs by copying tags and relevance from the highest-scored copy. Saved report snapshots are not deleted. Proceed?',
    'settings.modal.merge.confirm': 'Yes, Merge',
    'settings.modal.merge.processing': 'Merging...',
    'settings.modal.delete_preset.title': 'Delete Preset "{name}"?',
    'settings.modal.delete_preset.message':
      'Are you sure you want to permanently delete this preset? This action cannot be undone.',
    'settings.modal.delete_preset.confirm': 'Yes, Delete',

    // ── Toasts ──
    'settings.toast.fix_errors': 'Please fix the errors before saving.',
    'settings.toast.saved': 'Settings saved successfully!',
    'settings.toast.history_empty': 'History is empty. Nothing to export.',
    'settings.toast.history_exported': 'History exported successfully.',
    'settings.toast.kb_empty': 'Knowledge Base is empty. Nothing to export.',
    'settings.toast.kb_exported':
      'Full Knowledge Base (all unique articles) exported successfully.',
    'settings.toast.kb_imported': 'Imported {count} knowledge-base entries.',
    'settings.toast.import_trust_downgraded':
      'Synthesis trust downgraded on {count} imported report(s).',
    'settings.toast.import_failed': 'Import failed. Check the file format and try again.',
    'settings.toast.import_invalid_kb':
      'Invalid file format. The file must be an array of Knowledge Base entries.',
    'settings.toast.import_invalid_settings': 'Invalid settings file format.',
    'settings.toast.settings_exported': 'Settings exported successfully.',
    'settings.toast.settings_imported': 'Settings successfully imported and saved.',
    'settings.toast.reset': 'All settings have been reset to their defaults.',
    'settings.toast.preset_deleted': 'Preset "{name}" deleted.',
  },
  de: {
    'settings.tab.knowledgeBase': 'Knowledge Base',
    'settings.tab.export': 'Export',
    'settings.tab.data': 'Datenverwaltung & Datenschutz',
    'settings.aria.categories': 'Einstellungskategorien',
    'settings.nav.about': 'Über & Funktionen',
    'settings.nav.faq': 'FAQ & Tastenkürzel',

    'settings.language.en': 'English',
    'settings.language.en_hint': 'Standard',
    'settings.language.de': 'Deutsch',
    'settings.language.de_hint': 'German',

    'settings.appearance.desc': 'Passen Sie das Erscheinungsbild der Anwendung an.',
    'settings.appearance.density_tooltip':
      'Passen Sie Abstände und Größen der UI-Elemente an. „Kompakt“ eignet sich für kleinere Bildschirme oder mehr Informationen.',
    'settings.appearance.density.comfortable': 'Komfortabel',
    'settings.appearance.density.compact': 'Kompakt',
    'settings.appearance.custom_colors': 'Benutzerdefinierte Farben aktivieren',
    'settings.appearance.color.primary': 'Primärfarbe',
    'settings.appearance.color.secondary': 'Sekundärfarbe',
    'settings.appearance.color.accent': 'Akzentfarbe',
    'settings.appearance.color.picker_aria': 'Farbwähler für {color}',
    'settings.appearance.color.hex_aria': 'Hex-Wert für {color}',

    'settings.pwa.title': 'Anwendung',
    'settings.pwa.desc': 'Installationsstatus und Offline-Funktionen der Anwendung verwalten.',
    'settings.pwa.installed': 'App ist installiert und bereit für die Offline-Nutzung.',
    'settings.pwa.brand_status': 'PWA · Offline-bereit · 🔬',
    'settings.pwa.install_cta': 'App auf diesem Gerät installieren',
    'settings.pwa.install_hint':
      'Installieren Sie die App für ein natives Erlebnis inkl. Symbol auf dem Startbildschirm oder Desktop.',
    'settings.pwa.install_unavailable':
      'Diese App kann auf Ihrem Gerät installiert werden. Ihr Browser bietet ggf. eine Installationsoption in der Adressleiste oder im Menü.',

    'settings.notifications.title': 'Benachrichtigungen',
    'settings.notifications.desc': 'Steuern Sie, wie und wo Benachrichtigungen erscheinen.',
    'settings.notifications.position': 'Position',
    'settings.notifications.duration': 'Dauer (ms)',
    'settings.notifications.position.bottom_right': 'Unten rechts',
    'settings.notifications.position.bottom_left': 'Unten links',
    'settings.notifications.position.top_right': 'Oben rechts',
    'settings.notifications.position.top_left': 'Oben links',

    'settings.performance.title': 'Leistung',
    'settings.performance.desc':
      'Leistungsbezogene Einstellungen verwalten. Das Deaktivieren von Animationen kann die Reaktionsfähigkeit auf älteren Geräten verbessern.',
    'settings.performance.enable_animations': 'UI-Animationen aktivieren',

    'settings.developerMode.title': 'Entwicklermodus',
    'settings.developerMode.desc':
      'Zeigt interne Diagnosewerkzeuge, wie den Agent-Debugger, in der Kopfzeile an. Gedacht für Entwicklung und Fehlersuche.',
    'settings.developerMode.toggle': 'Agent-Debugger in der Kopfzeile anzeigen',

    'settings.ai.desc': 'Verhalten, Sprache und Kernanweisungen der KI fein abstimmen.',
    'settings.ai.persona': 'KI-Persona',
    'settings.ai.persona.neutral': 'Neutrale Wissenschaft',
    'settings.ai.persona.neutral_desc':
      'Wählt einen neutralen, objektiven und streng wissenschaftlichen Ton.',
    'settings.ai.persona.concise': 'Knappe Expertise',
    'settings.ai.persona.concise_desc':
      'Kurz und präzise. Liefert die wichtigsten Informationen ohne Weitschweifigkeit.',
    'settings.ai.persona.detailed': 'Detaillierte Analyse',
    'settings.ai.persona.detailed_desc':
      'Liefert tiefgehende Analysen. Erörtert Nuancen, Methodik und mögliche Implikationen gründlich.',
    'settings.ai.persona.creative': 'Kreative Synthese',
    'settings.ai.persona.creative_desc':
      'Hebt neuartige Verbindungen, interdisziplinäre Links und innovative Perspektiven in der Literatur hervor.',
    'settings.ai.temperature': 'KI-Kreativität (Temperatur)',
    'settings.ai.temperature_tooltip':
      'Steuert die Zufälligkeit der KI-Ausgabe. Niedrigere Werte sind fokussierter, höhere kreativer.',
    'settings.ai.temperature_protip': 'Tipp:',
    'settings.ai.temperature_tip_low': '0,0–0,3: Am besten für faktische, vorhersehbare Aufgaben.',
    'settings.ai.temperature_tip_mid': '0,4–0,7: Gute Balance für die meisten Aufgaben.',
    'settings.ai.temperature_tip_high':
      '0,8–1,0: Ideal für Brainstorming oder kreative Einsichten.',
    'settings.ai.output_language': 'KI-Sprache (Ausgabe)',
    'settings.ai.output_language_desc':
      'Steuert die Sprache generierter Berichte, unabhängig von der Oberfläche.',
    'settings.ai.lang.english': 'Englisch',
    'settings.ai.lang.german': 'Deutsch',
    'settings.ai.lang.french': 'Französisch',
    'settings.ai.lang.spanish': 'Spanisch',
    'settings.ai.preamble': 'Benutzerdefinierte Präambel (Erweitert)',
    'settings.ai.preamble_tooltip':
      'Dieser Text wird jedem KI-Prompt vorangestellt und kann übergeordnete Anweisungen setzen.',
    'settings.ai.preamble_placeholder':
      'z. B. Fokus speziell auf Studien mit menschlichen Probanden.',
    'settings.ai.tldr_desc':
      'Fügt in der Artikeldetailansicht einen Button hinzu, der eine ultrakurze (1–2 Sätze) Zusammenfassung eines Abstracts erzeugt. Das löst einen zusätzlichen API-Aufruf aus.',
    'settings.ai.hub.title': 'Recherche- & Autoren-Hub',
    'settings.ai.hub.desc': 'Verhalten der spezialisierten Recherche-Werkzeuge konfigurieren.',
    'settings.ai.hub.auto_similar': 'Ähnliche Artikel automatisch finden',
    'settings.ai.hub.auto_online': 'Online-Diskussionen automatisch finden',
    'settings.ai.hub.author_limit': 'Autoren-Suchlimit',
    'settings.ai.hub.author_limit_tooltip':
      'Maximale Anzahl an Publikationen für eine Autorensuche. Höhere Werte sind gründlicher, aber langsamer und verbrauchen mehr API-Kontingent.',
    'settings.ai.formDefaults.title': 'Formular-Standards',
    'settings.ai.formDefaults.desc':
      'Standardwerte für das Rechercheparameter-Formular setzen, um den Workflow zu beschleunigen.',
    'settings.ai.formDefaults.max_scan': 'Standard: Max. zu scannende Artikel',
    'settings.ai.formDefaults.top_synth': 'Standard: Top-Artikel zur Synthese',
    'settings.ai.formDefaults.date': 'Standard: Publikationsdatum',
    'settings.ai.formDefaults.focus': 'Standard: Synthesefokus',
    'settings.ai.formDefaults.article_types': 'Standard: Artikeltypen',
    'settings.ai.formDefaults.auto_save': 'Neue Berichte automatisch speichern',
    'settings.cost.tier_heuristic': 'Heuristik',
    'settings.ai.base_url_desc.ollama':
      'Loopback Local AI (Standard http://localhost:11434). Die Generierung bleibt auf diesem Rechner. Remote-LAN-Ollama ist nicht erstklassig und braucht eine angepasste CSP / Self-Host-Build. Genehmigen Sie einen abweichenden Origin, bevor Anfragen gesendet werden.',
    'settings.ai.ollama.fail.cors':
      'Der Browser konnte Ollama nicht erreichen (Netzwerk oder CORS). Erstklassige Local AI ist Loopback (localhost, 127.0.0.1 oder [::1] auf Port 11434). Ein Remote-Host braucht eine angepasste CSP. Detail: {message}',
    'settings.ai.ollama.fail.timeout':
      'Ollama hat nicht rechtzeitig geantwortet. Ein langsamer oder überlasteter Server ist nicht dasselbe wie „nicht installiert“. Detail: {message}',
    'settings.ai.ollama.fail.unavailable':
      'Ollama läuft nicht oder ist unter dieser URL nicht erreichbar. Starten Sie den lokalen Server und aktualisieren Sie. Detail: {message}',
    'settings.ai.ollama.fail.invalid_endpoint':
      'Diese Basis-URL ist kein zulässiger Local-AI-Endpunkt. Verwenden Sie http://localhost:11434, sofern Sie keinen anderen, CSP-erlaubten Origin genehmigt haben. Detail: {message}',
    'settings.ai.ollama.fail.http':
      'Ollama hat einen HTTP-Fehler zurückgegeben. Prüfen Sie die Server-Logs und den gewählten Origin. Detail: {message}',
    'settings.ai.ollama.fail.aborted':
      'Gesundheitsprüfung abgebrochen. Aktualisieren Sie, um es erneut zu versuchen.',
    'settings.ai.ollama.fail.model_list':
      'Verbunden, aber die Modellliste konnte nicht geladen werden. Das ausgewählte Modell wurde nicht gegen den Server geprüft. Detail: {message}',
    'settings.ai.ollama.budget_info':
      'Geschätztes Prompt-Eingabe-Budget ≈ {budget} Tokens ({source}). Ranking und Synthese lassen Artikel weg, die nicht passen; wenn keiner passt, bricht der Lauf mit Fehler ab statt still zu kürzen.',
    'settings.ai.ollama.budget_source.context_length': 'gemeldetes Kontextfenster',
    'settings.ai.ollama.budget_source.parameter_heuristic': 'Parametergrößen-Hinweis',
    'settings.ai.ollama.budget_source.default': 'Standardschätzung',

    'settings.kb.display.title': 'Anzeige-Standards',
    'settings.kb.display.desc':
      'Standarderscheinungsbild und Verhalten der Knowledge Base konfigurieren.',
    'settings.kb.view': 'Standard-Ansichtsmodus',
    'settings.kb.view.grid': 'Rasteransicht',
    'settings.kb.view.list': 'Listenansicht',
    'settings.kb.sort': 'Standard-Sortierung',
    'settings.kb.sort.relevance': 'Nach Relevanz sortieren',
    'settings.kb.sort.newest': 'Nach Neueste sortieren',
    'settings.kb.per_page': 'Artikel pro Seite',
    'settings.kb.cleaning.title': 'Datenbereinigung',
    'settings.kb.cleaning.desc':
      'Wartungsaktionen ausführen. Duplikate zusammenführen oder Artikel mit niedriger Relevanz entfernen, um die Bibliothek sauber zu halten.',
    'settings.kb.merge.title': 'Duplikate zusammenführen',
    'settings.kb.merge.desc':
      'Tags und Relevanz-Scores für doppelte PMIDs über gespeicherte Einträge harmonisieren. Bericht-Snapshots bleiben erhalten; die Bibliothek dedupliziert bereits per PMID.',
    'settings.kb.prune.title': 'Nach Relevanz-Score bereinigen',
    'settings.kb.prune.desc':
      'Artikel mit niedrigem Score nur aus gespeicherten Rechercheberichten dauerhaft entfernen. Autoren- und Journalprofile werden nicht bereinigt.',
    'settings.kb.notification.no_duplicates':
      'Keine doppelten Artikel zum Zusammenführen gefunden.',
    'settings.kb.notification.already_canonical':
      'Doppelte Artikel haben bereits identische kanonische Metadaten.',
    'settings.kb.notification.harmonized':
      'Metadaten für {count} doppelte Artikelkopie(n) harmonisiert. Bericht-Snapshots blieben erhalten.',
    'settings.kb.notification.merge_failed': 'Zusammenführen der Duplikate fehlgeschlagen.',
    'settings.kb.notification.pruned': '{count} Recherche-Artikel bereinigt.',
    'settings.kb.notification.no_prune_candidates':
      'Keine Recherche-Artikel mit einem Score unter {score} gefunden.',
    'settings.kb.notification.prune_failed': 'Bereinigung der Artikel fehlgeschlagen.',
    'settings.kb.presets.title': 'Recherche-Presets',
    'settings.kb.presets.desc':
      'Gespeicherte Rechercheformular-Einstellungen für schnellen Zugriff verwalten.',
    'settings.kb.presets.empty':
      'Keine gespeicherten Presets. Speichern Sie eines im Formular der Literaturrecherche.',
    'settings.kb.presets.delete_aria': 'Preset {name} löschen',

    'settings.export.pdf.title': 'PDF-Export-Einstellungen',
    'settings.export.pdf.desc': 'Inhalt und Erscheinungsbild Ihrer PDF-Exporte anpassen.',
    'settings.export.pdf.cover': 'Titelseite einschließen',
    'settings.export.pdf.toc': 'Inhaltsverzeichnis einschließen',
    'settings.export.pdf.header': 'Kopfzeile auf jeder Seite',
    'settings.export.pdf.footer': 'Fußzeile mit Seitenzahlen',
    'settings.export.pdf.prepared_for': '„Erstellt für“-Name (optional)',
    'settings.export.pdf.sections': 'Berichtsabschnitte einschließen',
    'settings.export.pdf.synthesis': 'Executive Synthesis',
    'settings.export.pdf.insights': 'KI-generierte Insights',
    'settings.export.pdf.queries': 'Generierte PubMed-Abfragen',
    'settings.export.csv.title': 'CSV-Export-Einstellungen',
    'settings.export.csv.desc': 'Wählen Sie, welche Datenfelder in CSV-Exporten enthalten sind.',
    'settings.export.csv.delimiter': 'Trennzeichen',
    'settings.export.csv.delimiter.comma': 'Komma (,)',
    'settings.export.csv.delimiter.semicolon': 'Semikolon (;)',
    'settings.export.csv.delimiter.tab': 'Tab',
    'settings.export.csv.columns': 'Spalten einschließen',
    'settings.export.csv.select_all': 'Alle auswählen',
    'settings.export.csv.deselect_all': 'Alle abwählen',
    'settings.export.csv.column.pmid': 'PMID',
    'settings.export.csv.column.pmcId': 'PMC-ID',
    'settings.export.csv.column.title': 'Titel',
    'settings.export.csv.column.authors': 'Autorinnen/Autoren',
    'settings.export.csv.column.journal': 'Journal',
    'settings.export.csv.column.pubYear': 'Publikationsjahr',
    'settings.export.csv.column.summary': 'Zusammenfassung',
    'settings.export.csv.column.aiSummary': 'KI-Zusammenfassung',
    'settings.export.csv.column.relevanceScore': 'Relevanz-Score',
    'settings.export.csv.column.relevanceExplanation': 'Relevanz-Erklärung',
    'settings.export.csv.column.keywords': 'Schlüsselwörter',
    'settings.export.csv.column.customTags': 'Eigene Tags',
    'settings.export.csv.column.sourceTitle': 'Quelltitel',
    'settings.export.csv.column.isOpenAccess': 'Open Access',
    'settings.export.csv.column.articleType': 'Artikeltyp',
    'settings.export.csv.column.URL': 'URL',
    'settings.export.csv.column.PMCID_URL': 'PMCID-URL',
    'settings.export.citation.title': 'Zitations-Export-Einstellungen',
    'settings.export.citation.desc': 'Inhalt von BibTeX- und RIS-Zitationsdateien anpassen.',
    'settings.export.citation.abstract': 'Abstract einschließen',
    'settings.export.citation.keywords': 'Schlüsselwörter einschließen',
    'settings.export.citation.tags': 'Eigene Tags einschließen',
    'settings.export.citation.pmcid': 'PMCID (PubMed Central ID) einschließen',

    'settings.data.storage.title': 'Lokaler Speicherverbrauch',
    'settings.data.storage.desc':
      'Diese Anwendung speichert alle Daten in Ihrem Browser. Überwachen Sie den Verbrauch hier.',
    'settings.data.storage.used': 'Speicher belegt',
    'settings.data.storage.quota': '{used} MB / ~{quota} MB',
    'settings.data.backup.title': 'Daten-Backup & Wiederherstellung',
    'settings.data.backup.desc':
      'Sie haben {reports} Berichte mit {articles} eindeutigen Artikeln.',
    'settings.data.backup.export_history': 'Verlauf exportieren (alle Berichte)',
    'settings.data.backup.export_kb': 'Knowledge Base exportieren (alle Artikel)',
    'settings.data.backup.import': 'Verlauf / KB importieren',
    'settings.data.settings_backup.title': 'Einstellungen-Backup & Wiederherstellung',
    'settings.data.settings_backup.desc':
      'Einstellungen sichern oder in einen anderen Browser übertragen.',
    'settings.data.settings_backup.export': 'Einstellungen exportieren',
    'settings.data.settings_backup.import': 'Einstellungen importieren',
    'settings.data.danger.title': 'Gefahrenzone',
    'settings.data.danger.desc': 'Diese Aktionen sind unumkehrbar und löschen Daten dauerhaft.',
    'settings.data.danger.clear_kb': 'Gesamte Knowledge Base löschen',
    'settings.data.danger.reset': 'Alle Einstellungen zurücksetzen',

    'settings.modal.clear.title': 'Knowledge Base löschen?',
    'settings.modal.clear.message':
      'Möchten Sie wirklich alle {count} Artikel aus Ihrer Knowledge Base löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    'settings.modal.clear.confirm': 'Ja, alles löschen',
    'settings.modal.reset.title': 'Alle Einstellungen zurücksetzen?',
    'settings.modal.reset.message':
      'Möchten Sie wirklich alle Anwendungseinstellungen auf die Standardwerte zurücksetzen? Das kann nicht rückgängig gemacht werden.',
    'settings.modal.reset.confirm': 'Ja, alles zurücksetzen',
    'settings.modal.import.title': 'Knowledge Base importieren',
    'settings.modal.import.message':
      '{count} bereinigte Knowledge-Base-Einträge importieren? Externe Dateien werden beim Import erneut validiert; korpus-gestützter Synthese-Trust kann nicht erhalten bleiben.',
    'settings.modal.import.quarantine':
      'Trust herabgestuft: {trustDowngraded}. Ungültige Zitationen entfernt: {invalidCitations}. Vor Import abgelehnt: {rejected}.',
    'settings.modal.import.confirm': 'Ja, importieren',
    'settings.modal.prune.title': 'Nach Relevanz-Score bereinigen',
    'settings.modal.prune.desc':
      'Dadurch werden alle Artikel mit einem Relevanz-Score unter dem gewählten Wert dauerhaft gelöscht.',
    'settings.modal.prune.score_aria': 'Bereinigungs-Score',
    'settings.modal.prune.warning': 'Diese Aktion löscht dauerhaft {count} Artikel.',
    'settings.modal.prune.confirm': 'Artikel bereinigen',
    'settings.modal.prune.processing': 'Bereinigung…',
    'settings.modal.merge.title': 'Duplikate zusammenführen',
    'settings.modal.merge.message':
      'Dies harmonisiert doppelte PMIDs durch Kopieren von Tags und Relevanz vom höchstbewerteten Exemplar. Gespeicherte Bericht-Snapshots werden nicht gelöscht. Fortfahren?',
    'settings.modal.merge.confirm': 'Ja, zusammenführen',
    'settings.modal.merge.processing': 'Zusammenführen…',
    'settings.modal.delete_preset.title': 'Preset „{name}“ löschen?',
    'settings.modal.delete_preset.message':
      'Möchten Sie dieses Preset wirklich dauerhaft löschen? Diese Aktion kann nicht rückgängig gemacht werden.',
    'settings.modal.delete_preset.confirm': 'Ja, löschen',

    'settings.toast.fix_errors': 'Bitte beheben Sie die Fehler vor dem Speichern.',
    'settings.toast.saved': 'Einstellungen erfolgreich gespeichert!',
    'settings.toast.history_empty': 'Verlauf ist leer. Nichts zu exportieren.',
    'settings.toast.history_exported': 'Verlauf erfolgreich exportiert.',
    'settings.toast.kb_empty': 'Knowledge Base ist leer. Nichts zu exportieren.',
    'settings.toast.kb_exported':
      'Vollständige Knowledge Base (alle eindeutigen Artikel) erfolgreich exportiert.',
    'settings.toast.kb_imported': '{count} Knowledge-Base-Einträge importiert.',
    'settings.toast.import_trust_downgraded':
      'Synthese-Trust bei {count} importiertem Bericht herabgestuft.',
    'settings.toast.import_failed':
      'Import fehlgeschlagen. Prüfen Sie das Dateiformat und versuchen Sie es erneut.',
    'settings.toast.import_invalid_kb':
      'Ungültiges Dateiformat. Die Datei muss ein Array von Knowledge-Base-Einträgen sein.',
    'settings.toast.import_invalid_settings': 'Ungültiges Einstellungsdatei-Format.',
    'settings.toast.settings_exported': 'Einstellungen erfolgreich exportiert.',
    'settings.toast.settings_imported': 'Einstellungen erfolgreich importiert und gespeichert.',
    'settings.toast.reset': 'Alle Einstellungen wurden auf die Standardwerte zurückgesetzt.',
    'settings.toast.preset_deleted': 'Preset „{name}“ gelöscht.',
  },
} as const;
