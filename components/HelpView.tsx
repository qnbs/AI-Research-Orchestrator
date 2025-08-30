import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { SearchIcon } from './icons/SearchIcon';
import { InfoIcon } from './icons/InfoIcon';

type HelpSection = 'guide' | 'faq' | 'glossary' | 'about';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

interface HelpViewProps {
    initialTab: string | null;
    onTabConsumed: () => void;
}

const Note: React.FC<{ children: React.ReactNode; type?: 'info' | 'tip' | 'warning'; title?: string }> = ({ children, type = 'info', title }) => {
    const styles = {
        info: { base: 'bg-sky-500/10 border-sky-500/20', icon: 'text-sky-400', title: 'text-sky-300' },
        tip: { base: 'bg-green-500/10 border-green-500/20', icon: 'text-green-400', title: 'text-green-300' },
        warning: { base: 'bg-red-500/10 border-red-500/20', icon: 'text-red-400', title: 'text-red-300' },
    };
    const selectedStyle = styles[type];

    return (
        <div className={`p-4 my-4 rounded-lg border not-prose ${selectedStyle.base}`}>
            <div className="flex">
                <div className="flex-shrink-0">
                    <InfoIcon className={`h-5 w-5 ${selectedStyle.icon}`} aria-hidden="true" />
                </div>
                <div className="ml-3">
                    {title && <h4 className={`text-sm font-bold mb-1 ${selectedStyle.title}`}>{title}</h4>}
                    <div className="text-sm text-text-secondary">{children}</div>
                </div>
            </div>
        </div>
    );
};

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen = false }) => {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const idSuffix = title.toLowerCase().replace(/\s+/g, '-').replace(/[?'".,]/g, '');
    const panelId = `help-panel-${idSuffix}`;
    const buttonId = `help-button-${idSuffix}`;

    return (
        <div className="border-b border-border last:border-b-0">
            <h3>
                <button
                    id={buttonId}
                    onClick={() => setIsOpen(!isOpen)}
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    className="w-full flex justify-between items-center py-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus:outline-none transition-colors"
                >
                    <span>{title}</span>
                    <ChevronDownIcon className={`h-6 w-6 transform transition-transform text-text-secondary ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </h3>
            
            <div 
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
            >
                <div className="overflow-hidden">
                    <div className="pb-4 pr-4 pl-2 text-text-secondary/90 leading-relaxed prose prose-sm prose-invert max-w-none">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

const GuideSection: React.FC<{ searchTerm: string }> = ({ searchTerm }) => {
    const guideTopics = useMemo(() => [
        {
            title: "The Two Core Workflows",
            content: (
                <>
                    <p>This app offers two distinct but interconnected paths for conducting research:</p>
                    <ol>
                        <li><strong>The Orchestrator:</strong> For comprehensive literature reviews on a broad topic, involving multiple articles. This is your starting point for building out a new area of your knowledge base.</li>
                        <li><strong>The Research Assistant:</strong> For quick, focused analysis of a specific question, abstract, or piece of text. It's perfect for exploring a single idea before committing to a full review.</li>
                    </ol>
                </>
            ),
            keywords: "workflow orchestrator research assistant core concept"
        },
        {
            title: "Using the Orchestrator",
            content: (
                <>
                    <p>Everything begins on the <strong>Orchestrator</strong> tab. Here’s how to fill it out effectively:</p>
                    <ul>
                        <li><strong>Primary Research Topic:</strong> Be as specific as possible. Instead of <code>coffee</code>, try <code>the effects of caffeine on sleep quality in young adults</code>. This helps the AI agents focus their search.</li>
                        <li><strong>Publication Date:</strong> Choose a timeframe relevant to your topic. For fast-moving fields, 'Last 5 Years' is often a good choice.</li>
                        <li><strong>Article Types:</strong> Select the types of evidence you trust most. <strong>Systematic Reviews</strong> and <strong>Meta-Analyses</strong> provide high-quality summaries of existing research and are considered strong forms of evidence.</li>
                        <li><strong>Synthesis Focus:</strong> This tells the AI what angle to take when summarizing the findings. Are you interested in a general overview, or are you specifically looking for gaps in the research?</li>
                    </ul>
                    <Note type="tip" title="Pro-Tip: Advanced Topics">
                        <p>Use boolean operators (`AND`, `OR`, `NOT`) in your topic for more precise control, e.g., <code>(intermittent fasting OR time-restricted eating) AND cognitive function NOT Alzheimer</code>.</p>
                    </Note>
                     <p>After you click 'Start Research', a detailed report will appear with a synthesis, AI insights, and a list of ranked articles. If you like the results, click 'Save to Knowledge Base' to permanently store the articles.</p>
                </>
            ),
            keywords: "research parameters topic date type synthesis focus start new report save"
        },
        {
            title: "Using the Research Assistant",
            content: (
                <>
                    <p>Navigate to the <strong>Research</strong> tab for quick analysis. This tool is ideal for:</p>
                    <ul>
                        <li>Getting a quick summary of a paper's abstract before you read it.</li>
                        <li>Asking a specific scientific question.</li>
                        <li>Exploring a new topic to see if it's worth a full literature review.</li>
                    </ul>
                    <p>Simply paste your text into the box and click 'Analyze'. The AI will provide a summary, extract key findings, and automatically search for related PubMed articles and online news/discussions on the topic.</p>
                    <p>If the results are promising, use the 'Start Full Review on This Topic' button to seamlessly send the AI-synthesized topic to the Orchestrator for a deeper dive.</p>
                </>
            ),
            keywords: "assistant analyze summary key findings similar online"
        },
        {
            title: "Exploring Your Knowledge Base",
            content: (
                <>
                    <p>Saved reports contribute their articles to your personal <strong>Knowledge Base</strong>. This view consolidates all unique articles from all your reports into a single, powerful interface.</p>
                    <ul>
                        <li><strong>Search & Filter:</strong> Use the extensive options on the left to narrow down hundreds of articles to the exact ones you need. You can filter by keywords, report topics, your own custom tags, or show only open-access articles.</li>
                        <li><strong>Manage Articles:</strong> Select one or more articles via the checkboxes to perform bulk actions, such as deleting them or exporting citation data for your reference manager.</li>
                         <li><strong>Article Details:</strong> Click on any article to open a side panel. Here, you can add custom tags, read the full summary, and use the 'Discovery Tools' to find even more related articles or online discussions.</li>
                    </ul>
                    <Note type="info" title="What does 'Unique Articles' mean?">
                        The Knowledge Base automatically de-duplicates articles. If two different reports find the same article (based on its PMID), it will only appear once in your Knowledge Base to keep your library clean. The version with the highest relevance score is retained.
                    </Note>
                </>
            ),
            keywords: "knowledge base library search filter manage delete export unique tags details"
        },
        {
            title: "Exporting Your Data",
            content: (
                <>
                     <p>You can export data from several places in the app, with settings configurable in the `Settings > Export` tab.</p>
                    <ul>
                        <li><strong>From a Report:</strong> Export a single report as a PDF, CSV, or just the AI Insights as a CSV.</li>
                        <li><strong>From the Knowledge Base:</strong> Select articles and export them as a PDF, CSV, or citation file.
                            <ul>
                                <li><strong>PDF:</strong> Creates a clean, summary report of the selected articles. Ideal for sharing.</li>
                                <li><strong>CSV:</strong> Exports the raw data for spreadsheets or other analysis tools.</li>
                                <li><strong>Citations:</strong> Get files in <strong>BibTeX (.bib)</strong> or <strong>RIS (.ris)</strong> format for reference managers like Zotero, Mendeley, or EndNote.</li>
                            </ul>
                        </li>
                    </ul>
                </>
            ),
            keywords: "export pdf csv citations bibtex ris zotero mendeley data"
        },
    ], [searchTerm]);

    const filteredTopics = useMemo(() => {
        if (!searchTerm) return guideTopics;
        const lowercasedTerm = searchTerm.toLowerCase();
        return guideTopics.filter(topic => 
            topic.title.toLowerCase().includes(lowercasedTerm) || 
            topic.keywords.includes(lowercasedTerm)
        );
    }, [guideTopics, searchTerm]);

    return (
        <div>
            {filteredTopics.map((topic, index) => (
                <AccordionItem key={index} title={topic.title} defaultOpen={!!searchTerm}>
                    {topic.content}
                </AccordionItem>
            ))}
            {filteredTopics.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-lg text-text-primary">No help topics match your search.</p>
                </div>
            )}
        </div>
    );
};

const FAQSection: React.FC<{ searchTerm?: string }> = () => (
    <div>
        <AccordionItem title="Is my data private?">
            <p><strong>Yes.</strong> All data, including your research history, saved articles, and settings, is stored exclusively in your browser's `localStorage`. No information is ever uploaded to a server or shared. Your research is completely private to the browser you are using.</p>
            <Note type="warning" title="Back Up Your Data">
                Because the data is stored locally, it can be lost if you clear your browser's data. Use the export features in `Settings > Data & Privacy` regularly to create JSON backups.
            </Note>
        </AccordionItem>
        <AccordionItem title="Can I fully trust the AI's output?">
            <p><strong>No.</strong> The AI is a powerful assistant, but it is not infallible. It can make mistakes, misinterpret data, or "hallucinate" information that sounds plausible but is incorrect. The content generated by the AI is for informational and discovery purposes only.</p>
            <p><strong>Always verify critical information by reading the original source articles.</strong> This application is a tool to accelerate research, not a substitute for scholarly review and critical evaluation.</p>
        </AccordionItem>
        <AccordionItem title="Why isn't an article I know exists showing up?">
            <p>There could be several reasons:</p>
            <ul>
                <li>The AI's search queries may not have been broad or specific enough to capture it.</li>
                <li>The article might fall outside the specified date range or article type filters.</li>
                <li>The article's abstract may not have contained enough relevant keywords for the AI to rank it highly, causing it to fall below your chosen 'Top N' articles for synthesis.</li>
            </ul>
             <p>Try broadening your research topic or adjusting the filters. You can also review the 'Generated PubMed Queries' in a report to see how the AI searched.</p>
        </AccordionItem>
        <AccordionItem title="How does the 'Relevance Score' work?">
            <p>The Relevance Score is generated by the AI. After you provide a research topic, the AI first infers 2-3 specific questions a researcher would aim to answer. It then scores each article's abstract against those questions. The score (1-100) reflects how directly and comprehensively the article addresses those inferred key questions. It is a subjective measure created by the AI to help guide your focus.</p>
        </AccordionItem>
        <AccordionItem title="Keyboard Shortcuts">
            <p>Speed up your workflow with these keyboard shortcuts:</p>
            <div className="mt-4 space-y-3 not-prose">
                <div className="grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-1 p-3 bg-background/70 border border-border rounded-lg">
                    <span className="font-semibold text-text-primary col-span-2 pb-2 border-b border-border mb-1">Global Actions</span>
                    <div className="text-right">
                        <kbd className="px-2 py-1 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-md">Esc</kbd>
                    </div>
                    <div className="text-sm">Closes any modal window, pop-up, or side panel.</div>
                </div>

                <div className="grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-1 p-3 bg-background/70 border border-border rounded-lg">
                    <span className="font-semibold text-text-primary col-span-2 pb-2 border-b border-border mb-1">Forms</span>
                    <div className="text-right">
                        <kbd className="px-2 py-1 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-md">Ctrl</kbd> + <kbd className="px-2 py-1 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-md">Enter</kbd>
                    </div>
                    <div className="text-sm">Submits the main form on the Orchestrator tab.</div>
                    <div className="text-right">
                        <kbd className="px-2 py-1 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-md">Cmd</kbd> + <kbd className="px-2 py-1 text-xs font-semibold text-text-secondary bg-surface border border-border rounded-md">Enter</kbd>
                    </div>
                    <div className="text-sm">(On macOS) Submits the main form on the Orchestrator tab.</div>
                </div>
            </div>
        </AccordionItem>
    </div>
);

const GlossarySection: React.FC<{ searchTerm?: string }> = () => (
    <div>
        <AccordionItem title="Executive Synthesis">
            <p>A comprehensive narrative summary of the key findings, themes, agreements, and contradictions from the top-ranked articles. It is the AI's version of the introduction or discussion section of a literature review.</p>
        </AccordionItem>
         <AccordionItem title="Knowledge Base">
            <p>The central library where all unique articles from your saved reports are stored. It acts as your personal, aggregated research database.</p>
        </AccordionItem>
        <AccordionItem title="Open Access">
            <p>Refers to research that is freely available to the public online without a subscription. The app flags these articles to help you prioritize content you can read immediately.</p>
        </AccordionItem>
        <AccordionItem title="PMID / PMCID">
            <p>A <strong>PMID</strong> (PubMed ID) is a unique identifier for a citation in the PubMed database. A <strong>PMCID</strong> (PubMed Central ID) is an identifier for full-text articles in the free PubMed Central archive. If an article has a PMCID, it is usually open access.</p>
        </AccordionItem>
         <AccordionItem title="Relevance Score">
            <p>An AI-assigned metric from 1-100 indicating how directly an article addresses the key questions inferred from your research topic. It helps you quickly identify the most important papers.</p>
        </AccordionItem>
         <AccordionItem title="Temperature (AI Setting)">
            <p>A setting that controls the randomness and 'creativity' of the AI's output. A low temperature (e.g., 0.2) results in more focused and deterministic responses, while a high temperature (e.g., 0.9) can lead to more diverse or creative results. The default is set low for scientific accuracy.</p>
        </AccordionItem>
    </div>
);

const AboutSection: React.FC<{ searchTerm?: string }> = () => {
    return (
        <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
            <h3 className="text-xl font-bold text-text-primary">About AI Research</h3>
            <p>
                AI Research is an expert system designed to manage a swarm of specialized AI agents to conduct comprehensive literature reviews using the PubMed database. The application's primary goal is to streamline and automate the process of collecting, curating, and synthesizing scientific research based on user-defined criteria.
            </p>
            <p>
                All data, including your knowledge base and settings, is stored locally in your browser. No data is sent to a server, except for requests to the Google Gemini API.
            </p>
            
            <h4 className="text-lg font-semibold text-text-primary mt-6">Feature Checklist & Changelog</h4>
            <p>
                This application includes the following core functionalities:
            </p>
            <ul>
                <li><strong>Core:</strong> AI research orchestration via the Gemini API to produce detailed literature reviews.</li>
                <li><strong>Core:</strong> Interactive Knowledge Base with automatic de-duplication and robust searching, filtering, and sorting.</li>
                <li><strong>Core:</strong> Data export to PDF, CSV, and citation (BibTeX, RIS) formats.</li>
                <li><strong>Core:</strong> Detailed article view with custom tagging and display of related AI insights.</li>
                <li><strong>Feature:</strong> Data visualization dashboard with charts for keywords, publication years, and journals.</li>
                <li><strong>Feature:</strong> Report history view with search to browse and revisit previously saved reports.</li>
                <li><strong>Feature:</strong> AI-powered 'Research Assistant' for summarizing text and finding related articles.</li>
                <li><strong>Feature:</strong> AI-powered 'Discovery Tools' in the article detail panel for finding similar articles and related online news/discussions.</li>
                <li><strong>UX:</strong> Comprehensive settings panel for managing themes, AI behavior, form defaults, and data backups.</li>
                <li><strong>UX:</strong> Confirmation modals for destructive actions and unsaved changes.</li>
                <li><strong>UX:</strong> Keyboard shortcuts (Ctrl+Enter, Escape) for primary actions.</li>
                <li><strong>Enhancement:</strong> Overhauled 'Research' view for a more robust and focused user experience.</li>
                <li><strong>Enhancement:</strong> Overhauled settings UX (new AI persona selector, pruning preview).</li>
                <li><strong>Enhancement:</strong> Implemented accessible focus-trapping for all modals and panels.</li>
            </ul>
             <Note type="info" title="Continuous Development">
                The features listed reflect the current state of the application. Functionality is subject to change and improvement.
            </Note>
        </div>
    );
};


const helpSections: { id: HelpSection; name: string; icon: React.FC<any>; component: React.FC<any> }[] = [
    { id: 'guide', name: "User Guide", icon: BookOpenIcon, component: GuideSection },
    { id: 'faq', name: "FAQ & Shortcuts", icon: QuestionMarkCircleIcon, component: FAQSection },
    { id: 'glossary', name: "Glossary", icon: BookmarkIcon, component: GlossarySection },
    { id: 'about', name: "About & Features", icon: InfoIcon, component: AboutSection },
];


export const HelpView: React.FC<HelpViewProps> = ({ initialTab, onTabConsumed }) => {
    const [activeTab, setActiveTab] = useState<HelpSection>('guide');
    const [searchTerm, setSearchTerm] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialTab && helpSections.some(s => s.id === initialTab)) {
            setActiveTab(initialTab as HelpSection);
            onTabConsumed();
        }
    }, [initialTab, onTabConsumed]);

    const handleTabChange = (tab: HelpSection) => {
        setActiveTab(tab);
        if (contentRef.current) {
            contentRef.current.scrollTop = 0;
        }
    };
    
    const ActiveComponent = helpSections.find(s => s.id === activeTab)?.component || GuideSection;
    
    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-brand-accent">Help & Documentation</h1>
                <p className="mt-2 text-lg text-text-secondary">Find answers, learn how to use the app, and review its features.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                <aside className="lg:col-span-1">
                    <div className="sticky top-24">
                        <div className="relative mb-4">
                             <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                            <input 
                                type="text" 
                                placeholder="Search help topics..." 
                                value={searchTerm} 
                                onChange={(e) => setSearchTerm(e.target.value)} 
                                className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                             />
                        </div>
                        <nav className="flex flex-col space-y-1" role="tablist" aria-label="Help categories">
                            {helpSections.map(section => (
                                <button 
                                    key={section.id} 
                                    id={`tab-${section.id}`}
                                    role="tab"
                                    aria-selected={activeTab === section.id}
                                    aria-controls={`tabpanel-${section.id}`}
                                    onClick={() => handleTabChange(section.id)}
                                    className={`flex items-center w-full text-left px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === section.id ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-primary bg-surface hover:bg-border'}`}
                                >
                                    <section.icon className="h-5 w-5 mr-3 flex-shrink-0" />
                                    <span>{section.name}</span>
                                </button>
                            ))}
                        </nav>
                    </div>
                </aside>

                <main className="lg:col-span-3 bg-surface border border-border rounded-lg p-6 min-h-[60vh]" ref={contentRef} role="tabpanel" id={`tabpanel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
                   <ActiveComponent searchTerm={searchTerm} />
                </main>
            </div>
        </div>
    );
};