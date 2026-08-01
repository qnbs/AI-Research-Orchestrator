import React, { useState, useMemo, useId } from 'react';
import { useAuthorsView } from './AuthorsViewContext';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronDownIcon } from '../icons/ChevronDownIcon';
import { DocumentIcon } from '../icons/DocumentIcon';
import { Tooltip } from '../Tooltip';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { useSettings } from '../../contexts/SettingsContext';
import { useTranslation } from '../../hooks/useTranslation';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

const secureMarkdownToHtml = (text: string): string => {
  if (!text) return '';
  const rawMarkup = marked.parse(text.trim(), { breaks: true, gfm: true }) as string;
  return DOMPurify.sanitize(rawMarkup);
};

const ProfileAccordion: React.FC<{
  title: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}> = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const id = useId();
  const panelId = `accordion-panel-${id}`;
  const buttonId = `accordion-button-${id}`;

  return (
    <div className="border border-border rounded-lg bg-surface overflow-hidden">
      <button
        type="button"
        id={buttonId}
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={panelId}
        className="w-full flex justify-between items-center p-4 text-left text-lg font-semibold text-text-primary hover:bg-surface-hover focus-ring-aa transition-colors"
      >
        <div className="flex items-center">{title}</div>
        <ChevronDownIcon
          className={`h-6 w-6 transform transition-transform duration-300 text-text-secondary ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <div
        id={panelId}
        role="region"
        aria-labelledby={buttonId}
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`grid transition-all duration-500 ease-in-out ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
      >
        <div className="overflow-hidden">
          <div className="p-4 border-t border-border bg-background/30">{children}</div>
        </div>
      </div>
    </div>
  );
};

export const AuthorProfileView: React.FC = () => {
  const { authorProfile: profile, handleReset: onReset } = useAuthorsView();
  const { settings } = useSettings();
  const { t } = useTranslation();

  const topCoAuthors = useMemo(() => {
    if (!profile) return [];
    const authorCounts: Record<string, number> = {};
    const mainNameParts = profile.name.toLowerCase().split(' ');
    const mainLastName = mainNameParts[mainNameParts.length - 1];

    profile.publications.forEach((pub) => {
      const authors = pub.authors.split(', ');
      authors.forEach((auth) => {
        const cleanAuth = auth.trim();
        if (cleanAuth && !cleanAuth.toLowerCase().includes(mainLastName)) {
          authorCounts[cleanAuth] = (authorCounts[cleanAuth] || 0) + 1;
        }
      });
    });

    return Object.entries(authorCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));
  }, [profile]);

  if (!profile) return null;

  const isDarkMode = settings.theme === 'dark';
  const textColor = isDarkMode ? '#7d8590' : '#57606a';
  const gridColor = isDarkMode ? 'rgba(125, 133, 144, 0.1)' : 'rgba(87, 96, 106, 0.1)';

  const citationTimeline = Object.keys(profile.metrics.citationsPerYear)
    .sort()
    .map((year) => ({
      year,
      citations: profile.metrics.citationsPerYear[year],
    }));

  return (
    <div className="animate-fadeIn space-y-8 pt-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onReset}
          className="flex items-center text-sm font-medium text-text-secondary hover:text-brand-accent transition-colors"
        >
          <ChevronLeftIcon className="h-4 w-4 mr-1" />
          {t('authors.profile.back')}
        </button>
      </div>

      <div className="bg-surface p-8 rounded-xl border border-border shadow-lg">
        <div className="flex flex-col md:flex-row md:items-start gap-6 mb-8 border-b border-border pb-8">
          <div className="h-20 w-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white text-2xl font-bold shadow-md">
            {profile.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()}
          </div>
          <div>
            <h1 className="text-4xl font-bold text-text-primary">{profile.name}</h1>
            <p className="mt-2 text-lg text-text-secondary">
              {profile.affiliations[0] || t('authors.profile.affiliation_missing')}
            </p>
            {profile.orcid && (
              <p className="text-sm font-mono text-text-secondary mt-1">
                {t('authors.profile.orcid')} {profile.orcid}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-background rounded-lg border border-border text-center">
                <div className="text-3xl font-bold text-brand-accent">
                  {profile.metrics.publicationCount}
                </div>
                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">
                  {t('authors.profile.metrics.publications')}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border border-border text-center">
                <div className="text-3xl font-bold text-brand-accent">
                  {profile.metrics.hIndex ?? t('authors.na')}
                </div>
                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">
                  {t('authors.profile.metrics.h_index')}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border border-border text-center">
                <div className="text-3xl font-bold text-accent-cyan">
                  {profile.metrics.publicationsAsFirstAuthor}
                </div>
                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">
                  {t('authors.profile.metrics.first_author')}
                </div>
              </div>
              <div className="p-4 bg-background rounded-lg border border-border text-center">
                <div className="text-3xl font-bold text-accent-magenta">
                  {profile.metrics.publicationsAsLastAuthor}
                </div>
                <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mt-1">
                  {t('authors.profile.metrics.last_author')}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-text-primary mb-4">
                {t('authors.profile.core_concepts')}
              </h3>
              <div className="space-y-3">
                {profile.coreConcepts.map(({ concept, frequency }) => (
                  <Tooltip
                    key={concept}
                    content={
                      frequency === 1
                        ? t('authors.profile.concept_tooltip_one', { count: frequency })
                        : t('authors.profile.concept_tooltip_other', { count: frequency })
                    }
                  >
                    <div className="group cursor-default">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-text-secondary font-medium group-hover:text-brand-accent transition-colors">
                          {concept}
                        </span>
                        <span className="text-text-secondary text-xs">{frequency}</span>
                      </div>
                      <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                        <div
                          className="h-full bg-brand-accent/70 group-hover:bg-brand-accent transition-colors rounded-full"
                          style={{
                            width: `${(frequency / profile.metrics.publicationCount) * 100}%`,
                          }}
                        ></div>
                      </div>
                    </div>
                  </Tooltip>
                ))}
              </div>
            </div>

            {topCoAuthors.length > 0 && (
              <div>
                <h3 className="text-lg font-bold text-text-primary mb-4">
                  {t('authors.profile.collaborators')}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {topCoAuthors.map((ca) => (
                    <span
                      key={ca.name}
                      className="px-3 py-1 rounded-full bg-surface-hover border border-border text-xs font-medium text-text-primary"
                      title={
                        ca.count === 1
                          ? t('authors.profile.coauthored_title_one', { count: ca.count })
                          : t('authors.profile.coauthored_title_other', { count: ca.count })
                      }
                    >
                      {ca.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-8">
            <div>
              <h3 className="text-xl font-bold text-text-primary mb-4">
                {t('authors.profile.career_synthesis')}
              </h3>
              <div
                className="prose prose-sm prose-invert max-w-none text-text-secondary/90 leading-relaxed bg-background p-6 rounded-lg border border-border shadow-inner"
                dangerouslySetInnerHTML={{ __html: secureMarkdownToHtml(profile.careerSummary) }}
              />
            </div>

            <div>
              <h3 className="text-xl font-bold text-text-primary mb-4">
                {t('authors.profile.citation_timeline')}
              </h3>
              <div className="h-64 bg-background p-4 rounded-lg border border-border">
                {citationTimeline.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={citationTimeline}
                      margin={{ top: 8, right: 8, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                      <XAxis
                        dataKey="year"
                        tick={{ fill: textColor, fontSize: 11 }}
                        angle={-45}
                        textAnchor="end"
                        height={50}
                      />
                      <YAxis
                        tick={{ fill: textColor, fontSize: 12 }}
                        label={{
                          value: t('charts.citations'),
                          angle: -90,
                          position: 'insideLeft',
                          fill: textColor,
                        }}
                      />
                      <RechartsTooltip />
                      <Bar
                        dataKey="citations"
                        name={t('charts.citations')}
                        fill="rgba(31, 111, 235, 0.75)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="h-full flex items-center justify-center text-sm text-text-secondary">
                    {t('charts.no_citation_timeline')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <ProfileAccordion
            title={
              <div className="flex items-center gap-2 font-bold">
                <DocumentIcon className="h-5 w-5 text-brand-accent" />
                <span>
                  {t(
                    profile.publications.length === 1
                      ? 'authors.profile.publication_list_one'
                      : 'authors.profile.publication_list_other',
                    {
                      count: profile.publications.length,
                    },
                  )}
                </span>
              </div>
            }
          >
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin">
              {[...profile.publications]
                .sort((a, b) => parseInt(b.pubYear) - parseInt(a.pubYear))
                .map((pub) => (
                  <a
                    key={pub.pmid}
                    href={`https://pubmed.ncbi.nlm.nih.gov/${pub.pmid}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-4 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-brand-accent/50 transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <p className="font-semibold text-sm text-text-primary group-hover:text-brand-accent">
                        {pub.title}
                      </p>
                      <span className="text-xs font-mono text-text-secondary bg-background px-2 py-0.5 rounded border border-border ml-2 shrink-0">
                        {pub.pubYear}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary mt-2 italic">{pub.journal}</p>
                  </a>
                ))}
            </div>
          </ProfileAccordion>
        </div>
      </div>
    </div>
  );
};
