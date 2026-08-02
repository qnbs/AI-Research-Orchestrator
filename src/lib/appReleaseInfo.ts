/**
 * Runtime release metadata (P1-6) — package version, deploy commit, schema/cache versions.
 */

import type { InferenceMode } from '../services/inferenceMode';
import type { AIProviderSelection } from '../services/providers/types';
import type { ResearchReport, ReportGenerationProvenance } from '../types';
import { DEXIE_SCHEMA_VERSION, SW_CACHE_VERSION } from './appVersionConstants';

export interface AppReleaseInfo {
  appVersion: string;
  buildCommitSha: string;
  dexieSchemaVersion: number;
  swCacheVersion: string;
}

export type { ReportGenerationProvenance };

const DEV_FALLBACK_VERSION = '0.0.0-dev';
const DEV_FALLBACK_SHA = 'dev';

export function getAppVersion(): string {
  return typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : DEV_FALLBACK_VERSION;
}

export function getBuildCommitSha(): string {
  return typeof __BUILD_COMMIT_SHA__ !== 'undefined' ? __BUILD_COMMIT_SHA__ : DEV_FALLBACK_SHA;
}

export function getAppReleaseInfo(): AppReleaseInfo {
  return {
    appVersion: getAppVersion(),
    buildCommitSha: getBuildCommitSha(),
    dexieSchemaVersion: DEXIE_SCHEMA_VERSION,
    swCacheVersion: SW_CACHE_VERSION,
  };
}

export function formatReleaseLabel(info: AppReleaseInfo = getAppReleaseInfo()): string {
  return `v${info.appVersion} (${info.buildCommitSha})`;
}

export interface StampReportProvenanceOptions {
  inferenceMode?: InferenceMode;
  providerId?: AIProviderSelection;
  model?: string;
  generatedAt?: number;
}

export function buildReportGenerationProvenance(
  options: StampReportProvenanceOptions = {},
): ReportGenerationProvenance {
  return {
    ...getAppReleaseInfo(),
    generatedAt: options.generatedAt ?? Date.now(),
    inferenceMode: options.inferenceMode,
    providerId: options.providerId,
    model: options.model,
  };
}

/** Attach generation provenance so exports and history identify the producing build. */
export function stampReportWithProvenance(
  report: ResearchReport,
  options: StampReportProvenanceOptions = {},
): ResearchReport {
  return {
    ...report,
    generationProvenance: buildReportGenerationProvenance(options),
  };
}
