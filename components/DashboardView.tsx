import React, { useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, Colors } from 'chart.js';
import { Bar, Doughnut, Chart } from 'react-chartjs-2';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import type { KnowledgeBaseEntry } from '../types';
import { DatabaseIcon } from './icons/DatabaseIcon';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, TreemapController, TreemapElement, Colors);

interface DashboardViewProps {
    entries: KnowledgeBaseEntry[];
}

const ChartCard: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="bg-surface border border-border rounded-lg p-4 sm:p-6 flex flex-col h-full">
        <h3 className="text-lg font-semibold text-brand-accent mb-4">{title}</h3>
        <div className="flex-grow flex items-center justify-center relative min-h-[250px]">{children}</div>
    </div>
);


export const DashboardView: React.FC<DashboardViewProps> = ({ entries }) => {
    
    const chartData = useMemo(() => {
        if (entries.length === 0) {
            return null;
        }

        const allArticles = entries.flatMap(entry => entry.report.rankedArticles);
        const articleMap = new Map();
        allArticles.forEach(article => {
            if (!articleMap.has(article.pmid)) {
                articleMap.set(article.pmid, article);
            }
        });
        const uniqueArticles = Array.from(articleMap.values());

        // Keyword Frequency
        const keywordCounts: { [key: string]: number } = {};
        uniqueArticles.forEach(article => {
            article.keywords.forEach(kw => {
                const keyword = kw.trim().toLowerCase();
                keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
            });
        });
        const sortedKeywords = Object.entries(keywordCounts).sort(([, a], [, b]) => b - a).slice(0, 25);

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

        // Open Access
        const openAccessCount = uniqueArticles.filter(a => a.isOpenAccess).length;

        return {
            keywords: sortedKeywords,
            years: {
                labels: sortedYears.map(([year]) => year),
                datasets: [{
                    label: 'Articles',
                    data: sortedYears.map(([, count]) => count),
                    backgroundColor: 'rgba(56, 189, 248, 0.6)',
                    borderColor: 'rgba(56, 189, 248, 1)',
                    borderWidth: 1,
                }]
            },
            journals: {
                labels: sortedJournals.map(([journal]) => journal.length > 30 ? journal.substring(0, 30) + '...' : journal),
                datasets: [{
                    label: 'Articles',
                    data: sortedJournals.map(([, count]) => count),
                    backgroundColor: 'rgba(56, 189, 248, 0.6)',
                    borderColor: 'rgba(56, 189, 248, 1)',
                    borderWidth: 1,
                }]
            },
            openAccess: {
                labels: ['Open Access', 'Closed Access'],
                datasets: [{
                    data: [openAccessCount, uniqueArticles.length - openAccessCount],
                    backgroundColor: ['rgba(16, 185, 129, 0.7)', 'rgba(239, 68, 68, 0.7)'],
                    borderColor: ['rgba(16, 185, 129, 1)', 'rgba(239, 68, 68, 1)'],
                    borderWidth: 1,
                }]
            }
        };
    }, [entries]);

    const chartOptions = (title: string, isDarkMode: boolean) => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: isDarkMode ? '#1F2937' : '#FFFFFF',
                titleColor: isDarkMode ? '#F3F4F6' : '#111827',
                bodyColor: isDarkMode ? '#9CA3AF' : '#6B7280',
                borderColor: isDarkMode ? '#374151' : '#E5E7EB',
                borderWidth: 1,
            },
            colors: {
                force: true,
            }
        },
        scales: {
            x: {
                ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
                grid: { color: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)' }
            },
            y: {
                ticks: { color: isDarkMode ? '#9CA3AF' : '#6B7280' },
                grid: { color: isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.5)' }
            }
        }
    });

    const isDarkMode = document.documentElement.classList.contains('dark');

    if (!chartData) {
        return (
            <div className="flex flex-col items-center justify-center h-[calc(100vh-200px)] text-center animate-fadeIn">
                <DatabaseIcon className="h-24 w-24 text-border mb-6"/>
                <h2 className="text-3xl font-bold text-text-primary mb-3">Dashboard is Empty</h2>
                <p className="max-w-md mx-auto text-lg text-text-secondary">
                    Save some reports to your Knowledge Base to see your research visualized here.
                </p>
            </div>
        );
    }

    return (
        <div className="animate-fadeIn">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold text-brand-accent">Knowledge Base Dashboard</h1>
                <p className="mt-2 text-lg text-text-secondary">Visual insights from your aggregated research data.</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="lg:col-span-2">
                    <ChartCard title="Top Keywords">
                        <Chart 
                            type="treemap"
                            data={{
                                datasets: [{
                                    tree: chartData.keywords.map(([label, value]) => ({ label, value })),
                                    key: 'value',
                                    groups: ['label'],
                                    fontColor: isDarkMode ? 'white' : 'black',
                                    spacing: 1,
                                    borderWidth: 2,
                                    borderColor: isDarkMode ? '#111827' : '#F9FAFB',
                                }]
                            }}
                            options={{
                                ...chartOptions('Top Keywords', isDarkMode),
                                plugins: {
                                    ...chartOptions('Top Keywords', isDarkMode).plugins,
                                    legend: { display: false },
                                }
                            }}
                        />
                    </ChartCard>
                </div>

                <ChartCard title="Publication Trend by Year">
                    <Bar options={{...chartOptions('Publication Trend', isDarkMode), indexAxis: 'x'}} data={chartData.years} />
                </ChartCard>

                <ChartCard title="Open Access Distribution">
                    <Doughnut 
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    position: 'bottom',
                                    labels: { color: isDarkMode ? '#9CA3AF' : '#6B7280' }
                                },
                            }
                        }}
                        data={chartData.openAccess}
                    />
                </ChartCard>
                
                <div className="lg:col-span-2">
                    <ChartCard title="Top 10 Journals">
                        <Bar options={{...chartOptions('Top Journals', isDarkMode), indexAxis: 'y'}} data={chartData.journals} />
                    </ChartCard>
                </div>
            </div>
        </div>
    );
};
