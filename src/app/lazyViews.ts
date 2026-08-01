import { lazy } from 'react';

/** Lazy-loaded major views — kept in one module so AppLayout stays focused on composition. */
export const OnboardingView = lazy(() => import('../components/OnboardingView'));
export const KnowledgeBaseView = lazy(() => import('../components/KnowledgeBaseView'));
export const SettingsView = lazy(() => import('../components/SettingsView'));
export const HelpView = lazy(() => import('../components/HelpView'));
export const DashboardView = lazy(() => import('../components/DashboardView'));
export const HistoryView = lazy(() => import('../components/HistoryView'));
export const ResearchView = lazy(() => import('../components/ResearchView'));
export const AuthorsView = lazy(() => import('../components/AuthorsView'));
export const OrchestratorView = lazy(() => import('../components/OrchestratorView'));
export const HomeView = lazy(() => import('../components/HomeView'));
export const CommandPalette = lazy(() => import('../components/CommandPalette'));
export const QuickAddModal = lazy(() => import('../components/QuickAddModal'));
export const JournalsView = lazy(() => import('../components/JournalsView'));
export const CollectionsView = lazy(() => import('../components/CollectionsView'));
export const AgentDebugger = lazy(() => import('../components/agentDebugger/AgentDebuggerPanel'));
