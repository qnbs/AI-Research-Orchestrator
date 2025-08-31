import React, { useMemo, useRef, useId, memo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, Colors } from 'chart.js';
import { Bar, Doughnut, Chart, getElementAtEvent } from 'react-chartjs-2';
import type { KnowledgeBaseFilter } from '../types';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { useSettings } from '../contexts/SettingsContext';
import type { View } from '../contexts/UIContext';
import { EmptyState } from './EmptyState';
import { DocumentPlusIcon } from './icons/DocumentPlusIcon';
import { useKnowledgeBase } from '../contexts/KnowledgeBaseContext';


ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, Colors);

interface DashboardViewProps {
    onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void;
    onViewChange: (view: View) => void;
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode; 'aria-label': string, titleId: string }> = ({ title, children, 'aria-label': ariaLabel, titleId }) => (
    <div role="figure" aria-label={ariaLabel} aria-labelledby={titleId} className="bg-surface border border-border rounded-lg p-4 sm:p-6 flex flex-col h-full">
        <h3 id={titleId} className="text-lg font-semibold brand-gradient-text mb-4">{title}</h3>
        <div className="flex-grow flex items-center justify-center relative min-h-[250px]">{children}</div>
    </div>
);

// Accessibility Best Practice: Component to render a data table for screen readers
const AccessibleDataTable: React.FC<{ titleId: string; headers: string[]; data: (string | number)[][]; caption: string }> = ({ titleId, headers, data, caption }) => (
    <div className="sr-only">
        <table aria-labelledby={titleId}>
            <caption>{caption}</caption>
            <thead>
                <tr>
                    {headers.map(h => <th key={h} scope="col">{h}</th>)}
                </tr>
            </thead>
            <tbody>
                {data.map((row, i) => (
                    <tr key={i}>
                        {row.map((cell, j) => j === 0 ? <th key={j} scope="row">{cell}</th> : <td key={j}>{cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


const DashboardViewComponent: React.FC<DashboardViewProps> = ({ onFilterChange, onViewChange }) => {
    const { settings } = useSettings();
    const { getArticles } = useKnowledgeBase();

    const chartRefs = {
        journals: useRef<ChartJS<'bar', number[], string>>(null),
        articleTypes: useRef<ChartJS<'doughnut', number[], string>>(null),
        years: useRef<ChartJS<'bar', number[], string>>(null),
        openAccess: useRef<ChartJS<'doughnut', number[], string>>(null),
    };

    const uniqueArticles = useMemo(() => getArticles('all'), [getArticles]);

    const chartData = useMemo(() => {
        if (uniqueArticles.length === 0) {
            return null;
        }
        
        const yearCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            if (article.pubYear) yearCounts[article.pubYear] = (yearCounts[article.pubYear] || 0) + 1;
        });
        const sortedYears = Object.entries(yearCounts).sort(([a], [b]) => parseInt(a) - parseInt(b));

        const journalCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            if (article.journal) journalCounts[article.journal] = (journalCounts[article.journal] || 0) + 1;
        });
        const sortedJournals = Object.entries(journalCounts).sort(([, a], [, b]) => b - a).slice(0, 10);

        const articleTypeCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            const type = article.articleType || 'Other';
            articleTypeCounts[type] = (articleTypeCounts[type] || 0) + 1;
        });
        const sortedArticleTypes = Object.entries(articleTypeCounts).sort(([, a], [, b]) => b - a);
        const openAccessCount = uniqueArticles.filter(a => a.isOpenAccess).length;

        return {
            years: { labels: sortedYears.map(([year]) => year), datasets: [{ label: 'Articles', data: sortedYears.map(([, count]) => count) }] },
            journals: { labels: sortedJournals.map(([journal]) => journal), datasets: [{ label: 'Articles', data: sortedJournals.map(([, count]) => count) }] },
            articleTypes: { labels: sortedArticleTypes.map(([type]) => type), datasets: [{ data: sortedArticleTypes.map(([, count]) => count) }] },
            openAccess: { labels: ['Open Access', 'Closed Access'], datasets: [{ data: [openAccessCount, uniqueArticles.length - openAccessCount] }] }
        };
    }, [uniqueArticles]);

    const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>, chartRef: React.RefObject<ChartJS<any, any, any>>, filterKey: keyof KnowledgeBaseFilter) => {
        if (!chartRef.current) return;
        const element = getElementAtEvent(chartRef.current, event);
        if (!element.length) return;

        const { index } = element[0];
        let value;
        if (chartRef.current.data.labels) {
            value = chartRef.current.data.labels[index] as string;
            if (filterKey === 'selectedJournals' && chartData?.journals) value = chartData.journals.labels[index];
            onFilterChange({ [filterKey]: [value] });
        }
        onViewChange('knowledgeBase');
    };

    const isDarkMode = settings.theme === 'dark';
    const textColor = isDarkMode ? '#7d8590' : '#57606a';
    const gridColor = isDarkMode ? 'rgba(125, 133, 144, 0.1)' : 'rgba(87, 96, 106, 0.1)';
    const tooltipBgColor = isDarkMode ? '#0d1117' : '#ffffff';
    const tooltipTitleColor = isDarkMode ? '#e6edf3' : '#1f2328';
    const tooltipBodyColor = isDarkMode ? '#7d8590' : '#57606a';
    const tooltipBorderColor = isDarkMode ? '#21262d' : '#d0d7de';

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            colors: { forceOverride: true },
            legend: { position: 'top' as const, labels: { color: textColor, font: { family: 'Inter, sans-serif' } } },
            tooltip: { backgroundColor: tooltipBgColor, titleColor: tooltipTitleColor, bodyColor: tooltipBodyColor, borderColor: tooltipBorderColor, borderWidth: 1, titleFont: { family: 'Inter, sans-serif', weight: 'bold' as const }, bodyFont: { family: 'Inter, sans-serif' }, padding: 10, cornerRadius: 4 }
        },
        scales: { x: { ticks: { color: textColor }, grid: { color: gridColor } }, y: { ticks: { color: textColor }, grid: { color: gridColor } } }
    };
    
    // Generate unique IDs for ARIA labels
    const titleIds = {
        years: useId(),
        journals: useId(),
        articleTypes: useId(),
        openAccess: useId(),
    };
    
    if (!chartData) {
        return (
            <div className="h-[calc(100vh-200px)]">
                 <EmptyState
                    icon={<DatabaseIcon className="h-24 w-24" />}
                    title="Dashboard is Empty"
                    message="Save reports from the Orchestrator tab to start building your knowledge base and visualizing your data."
                    action={{
                        text: "Start Research",
                        onClick: () => onViewChange('orchestrator'),
                        icon: <DocumentPlusIcon className="h-5 w-5" />
                    }}
                />
            </div>
        );
    }
    
    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold brand-gradient-text">Data Dashboard</h1>
                <p className="mt-2 text-lg text-text-secondary">Visualize trends and insights from your knowledge base.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 <ChartCard title="Articles by Publication Year" titleId={titleIds.years} aria-label="Bar chart showing the number of articles published per year.">
                    <Bar ref={chartRefs.years} options={{...commonOptions, scales: { ...commonOptions.scales, x: { ...commonOptions.scales.x, type: 'category' }, y: { ...commonOptions.scales.y, title: { display: true, text: 'Number of Articles'} } } }} data={chartData.years} />
                    <AccessibleDataTable
                        titleId={titleIds.years}
                        caption="Table of article counts by publication year."
                        headers={['Year', 'Number of Articles']}
                        data={chartData.years.labels.map((label, i) => [label, chartData.years.datasets[0].data[i]])}
                    />
                </ChartCard>
                 <ChartCard title="Top 10 Journals" titleId={titleIds.journals} aria-label="Horizontal bar chart showing the top 10 journals by number of articles. Clicking a journal filters the knowledge base.">
                    <Bar ref={chartRefs.journals} onClick={(e) => handleChartClick(e, chartRefs.journals, 'selectedJournals')} options={{ ...commonOptions, indexAxis: 'y' as const, scales: { x: { ...commonOptions.scales.x, suggestedMin: 0, ticks: { ...commonOptions.scales.x.ticks, stepSize: 1 } }, y: { ...commonOptions.scales.y, ticks: { ...commonOptions.scales.y.ticks, callback: (value, index, values) => { const label = chartData.journals.labels[index]; return label.length > 25 ? label.substring(0, 22) + '...' : label; } } } } }} data={chartData.journals} />
                     <AccessibleDataTable
                        titleId={titleIds.journals}
                        caption="Table of top 10 journals by article count."
                        headers={['Journal', 'Number of Articles']}
                        data={chartData.journals.labels.map((label, i) => [label, chartData.journals.datasets[0].data[i]])}
                    />
                </ChartCard>
                 <ChartCard title="Article Types" titleId={titleIds.articleTypes} aria-label="Doughnut chart showing the distribution of different article types. Clicking a segment filters the knowledge base.">
                    <Doughnut ref={chartRefs.articleTypes} onClick={(e) => handleChartClick(e, chartRefs.articleTypes, 'selectedArticleTypes')} options={{...commonOptions, plugins: {...commonOptions.plugins, legend: { position: 'right' as const, ...commonOptions.plugins.legend }}}} data={chartData.articleTypes} />
                     <AccessibleDataTable
                        titleId={titleIds.articleTypes}
                        caption="Table of article type distribution."
                        headers={['Article Type', 'Count']}
                        data={chartData.articleTypes.labels.map((label, i) => [label, chartData.articleTypes.datasets[0].data[i]])}
                    />
                </ChartCard>
                <ChartCard title="Open Access vs. Closed" titleId={titleIds.openAccess} aria-label="Doughnut chart showing the proportion of open access versus closed access articles.">
                    <Doughnut ref={chartRefs.openAccess} options={{...commonOptions, plugins: {...commonOptions.plugins, legend: { position: 'right' as const, ...commonOptions.plugins.legend }}}} data={chartData.openAccess} />
                     <AccessibleDataTable
                        titleId={titleIds.openAccess}
                        caption="Table of open vs. closed access article counts."
                        headers={['Access Type', 'Count']}
                        data={chartData.openAccess.labels.map((label, i) => [label, chartData.openAccess.datasets[0].data[i]])}
                    />
                </ChartCard>
            </div>
        </div>
    );
};

export const DashboardView = memo(DashboardViewComponent);