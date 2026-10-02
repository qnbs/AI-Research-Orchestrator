import { describe, expect, it } from 'vitest';
import {
  orchestratorBriefStatusKey,
  resolveOrchestratorTaskPhase,
  shouldShowComposeForm,
  shouldShowResearchBrief,
} from './orchestratorTaskPhase';

describe('orchestratorTaskPhase', () => {
  it('maps report statuses to task phases', () => {
    expect(
      resolveOrchestratorTaskPhase({ reportStatus: 'idle', hasReport: false, hasBrief: false }),
    ).toBe('compose');
    expect(
      resolveOrchestratorTaskPhase({
        reportStatus: 'generating',
        hasReport: false,
        hasBrief: true,
      }),
    ).toBe('running');
    expect(
      resolveOrchestratorTaskPhase({ reportStatus: 'streaming', hasReport: true, hasBrief: true }),
    ).toBe('streaming');
    expect(
      resolveOrchestratorTaskPhase({ reportStatus: 'partial', hasReport: true, hasBrief: true }),
    ).toBe('partial');
    expect(
      resolveOrchestratorTaskPhase({ reportStatus: 'done', hasReport: true, hasBrief: true }),
    ).toBe('complete');
    expect(
      resolveOrchestratorTaskPhase({ reportStatus: 'error', hasReport: false, hasBrief: true }),
    ).toBe('error');
  });

  it('picks brief status keys', () => {
    expect(orchestratorBriefStatusKey('complete', true)).toBe(
      'orchestrator.brief.status.complete_saved',
    );
    expect(orchestratorBriefStatusKey('complete', false)).toBe(
      'orchestrator.brief.status.complete_unsaved',
    );
  });

  it('shows brief during active tasks but not while editing', () => {
    expect(
      shouldShowResearchBrief({
        researchTopic: 'aspirin',
        reportStatus: 'generating',
        hasReport: false,
        editingBrief: false,
      }),
    ).toBe(true);
    expect(
      shouldShowResearchBrief({
        researchTopic: 'aspirin',
        reportStatus: 'generating',
        hasReport: false,
        editingBrief: true,
      }),
    ).toBe(false);
  });

  it('shows compose form only in compose or edit-brief modes', () => {
    expect(
      shouldShowComposeForm({
        showBrief: false,
        editingBrief: false,
        reportStatus: 'idle',
        hasReport: false,
      }),
    ).toBe(true);
    expect(
      shouldShowComposeForm({
        showBrief: true,
        editingBrief: false,
        reportStatus: 'streaming',
        hasReport: true,
      }),
    ).toBe(false);
    expect(
      shouldShowComposeForm({
        showBrief: true,
        editingBrief: true,
        reportStatus: 'done',
        hasReport: true,
      }),
    ).toBe(true);
  });
});
