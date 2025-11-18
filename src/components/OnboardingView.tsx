import React from 'react';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { PencilIcon } from './icons/PencilIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { DatabaseIcon } from './icons/DatabaseIcon';
import { AppLogo } from './AppLogo';


interface OnboardingViewProps {
    onComplete: () => void;
}

const StepCard: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
    <div className="bg-surface/30 backdrop-blur-sm p-6 rounded-xl border border-white/10 text-left shadow-lg h-full">
        <div className="flex items-center justify-center h-12 w-12 rounded-full bg-brand-accent/20 text-brand-accent border border-brand-accent/30 mb-4">
            {icon}
        </div>
        <h3 className="text-lg font-bold text-text-primary mb-2">{title}</h3>
        <p className="text-sm text-text-secondary leading-relaxed">{children}</p>
    </div>
);


const OnboardingView: React.FC<OnboardingViewProps> = ({ onComplete }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 sm:p-6 lg:p-8 animate-fadeIn">
        <div className="absolute inset-0 z-0" style={{
            backgroundImage: 'radial-gradient(ellipse 80% 80% at 10% -20%, var(--aurora-1), transparent), radial-gradient(ellipse 80% 80% at 90% -20%, var(--aurora-2), transparent)'
        }}></div>
        <div className="w-full max-w-4xl mx-auto text-center relative z-10 bg-surface/50 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl p-8 sm:p-12">
             <div className="mb-6 flex items-center justify-center">
                <AppLogo className="h-16 w-16" idPrefix="onboarding-logo" />
             </div>
            <h1 className="text-4xl sm:text-5xl font-bold text-text-primary mb-3">
                Welcome to the <span className="brand-gradient-text">Future of Research</span>
            </h1>
            <p className="max-w-2xl mx-auto text-lg text-text-secondary mb-12">
                Your intelligent assistant for scientific literature reviews.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-12">
                <StepCard icon={<PencilIcon className="h-6 w-6" />} title="Define Your Topic">
                    Enter any research query to have AI agents conduct a comprehensive review of the PubMed database.
                </StepCard>
                <StepCard icon={<SparklesIcon className="h-6 w-6" />} title="Receive AI Analysis">
                    The AI researches, filters, and synthesizes the most relevant articles into an actionable report.
                </StepCard>
                <StepCard icon={<DatabaseIcon className="h-6 w-6" />} title="Leverage Your Knowledge">
                    Build a personal, de-duplicated knowledge base and export your findings for any workflow.
                </StepCard>
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

export default OnboardingView;