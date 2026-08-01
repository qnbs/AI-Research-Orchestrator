import React from 'react';
import { InfoIcon } from '../icons/InfoIcon';
import { Kbd } from '../Kbd';
import type { TranslationKey } from '../../hooks/useTranslation';

type Translator = (
  key: TranslationKey | (string & {}),
  values?: Record<string, string | number>,
) => string;

export interface HelpTopic {
  title: string;
  content: React.ReactNode;
  keywords?: string;
}

const Note: React.FC<{
  children: React.ReactNode;
  type?: 'info' | 'tip' | 'warning';
  title?: string;
}> = ({ children, type = 'info', title }) => {
  const styles = {
    info: { base: 'bg-sky-500/10 border-sky-500/20', icon: 'text-sky-400', title: 'text-sky-300' },
    tip: {
      base: 'bg-green-500/10 border-green-500/20',
      icon: 'text-green-400',
      title: 'text-green-300',
    },
    warning: {
      base: 'bg-red-500/10 border-red-500/20',
      icon: 'text-red-400',
      title: 'text-red-300',
    },
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

/** Flat list item — keeps JSX depth low for DeepSource nesting limits. */
const Bullet: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <li>
    <strong>{label}</strong> {children}
  </li>
);

const ExportGuideContent: React.FC<{ t: Translator }> = ({ t }) => (
  <div>
    <p>
      {t('help.guide.export.intro.start')} <code>{t('help.guide.export.settings')}</code>{' '}
      {t('help.guide.export.intro.end')}
    </p>
    <ul>
      <Bullet label={t('help.guide.export.report.label')}>
        {t('help.guide.export.report.desc')}
      </Bullet>
      <Bullet label={t('help.guide.export.kb.label')}>{t('help.guide.export.kb.desc')}</Bullet>
      <Bullet label={t('help.guide.export.pdf.label')}>{t('help.guide.export.pdf.desc')}</Bullet>
      <Bullet label={t('help.guide.export.csv.label')}>{t('help.guide.export.csv.desc')}</Bullet>
      <Bullet label={t('help.guide.export.citations.label')}>
        {t('help.guide.export.citations.start')}{' '}
        <strong>{t('help.guide.export.citations.bib')}</strong>{' '}
        {t('help.guide.export.citations.or')}{' '}
        <strong>{t('help.guide.export.citations.ris')}</strong>{' '}
        {t('help.guide.export.citations.end')}
      </Bullet>
    </ul>
  </div>
);

export const getGuideTopics = (t: Translator): HelpTopic[] => [
  {
    title: t('help.guide.workflows.title'),
    content: (
      <>
        <p>{t('help.guide.workflows.intro')}</p>
        <ol>
          <li>
            <strong>{t('help.guide.workflows.research.label')}</strong>{' '}
            {t('help.guide.workflows.research.desc')}
          </li>
          <li>
            <strong>{t('help.guide.workflows.orchestrator.label')}</strong>{' '}
            {t('help.guide.workflows.orchestrator.desc')}
          </li>
          <li>
            <strong>{t('help.guide.workflows.author.label')}</strong>{' '}
            {t('help.guide.workflows.author.desc')}
          </li>
        </ol>
      </>
    ),
    keywords: t('help.guide.workflows.keywords'),
  },
  {
    title: t('help.guide.orchestrator.title'),
    content: (
      <>
        <p>
          {t('help.guide.orchestrator.intro.start')}{' '}
          <strong>{t('help.guide.orchestrator.intro.strong')}</strong>{' '}
          {t('help.guide.orchestrator.intro.end')}
        </p>
        <ul>
          <li>
            <strong>{t('help.guide.orchestrator.topic.label')}</strong>{' '}
            {t('help.guide.orchestrator.topic.start')}{' '}
            <code>{t('help.guide.orchestrator.topic.bad')}</code>
            {t('help.guide.orchestrator.topic.middle')}{' '}
            <code>{t('help.guide.orchestrator.topic.good')}</code>
            {t('help.guide.orchestrator.topic.end')}
          </li>
          <li>
            <strong>{t('help.guide.orchestrator.date.label')}</strong>{' '}
            {t('help.guide.orchestrator.date.desc')}
          </li>
          <li>
            <strong>{t('help.guide.orchestrator.types.label')}</strong>{' '}
            {t('help.guide.orchestrator.types.start')}{' '}
            <strong>{t('help.guide.orchestrator.types.systematic')}</strong>{' '}
            {t('help.guide.orchestrator.types.and')}{' '}
            <strong>{t('help.guide.orchestrator.types.meta')}</strong>{' '}
            {t('help.guide.orchestrator.types.end')}
          </li>
          <li>
            <strong>{t('help.guide.orchestrator.focus.label')}</strong>{' '}
            {t('help.guide.orchestrator.focus.desc')}
          </li>
          <li>
            <strong>{t('help.guide.orchestrator.config.label')}</strong>{' '}
            {t('help.guide.orchestrator.config.desc')}
          </li>
        </ul>
        <Note type="tip" title={t('help.note.pro_tip_advanced')}>
          <p>
            {t('help.guide.orchestrator.tip.start')}{' '}
            <code>{t('help.guide.orchestrator.tip.and')}</code>,{' '}
            <code>{t('help.guide.orchestrator.tip.or')}</code>,{' '}
            <code>{t('help.guide.orchestrator.tip.not')}</code>{' '}
            {t('help.guide.orchestrator.tip.middle')}{' '}
            <code>{t('help.guide.orchestrator.tip.example')}</code>
            {t('help.guide.orchestrator.tip.end')}
          </p>
        </Note>
        <p>{t('help.guide.orchestrator.after')}</p>
      </>
    ),
    keywords: t('help.guide.orchestrator.keywords'),
  },
  {
    title: t('help.guide.research.title'),
    content: (
      <>
        <p>
          {t('help.guide.research.intro.start')}{' '}
          <strong>{t('help.guide.research.intro.strong')}</strong>{' '}
          {t('help.guide.research.intro.end')}
        </p>
        <ul>
          <li>{t('help.guide.research.use.summary')}</li>
          <li>{t('help.guide.research.use.question')}</li>
          <li>{t('help.guide.research.use.exploration')}</li>
        </ul>
        <p>{t('help.guide.research.analyze')}</p>
        <p>{t('help.guide.research.full_review')}</p>
      </>
    ),
    keywords: t('help.guide.research.keywords'),
  },
  {
    title: t('help.guide.authors.title'),
    content: (
      <>
        <p>
          {t('help.guide.authors.intro.start')}{' '}
          <strong>{t('help.guide.authors.intro.strong')}</strong>{' '}
          {t('help.guide.authors.intro.end')}
        </p>
        <ol>
          <li>
            <strong>{t('help.guide.authors.search.label')}</strong>{' '}
            {t('help.guide.authors.search.desc')}
          </li>
          <li>
            <strong>{t('help.guide.authors.disambiguate.label')}</strong>{' '}
            {t('help.guide.authors.disambiguate.desc')}
          </li>
          <li>
            <strong>{t('help.guide.authors.profile.label')}</strong>{' '}
            {t('help.guide.authors.profile.desc')}
          </li>
        </ol>
        <Note type="info" title={t('help.note.author_disambiguation')}>
          {t('help.guide.authors.note')}
        </Note>
      </>
    ),
    keywords: t('help.guide.authors.keywords'),
  },
  {
    title: t('help.guide.knowledge.title'),
    content: (
      <>
        <p>
          {t('help.guide.knowledge.intro.start')}{' '}
          <strong>{t('help.guide.knowledge.intro.strong')}</strong>{' '}
          {t('help.guide.knowledge.intro.end')}
        </p>
        <ul>
          <li>
            <strong>{t('help.guide.knowledge.search.label')}</strong>{' '}
            {t('help.guide.knowledge.search.desc')}
          </li>
          <li>
            <strong>{t('help.guide.knowledge.manage.label')}</strong>{' '}
            {t('help.guide.knowledge.manage.desc')}
          </li>
          <li>
            <strong>{t('help.guide.knowledge.details.label')}</strong>{' '}
            {t('help.guide.knowledge.details.desc')}
          </li>
        </ul>
        <Note type="info" title={t('help.note.unique_articles')}>
          {t('help.guide.knowledge.note')}
        </Note>
      </>
    ),
    keywords: t('help.guide.knowledge.keywords'),
  },
  {
    title: t('help.guide.export.title'),
    content: <ExportGuideContent t={t} />,
    keywords: t('help.guide.export.keywords'),
  },
  {
    title: t('help.guide.navigation.title'),
    content: (
      <>
        <p>{t('help.guide.navigation.intro')}</p>
        <ul>
          <li>
            <strong>{t('help.guide.navigation.command.label')}</strong>{' '}
            {t('help.guide.navigation.command.start')} <Kbd>⌘ + K</Kbd>{' '}
            {t('help.guide.navigation.command.middle')} <Kbd>Ctrl + K</Kbd>{' '}
            {t('help.guide.navigation.command.end')}
          </li>
          <li>
            <strong>{t('help.guide.navigation.quick_add.label')}</strong>{' '}
            {t('help.guide.navigation.quick_add.desc')}
          </li>
          <li>
            <strong>{t('help.guide.navigation.header.label')}</strong>{' '}
            {t('help.guide.navigation.header.desc')}
          </li>
        </ul>
      </>
    ),
    keywords: t('help.guide.navigation.keywords'),
  },
];

export const getFaqItems = (t: Translator): HelpTopic[] => [
  {
    title: t('help.faq.privacy.title'),
    content: (
      <>
        <p>
          <strong>{t('help.faq.privacy.answer.label')}</strong> {t('help.faq.privacy.answer.start')}{' '}
          <code>{t('help.faq.privacy.storage')}</code> {t('help.faq.privacy.answer.end')}
        </p>
        <Note type="warning" title={t('help.note.back_up')}>
          {t('help.faq.privacy.backup.start')} <code>{t('help.faq.privacy.backup.settings')}</code>{' '}
          {t('help.faq.privacy.backup.end')}
        </Note>
      </>
    ),
  },
  {
    title: t('help.faq.trust.title'),
    content: (
      <>
        <p>
          <strong>{t('help.faq.trust.answer.label')}</strong> {t('help.faq.trust.answer')}
        </p>
        <p>
          <strong>{t('help.faq.trust.verify')}</strong> {t('help.faq.trust.review')}
        </p>
      </>
    ),
  },
  {
    title: t('help.faq.pubmed.title'),
    content: <p>{t('help.faq.pubmed.answer')}</p>,
  },
  {
    title: t('help.faq.cost.title'),
    content: (
      <>
        <p>{t('help.faq.cost.answer')}</p>
        <p>{t('help.faq.cost.responsibility')}</p>
      </>
    ),
  },
  {
    title: t('help.faq.missing.title'),
    content: (
      <>
        <p>{t('help.faq.missing.intro')}</p>
        <ul>
          <li>{t('help.faq.missing.reason.query')}</li>
          <li>{t('help.faq.missing.reason.filters')}</li>
          <li>{t('help.faq.missing.reason.ranking')}</li>
        </ul>
        <p>{t('help.faq.missing.try')}</p>
      </>
    ),
  },
  {
    title: t('help.faq.shortcuts.title'),
    content: (
      <>
        <p>{t('help.faq.shortcuts.intro')}</p>
        <div className="mt-4 space-y-3 not-prose">
          <div className="grid grid-cols-[auto,1fr] items-center gap-x-4 gap-y-2">
            <Kbd>⌘ + K</Kbd>
            <span className="ml-4">{t('help.faq.shortcuts.command_palette')}</span>
            <Kbd>⌘ + Enter</Kbd>
            <span className="ml-4">{t('help.faq.shortcuts.submit')}</span>
            <Kbd>Esc</Kbd>
            <span className="ml-4">{t('help.faq.shortcuts.close')}</span>
          </div>
        </div>
      </>
    ),
  },
];

export const getGlossaryItems = (t: Translator): HelpTopic[] => [
  {
    title: t('help.glossary.ai_persona.title'),
    content: <p>{t('help.glossary.ai_persona.desc')}</p>,
  },
  {
    title: t('help.glossary.author_disambiguation.title'),
    content: <p>{t('help.glossary.author_disambiguation.desc')}</p>,
  },
  {
    title: t('help.glossary.bibtex_ris.title'),
    content: <p>{t('help.glossary.bibtex_ris.desc')}</p>,
  },
  {
    title: t('help.glossary.knowledge_base.title'),
    content: <p>{t('help.glossary.knowledge_base.desc')}</p>,
  },
  {
    title: t('help.glossary.pmid.title'),
    content: <p>{t('help.glossary.pmid.desc')}</p>,
  },
  {
    title: t('help.glossary.relevance.title'),
    content: <p>{t('help.glossary.relevance.desc')}</p>,
  },
  {
    title: t('help.glossary.synthesis.title'),
    content: <p>{t('help.glossary.synthesis.desc')}</p>,
  },
];

export const AboutSection: React.FC<{ t: Translator }> = ({ t }) => (
  <div className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed">
    <h3 className="text-xl font-bold text-text-primary">{t('help.about.title')}</h3>
    <p>{t('help.about.description')}</p>
    <p>
      <strong>{t('help.about.version.label')}</strong> {t('help.about.version.value')}
    </p>
    <h4 className="font-semibold text-text-primary">{t('help.about.principles.title')}</h4>
    <ul>
      <li>
        <strong>{t('help.about.principles.privacy.label')}</strong>{' '}
        {t('help.about.principles.privacy.desc')}
      </li>
      <li>
        <strong>{t('help.about.principles.assistant.label')}</strong>{' '}
        {t('help.about.principles.assistant.desc')}
      </li>
      <li>
        <strong>{t('help.about.principles.traceability.label')}</strong>{' '}
        {t('help.about.principles.traceability.desc')}
      </li>
    </ul>
    <h4 className="font-semibold text-text-primary">{t('help.about.disclaimer.title')}</h4>
    <p>{t('help.about.disclaimer.desc')}</p>
  </div>
);
