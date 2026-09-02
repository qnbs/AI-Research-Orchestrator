import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { ChartAccessibleTable } from './charts/ChartAccessibleTable';
import { useSettings } from '../contexts/SettingsContext';
import { useTranslation } from '../hooks/useTranslation';

export interface ReportPublicationPoint {
  year: string;
  count: number;
}

interface ReportPublicationChartProps {
  data: ReportPublicationPoint[] | null;
}

/** Report visualization accordion: publication-year bar chart plus SR table twin. */
export function ReportPublicationChart({ data }: ReportPublicationChartProps): React.ReactElement {
  const { t } = useTranslation();
  const { settings } = useSettings();
  const tickFill = settings.theme === 'dark' ? '#7d8590' : '#57606a';
  const gridStroke =
    settings.theme === 'dark' ? 'rgba(125, 133, 144, 0.1)' : 'rgba(87, 96, 106, 0.1)';

  if (!data) {
    return <p className="text-text-secondary italic">{t('report.chart.empty')}</p>;
  }

  return (
    <div className="h-64 bg-background border border-border rounded-md p-4">
      <p className="text-sm font-medium text-text-secondary mb-2">
        {t('report.chart.timelineTitle')}
      </p>
      <ResponsiveContainer width="100%" height="90%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
          <XAxis dataKey="year" tick={{ fill: tickFill, fontSize: 12 }} />
          <YAxis allowDecimals={false} tick={{ fill: tickFill, fontSize: 12 }} />
          <RechartsTooltip />
          <Bar
            dataKey="count"
            name={t('report.chart.publications')}
            fill="rgba(31, 111, 235, 0.75)"
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="sr-only" aria-label={t('report.a11y.tables')}>
        <ChartAccessibleTable
          caption={t('report.a11y.timeline_caption')}
          columns={[
            { key: 'year', label: t('report.a11y.year'), render: (r) => r.year },
            { key: 'count', label: t('report.a11y.publications'), render: (r) => r.count },
          ]}
          rows={data}
          rowKey={(r) => r.year}
        />
      </div>
    </div>
  );
}
