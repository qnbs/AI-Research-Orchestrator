import React from 'react';
import { LockClosedIcon } from './icons/LockClosedIcon';


const AppLogoIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" {...props}>
        <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{stopColor: 'var(--color-brand-accent)', stopOpacity: 1}} />
                <stop offset="100%" style={{stopColor: 'var(--color-accent-cyan)', stopOpacity: 1}} />
            </linearGradient>
        </defs>
        <path d="M12 2L8 4V8L12 10L16 8V4L12 2Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 22L8 20V16L12 14L16 16V20L12 22Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M22 12L20 8L16 10L14 12L16 14L20 16L22 12Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2 12L4 8L8 10L10 12L8 14L4 16L2 12Z" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M12 10V14" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 8L4 8" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 8L20 8" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M8 16L4 16" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 16L20 16" stroke="url(#logo-gradient)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);


interface OnboardingViewProps {
    onComplete: () => void;
}

const Step: React.FC<{ number: string; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
    <div className="text-left relative pl-12">
        <div className="absolute left-0 top-0 flex items-center justify-center h-8 w-8 rounded-full bg-brand-accent/10 text-brand-accent font-bold text-lg border border-brand-accent/20">
            {number}
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-1">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{children}</p>
    </div>
);

export const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
        <div className="absolute inset-0 z-0" style={{
            backgroundImage: 'radial-gradient(ellipse 80% 80% at 10% -20%, var(--aurora-1), transparent), radial-gradient(ellipse 80% 80% at 90% -20%, var(--aurora-2), transparent)'
        }}></div>
        <div className="w-full max-w-3xl mx-auto text-center relative z-10">
             <div className="relative mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-surface border border-border shadow-lg mx-auto">
                <AppLogoIcon className="h-16 w-16" />
             </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
                Welcome to <span className="brand-gradient-text">AI Research Orchestrator</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-text-secondary mb-12">
                Your intelligent assistant for scientific literature reviews.
            </p>

            <div className="space-y-8 mb-12 max-w-xl mx-auto">
                <Step number="1" title="Define Your Topic">
                    Enter any research query to have AI agents conduct a comprehensive review of the PubMed database.
                </Step>
                <Step number="2" title="Receive AI Analysis">
                    The AI researches, filters, and synthesizes the most relevant articles into an actionable report.
                </Step>
                <Step number="3" title="Leverage Your Knowledge">
                    Build a personal, de-duplicated knowledge base and export your findings for any workflow.
                </Step>
            </div>
            
            <button
                onClick={onComplete}
                className="inline-flex items-center px-8 py-3 border border-transparent text-base font-bold rounded-md shadow-lg text-brand-text-on-accent bg-gradient-to-r from-brand-primary to-accent-cyan hover:shadow-xl hover:shadow-brand-accent/30 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background focus:ring-brand-accent transform hover:scale-105 transition-all duration-300"
            >
                Start Researching
            </button>
            <div className="mt-8 flex items-center justify-center text-xs text-text-secondary">
                <LockClosedIcon className="h-4 w-4 mr-2" />
                Your data remains private and is stored only locally in your browser.
            </div>
        </div>
    </div>
  );
};