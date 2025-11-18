import React from 'react';
import type { View } from '../contexts/UIContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { AuthorIcon } from './icons/AuthorIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { AppLogo } from './AppLogo';

interface HomeViewProps {
    onNavigate: (view: View) => void;
}

const ActionButton: React.FC<{ icon: React.ReactNode; title: string; description: string; onClick: () => void }> = ({ icon, title, description, onClick }) => (
    <button onClick={onClick} className="text-left bg-surface p-6 rounded-lg border border-border shadow-lg hover:shadow-xl hover:border-brand-accent/50 hover:-translate-y-1 transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2 focus:ring-offset-background">
        <div className="flex items-center gap-4">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-background border border-border text-brand-accent group-hover:text-brand-text-on-accent group-hover:bg-brand-accent transition-colors duration-300">
                {icon}
            </div>
            <div>
                <h3 className="text-lg font-bold text-text-primary group-hover:brand-gradient-text transition-colors">{title}</h3>
                <p className="text-sm text-text-secondary mt-1">{description}</p>
            </div>
        </div>
    </button>
);


const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
    return (
        <div className="max-w-4xl mx-auto text-center py-8 animate-fadeIn">
             <div className="inline-block relative mb-6">
                <AppLogo className="h-24 w-24" idPrefix="home-logo" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -z-10">
                    <div className="w-20 h-20 rounded-full bg-brand-accent/10 animate-pulseGlow" style={{ animationDuration: '4s' }}></div>
                </div>
            </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
                AI Research Orchestrator
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-text-secondary mb-12">
                What would you like to do today?
            </p>

            <div className="grid grid-cols-1 md:grid-cols-1 gap-6 text-left max-w-2xl mx-auto">
                <ActionButton
                    icon={<BeakerIcon className="h-6 w-6" />}
                    title="Research"
                    description="Perform a quick, focused analysis on a specific question or abstract."
                    onClick={() => onNavigate('research')}
                />
                <ActionButton
                    icon={<DocumentIcon className="h-6 w-6" />}
                    title="Orchestrator"
                    description="Conduct a comprehensive literature review on a broad topic."
                    onClick={() => onNavigate('orchestrator')}
                />
                <ActionButton
                    icon={<AuthorIcon className="h-6 w-6" />}
                    title="Author Hub"
                    description="Analyze a researcher's body of work, impact, and collaborations."
                    onClick={() => onNavigate('authors')}
                />
                 <ActionButton
                    icon={<BookOpenIcon className="h-6 w-6" />}
                    title="Journal Hub"
                    description="Discover and analyze scientific journals in your field of study."
                    onClick={() => onNavigate('journals')}
                />
            </div>
        </div>
    );
};

export default HomeView;