import { describe, expect, it } from 'vitest';
import {
  buildReportGenerationProvenance,
  formatReleaseLabel,
  formatReportReleaseLabel,
  getAppReleaseInfo,
  stampReportWithProvenance,
} from './appReleaseInfo';
import { DEXIE_SCHEMA_VERSION, SW_CACHE_VERSION } from './appVersionConstants';

describe('appReleaseInfo', () => {
  it('returns build-injected version metadata', () => {
    const info = getAppReleaseInfo();
    expect(info.dexieSchemaVersion).toBe(DEXIE_SCHEMA_VERSION);
    expect(info.swCacheVersion).toBe(SW_CACHE_VERSION);
    expect(info.appVersion).toMatch(/^\d+\.\d+\.\d+/);
    expect(info.buildCommitSha.length).toBeGreaterThan(0);
  });

  it('formats a human-readable release label', () => {
    expect(
      formatReleaseLabel({
        appVersion: '0.4.0',
        buildCommitSha: 'abc1234',
        dexieSchemaVersion: 5,
        swCacheVersion: 'v1',
      }),
    ).toBe('v0.4.0 (abc1234)');
  });

  it('prefers report provenance for export labels', () => {
    const report = {
      generatedQueries: [],
      rankedArticles: [],
      synthesis: '',
      aiGeneratedInsights: [],
      overallKeywords: [],
      generationProvenance: {
        appVersion: '0.3.9',
        buildCommitSha: 'oldsha1',
        dexieSchemaVersion: 4,
        swCacheVersion: 'v0',
        generatedAt: 1_700_000_000_000,
      },
    };
    expect(formatReportReleaseLabel(report)).toBe('v0.3.9 (oldsha1)');
    expect(formatReportReleaseLabel({ ...report, generationProvenance: undefined })).toMatch(
      /^v\d+\.\d+\.\d+/,
    );
  });

  it('stamps generation provenance onto reports', () => {
    const report = stampReportWithProvenance(
      {
        generatedQueries: [],
        rankedArticles: [],
        synthesis: '',
        aiGeneratedInsights: [],
        overallKeywords: [],
      },
      { inferenceMode: 'heuristic', providerId: 'heuristic', model: 'local' },
    );
    expect(report.generationProvenance?.inferenceMode).toBe('heuristic');
    expect(report.generationProvenance?.providerId).toBe('heuristic');
    expect(report.generationProvenance?.dexieSchemaVersion).toBe(DEXIE_SCHEMA_VERSION);
    expect(buildReportGenerationProvenance({ generatedAt: 1_700_000_000_000 }).generatedAt).toBe(
      1_700_000_000_000,
    );
  });

  it('stamps frozen execution context without re-deriving release fields', () => {
    const report = stampReportWithProvenance(
      {
        generatedQueries: [],
        rankedArticles: [],
        synthesis: '',
        aiGeneratedInsights: [],
        overallKeywords: [],
      },
      {
        executionContext: {
          executionId: 'run-1',
          startedAt: 1_700_000_000_000,
          inferenceMode: 'heuristic',
          inferenceReason: 'offline',
          providerId: 'heuristic',
          model: 'gemini-2.5-flash',
          appVersion: '0.4.1',
          buildCommitSha: 'deadbeef',
          dexieSchemaVersion: DEXIE_SCHEMA_VERSION,
          swCacheVersion: SW_CACHE_VERSION,
          promptRegistryVersion: '2026.07.16',
          transitions: [],
        },
        generatedAt: 1_700_000_000_500,
      },
    );
    expect(report.generationProvenance).toMatchObject({
      executionId: 'run-1',
      startedAt: 1_700_000_000_000,
      inferenceMode: 'heuristic',
      inferenceReason: 'offline',
      providerId: 'heuristic',
      model: 'gemini-2.5-flash',
      appVersion: '0.4.1',
      buildCommitSha: 'deadbeef',
      promptRegistryVersion: '2026.07.16',
      generatedAt: 1_700_000_000_500,
    });
  });
});
