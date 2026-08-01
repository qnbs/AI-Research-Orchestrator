/**
 * Scientometric Network Hub – Author collaboration graph + keyword co-occurrence
 * Built with Recharts (ScatterChart + ResponsiveContainer) + Framer Motion
 */
import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import type { AggregatedArticle, OverallKeyword } from '../types';
import { useTranslation } from '../hooks/useTranslation';
import type { TranslationKey } from '../hooks/useTranslation';

// ── Types ─────────────────────────────────────────────────────────────────────
interface AuthorNode {
  name: string;
  articleCount: number;
  avgRelevance: number;
  journals: string[];
  collaborators: string[];
  x: number;
  y: number;
}

interface Props {
  articles: AggregatedArticle[];
  keywords?: OverallKeyword[];
  title?: string;
}

// ── Color palette ─────────────────────────────────────────────────────────────
const NEON_COLORS = [
  'var(--color-brand-accent)',
  'var(--color-accent-cyan)',
  'var(--color-accent-magenta)',
  'var(--color-accent-amber)',
  'var(--color-accent-green)',
  '#818cf8',
  '#f9a8d4',
  '#86efac',
];

// ── Tooltip ───────────────────────────────────────────────────────────────────
const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ payload: AuthorNode }> }> = ({
  active,
  payload,
}) => {
  const { t, lang } = useTranslation();
  if (!active || !payload?.length) return null;
  const node = payload[0].payload;
  const avgRelevance = Number(node.avgRelevance).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', {
    maximumFractionDigits: 1,
    minimumFractionDigits: 1,
  });
  return (
    <div
      className="glass-panel rounded-xl p-3 text-xs max-w-[220px]"
      style={{ border: '1px solid var(--color-brand-accent)' }}
    >
      <p className="font-semibold text-text-primary text-sm mb-1">{node.name}</p>
      <p className="text-text-secondary">
        {node.articleCount === 1
          ? t('scientometrics.tooltip.articles_one', { count: node.articleCount })
          : t('scientometrics.tooltip.articles_other', { count: node.articleCount })}
      </p>
      <p className="text-accent-cyan">
        {t('scientometrics.tooltip.avg_relevance', { value: avgRelevance })}
      </p>
      {node.journals.length > 0 && (
        <p className="text-text-secondary mt-1 truncate">{node.journals.slice(0, 2).join(', ')}</p>
      )}
    </div>
  );
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseAuthors = (articles: AggregatedArticle[]): AuthorNode[] => {
  const map = new Map<string, { articles: AggregatedArticle[]; collaborators: Set<string> }>();

  articles.forEach((article) => {
    const authors = article.authors
      .split(/,\s*/)
      .map((name) => name.trim())
      .filter(Boolean);
    authors.forEach((author) => {
      if (!map.has(author)) map.set(author, { articles: [], collaborators: new Set() });
      const entry = map.get(author);
      if (!entry) return;
      entry.articles.push(article);
      authors
        .filter((other) => other !== author)
        .forEach((collab) => entry.collaborators.add(collab));
    });
  });

  const nodes: AuthorNode[] = [];
  let nodeIndex = 0;
  map.forEach((data, name) => {
    if (data.articles.length < 1) return;
    const avgRelevance =
      data.articles.reduce((sum, article) => sum + (article.relevanceScore ?? 0), 0) /
      data.articles.length;
    const angle = (nodeIndex / map.size) * Math.PI * 2;
    const radius = 30 + Math.log(data.articles.length + 1) * 15;
    nodes.push({
      name,
      articleCount: data.articles.length,
      avgRelevance,
      journals: [...new Set(data.articles.map((article) => article.journal).filter(Boolean))],
      collaborators: [...data.collaborators].slice(0, 5),
      x: 50 + Math.cos(angle) * radius,
      y: 50 + Math.sin(angle) * radius,
    });
    nodeIndex++;
  });

  return nodes.sort((left, right) => right.articleCount - left.articleCount).slice(0, 40);
};

const getYearDistribution = (articles: AggregatedArticle[], unknownLabel: string) => {
  const map = new Map<string, number>();
  articles.forEach((article) => {
    const year = article.pubYear || unknownLabel;
    map.set(year, (map.get(year) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([year, count]) => ({ year, count }))
    .sort((left, right) => left.year.localeCompare(right.year));
};

const getJournalDistribution = (articles: AggregatedArticle[], unknownLabel: string) => {
  const map = new Map<string, number>();
  articles.forEach((article) => {
    const journal = article.journal || unknownLabel;
    map.set(journal, (map.get(journal) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((left, right) => right.value - left.value)
    .slice(0, 8);
};

// ── Tab Types ─────────────────────────────────────────────────────────────────
type Tab = 'authors' | 'years' | 'journals' | 'keywords';
const TABS: { id: Tab; labelKey: TranslationKey; icon: string }[] = [
  { id: 'authors', labelKey: 'scientometrics.authors', icon: '👥' },
  { id: 'years', labelKey: 'scientometrics.timeline', icon: '📅' },
  { id: 'journals', labelKey: 'scientometrics.journals', icon: '📰' },
  { id: 'keywords', labelKey: 'scientometrics.keywords', icon: '🏷️' },
];

// ── Main Component ────────────────────────────────────────────────────────────
const ScientometricHub: React.FC<Props> = ({ articles, keywords = [], title }) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('authors');
  const unknownLabel = t('scientometrics.unknown');
  const activeTabIndex = TABS.findIndex((tab) => tab.id === activeTab);

  const handleTabListKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keyOffsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };
    const offset = keyOffsets[event.key];
    if (offset == null) return;
    event.preventDefault();
    const nextIndex = (activeTabIndex + offset + TABS.length) % TABS.length;
    const nextTab = TABS[nextIndex].id;
    setActiveTab(nextTab);
    requestAnimationFrame(() => {
      document.getElementById(`scientometrics-tab-${nextTab}`)?.focus();
    });
  };

  const authorNodes = useMemo(() => parseAuthors(articles), [articles]);
  const yearData = useMemo(
    () => getYearDistribution(articles, unknownLabel),
    [articles, unknownLabel],
  );
  const journalData = useMemo(
    () => getJournalDistribution(articles, unknownLabel),
    [articles, unknownLabel],
  );

  // Top 30 keywords for cloud
  const topKeywords = useMemo(
    () => [...keywords].sort((a, b) => b.frequency - a.frequency).slice(0, 30),
    [keywords],
  );

  if (!articles.length)
    return (
      <div className="flex items-center justify-center h-40 text-text-secondary text-sm">
        {t('scientometrics.empty')}
      </div>
    );

  return (
    <div className="glass-panel rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-semibold brand-gradient-text">
          {title ?? t('scientometrics.title')}
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          {t('scientometrics.stats', {
            articles: articles.length,
            authors: authorNodes.length,
            years: yearData.length,
          })}
        </p>
      </div>

      {/* Tabs */}
      <div
        className="flex gap-1 px-4 pt-3 pb-0 overflow-x-auto"
        role="tablist"
        aria-label={t('scientometrics.title')}
        onKeyDown={handleTabListKeyDown}
        tabIndex={-1}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            id={`scientometrics-tab-${tab.id}`}
            role="tab"
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            aria-controls={`scientometrics-panel-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs font-medium transition-all whitespace-nowrap
              ${
                activeTab === tab.id
                  ? 'bg-brand-accent/10 text-brand-accent border border-brand-accent/30 border-b-0'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
          >
            <span>{tab.icon}</span>
            <span>{t(tab.labelKey)}</span>
          </button>
        ))}
      </div>

      {/* Chart Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          id={`scientometrics-panel-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`scientometrics-tab-${activeTab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="p-4"
          style={{ minHeight: 320 }}
        >
          {/* Author Network Scatter */}
          {activeTab === 'authors' && (
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                  <XAxis type="number" dataKey="x" name="Position" hide domain={[0, 100]} />
                  <YAxis type="number" dataKey="y" name="Position" hide domain={[0, 100]} />
                  <ZAxis type="number" dataKey="articleCount" range={[40, 400]} name="Articles" />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter data={authorNodes} name={t('scientometrics.series.authors')}>
                    {authorNodes.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={NEON_COLORS[index % NEON_COLORS.length]}
                        fillOpacity={0.75}
                        stroke={NEON_COLORS[index % NEON_COLORS.length]}
                        strokeWidth={1}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
              {/* Top authors list */}
              <div className="mt-3 flex flex-wrap gap-2">
                {authorNodes.slice(0, 10).map((a, i) => (
                  <span
                    key={a.name}
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      backgroundColor: `${NEON_COLORS[i % NEON_COLORS.length]}20`,
                      color: NEON_COLORS[i % NEON_COLORS.length],
                      border: `1px solid ${NEON_COLORS[i % NEON_COLORS.length]}40`,
                    }}
                  >
                    {a.name} ({a.articleCount})
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Publication Timeline */}
          {activeTab === 'years' && (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yearData} margin={{ top: 5, right: 10, bottom: 20, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-subtle)" />
                <XAxis
                  dataKey="year"
                  tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={40}
                />
                <YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    backdropFilter: 'blur(16px)',
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)' }}
                  itemStyle={{ color: 'var(--color-brand-accent)' }}
                />
                <Bar
                  dataKey="count"
                  name={t('scientometrics.series.articles')}
                  radius={[4, 4, 0, 0]}
                >
                  {yearData.map((entry, index) => (
                    <Cell
                      key={entry.year}
                      fill={`hsl(${190 + index * 5}, 80%, 60%)`}
                      fillOpacity={0.85}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}

          {/* Journal Distribution Pie */}
          {activeTab === 'journals' && (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={journalData}
                  cx="50%"
                  cy="50%"
                  outerRadius={110}
                  dataKey="value"
                  nameKey="name"
                  label={({ value }) => `${value}`}
                  labelLine={false}
                >
                  {journalData.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={NEON_COLORS[index % NEON_COLORS.length]}
                      fillOpacity={0.8}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-surface)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                  }}
                  labelStyle={{ color: 'var(--color-text-primary)', fontSize: 12 }}
                />
                <Legend
                  formatter={(value) => (
                    <span
                      style={{ color: 'var(--color-text-secondary)', fontSize: 11 }}
                      title={value}
                    >
                      {value.length > 30 ? value.slice(0, 28) + '…' : value}
                    </span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}

          {/* Keyword Cloud */}
          {activeTab === 'keywords' && (
            <div className="flex flex-wrap gap-2 p-2 justify-center items-center min-h-[280px]">
              {topKeywords.length === 0 ? (
                <p className="text-text-secondary text-sm">{t('scientometrics.no_keywords')}</p>
              ) : (
                topKeywords.map((kw, i) => {
                  const maxFreq = topKeywords[0].frequency;
                  const scale = 0.7 + (kw.frequency / maxFreq) * 1.3;
                  const color = NEON_COLORS[i % NEON_COLORS.length];
                  return (
                    <motion.span
                      key={kw.keyword}
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale }}
                      transition={{ delay: i * 0.03, type: 'spring', stiffness: 200 }}
                      whileHover={{ scale: scale * 1.1 }}
                      className="px-2.5 py-1 rounded-full cursor-default select-none font-medium"
                      style={{
                        fontSize: `${Math.max(10, Math.min(20, 10 + (kw.frequency / maxFreq) * 10))}px`,
                        backgroundColor: `${color}18`,
                        color,
                        border: `1px solid ${color}35`,
                      }}
                      title={
                        kw.frequency === 1
                          ? t('scientometrics.occurrence_one', { count: kw.frequency })
                          : t('scientometrics.occurrence_other', { count: kw.frequency })
                      }
                    >
                      {kw.keyword}
                    </motion.span>
                  );
                })
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default ScientometricHub;
