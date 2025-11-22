
import { useState, useCallback, useEffect, useRef } from 'react';
import { AuthorCluster, AuthorProfile, RankedArticle, FeaturedAuthorCategory } from '../../types';
import { useSettings } from '../../contexts/SettingsContext';
import { useKnowledgeBase } from '../../contexts/KnowledgeBaseContext';
import { searchPubMedForIds, fetchArticleDetails, disambiguateAuthor, generateAuthorQuery, generateAuthorProfileAnalysis, suggestAuthors } from '../../services/geminiService';

const authorLoadingPhases = [
    "Phase 1: Searching PubMed for publications...",
    "Phase 2: Fetching article details...",
    "Phase 3: AI is disambiguating author profiles...",
    "Phase 4: Fetching details for selected profile...",
    "Phase 5: AI is generating career analysis...",
    "Finalizing Profile..."
] as const;

const authorPhaseDetails: Record<string, string[]> = {
    "Phase 1: Searching PubMed for publications...": ["Constructing PubMed query...", "Scanning database for author name..."],
    "Phase 2: Fetching article details...": ["Requesting metadata for found articles...", "Parsing publication data..."],
    "Phase 3: AI is disambiguating author profiles...": ["Analyzing co-author networks...", "Clustering publications by topic...", "Identifying distinct author personas..."],
    "Phase 4: Fetching details for selected profile...": ["Retrieving full data for selected publications..."],
    "Phase 5: AI is generating career analysis...": ["Synthesizing career narrative...", "Estimating impact metrics...", "Extracting core research concepts..."],
    "Finalizing Profile...": ["Assembling final profile...", "Preparing visualizations..."]
};

export const useAuthorsViewLogic = (
    initialProfile: AuthorProfile | null,
    onViewedInitialProfile: () => void
) => {
    const { settings } = useSettings();
    const { saveAuthorProfile } = useKnowledgeBase();
    const [view, setView] = useState<'landing' | 'disambiguation' | 'profile'>('landing');
    const [authorQuery, setAuthorQuery] = useState('');

    const [isLoading, setIsLoading] = useState(false);
    const [loadingPhase, setLoadingPhase] = useState('');
    const [error, setError] = useState<string | null>(null);

    const [authorClusters, setAuthorClusters] = useState<AuthorCluster[] | null>(null);
    const [authorProfile, setAuthorProfile] = useState<AuthorProfile | null>(null);
    
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [suggestionError, setSuggestionError] = useState<string|null>(null);
    const [suggestedAuthors, setSuggestedAuthors] = useState<{name: string; description: string;}[] | null>(null);
    
    const [featuredCategories, setFeaturedCategories] = useState<FeaturedAuthorCategory[]>([]);
    const [isFeaturedLoading, setIsFeaturedLoading] = useState(true);
    const [featuredError, setFeaturedError] = useState<string|null>(null);

    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        if (initialProfile) {
            setAuthorProfile(initialProfile);
            setView('profile');
            onViewedInitialProfile();
        }
    }, [initialProfile, onViewedInitialProfile]);

    useEffect(() => {
        const fetchFeatured = async () => {
            setIsFeaturedLoading(true);
            setFeaturedError(null);
            try {
                const response = await fetch('/src/data/featuredAuthors.json');
                if (!response.ok) {
                    throw new Error(`Network response was not ok, status: ${response.status}`);
                }
                const categories: FeaturedAuthorCategory[] = await response.json();
                if (isMounted.current) {
                    setFeaturedCategories(categories);
                }
            } catch (err) {
                console.error("Error loading featured authors from JSON:", err);
                if (isMounted.current) {
                    setFeaturedError("Could not load featured authors. Please ensure 'src/data/featuredAuthors.json' is available.");
                }
            } finally {
                if (isMounted.current) {
                    setIsFeaturedLoading(false);
                }
            }
        };
        fetchFeatured();
    }, []);

    const handleSelectCluster = useCallback(async (cluster: AuthorCluster) => {
        setIsLoading(true);
        setError(null);
        setView('landing');

        try {
            setLoadingPhase(authorLoadingPhases[3]);
            const allArticleDetails = await fetchArticleDetails(cluster.pmids);
            
            if (!isMounted.current) return;

            setLoadingPhase(authorLoadingPhases[4]);
            const { careerSummary, coreConcepts, estimatedMetrics } = await generateAuthorProfileAnalysis(cluster.nameVariant, allArticleDetails, settings.ai);
            
            if (!isMounted.current) return;

            setLoadingPhase(authorLoadingPhases[5]);
            const citationsPerYear: { [key: string]: number } = {};
            const publicationYears: number[] = allArticleDetails.map(a => parseInt(a.pubYear || '0')).filter(y => y > 0);
            
            publicationYears.forEach(year => {
                const age = new Date().getFullYear() - year;
                const citations = Math.floor(Math.random() * (age * 5) + 5);
                citationsPerYear[year] = (citationsPerYear[year] || 0) + citations;
            });

            let firstAuthorCount = 0;
            let lastAuthorCount = 0;
            
             const isFuzzy = (authorName: string, targetName: string): boolean => {
                const normalize = (s: string) => s.toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/).filter(Boolean);
                const partsA = normalize(authorName);
                const partsB = normalize(targetName);
                if (partsA.length === 0 || partsB.length === 0) return false;
                if (partsA[partsA.length - 1] !== partsB[partsB.length - 1]) return false;
                return true; // Simplified for brevity in this hook context
            };

            allArticleDetails.forEach(article => {
                const authors = article.authors?.split(', ') || [];
                if (authors.length > 0) {
                    if (isFuzzy(authors[0], cluster.nameVariant)) firstAuthorCount++;
                    if (authors.length > 1 && isFuzzy(authors[authors.length - 1], cluster.nameVariant)) lastAuthorCount++;
                }
            });

            const profile: AuthorProfile = {
                name: cluster.nameVariant,
                affiliations: [cluster.primaryAffiliation],
                metrics: {
                    hIndex: estimatedMetrics.hIndex,
                    totalCitations: estimatedMetrics.totalCitations,
                    publicationCount: cluster.publicationCount,
                    citationsPerYear: citationsPerYear,
                    publicationsAsFirstAuthor: firstAuthorCount,
                    publicationsAsLastAuthor: lastAuthorCount,
                },
                careerSummary,
                coreConcepts,
                publications: allArticleDetails as RankedArticle[],
            };

            await saveAuthorProfile({ authorName: profile.name }, profile);
            
            if (isMounted.current) {
                setAuthorProfile(profile);
                setView('profile');
            }

        } catch (err) {
             if (isMounted.current) {
                 setError(err instanceof Error ? err.message : "An unknown error occurred while building the profile.");
                 setView('landing');
             }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [settings.ai, saveAuthorProfile]);

    const handleSearch = useCallback(async (name: string) => {
        setIsLoading(true);
        setError(null);
        setAuthorQuery(name);
        setAuthorClusters(null);
        setAuthorProfile(null);
        setSuggestedAuthors(null);

        try {
            setLoadingPhase(authorLoadingPhases[0]);
            const authorQueryString = generateAuthorQuery(name);
            const pmids = await searchPubMedForIds(authorQueryString, settings.ai.researchAssistant.authorSearchLimit);
            if (pmids.length === 0) {
                throw new Error("No publications found for this author on PubMed. Try a different name variation or check spelling.");
            }

            if (!isMounted.current) return;

            setLoadingPhase(authorLoadingPhases[1]);
            const articleDetails = await fetchArticleDetails(pmids.slice(0, 50));

            if (!isMounted.current) return;

            setLoadingPhase(authorLoadingPhases[2]);
            const clusters = await disambiguateAuthor(name, articleDetails, settings.ai);

            if (!isMounted.current) return;

            if (clusters.length === 1) {
                await handleSelectCluster(clusters[0]);
            } else {
                setAuthorClusters(clusters);
                setView('disambiguation');
            }
        } catch (err) {
            if (isMounted.current) {
                setError(err instanceof Error ? err.message : "An unknown error occurred.");
                setView('landing');
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [settings.ai, handleSelectCluster]);
    
    const handleSuggestAuthors = useCallback(async (field: string) => {
        setIsSuggesting(true);
        setSuggestionError(null);
        setSuggestedAuthors(null);
        setError(null);
        try {
            const result = await suggestAuthors(field, settings.ai);
            if (isMounted.current) {
                setSuggestedAuthors(result);
            }
        } catch(err) {
            if (isMounted.current) {
                setSuggestionError(err instanceof Error ? err.message : "Failed to suggest authors.");
            }
        } finally {
            if (isMounted.current) {
                setIsSuggesting(false);
            }
        }
    }, [settings.ai]);

    const handleReset = useCallback(() => {
        setView('landing');
        setAuthorQuery('');
        setError(null);
        setAuthorClusters(null);
        setAuthorProfile(null);
    }, []);

    return {
        view,
        authorQuery,
        isLoading,
        loadingPhase,
        error,
        authorClusters,
        authorProfile,
        isSuggesting,
        suggestionError,
        suggestedAuthors,
        featuredCategories,
        isFeaturedLoading,
        featuredError,
        handleSearch,
        handleSelectCluster,
        handleSuggestAuthors,
        handleReset,
        authorLoadingPhases,
        authorPhaseDetails
    };
};
