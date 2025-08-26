

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { SearchIcon } from './icons/SearchIcon';
import { InfoIcon } from './icons/InfoIcon';

type HelpSection = 'guide' | 'faq' | 'glossary';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
    keywords?: string; // For search
}

const Note: React.FC<{ children: React.ReactNode; type?: 'info' | 'tip' | 'warning'; title?: string }> = ({ children, type = 'info', title }) => {
    const styles = {
        info: { base: 'bg-sky-500/10 border-sky-500/20', icon: 'text-sky-400', title: 'text-sky-300' },
        tip: { base: 'bg-green-500/10 border-green-500/20', icon: 'text-green-400', title: 'text-green-300' },
        warning: { base: 'bg-red-500/10 border-red-500/20', icon: 'text-red-400', title: 'text-red-300' },
    };
    const selectedStyle = styles[type];

    return (
        <div className={`p-4 mt-4 rounded-lg border not-prose ${selectedStyle.base}`}>
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
            title: "Step 1: Define Your Research",
            content: (
                <>
                    <p>Everything starts in the <strong>Research Parameters</strong> panel. Here’s how to fill it out effectively:</p>
                    <ul>
                        <li><strong>Primary Research Topic:</strong> Be as specific as possible. Instead of <code>coffee</code>, try <code>the effects of caffeine on sleep quality in young adults</code>. This helps the AI agents focus their search.</li>
                        <li><strong>Publication Date:</strong> Choose a time frame relevant to your topic. For fast-moving fields, "Last 5 Years" is often a good choice.</li>
                        <li><strong>Article Types:</strong> Select the types of evidence you trust most. <strong>Systematic Reviews</strong> and <strong>Meta-Analyses</strong> provide high-level summaries of existing research and are considered strong forms of evidence.</li>
                        <li><strong>Synthesis Focus:</strong> This tells the AI what angle to take when summarizing the findings. Are you interested in a general overview, or looking specifically for gaps in the research?</li>
                    </ul>
                    <Note type="tip" title="Pro-Tip: Advanced Topics">
                        <p>Use boolean-like operators (<code>AND</code>, <code>OR</code>, <code>NOT</code>) in your topic for more precise control, e.g., <code>(intermittent fasting OR time-restricted eating) AND cognitive function NOT alzheimer's</code>.</p>
                    </Note>
                </>
            ),
            keywords: "research parameters topic date type synthesis focus start starting new"
        },
        {
            title: "Step 2: Analyze & Save Your Report",
            content: (
                <>
                    <p>When the process is complete, a detailed report appears. It contains several key sections that you can expand or collapse:</p>
                    <ul>
                        <li><strong>Executive Synthesis:</strong> A comprehensive, narrative summary of the findings from the top articles. This is your high-level overview.</li>
                        <li><strong>AI-Generated Insights:</strong> The AI formulates key questions based on your topic and then answers them using evidence from the literature, citing the specific articles (by PMID) that support the answer.</li>
                        <li><strong>Ranked Articles:</strong> A list of the most relevant articles found. Each card shows the title, authors, relevance score (and why), a summary, and keywords. Click the title to open the article on PubMed.</li>
                         <li><strong>Generated PubMed Queries:</strong> See the exact, advanced queries the AI used to search the database. This is great for learning how to improve your own manual searches.</li>
                    </ul>
                    <p>If you have "Auto-save" disabled in settings, you'll see a <strong>"Save to Knowledge Base"</strong> button. This allows you to review the report's quality before adding its articles to your permanent collection.</p>
                </>
            ),
            keywords: "report results synthesis insights articles save saving pmid query"
        },
        {
            title: "Step 3: Explore Your Knowledge Base",
            content: (
                <>
                    <p>Saved reports contribute their articles to your personal <strong>Knowledge Base</strong>. This view aggregates all unique articles from all your reports into a single, powerful interface.</p>
                    <ul>
                        <li><strong>Search & Filter:</strong> Use the extensive options on the left to narrow down hundreds of articles to just the ones you need. You can filter by keywords, report topics, your own custom tags, or show only Open Access articles.</li>
                        <li><strong>Manage Articles:</strong> Select one or more articles using the checkboxes to perform bulk actions like deleting them or exporting citation data for your reference manager.</li>
                         <li><strong>Sort:</strong> Change the sorting order to find the newest publications or the most relevant articles based on their original scores.</li>
                    </ul>
                    <Note type="info" title="What does 'Unique Articles' mean?">
                        The Knowledge Base automatically de-duplicates articles. If two different reports find the same article (based on its PMID), it will only appear once in your Knowledge Base, ensuring your library stays clean. The version with the highest relevance score is kept.
                    </Note>
                </>
            ),
            keywords: "knowledge base library search filter manage delete export unique"
        },
        {
            title: "Step 4: Dive Deep with the Article Detail Panel",
            content: (
                <>
                     <p>Click on any article in the Knowledge Base list to open the <strong>Article Detail Panel</strong>. This side panel gives you an in-depth look, including:</p>
                    <ul>
                        <li>Full summary, publication details, and all associated keywords.</li>
                        <li><strong>Custom Tags:</strong> Add your own tags (e.g., <code>must-read</code>, <code>methodology-focus</code>) to organize your research. These tags are then available as a filter in the main view.</li>
                        <li><strong>Related AI Insights:</strong> See exactly which AI-generated questions this specific article helped support across all of your reports. This is a powerful way to see cross-report connections.</li>
                    </ul>
                </>
            ),
            keywords: "details panel tags tagging insights summary"
        },
        {
            title: "Step 5: Export Your Data",
            content: (
                <>
                     <p>In the Knowledge Base, you have several export options for your filtered articles:</p>
                    <ul>
                        <li><strong>PDF:</strong> Creates a clean, summarized report of selected articles (or all currently filtered articles if none are selected), including AI insights related to them. Ideal for sharing or quick reading.</li>
                        <li><strong>CSV:</strong> Exports the raw data (title, authors, summary, etc.) to a comma-separated values file, perfect for spreadsheets or other analysis tools.</li>
                        <li><strong>Export Citations:</strong> Select articles and export their citation information in <strong>BibTeX (<code>.bib</code>)</strong> or <strong>RIS (<code>.ris</code>)</strong> format for use in reference managers like Zotero, Mendeley, or EndNote.</li>
                    </ul>
                </>
            ),
            keywords: "export pdf csv citations bibtex ris zotero mendeley data"
        },
        {
            title: "Step 6: Master the Settings",
            content: (
                <>
                    <p>The Settings page (gear icon) gives you granular control over the application:</p>
                    <ul>
                        <li><strong>General:</strong> Switch between light and dark themes, control animations, and set your notification preferences.</li>
                        <li><strong>AI & Defaults:</strong> This is a crucial section. Change the AI's language or persona (e.g., from a "Neutral Scientist" to a "Concise Expert"), adjust its creativity (temperature), and set default values for the main research form to speed up your workflow.</li>
                        <li><strong>Data Management:</strong> Import and export your entire knowledge base, and use tools like "Merge Duplicates" and "Prune by Relevance" to keep your data clean and high-quality.</li>
                    </ul>
                </>
            ),
            keywords: "settings configuration theme dark light mode ai persona temperature defaults data management"
        }
    ], []);

    const filteredTopics = useMemo(() => {
        if (!searchTerm) return guideTopics;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return guideTopics.filter(topic =>
            topic.title.toLowerCase().includes(lowerSearchTerm) ||
            topic.keywords.includes(lowerSearchTerm)
        );
    }, [searchTerm, guideTopics]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-brand-accent mb-4 flex items-center"><BookOpenIcon className="h-8 w-8 mr-3" />User Guide: Step-by-Step</h2>
            <p className="text-text-secondary mb-6">Welcome to the AI Research Orchestrator. This guide will walk you through the entire workflow, from starting your research to managing your findings.</p>
            {filteredTopics.length > 0 ? filteredTopics.map(topic => (
                <AccordionItem key={topic.title} title={topic.title} defaultOpen={!!searchTerm}>{topic.content}</AccordionItem>
            )) : <p className="text-center italic text-text-secondary py-4">No guide topics match your search.</p>}
        </div>
    );
};

const FaqSection: React.FC<{ searchTerm: string }> = ({ searchTerm }) => {
    const faqItems = useMemo(() => [
        {
            title: "Is the AI-generated information always 100% accurate?",
            content: <>
                <Note type="warning" title="Important Disclaimer">
                     <p>While powerful, this tool uses generative AI, which can make mistakes, misinterpret information, or "hallucinate" facts. The generated synthesis and insights are intended as a <strong>starting point for your research, not a replacement for critical evaluation.</strong></p>
                     <p className="mt-2"><strong>You must always verify key findings by reading the original source articles provided.</strong></p>
                </Note>
            </>,
            keywords: "accurate accuracy reliable valid mistakes errors hallucination"
        },
         {
            title: "What is the difference between a 'Report' and the 'Knowledge Base'?",
            content: <>
                <p>This is a key concept to understand:</p>
                <ul>
                    <li>A <strong>Report</strong> is the direct output of a single research query. It's a self-contained document with a synthesis and a list of articles relevant to that specific query.</li>
                    <li>The <strong>Knowledge Base</strong> is the master library of <em>all unique articles</em> from <em>all the reports you have saved</em>. It automatically de-duplicates articles and lets you search, filter, and manage everything in one place.</li>
                </ul>
                <p>Think of reports as the "shopping trips" and the Knowledge Base as your "pantry" that you fill over time.</p>
            </>,
            keywords: "report knowledge base difference distinction"
        },
        {
            title: "Where does the AI get its information?",
            content: <p>The AI Research Orchestrator is designed to query the <strong>PubMed</strong> database, a free resource from the NIH/NLM containing over 36 million citations for biomedical literature. The AI synthesizes information from the abstracts and metadata of the articles it finds there.</p>,
            keywords: "source data pubmed information"
        },
        {
            title: "Where is my data stored? Is it private?",
            content: <>
                <p>All your research reports and the resulting Knowledge Base are stored directly in your web browser's <strong>localStorage</strong>. No data is saved on any external server. This means your research is private to you and your current browser.</p>
                <p>To back up your data or move it to another computer/browser, use the <strong>Export</strong> and <strong>Import</strong> features on the Settings page.</p>
            </>,
            keywords: "data storage privacy security local localStorage server backup"
        },
        {
            title: "How does the 'Merge Duplicates' feature work?",
            content: <p>This tool scans your entire Knowledge Base for articles that have the same PubMed ID (PMID) but may have appeared in different reports (potentially with different relevance scores). It intelligently removes the duplicates, ensuring only the version of the article with the <strong>highest relevance score</strong> is kept. It's a great way to clean up your data without losing the best version of an article.</p>,
            keywords: "merge duplicates clean cleaning data management"
        },
        {
            title: "What are some best practices for a good research topic?",
            content: <>
                <p>A well-defined topic yields better results. Follow these tips:</p>
                 <ul>
                    <li><strong>Be Specific:</strong> Instead of "diet and health," try "impact of Mediterranean diet on cardiovascular health in elderly patients."</li>
                    <li><strong>Use Keywords:</strong> Include the primary keywords you'd expect to find in relevant papers.</li>
                    <li><strong>Define Scope:</strong> Mention specific populations (e.g., "in children," "in athletes") or outcomes (e.g., "cognitive function," "mortality rates") to narrow the focus.</li>
                </ul>
            </>,
            keywords: "best practices topic query prompt"
        },
        {
            title: "Why did my search find no articles?",
            content: <p>This can happen if your criteria are too narrow. Try broadening your search by: extending the date range, removing article type restrictions, or rephrasing your research topic to be less specific. The generated PubMed queries in the report can also give you a hint as to what the AI was looking for.</p>,
            keywords: "no results empty blank articles search fail"
        },
    ], []);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return faqItems;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return faqItems.filter(item =>
            item.title.toLowerCase().includes(lowerSearchTerm) ||
            item.keywords.includes(lowerSearchTerm)
        );
    }, [searchTerm, faqItems]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-brand-accent mb-4 flex items-center"><QuestionMarkCircleIcon className="h-8 w-8 mr-3"/>Frequently Asked Questions</h2>
            {filteredItems.length > 0 ? filteredItems.map(item => (
                <AccordionItem key={item.title} title={item.title}>{item.content}</AccordionItem>
            )) : <p className="text-center italic text-text-secondary py-4">No questions match your search.</p>}
        </div>
    );
};


const GlossarySection: React.FC<{ searchTerm: string }> = ({ searchTerm }) => {
    const glossaryItems = useMemo(() => [
        { title: "Abstract", content: <p>A brief summary of a research article, thesis, or other scholarly work, which helps the reader quickly ascertain the paper's purpose and major findings.</p>, keywords: "abstract summary" },
        { title: "AI Persona", content: <p>A setting that defines the personality and style of the AI's analysis and writing. For example, 'Concise Expert' will be brief, while 'Detailed Analyst' will be more thorough.</p>, keywords: "ai persona personality" },
        { title: "BibTeX / RIS", content: <p>Standardized text-based file formats used to store citation and bibliographic data. These files can be imported into most reference management software like Zotero or Mendeley.</p>, keywords: "bibtex ris citation" },
        { title: "Boolean Operators", content: <p>Words like <code>AND</code>, <code>OR</code>, and <code>NOT</code> used to combine or exclude keywords in a search, resulting in more focused and productive results.</p>, keywords: "boolean operators search" },
        { title: "Custom Tags", content: <p>Personal labels or keywords you can add to articles in the Knowledge Base to organize them according to your own system (e.g., 'To-Read', 'Key Paper').</p>, keywords: "custom tags" },
        { title: "Generative AI", content: <p>A type of artificial intelligence that can create new content, such as text, imagery, or code, based on the data it was trained on.</p>, keywords: "generative ai" },
        { title: "Hallucination", content: <p>An AI phenomenon where the model generates incorrect or nonsensical information but presents it as factual. This is why verifying sources is critical.</p>, keywords: "hallucination error" },
        { title: "Knowledge Base", content: <p>The central repository where all unique articles from all your saved reports are stored, aggregated, and made searchable.</p>, keywords: "knowledge base" },
        { title: "Meta-Analysis", content: <p>A statistical procedure for combining data from multiple studies to increase power and draw a stronger conclusion than any single study.</p>, keywords: "meta-analysis" },
        { title: "Model Temperature", content: <p>An AI setting that controls the randomness of its output. A low temperature (e.g., 0.2) produces more predictable, focused results. A high temperature (e.g., 0.8) produces more creative or diverse results.</p>, keywords: "temperature" },
        { title: "Open Access", content: <p>Scholarly research that is made available online, free of charge to the reader. These articles are marked with an unlock icon in the application.</p>, keywords: "open access free" },
        { title: "PMID (PubMed ID)", content: <p>A unique identification number assigned to every article in the PubMed database.</p>, keywords: "pmid" },
        { title: "Pruning", content: <p>A data management feature that allows you to permanently remove articles from your Knowledge Base that fall below a specified relevance score, helping to maintain data quality.</p>, keywords: "pruning data management" },
        { title: "Randomized Controlled Trial (RCT)", content: <p>A study design that randomly assigns participants into an experimental group or a control group. It is considered a gold standard for clinical evidence.</p>, keywords: "randomized controlled trial rct" },
        { title: "Relevance Score", content: <p>A score from 1-100 generated by the AI to rank how relevant an article is to the user's research topic.</p>, keywords: "relevance score" },
        { title: "Synthesis", content: <p>A comprehensive narrative written by the AI that summarizes and connects the findings from the top-ranked articles.</p>, keywords: "synthesis summary" },
        { title: "Systematic Review", content: <p>A type of literature review that collects and critically analyzes multiple research studies or papers, using systematic methods to identify, select, and appraise research.</p>, keywords: "systematic review" },
    ].sort((a, b) => a.title.localeCompare(b.title)), []);
    
    const filteredItems = useMemo(() => {
        if (!searchTerm) return glossaryItems;
        const lowerSearchTerm = searchTerm.toLowerCase();
        return glossaryItems.filter(item =>
            item.title.toLowerCase().includes(lowerSearchTerm) ||
            item.keywords.includes(lowerSearchTerm)
        );
    }, [searchTerm, glossaryItems]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-brand-accent mb-4 flex items-center"><BookmarkIcon className="h-8 w-8 mr-3"/>Glossary of Terms</h2>
            <p className="text-text-secondary mb-6">Understanding these key terms will help you get the most out of the application.</p>
            {filteredItems.length > 0 ? filteredItems.map(item => (
                <AccordionItem key={item.title} title={item.title}>{item.content}</AccordionItem>
            )) : <p className="text-center italic text-text-secondary py-4">No terms match your search.</p>}
        </div>
    );
};

const sections = [
    { id: 'guide', label: 'User Guide' },
    { id: 'faq', label: 'FAQ' },
    { id: 'glossary', label: 'Glossary' },
] as const;

export const HelpView: React.FC = () => {
    const [activeSection, setActiveSection] = useState<HelpSection>('guide');
    const [searchTerm, setSearchTerm] = useState('');
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        contentRef.current?.scrollTo(0, 0);
    }, [activeSection]);

    const renderSection = () => {
        switch (activeSection) {
            case 'guide': return <GuideSection searchTerm={searchTerm} />;
            case 'faq': return <FaqSection searchTerm={searchTerm} />;
            case 'glossary': return <GlossarySection searchTerm={searchTerm} />;
            default: return null;
        }
    };

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-brand-accent">Help Center</h1>
                <p className="mt-2 text-lg text-text-secondary">Your resource for mastering the AI Research Orchestrator.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                <aside className="md:col-span-1">
                    <div className="sticky top-24 space-y-4">
                        <nav>
                            <ul className="space-y-2">
                                {sections.map(section => (
                                    <li key={section.id}>
                                        <button
                                            onClick={() => setActiveSection(section.id)}
                                            className={`w-full text-left px-4 py-2.5 rounded-md text-sm font-medium transition-colors ${activeSection === section.id ? 'bg-brand-accent text-brand-text-on-accent' : 'text-text-primary bg-surface hover:bg-border'}`}
                                        >
                                            {section.label}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </nav>
                        <div className="relative">
                            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary" />
                            <input
                                type="text"
                                placeholder="Search help topics..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-surface border border-border rounded-md py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand-accent"
                            />
                        </div>
                    </div>
                </aside>
                <main ref={contentRef} className="md:col-span-3 bg-surface rounded-lg border border-border p-6 md:p-8 min-h-[70vh] max-h-[70vh] overflow-y-auto">
                    {renderSection()}
                </main>
            </div>
        </div>
    );
};