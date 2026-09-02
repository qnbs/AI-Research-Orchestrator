import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { ReportPublicationChart } from './ReportPublicationChart';

vi.mock('../hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    lang: 'en',
  }),
}));

vi.mock('../contexts/SettingsContext', () => ({
  useSettings: () => ({ settings: { theme: 'dark' } }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="chart">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
}));

describe('ReportPublicationChart', () => {
  it('renders an empty-state message when there is no year data', () => {
    render(<ReportPublicationChart data={null} />);
    expect(screen.getByText('report.chart.empty')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('pairs the bar chart with a screen-reader table of year counts', () => {
    render(
      <ReportPublicationChart
        data={[
          { year: '2024', count: 3 },
          { year: '2025', count: 1 },
        ]}
      />,
    );

    expect(screen.getByTestId('chart')).toBeInTheDocument();
    const table = screen.getByRole('table');
    expect(within(table).getByText('report.a11y.timeline_caption')).toBeInTheDocument();
    const bodyRows = within(table).getAllByRole('row').slice(1);
    expect(bodyRows).toHaveLength(2);
    expect(within(bodyRows[0]).getByText('2024')).toBeInTheDocument();
    expect(within(bodyRows[0]).getByText('3')).toBeInTheDocument();
  });
});
