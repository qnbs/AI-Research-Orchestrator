import { describe, expect, it } from 'vitest';
import {
  buildReportGenerationProvenance,
  formatReleaseLabel,
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
    expect(formatReleaseLabel({ appVersion: '0.4.0', buildCommitSha: 'abc1234', dexieSchemaVersion: 5, swCacheVersion: 'v1' })).toBe(
      'v0.4.0 (abc1234)',
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
    expect(buildReportGenerationProvenance().generatedAt).toBeTypeOf('number');
  });
});
