import type { ReportStatus } from '../types';

/** High-level Orchestrator task phases (master prompt §10). */
export type OrchestratorTaskPhase =
  'compose' | 'running' | 'streaming' | 'partial' | 'complete' | 'error';

export function resolveOrchestratorTaskPhase(args: {
  reportStatus: ReportStatus;
  hasReport: boolean;
  /** Reserved for future brief-aware compose detection; idle always maps to compose. */
  hasBrief?: boolean;
}): OrchestratorTaskPhase {
  const { reportStatus, hasReport } = args;
  if (reportStatus === 'generating') return 'running';
  if (reportStatus === 'streaming') return 'streaming';
  if (reportStatus === 'partial') return 'partial';
  if (reportStatus === 'error') return 'error';
  if (reportStatus === 'done' || hasReport) return 'complete';
  return 'compose';
}

export function orchestratorBriefStatusKey(
  phase: OrchestratorTaskPhase,
  isSaved: boolean,
): `orchestrator.brief.status.${string}` {
  switch (phase) {
    case 'running':
      return 'orchestrator.brief.status.running';
    case 'streaming':
      return 'orchestrator.brief.status.streaming';
    case 'partial':
      return 'orchestrator.brief.status.partial';
    case 'error':
      return 'orchestrator.brief.status.error';
    case 'complete':
      return isSaved
        ? 'orchestrator.brief.status.complete_saved'
        : 'orchestrator.brief.status.complete_unsaved';
    default:
      return 'orchestrator.brief.status.running';
  }
}

export function shouldShowResearchBrief(args: {
  researchTopic: string | null | undefined;
  reportStatus: ReportStatus;
  hasReport: boolean;
  editingBrief: boolean;
}): boolean {
  if (args.editingBrief) return false;
  const topic = args.researchTopic?.trim();
  if (!topic) return false;
  return (
    args.reportStatus === 'generating' ||
    args.reportStatus === 'streaming' ||
    args.reportStatus === 'partial' ||
    args.reportStatus === 'error' ||
    args.hasReport
  );
}

export function shouldShowComposeForm(args: {
  showBrief: boolean;
  editingBrief: boolean;
  reportStatus: ReportStatus;
  hasReport: boolean;
}): boolean {
  if (args.editingBrief) return true;
  if (args.showBrief) return false;
  if (args.reportStatus === 'idle' && !args.hasReport) return true;
  return false;
}
