
import React, { useMemo, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, Colors, FontSpec } from 'chart.js';
import { Bar, Doughnut, Chart, getElementAtEvent } from 'react-chartjs-2';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import type { KnowledgeBaseEntry, KnowledgeBaseFilter } from '../types';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { useSettings } from '../contexts/SettingsContext';
// FIX: The View type should be imported from UIContext, not Header.
import type { View } from '../contexts/UIContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, TreemapController, TreemapElement, Colors);

interface DashboardViewProps {
    entries: KnowledgeBaseEntry[];
    onFilterChange: (newFilter: Partial<KnowledgeBaseFilter>) => void;
    onViewChange: (view: View) => void;
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 flex flex-col h-full">
        <h3 className="text-lg font-semibold brand-gradient-text mb-4">{title}</h3>
        <div className="flex-grow flex items-center justify-center relative min-h-[250px]">{children}</div>
    </div>
);


export const DashboardView: React.FC<DashboardViewProps> = ({ entries, onFilterChange, onViewChange }) => {
    const { settings } = useSettings();
    const chartRefs = {
        keywords: useRef<ChartJS<'treemap', any[], string>>(null),
        journals: useRef<ChartJS<'bar', number[], string>>(null),
        articleTypes: useRef<ChartJS<'doughnut', number[], string>>(null),
    };

    const chartData = useMemo(() => {
        if (entries.length === 0) {
            return null;
        }

        const articleMap = new Map();
        entries.forEach(entry => {
            (entry.report.rankedArticles || []).forEach(article => {
                if (!articleMap.has(article.pmid) || article.relevanceScore > (articleMap.get(article.pmid)?.relevanceScore || 0)) {
                    articleMap.set(article.pmid, article);
                }
            });
        });
        const uniqueArticles = Array.from(articleMap.values());

        // Keyword Frequency (Optimized Processing)
        const keywordCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            article.keywords.forEach(kw => {
                const keyword = kw.trim().toLowerCase();
                if (keyword) {
                    keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
                }
            });
        });
        
        const sortedKeywords = Object.entries(keywordCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 25)
            .map(([label, value]) => {
                const capitalizedLabel = label
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                return [capitalizedLabel, value, label] as [string, number, string]; // Add original lowercase label
            });

        // Publication Years
        const yearCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            if (article.pubYear) {
                yearCounts[article.pubYear] = (yearCounts[article.pubYear] || 0) + 1;
            }
        });
        const sortedYears = Object.entries(yearCounts).sort(([a], [b]) => parseInt(a) - parseInt(b));

        // Top Journals
        const journalCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            if (article.journal) {
                journalCounts[article.journal] = (journalCounts[article.journal] || 0) + 1;
            }
        });
        const sortedJournals = Object.entries(journalCounts).sort(([, a], [, b]) => b - a).slice(0, 10);

        // Article Types
        const articleTypeCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            const type = article.articleType || 'Other';
            articleTypeCounts[type] = (articleTypeCounts[type] || 0) + 1;
        });
        const sortedArticleTypes = Object.entries(articleTypeCounts).sort(([, a], [, b]) => b - a);

        // Open Access
        const openAccessCount = uniqueArticles.filter(a => a.isOpenAccess).length;

        return {
            keywords: sortedKeywords,
            years: {
                labels: sortedYears.map(([year]) => year),
                datasets: [{
                    label: 'Articles',
                    data: sortedYears.map(([, count]) => count),
                }],
            },
            journals: {
                labels: sortedJournals.map(([journal]) => journal),
                datasets: [{
                    label: 'Articles',
                    data: sortedJournals.map(([, count]) => count),
                }],
            },
            articleTypes: {
                labels: sortedArticleTypes.map(([type]) => type),
                datasets: [{
                    data: sortedArticleTypes.map(([, count]) => count),
                }],
            },
            openAccess: {
                labels: ['Open Access', 'Closed Access'],
                datasets: [{
                    data: [openAccessCount, uniqueArticles.length - openAccessCount],
                }],
            }
        };
    }, [entries]);

    const handleChartClick = (event: React.MouseEvent<HTMLCanvasElement>, chartRef: React.RefObject<ChartJS<any, any, any>>, filterKey: keyof KnowledgeBaseFilter, labelSource: 'label' | 'treemap') => {
        if (!chartRef.current) return;
        const element = getElementAtEvent(chartRef.current, event);
        if (!element.length) return;

        const { index } = element[0];
        let value;
        if (labelSource === 'treemap' && chartData?.keywords) {
            value = chartData.keywords[index][2]; // use original lowercase keyword for searching
            onFilterChange({ searchTerm: value });
        } else if (chartRef.current.data.labels) {
            value = chartRef.current.data.labels[index] as string;
            // For journals, use the full name from source data
            if (filterKey === 'selectedJournals' && chartData?.journals) {
                 value = chartData.journals.labels[index];
            }
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
            colors: {
                forceOverride: true,
            },
            legend: {
                position: 'top' as const,
                labels: {
                    color: textColor,
                    font: {
                        family: 'Inter, sans-serif'
                    }
                }
            },
            tooltip: {
                backgroundColor: tooltipBgColor,
                titleColor: tooltipTitleColor,
                bodyColor: tooltipBodyColor,
                borderColor: tooltipBorderColor,
                borderWidth: 1,
                titleFont: {
                    family: 'Inter, sans-serif',
                    weight: 'bold' as const,
                },
                bodyFont: {
                    family: 'Inter, sans-serif'
                },
                padding: 10,
                cornerRadius: 4,
            }
        },
        scales: {
            x: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            },
            y: {
                ticks: { color: textColor },
                grid: { color: gridColor }
            }
        }
    };
    
    if (!chartData) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center animate-fadeIn">
                <DatabaseIcon className="h-24 w-24 text-border mb-6" />
                <h2 className="text-3xl font-bold text-text-primary mb-3">Dashboard is Empty</h2>
                <p className="max-w-md mx-auto text-lg text-text-secondary">Save reports from the Orchestrator tab to start visualizing your data.</p>
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
                <div className="lg:col-span-2">
                    <ChartCard title="Top Keywords">
                        <Chart 
                            type="treemap"
                            ref={chartRefs.keywords}
                            onClick={(e) => handleChartClick(e, chartRefs.keywords, 'searchTerm', 'treemap')}
                            data={{
                                datasets: [{
                                    data: chartData.keywords.map(([label, value]) => ({ _key: label, value })),
                                    key: 'value',
                                    groups: ['_key'],
                                    borderColor: isDarkMode ? 'rgba(1, 4, 9, 0.5)' : 'rgba(255, 255, 255, 0.5)',
                                    borderWidth: 1.5,
                                    spacing: 1,
                                    // @ts-ignore - The types for chartjs-chart-treemap are incomplete for some scriptable options.
                                    labels: {
                                        color: (ctx: any) => '#FFFFFF',
                                        // FIX: Type definitions for chartjs-chart-treemap are incorrect and do not include 'center'.
                                        // @ts-ignore
                                        position: 'center',
                                        // @ts-ignore
                                        align: 'center',
                                        formatter: (ctx: any) => ctx.raw?._key,
                                        font: (ctx: any): FontSpec | undefined => {
                                            if (!ctx.raw) return;
                                            const { w, h } = ctx.raw;
                                            const label = ctx.raw?._key;
                                            
                                            if (typeof w !== 'number' || typeof h !== 'number' || !label || w < 40 || h < 15) {
                                                return; // Return undefined to hide the label
                                            }
                                            
                                            const area = w * h;
                                            let size = 12;
                                            if (area > 4000) size = 14;
                                            if (area > 8000) size = 16;
                                            if (area > 20000) size = 20;
                                            
                                            size = Math.min(size, h - 4, w / (label.length * 0.55));
                                            if (size < 10) return; // Hide label if it's too small to be legible
                                            
                                            // FIX: The 'weight' property expects a number or specific string literal. '600' is not a valid string, but 600 is a valid number.
                                            const weight = size > 14 ? 'bold' : 600;

                                            return {
                                                size: Math.round(size),
                                                family: 'Inter, sans-serif',
                                                weight: weight,
                                                style: 'normal' as const,
                                                lineHeight: 1.2
                                            };
                                        }
                                    }
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    colors: {
                                        forceOverride: true
                                    },
                                    legend: { display: false },
                                    tooltip: {
                                        ...commonOptions.plugins.tooltip,
                                        callbacks: {
                                            title: (tooltipItems) => (tooltipItems[0]?.raw as any)?._key || '',
                                            label: (ctx) => `Frequency: ${(ctx.raw as any)?.value || 0}`,
                                        }
                                    }
                                }
                            }}
                        />
                    </ChartCard>
                </div>
                <ChartCard title="Articles by Publication Year">
                    <Bar options={commonOptions} data={chartData.years} />
                </ChartCard>
                 <ChartCard title="Top 10 Journals">
                    <Bar 
                        ref={chartRefs.journals}
                        onClick={(e) => handleChartClick(e, chartRefs.journals, 'selectedJournals', 'label')}
                        options={{
                            ...commonOptions,
                            indexAxis: 'y' as const,
                            scales: {
                                x: { ...commonOptions.scales.x, suggestedMin: 0, ticks: { ...commonOptions.scales.x.ticks, stepSize: 1 } },
                                y: { ...commonOptions.scales.y, ticks: { ...commonOptions.scales.y.ticks, callback: (value, index, values) => {
                                    const label = chartData.journals.labels[index];
                                    return label.length > 25 ? label.substring(0, 22) + '...' : label;
                                } } }
                            }
                        }} 
                        data={chartData.journals} 
                    />
                </ChartCard>
                 <ChartCard title="Article Types">
                    <Doughnut 
                        ref={chartRefs.articleTypes}
                        onClick={(e) => handleChartClick(e, chartRefs.articleTypes, 'selectedArticleTypes', 'label')}
                        options={{...commonOptions, plugins: {...commonOptions.plugins, legend: { position: 'right' as const, ...commonOptions.plugins.legend }}}} 
                        data={chartData.articleTypes} 
                    />
                </ChartCard>
                <ChartCard title="Open Access vs. Closed">
                    <Doughnut options={{...commonOptions, plugins: {...commonOptions.plugins, legend: { position: 'right' as const, ...commonOptions.plugins.legend }}}} data={chartData.openAccess} />
                </ChartCard>
            </div>
        </div>
    );
};
