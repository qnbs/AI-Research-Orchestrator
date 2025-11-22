
import React from 'react';
import { useJournalsView } from './JournalsViewContext';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';
import { Article } from '../../types';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { Doughnut, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement } from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export const JournalCard: React.FC<{ name: string; description: string; onClick: () => void; }> = ({ name, description, onClick }) => (
    <button
        onClick={onClick}
        className="group relative w-full h-full p-5 bg-surface border border-border rounded-lg text-left transition-all duration-300 hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent ring-offset-2 ring-offset-background"
    >
        <h4 className="text-lg font-bold text-text-primary transition-colors duration-300 group-hover:brand-gradient-text mb-2">
            {name}
        </h4>
        <p className="text-sm text-text-secondary leading-relaxed">
            {description}
        </p>
         <div className="absolute bottom-4 right-4 flex items-center text-xs font-semibold text-text-secondary opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-300">
            Select <ChevronRightIcon className="h-4 w-4 ml-1" />
        </div>
    </button>
);

export const ArticleListItem: React.FC<{ article: Article }> = ({ article }) => (
    <a href={`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}/`} target="_blank" rel="noopener noreferrer" className="block p-4 bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-brand-accent/50 transition-all duration-200 group">
        <div className="flex justify-between items-start gap-4">
            <div>
                <p className="font-semibold text-sm text-text-primary group-hover:text-brand-accent transition-colors line-clamp-2">{article.title}</p>
                <p className="text-xs text-text-secondary mt-1.5">{article.authors}</p>
            </div>
            {article.pubYear && <span className="text-xs font-mono bg-surface-hover border border-border px-2 py-0.5 rounded text-text-secondary whitespace-nowrap">{article.pubYear}</span>}
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
                    <p className="text-text-secondary text-sm mt-1">Start your analysis with one of these top-tier publications.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredJournals.map(journal => (
                    <JournalCard key={journal.name} {...journal} onClick={() => handleFeaturedSelect(journal.name)} />
                ))}
            </div>
        </div>
    );
};

export const AnalysisCharts: React.FC = () => {
    const { analyticsData, settings } = useJournalsView();
    if (!analyticsData) return null;

    const isDarkMode = settings.theme === 'dark';
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'right' as const, labels: { color: isDarkMode ? '#9ca3af' : '#4b5563', boxWidth: 12 } },
        },
        cutout: '70%',
    };
    
    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
            x: { grid: { display: false }, ticks: { color: isDarkMode ? '#9ca3af' : '#4b5563' } },
            y: { grid: { color: isDarkMode ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDarkMode ? '#9ca3af' : '#4b5563', stepSize: 1 } }
        }
    };

    return (
        <div className="lg:col-span-1 space-y-6">
            <div className="bg-surface p-5 rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">Recent Topic Landscape</h3>
                <div className="h-48">
                    <Doughnut data={analyticsData.topicData} options={chartOptions} />
                </div>
            </div>
            <div className="bg-surface p-5 rounded-lg border border-border">
                <h3 className="text-sm font-semibold text-text-primary mb-4 uppercase tracking-wide">Activity Timeline</h3>
                <div className="h-32">
                        <Bar data={analyticsData.timelineData} options={barOptions} />
                </div>
            </div>
        </div>
    );
};
