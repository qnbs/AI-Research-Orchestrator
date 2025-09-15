import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { SearchIcon } from './icons/SearchIcon';
import { InfoIcon } from './icons/InfoIcon';
import { Kbd } from './Kbd';
import { ChevronUpIcon } from './icons/ChevronUpIcon';

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
    const id = useId();
    const panelId = `panel-${id}`;
    const buttonId = `button-${id}`;
    
    useEffect(() => {
        setIsOpen(defaultOpen);
    }, [defaultOpen]);


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

const GuideSection: React.FC<{ items: any[]; searchTerm: string }> = ({ items, searchTerm }) => {
    return (
        <div>
            {items.map((topic, index) => (
                <AccordionItem key={index} title={topic.title} defaultOpen={!!searchTerm}>
                    {topic.content}
                </AccordionItem>
            ))}
            {items.length === 0 && (
                <div className="text-center py-8">
                    <p className="text-lg text-text-primary">No help topics match your search.</p>
                </div>
            )}
        </div>
    );
};

const FAQSection: React.FC<{ items: any[]; searchTerm: string }> = ({ items, searchTerm }) => (
    <div>
        {items.map((item, index) => (
            <AccordionItem key={index} title={item.title} defaultOpen={!!searchTerm}>
                {item.content}
            </AccordionItem>
        ))}
         {items.length === 0 && (
            <div className="text-center py-8">
                <p className="text-lg text-text-primary">No FAQs match your search.</p>
            </div>
        )}
    </div>
);

const GlossarySection: React.FC<{ items: any[]; searchTerm: string }> = ({ items, searchTerm }) => (
    <div>
        {items.map((item, index) => (
             <AccordionItem key={index} title={item.title} defaultOpen={!!searchTerm}>
                {item.content}
            </AccordionItem>
        ))}
         {items.length === 0 && (
            <div className="text-center py-8">
                <p className="text-lg text-text-primary">No glossary terms match your search.</p>
            </div>
        )}
    </div>
);

const AboutSection: React.FC<{}> = () => (
    <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
        <h3 className="text-xl font-bold text-text-primary">About AI Research Orchestration Author</h3>
        <p>This application is a tool designed to accelerate the process of scientific literature review. It leverages generative AI to automate the tedious tasks of searching, filtering, and synthesizing information from the PubMed database.</p>
        <p><strong>Version:</strong> 1.0.0</p>
        <h4 className="font-semibold text-text-primary">Core Principles</h4>
        <ul>
            <li><strong>Privacy First:</strong> All your data is stored locally in your browser. Nothing is ever sent to a server.</li>
            <li><strong>AI as an Assistant:</strong> The AI is a powerful tool, but it's meant to augment, not replace, human intelligence. Always critically evaluate its output.</li>
            <li><strong>Traceability:</strong> The AI's sources are provided where possible to allow for verification of its findings.</li>
        </ul>
        <h4 className="font-semibold text-text-primary">Disclaimer</h4>
        <p>This tool is for informational and research assistance purposes only. It is not a substitute for professional medical or scientific advice. The AI can make mistakes; always verify information from the primary source articles.</p>
    </div>
);

const HelpView: React.FC<HelpViewProps> = ({ initialTab, onTabConsumed }) => {
    const [activeTab, setActiveTab] = useState<HelpSection>(initialTab === 'about' || initialTab === 'faq' ? initialTab : 'guide');
    const [searchTerm, setSearchTerm] = useState('');
    const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
    const [indicatorStyle, setIndicatorStyle] = useState({});
    const [showGoToTop, setShowGoToTop] = useState(false);

    useEffect(() => {
        if (initialTab) {
            onTabConsumed();
        }
    }, [initialTab, onTabConsumed]);
    
     useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowGoToTop(true);
            } else {
                setShowGoToTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Content Data ---
    const guideTopics = useMemo(() => [
        {
            title: "Understanding the Core Workflows", 
            content: (<><p>This app offers three distinct but interconnected paths for conducting research:</p><ol><li><strong>Research Tab:</strong> For quick, focused analysis of a specific question, abstract, or piece of text. It's perfect for exploring a single idea before committing to a full review.</li><li><strong>The Orchestrator:</strong> For comprehensive literature reviews on a broad topic. This is your starting point for building out a new area of your knowledge base by analyzing many articles at once.</li><li><strong>The Author Hub:</strong> For deep dives into the work of a specific researcher. It helps you understand their impact, collaborations, and the evolution of their research focus over time.</li></ol></>),
            keywords: "workflow orchestrator research author hub core concept"
        },
        {
            title: "Using the Orchestrator",
            content: (<><p>The <strong>Orchestrator</strong> tab is where you conduct large-scale literature reviews. Here’s how to fill out the form effectively:</p><ul><li><strong>Primary Research Topic:</strong> Be as specific as possible. Instead of <code>coffee</code>, try <code>the effects of caffeine on sleep quality in young adults</code>. This helps the AI agents focus their search.</li><li><strong>Publication Date:</strong> Choose a timeframe relevant to your topic.</li><li><strong>Article Types:</strong> Select the types of evidence you trust most. <strong>Systematic Reviews</strong> and <strong>Meta-Analyses</strong> provide high-quality summaries and are considered strong forms of evidence.</li><li><strong>Synthesis Focus:</strong> This tells the AI what angle to take when summarizing the findings. Are you interested in a general overview, or specifically looking for gaps in the research?</li><li><strong>AI Agent Configuration:</strong> The sliders control the scope. 'Max Articles to Scan' is the initial pool of papers the AI will consider. 'Top Articles to Synthesize' is the number of highest-ranked papers that will be used for the detailed report.</li></ul><Note type="tip" title="Pro-Tip: Advanced Topics"><p>Use boolean operators (`AND`, `OR`, `NOT`) in your topic for more precise control, e.g., <code>(intermittent fasting OR time-restricted eating) AND cognitive function NOT Alzheimer</code>.</p></Note><p>After you click 'Start Research', a detailed report will appear. If you like the results, click 'Save' to permanently store the articles in your Knowledge Base. You can also edit the report title before saving.</p></>),
            keywords: "research parameters topic date type synthesis focus start new report save"
        },
        {
            title: "Using the Research Tab",
            content: (<><p>The <strong>Research</strong> tab is for quick analysis. This tool is ideal for:</p><ul><li>Getting a quick summary of a paper's abstract before you read it.</li><li>Asking a specific scientific question.</li><li>Exploring a new topic to see if it's worth a full literature review.</li></ul><p>Simply paste your text or question into the box and click 'Analyze'. The AI provides a summary, extracts key findings, and, based on your settings, can automatically search for related PubMed articles and online news/discussions.</p><p>If the results are promising, use the 'Start Full Review on This Topic' button to seamlessly transfer the AI-synthesized topic to the Orchestrator for a deeper dive.</p></>),
            keywords: "assistant analyze summary key findings similar online"
        },
        {
            title: "Using the Author Hub",
            content: (<><p>The <strong>Authors</strong> tab lets you analyze a researcher's body of work.</p><ol><li><strong>Search or Suggest:</strong> You can either directly search for an author by name or ask the AI to suggest prominent researchers in a field of study (e.g., "mRNA vaccine technology").</li><li><strong>Disambiguate:</strong> The AI will search PubMed and may find multiple potential authors with similar names. It presents you with distinct profiles based on co-authors, affiliations, and research topics. Select the correct one to proceed.</li><li><strong>View Profile:</strong> Once confirmed, the app generates a complete profile, including an AI-written career summary, key research concepts, estimated metrics, and an interactive publication timeline.</li></ol><Note type="info" title="What is Author Disambiguation?">This is a crucial step to ensure you are analyzing the correct person. Many researchers share common names. The AI groups publications into clusters that likely belong to a single individual to prevent mixing up their work.</Note></>),
            keywords: "author hub profile career summary disambiguation disambiguate"
        },
        {
            title: "Mastering the Knowledge Base",
            content: (<><p>Saved reports contribute their articles to your personal <strong>Knowledge Base</strong>. This view consolidates all unique articles from all your reports into a single, powerful interface.</p><ul><li><strong>Search & Filter:</strong> Use the extensive options on the left to narrow down hundreds of articles. You can filter by keywords from the text, report topics, your own custom tags, or show only open-access articles.</li><li><strong>Manage Articles:</strong> Select one or more articles via the checkboxes to perform bulk actions, such as deleting them or exporting citation data for your reference manager.</li><li><strong>Article Details:</strong> Click on any article's title to open a side panel. Here, you can add custom tags, read the full summary, and use the 'Discovery Tools' to find even more related articles or online discussions.</li></ul><Note type="info" title="What does 'Unique Articles' mean?">The Knowledge Base automatically de-duplicates articles. If two different reports find the same article (based on its PMID), it will only appear once in your Knowledge Base. The version with the highest relevance score is retained by default.</Note></>),
            keywords: "knowledge base library search filter manage delete export unique tags details"
        },
        {
            title: "Exporting Your Data",
            content: (<><p>You can export data from several places in the app, with all options configurable in the `Settings > Export` tab.</p><ul><li><strong>From a Report:</strong> Export a single report as a PDF, its article data as a CSV, or just the AI Insights as a CSV.</li><li><strong>From the Knowledge Base:</strong> Select articles and export them as a summary PDF, a data-rich CSV, or a citation file.<ul><li><strong>PDF:</strong> Creates a clean, summary report of the selected articles. Ideal for sharing.</li><li><strong>CSV:</strong> Exports the raw data for spreadsheets or other analysis tools.</li><li><strong>Citations:</strong> Get files in <strong>BibTeX (.bib)</strong> or <strong>RIS (.ris)</strong> format for reference managers like Zotero, Mendeley, or EndNote.</li></ul></li></ul></>),
            keywords: "export pdf csv citations bibtex ris zotero mendeley data"
        },
        {
            title: "General Features & Navigation",
            content: (<><p>Several features are available throughout the app to enhance your workflow.</p><ul><li><strong>Command Palette:</strong> Press <Kbd>⌘ + K</Kbd> (or <Kbd>Ctrl + K</Kbd> on Windows) to open a powerful search bar. From here, you can instantly navigate to any section, change the theme, or perform context-aware actions like saving a report.</li><li><strong>Quick Add:</strong> Use the "Quick Add" button in the header to add a single article to your Knowledge Base using its PMID, DOI, or PubMed URL. The AI will analyze it and create a single-article report.</li><li><strong>Header Navigation:</strong> The main header provides quick access to all core workflows. The "More" dropdown contains secondary views like the Dashboard and History, which become active once you've saved your first report.</li></ul></>)
        }
    ], []);

    const faqItems = useMemo(() => [
        { title: "Is my data private?", content: (<><p><strong>Yes.</strong> All data, including your research history, saved articles, and settings, is stored exclusively in your browser's `localStorage`. No information is ever uploaded to a server or shared. Your research is completely private to the browser you are using.</p><Note type="warning" title="Back Up Your Data">Because the data is stored locally, it can be lost if you clear your browser's data. Use the export features in `Settings > Data Management & Privacy` regularly to create JSON backups.</Note></>) },
        { title: "Can I fully trust the AI's output?", content: (<><p><strong>No.</strong> The AI is a powerful assistant, but it is not infallible. It can make mistakes, misinterpret data, or "hallucinate" information that sounds plausible but is incorrect. The content generated by the AI is for informational and discovery purposes only.</p><p><strong>Always verify critical information by reading the original source articles.</strong> This application is a tool to accelerate research, not a substitute for scholarly review and critical evaluation.</p></>) },
        { title: "How does the app access PubMed?", content: (<><p>The application interacts directly with the public NCBI E-utilities API to search for and retrieve article data from PubMed. It acts as a client, sending requests from your browser to the NCBI servers. No intermediary server is involved.</p></>) },
        { title: "Will this cost me money to use?", content: (<><p>The application itself is free, but it requires a Google Gemini API key to function. Usage of the Gemini API may incur costs depending on your usage and Google's pricing plans. Performing actions like generating reports, analyzing text, or building author profiles consumes API credits.</p><p>You are responsible for monitoring your own API usage and any associated costs. You can do this in your Google AI Studio or Google Cloud Platform console.</p></>) },
        { title: "Why isn't an article I know exists showing up?", content: (<><p>There could be several reasons:</p><ul><li>The AI's search queries may not have been broad or specific enough to capture it.</li><li>The article might fall outside the specified date range or article type filters.</li><li>The article's abstract may not have contained enough relevant keywords for the AI to rank it highly, causing it to fall below your chosen 'Top N' articles for synthesis.</li></ul><p>Try broadening your research topic or adjusting the filters. You can also review the 'Generated PubMed Queries' in a report to see how the AI searched.</p></>) },
        { title: "Keyboard Shortcuts", content: (<><p>Speed up your workflow with these keyboard shortcuts:</p><div className="mt-4 space-y-3 not-prose"><div className="grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-2"><Kbd>⌘ + K</Kbd><span className="ml-4">Open Command Palette</span><Kbd>⌘ + Enter</Kbd><span className="ml-4">Submit Research Form</span><Kbd>Esc</Kbd><span className="ml-4">Close modal / panel / palette</span></div></div></>) }
    ], []);

    const glossaryItems = useMemo(() => [
        { title: "AI Persona", content: <p>A setting that guides the AI's tone and style. For example, 'Concise Expert' will produce shorter, more direct text than 'Detailed Analyst'. This is configured in the AI settings.</p> },
        { title: "Author Disambiguation", content: <p>The process by which the AI distinguishes between different researchers who may share the same name. It does this by analyzing co-authors, institutional affiliations, and publication topics to group articles into distinct profiles.</p> },
        { title: "BibTeX / RIS", content: <p>Standard file formats for bibliographic citations. Files with `.bib` (BibTeX) or `.ris` extensions can be imported into most reference management software like Zotero, Mendeley, or EndNote.</p> },
        { title: "Knowledge Base", content: <p>The central library within the app that stores all unique articles from all of your saved reports. It provides a de-duplicated, searchable, and filterable view of your entire research collection.</p> },
        { title: "PMID (PubMed ID)", content: <p>A unique numerical identifier assigned to each article in the PubMed database. It's the most reliable way to reference a specific paper.</p> },
        { title: "Relevance Score", content: <p>A score from 1-100 generated by the AI, indicating how relevant an article's title and abstract are to your original research query. It serves as an initial filter to prioritize the most promising articles.</p> },
        { title: "Synthesis Focus", content: <p>A setting in the Orchestrator form that directs the AI on what aspect of the research to focus on when writing its summary. For example, focusing on 'Clinical Implications' will yield a different synthesis than 'Gaps in Research'.</p> },
    ], []);

    const getTextFromReactNode = (node: React.ReactNode): string => {
        if (typeof node === 'string') return node;
        if (typeof node === 'number') return String(node);
        if (Array.isArray(node)) return node.map(getTextFromReactNode).join('');
        if (React.isValidElement(node) && (node.props as any).children) {
            return getTextFromReactNode((node.props as any).children);
        }
        return '';
    };

    const filteredGuideTopics = useMemo(() => {
        if (!searchTerm) return guideTopics;
        const lowercasedTerm = searchTerm.toLowerCase();
        return guideTopics.filter(topic => topic.title.toLowerCase().includes(lowercasedTerm) || topic.keywords.includes(lowercasedTerm));
    }, [searchTerm, guideTopics]);
    
    const filteredFaqItems = useMemo(() => {
        if (!searchTerm) return faqItems;
        const lowercasedTerm = searchTerm.toLowerCase();
        return faqItems.filter(item => item.title.toLowerCase().includes(lowercasedTerm) || getTextFromReactNode(item.content).toLowerCase().includes(lowercasedTerm));
    }, [searchTerm, faqItems]);

    const filteredGlossaryItems = useMemo(() => {
        if (!searchTerm) return glossaryItems;
        const lowercasedTerm = searchTerm.toLowerCase();
        return glossaryItems.filter(item => item.title.toLowerCase().includes(lowercasedTerm) || getTextFromReactNode(item.content).toLowerCase().includes(lowercasedTerm));
    }, [searchTerm, glossaryItems]);


    const tabs = useMemo(() => [
        { id: 'guide', name: 'User Guide', icon: BookOpenIcon, component: <GuideSection items={filteredGuideTopics} searchTerm={searchTerm}/> },
        { id: 'faq', name: 'FAQ & Shortcuts', icon: QuestionMarkCircleIcon, component: <FAQSection items={filteredFaqItems} searchTerm={searchTerm} /> },
        { id: 'glossary', name: 'Glossary', icon: BookmarkIcon, component: <GlossarySection items={filteredGlossaryItems} searchTerm={searchTerm}/> },
        { id: 'about', name: 'About', icon: InfoIcon, component: <AboutSection /> },
    ], [searchTerm, filteredGuideTopics, filteredFaqItems, filteredGlossaryItems]);

    useEffect(() => {
        const activeTabIndex = tabs.findIndex(t => t.id === activeTab);
        const activeTabEl = tabRefs.current[activeTabIndex];
        if (activeTabEl) {
            setIndicatorStyle({
                left: activeTabEl.offsetLeft,
                width: activeTabEl.offsetWidth,
                height: activeTabEl.offsetHeight,
            });
        }
    }, [activeTab, tabs]);
    
    const renderContent = () => {
        return tabs.find(tab => tab.id === activeTab)?.component;
    };

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold brand-gradient-text">Help & Documentation</h1>
                <p className="mt-2 text-lg text-text-secondary">Find answers and learn how to get the most out of the application.</p>
            </div>

            <div className="mb-8">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" aria-hidden="true"/>
                    <input
                        type="text"
                        placeholder="Search documentation..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-brand-accent"
                    />
                </div>
            </div>

            <div className="bg-surface border border-border rounded-lg shadow-lg">
                <nav className="border-b border-border p-2">
                    <div className="relative flex items-center">
                        {tabs.map((tab, index) => (
                            <button
                                key={tab.id}
                                ref={el => { tabRefs.current[index] = el; }}
                                onClick={() => setActiveTab(tab.id as HelpSection)}
                                className={`relative flex-1 flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors z-10 ${activeTab === tab.id ? 'text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}
                            >
                                <tab.icon className="h-5 w-5" aria-hidden="true"/>
                                {tab.name}
                            </button>
                        ))}
                        <div
                            className="absolute bg-brand-accent rounded-md transition-all duration-300 ease-in-out"
                            style={indicatorStyle}
                        />
                    </div>
                </nav>
                <div className="p-4 sm:p-6">
                    {renderContent()}
                </div>
            </div>
             {showGoToTop && (
                <button
                    onClick={scrollToTop}
                    aria-label="Scroll to top"
                    className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-brand-accent text-brand-text-on-accent shadow-lg hover:bg-opacity-90 transition-all duration-300 animate-fadeIn"
                >
                    <ChevronUpIcon className="h-6 w-6" aria-hidden="true"/>
                </button>
            )}
        </div>
    );
};

// FIX: Changed to default export to resolve lazy loading type issue.
export default HelpView;
