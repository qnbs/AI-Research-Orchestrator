
import React from 'react';
import { AuthorProfile } from '../types';
import { useAuthorsViewLogic } from './authors/useAuthorsViewLogic';
import { AuthorsViewProvider } from './authors/AuthorsViewContext';
import { LandingView, FeaturedAuthorsView, DisambiguationView, AuthorProfileView } from './authors/AuthorsSubComponents';
import { LoadingIndicator } from './LoadingIndicator';
import { useAuthorsView } from './authors/AuthorsViewContext';

interface AuthorsViewProps {
    initialProfile: AuthorProfile | null;
    onViewedInitialProfile: () => void;
}

const AuthorsViewContent: React.FC = () => {
    const { 
        view, 
        isLoading, 
        loadingPhase, 
        authorLoadingPhases, 
        authorPhaseDetails,
        authorClusters,
        authorProfile,
        featuredCategories,
        isFeaturedLoading,
        featuredError
    } = useAuthorsView();

    if (isLoading) {
        return (
            <LoadingIndicator
                title="Analyzing Author Profile..."
                phase={loadingPhase}
                phases={authorLoadingPhases}
                phaseDetails={authorPhaseDetails}
                footerText="This may take up to a minute. The AI is performing multiple complex steps, including live database searches and synthesis."
            />
        );
    }

    switch (view) {
        case 'disambiguation':
            return <DisambiguationView />;
        case 'profile':
            return <AuthorProfileView />;
        case 'landing':
        default:
            return (
                <div className="space-y-12">
                    <LandingView />
                    <div className="my-12 h-px w-1/2 mx-auto bg-border"></div>
                    <FeaturedAuthorsView />
                </div>
            );
    }
};

const AuthorsView: React.FC<AuthorsViewProps> = (props) => {
    const logic = useAuthorsViewLogic(props.initialProfile, props.onViewedInitialProfile);

    return (
        <AuthorsViewProvider value={logic}>
            <div className="max-w-6xl mx-auto animate-fadeIn">
                <AuthorsViewContent />
            </div>
        </AuthorsViewProvider>
    );
};

export default AuthorsView;
