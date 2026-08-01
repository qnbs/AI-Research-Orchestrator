/**
 * Data Dashboard — Interactive Recharts + Scientometric Network Graphs
 */
import React, { useMemo, useRef } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  PieChart,
  Pie,
  Cell,
  Treemap,
} from 'recharts';
import { motion } from 'framer-motion';
import type { KnowledgeBaseFilter } from '../types';
import type { View } from '../contexts/UIContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';
import { useTranslation } from '../hooks/useTranslation';
import { DASHBOARD_ACCENT, dashboardAccentFill } from './dashboardChartTheme';
import {
  ChartCard,
  CyberTooltip,
  TreemapCell,
  CoAuthorshipNetwork,
  C,
} from './dashboard/DashboardSubComponents';

interface DashboardViewProps {
  onFilterChange: (f: Partial<KnowledgeBaseFilter>) => void;
  onViewChange: (v: View) => void;
}

const DashboardViewComponent: React.FC<DashboardViewProps> = ({ onFilterChange, onViewChange }) => {
  const { t } = useTranslation();
  const { getArticles } = useKnowledgeBase();
  const articles = useMemo(() => getArticles('all'), [getArticles]);

  const refYears = useRef<HTMLDivElement>(null);
  const refJournals = useRef<HTMLDivElement>(null);
  const refTypes = useRef<HTMLDivElement>(null);
  const refOA = useRef<HTMLDivElement>(null);
  const refSource = useRef<HTMLDivElement>(null);
  const refKeywords = useRef<HTMLDivElement>(null);

  const data = useMemo(() => {
    if (!articles.length) return null;

    const yearMap = new Map<string, number>();
    for (const a of articles)
      if (a.pubYear) yearMap.set(a.pubYear, (yearMap.get(a.pubYear) ?? 0) + 1);
    const years = [...yearMap.entries()]
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([year, count]) => ({ year, count }));

    const journalMap = new Map<string, number>();
    for (const a of articles)
      if (a.journal) journalMap.set(a.journal, (journalMap.get(a.journal) ?? 0) + 1);
    const journals = [...journalMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({
        name: name.length > 30 ? name.slice(0, 28) + '…' : name,
        fullName: name,
        count,
      }));

    const typeMap = new Map<string, number>();
    for (const a of articles) {
      const articleType = a.articleType || t('dashboard.type.other');
      typeMap.set(articleType, (typeMap.get(articleType) ?? 0) + 1);
    }
    const types = [...typeMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value }));

    const oaCount = articles.filter((a) => a.isOpenAccess).length;
    const oa = [
      { name: t('dashboard.oa.open'), value: oaCount },
      { name: t('dashboard.oa.closed'), value: articles.length - oaCount },
    ];

    const arxivCount = articles.filter((a) => (a.pmid ?? '').startsWith('arxiv:')).length;
    const source = [
      { name: t('dashboard.source.pubmed'), value: articles.length - arxivCount },
      { name: t('dashboard.source.arxiv'), value: arxivCount },
    ].filter((s) => s.value > 0);

    const kwMap = new Map<string, number>();
    for (const a of articles)
      for (const kw of a.keywords ?? []) {
        const k = kw.trim().toLowerCase();
        if (k.length > 2 && k.length < 40) kwMap.set(k, (kwMap.get(k) ?? 0) + 1);
      }
    const keywords = [...kwMap.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 40)
      .map(([name, value]) => ({ name, value }));

    return { years, journals, types, oa, source, keywords };
  }, [articles, t]);

  if (!data) {
    return (
      <div className="h-[calc(100vh-200px)]">
        <EmptyState
          icon={<DatabaseIcon className="h-24 w-24" />}
          title={t('dashboard.empty.title')}
          message={t('dashboard.empty.message')}
          action={{
            text: t('dashboard.empty.action'),
            onClick: () => onViewChange('orchestrator'),
            icon: <DocumentPlusIcon className="h-5 w-5" />,
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8 animate-fadeIn">
      <div className="text-center">
        <h1 className="text-4xl font-bold brand-gradient-text">{t('dashboard.title')}</h1>
        <p className="mt-1.5 text-sm text-text-secondary">
          {t('dashboard.subtitle', { count: articles.length.toLocaleString() })}
        </p>
      </div>

      {/* Row 1: Years + Journals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard
          title={t('dashboard.chart.years')}
          subtitle={t('dashboard.chart.years_sub')}
          exportName="publications-per-year.svg"
          chartRef={refYears}
        >
          <ResponsiveContainer width="100%" height={270}>
            <BarChart data={data.years} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(125,133,144,0.1)" />
              <XAxis dataKey="year" tick={{ fontSize: 10, fill: '#7d8590' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#7d8590' }} />
              <Tooltip content={(props) => <CyberTooltip {...props} />} />
              <Bar dataKey="count" name={t('dashboard.series.articles')} radius={[4, 4, 0, 0]}>
                {data.years.map((_, i) => (
                  <Cell key={i} fill={C[0]} fillOpacity={0.82} />
                ))}
              </Bar>
              {data.years.length > 8 && (
                <Brush
                  dataKey="year"
                  height={18}
                  stroke={C[0]}
                  fill="color-mix(in srgb, var(--color-brand-accent) 12%, transparent)"
                  travellerWidth={6}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t('dashboard.chart.journals')}
          subtitle={t('dashboard.chart.journals_sub')}
          exportName="top-journals.svg"
          chartRef={refJournals}
        >
          <ResponsiveContainer width="100%" height={270}>
            <BarChart
              data={data.journals}
              layout="vertical"
              margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(125,133,144,0.1)"
                horizontal={false}
              />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: '#7d8590' }} />
              <YAxis
                type="category"
                dataKey="name"
                width={115}
                tick={{ fontSize: 9, fill: '#7d8590' }}
              />
              <Tooltip content={(props) => <CyberTooltip {...props} />} />
              <Bar
                dataKey="count"
                name={t('dashboard.series.articles')}
                radius={[0, 4, 4, 0]}
                onClick={(d) => {
                  const payload = d.payload as { fullName?: string; name?: string };
                  onFilterChange({ selectedJournals: [payload.fullName ?? payload.name ?? ''] });
                  onViewChange('knowledgeBase');
                }}
              >
                {data.journals.map((_, i) => (
                  <Cell key={i} fill={C[1]} fillOpacity={0.82} />
                ))}
              </Bar>
              {data.journals.length > 6 && (
                <Brush
                  dataKey="name"
                  height={14}
                  stroke={C[1]}
                  fill={dashboardAccentFill(0.08)}
                  travellerWidth={6}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 2: Article Types + OA + Source */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <ChartCard
          title={t('dashboard.chart.types')}
          subtitle={t('dashboard.chart.types_sub')}
          exportName="article-types.svg"
          chartRef={refTypes}
        >
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie
                data={data.types}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={96}
                paddingAngle={3}
                label={({ percent }) =>
                  (percent ?? 0) > 0.06 ? `${((percent ?? 0) * 100).toFixed(0)}%` : ''
                }
                labelLine={{ stroke: 'rgba(125,133,144,0.4)' }}
                onClick={(d) => {
                  onFilterChange({ selectedArticleTypes: [String(d.name ?? '')] });
                  onViewChange('knowledgeBase');
                }}
              >
                {data.types.map((_, i) => (
                  <Cell key={i} fill={C[i % C.length]} fillOpacity={0.82} stroke="transparent" />
                ))}
              </Pie>
              <Tooltip content={(props) => <CyberTooltip {...props} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v: string) => (
                  <span style={{ fontSize: 10, color: '#7d8590' }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title={t('dashboard.chart.oa')} exportName="open-access.svg" chartRef={refOA}>
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie
                data={data.oa}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={96}
                paddingAngle={4}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: 'rgba(125,133,144,0.4)' }}
              >
                <Cell fill="#34d399" fillOpacity={0.85} stroke="transparent" />
                <Cell fill="#7d8590" fillOpacity={0.5} stroke="transparent" />
              </Pie>
              <Tooltip content={(props) => <CyberTooltip {...props} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v: string) => (
                  <span style={{ fontSize: 10, color: '#7d8590' }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t('dashboard.chart.source')}
          subtitle={t('dashboard.chart.source_sub')}
          exportName="source-distribution.svg"
          chartRef={refSource}
        >
          <ResponsiveContainer width="100%" height={270}>
            <PieChart>
              <Pie
                data={data.source}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={96}
                paddingAngle={4}
                label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                labelLine={{ stroke: 'rgba(125,133,144,0.4)' }}
              >
                <Cell fill={DASHBOARD_ACCENT} fillOpacity={0.85} stroke="transparent" />
                <Cell fill={C[1]} fillOpacity={0.85} stroke="transparent" />
              </Pie>
              <Tooltip content={(props) => <CyberTooltip {...props} />} />
              <Legend
                iconType="circle"
                iconSize={8}
                formatter={(v: string) => (
                  <span style={{ fontSize: 10, color: '#7d8590' }}>{v}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Row 3: Keyword Clusters */}
      {data.keywords.length > 0 && (
        <ChartCard
          title={t('dashboard.chart.keywords')}
          subtitle={t('dashboard.chart.keywords_sub', { count: data.keywords.length })}
          exportName="keyword-clusters.svg"
          chartRef={refKeywords}
        >
          <ResponsiveContainer width="100%" height={340}>
            <Treemap
              data={data.keywords}
              dataKey="value"
              nameKey="name"
              aspectRatio={4 / 3}
              content={(props) => <TreemapCell {...props} />}
            />
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* Row 4: Co-authorship Network */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glass-panel rounded-xl p-4"
      >
        <div className="mb-4">
          <h3 className="text-sm font-semibold brand-gradient-text">
            {t('dashboard.chart.coauthors')}
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Node size = article count · edge thickness = shared publications
          </p>
        </div>
        <CoAuthorshipNetwork articles={articles} />
      </motion.div>

      {/* Screen-reader data tables */}
      <div className="sr-only" aria-label={t('dashboard.a11y.tables')}>
        <table>
          <caption>{t('dashboard.a11y.years_caption')}</caption>
          <thead>
            <tr>
              <th>{t('dashboard.a11y.year')}</th>
              <th>{t('dashboard.a11y.articles')}</th>
            </tr>
          </thead>
          <tbody>
            {data.years.map((r) => (
              <tr key={r.year}>
                <td>{r.year}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table>
          <caption>{t('dashboard.a11y.journals_caption')}</caption>
          <thead>
            <tr>
              <th>{t('dashboard.a11y.journal')}</th>
              <th>{t('dashboard.a11y.articles')}</th>
            </tr>
          </thead>
          <tbody>
            {data.journals.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td>{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DashboardViewComponent;
