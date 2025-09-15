import React from 'react';
import type { View } from '../contexts/UIContext';
import { DocumentIcon } from './icons/DocumentIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { AuthorIcon } from './icons/AuthorIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';

const AppLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="logo-gradient-home" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'var(--color-brand-accent)', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: 'var(--color-accent-cyan)', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        {/* Using a different gradient ID to avoid conflicts if rendered simultaneously with header */}
        <path d="M12 2L8 4V8L12 10L16 8V4L12 2Z" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22L8 20V16L12 14L16 16V20L12 22Z" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12L20 8L16 10L14 12L16 14L20 16L22 12Z" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L4 8L8 10L10 12L8 14L4 16L2 12Z" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10V14" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8L4 8" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8L20 8" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 16L4 16" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 16L20 16" stroke="url(#logo-gradient-home)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

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
                <AppLogoIcon className="h-24 w-24" />
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