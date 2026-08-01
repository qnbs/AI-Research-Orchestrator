import React, { useState, useRef, useEffect, useMemo, useId } from 'react';
import { ChevronDownIcon } from './icons/ChevronDownIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { QuestionMarkCircleIcon } from './icons/QuestionMarkCircleIcon';
import { BookmarkIcon } from './icons/BookmarkIcon';
import { SearchIcon } from './icons/SearchIcon';
import { InfoIcon } from './icons/InfoIcon';
import { ChevronUpIcon } from './icons/ChevronUpIcon';
import { useTranslation } from '../hooks/useTranslation';
import {
  AboutSection,
  getFaqItems,
  getGlossaryItems,
  getGuideTopics,
  type HelpTopic,
} from './help/helpContent';

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

const AccordionItem: React.FC<AccordionItemProps> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `panel-${id}`;
  const buttonId = `button-${id}`;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets on prop change; isOpen is also toggled independently by the user.
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
          className="w-full flex justify-between items-center py-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus-ring-aa transition-colors"
        >
          <span>{title}</span>
          <ChevronDownIcon
            className={`h-6 w-6 transform transition-transform text-text-secondary ${isOpen ? 'rotate-180' : ''}`}
          />
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

const TopicSection: React.FC<{ items: HelpTopic[]; searchTerm: string; emptyMessage: string }> = ({
  items,
  searchTerm,
  emptyMessage,
}) => {
  return (
    <div>
      {items.map((topic) => (
        <AccordionItem key={topic.title} title={topic.title} defaultOpen={!!searchTerm}>
          {topic.content}
        </AccordionItem>
      ))}
      {items.length === 0 && (
        <div className="text-center py-8">
          <p className="text-lg text-text-primary">{emptyMessage}</p>
        </div>
      )}
    </div>
  );
};

/** Pure text extraction from a React node tree, used to search rendered help content. */
export const getTextFromReactNode = (node: React.ReactNode): string => {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') {
    return String(node);
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getTextFromReactNode(node.props.children);
  }
  return React.Children.toArray(node).map(getTextFromReactNode).join('');
};

export const filterHelpTopics = (
  items: HelpTopic[],
  searchTerm: string,
  getText: (node: React.ReactNode) => string = getTextFromReactNode,
): HelpTopic[] => {
  const normalizedTerm = searchTerm.trim().toLowerCase();
  if (!normalizedTerm) return items;

  return items.filter((topic) =>
    [topic.title, topic.keywords ?? '', getText(topic.content)].some((value) =>
      value.toLowerCase().includes(normalizedTerm),
    ),
  );
};

const HelpView: React.FC<HelpViewProps> = ({ initialTab, onTabConsumed }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<HelpSection>(
    initialTab === 'about' || initialTab === 'faq' ? initialTab : 'guide',
  );
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

  const guideTopics = useMemo(() => getGuideTopics(t), [t]);
  const faqItems = useMemo(() => getFaqItems(t), [t]);
  const glossaryItems = useMemo(() => getGlossaryItems(t), [t]);

  const filteredGuideTopics = useMemo(
    () => filterHelpTopics(guideTopics, searchTerm),
    [searchTerm, guideTopics],
  );

  const filteredFaqItems = useMemo(
    () => filterHelpTopics(faqItems, searchTerm),
    [searchTerm, faqItems],
  );

  const filteredGlossaryItems = useMemo(
    () => filterHelpTopics(glossaryItems, searchTerm),
    [searchTerm, glossaryItems],
  );

  const tabs = useMemo<
    Array<{
      id: HelpSection;
      name: string;
      icon: React.FC<React.SVGProps<SVGSVGElement>>;
      component: React.ReactNode;
    }>
  >(
    () => [
      {
        id: 'guide',
        name: t('help.tabs.guide'),
        icon: BookOpenIcon,
        component: (
          <TopicSection
            items={filteredGuideTopics}
            searchTerm={searchTerm}
            emptyMessage={t('help.empty.guide')}
          />
        ),
      },
      {
        id: 'faq',
        name: t('help.tabs.faq'),
        icon: QuestionMarkCircleIcon,
        component: (
          <TopicSection
            items={filteredFaqItems}
            searchTerm={searchTerm}
            emptyMessage={t('help.empty.faq')}
          />
        ),
      },
      {
        id: 'glossary',
        name: t('help.tabs.glossary'),
        icon: BookmarkIcon,
        component: (
          <TopicSection
            items={filteredGlossaryItems}
            searchTerm={searchTerm}
            emptyMessage={t('help.empty.glossary')}
          />
        ),
      },
      {
        id: 'about',
        name: t('help.tabs.about'),
        icon: InfoIcon,
        component: <AboutSection t={t} />,
      },
    ],
    [searchTerm, filteredGuideTopics, filteredFaqItems, filteredGlossaryItems, t],
  );

  useEffect(() => {
    const activeTabIndex = tabs.findIndex((tab) => tab.id === activeTab);
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
    return tabs.find((tab) => tab.id === activeTab)?.component;
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold brand-gradient-text">{t('help.title')}</h1>
        <p className="mt-2 text-lg text-text-secondary">{t('help.subtitle')}</p>
      </div>

      <div className="mb-8">
        <div className="relative">
          <SearchIcon
            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-text-secondary"
            aria-hidden="true"
          />
          <input
            type="text"
            placeholder={t('help.search.placeholder')}
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
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
                ref={(el) => {
                  tabRefs.current[index] = el;
                }}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex-1 flex justify-center items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-md transition-colors z-10 ${activeTab === tab.id ? 'text-brand-text-on-accent' : 'text-text-secondary hover:bg-surface-hover'}`}
              >
                <tab.icon className="h-5 w-5" aria-hidden="true" />
                {tab.name}
              </button>
            ))}
            <div
              className="absolute bg-brand-accent rounded-md transition-all duration-300 ease-in-out"
              style={indicatorStyle}
            />
          </div>
        </nav>
        <div className="p-4 sm:p-6">{renderContent()}</div>
      </div>
      {showGoToTop && (
        <button
          onClick={scrollToTop}
          aria-label={t('help.scroll_top')}
          className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-brand-accent text-brand-text-on-accent shadow-lg hover:bg-opacity-90 transition-all duration-300 animate-fadeIn"
        >
          <ChevronUpIcon className="h-6 w-6" aria-hidden="true" />
        </button>
      )}
    </div>
  );
};

export default HelpView;
