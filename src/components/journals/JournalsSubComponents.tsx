import React from 'react';
import { useJournalsView } from './JournalsViewContext';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { Article } from '../../types';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export const JournalCard: React.FC<{ name: string; description: string; onClick: () => void }> = ({
  name,
  description,
  onClick,
}) => (
  <button
    onClick={onClick}
    className="group relative w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
  >
    <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text mb-2">
      {name}
    </h4>
    <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
    <div className="absolute bottom-4 right-4 flex items-center text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
      Select <ChevronRightIcon className="h-4 w-4 ml-1" />
    </div>
  </button>
);

export const ArticleListItem: React.FC<{ article: Article }> = ({ article }) => (
  <a
    href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`}
    target="_blank"
    rel="noopener noreferrer"
    className="block p-4 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-brand-accent/50 transition-all duration-200 group"
  >
    <div className="flex justify-between items-start gap-4">
      <div>
        <p className="font-semibold text-sm text-text-primary group-hover:text-brand-accent transition-colors line-clamp-2">
          {article.title}
        </p>
        <p className="text-xs text-text-secondary mt-1.5">{article.authors}</p>
      </div>
      {article.pubYear && (
        <span className="text-xs font-mono bg-surface-hover border border-border px-2 py-0.5 rounded text-text-secondary whitespace-nowrap">
          {article.pubYear}
        </span>
      )}
    </div>
  </a>
);

export const FeaturedJournalsGrid: React.FC = () => {
  const { featuredJournals, handleFeaturedSelect } = useJournalsView();
  if (featuredJournals.length === 0) return null;

  return (
    <div className="space-y-8 pt-8 border-t border-border/50">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-text-primary">Featured Journals</h2>
        <p className="text-text-secondary text-sm mt-1">
          Start your analysis with one of these top-tier publications.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {featuredJournals.map((journal) => (
          <JournalCard
            key={journal.name}
            {...journal}
            onClick={() => handleFeaturedSelect(journal.name)}
          />
        ))}
      </div>
    </div>
  );
};

const TOPIC_COLORS = [
  'rgba(31, 111, 235, 0.7)',
  'rgba(57, 197, 247, 0.7)',
  'rgba(232, 83, 165, 0.7)',
  'rgba(245, 158, 11, 0.7)',
  'rgba(16, 185, 129, 0.7)',
  'rgba(99, 102, 241, 0.7)',
];

export const AnalysisCharts: React.FC = () => {
  const { analyticsData, settings } = useJournalsView();
  if (!analyticsData) return null;

  const isDarkMode = settings.theme === 'dark';
  const tickColor = isDarkMode ? '#9ca3af' : '#4b5563';
  const gridColor = isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  return (
    <div className="lg:col-span-1 space-y-6">
      <div className="bg-surface p-5 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
          Recent Topic Landscape
        </h3>
        <div className="h-48">
          {analyticsData.topicData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.topicData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius="70%"
                  outerRadius="95%"
                  paddingAngle={2}
                >
                  {analyticsData.topicData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={TOPIC_COLORS[index % TOPIC_COLORS.length]} />
                  ))}
                </Pie>
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: 11, color: tickColor }}
                />
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="h-full flex items-center justify-center text-sm text-text-secondary">
              No topic data available.
            </p>
          )}
        </div>
      </div>
      <div className="bg-surface p-5 rounded-lg border border-border">
        <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">
          Activity Timeline
        </h3>
        <div className="h-32">
          {analyticsData.timelineData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analyticsData.timelineData}
                margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="year" tick={{ fill: tickColor, fontSize: 11 }} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: tickColor, fontSize: 11 }} width={28} />
                <RechartsTooltip />
                <Bar
                  dataKey="count"
                  name="Articles"
                  fill="rgba(31, 111, 235, 0.5)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="h-full flex items-center justify-center text-sm text-text-secondary">
              No publication years available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
