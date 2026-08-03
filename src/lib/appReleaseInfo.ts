/**
 * Runtime release metadata (P1-6) — package version, deploy commit, schema/cache versions.
 * Execution freeze fields come from ResearchExecutionContext (ADR 0017).
 */

import type { InferenceMode, InferenceModeReason } from '../services/inferenceMode';
import type { AIProviderSelection } from '../services/providers/types';
import type { ResearchReport, ReportGenerationProvenance } from '../types';
import { DEXIE_SCHEMA_VERSION, SW_CACHE_VERSION } from './appVersionConstants';
import type { InferenceTransition, ResearchExecutionContext } from './researchExecutionContext';

export interface AppReleaseInfo {
  appVersion: string;
  buildCommitSha: string;
  dexieSchemaVersion: number;
  swCacheVersion: string;
}

export type { ReportGenerationProvenance };

const DEV_FALLBACK_VERSION = '0.0.0-dev';
const DEV_FALLBACK_SHA = 'dev';

export const getAppVersion = (): string =>
  typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : DEV_FALLBACK_VERSION;

export const getBuildCommitSha = (): string =>
  typeof __BUILD_COMMIT_SHA__ !== 'undefined' ? __BUILD_COMMIT_SHA__ : DEV_FALLBACK_SHA;

export const getAppReleaseInfo = (): AppReleaseInfo => ({
  appVersion: getAppVersion(),
  buildCommitSha: getBuildCommitSha(),
  dexieSchemaVersion: DEXIE_SCHEMA_VERSION,
  swCacheVersion: SW_CACHE_VERSION,
});

export const formatReleaseLabel = (info: AppReleaseInfo = getAppReleaseInfo()): string =>
  `v${info.appVersion} (${info.buildCommitSha})`;

/** Prefer report generation provenance for exports; fall back to current build. */
export const formatReportReleaseLabel = (report: ResearchReport): string => {
  const prov = report.generationProvenance;
  if (!prov) return formatReleaseLabel();
  return formatReleaseLabel({
    appVersion: prov.appVersion,
    buildCommitSha: prov.buildCommitSha,
    dexieSchemaVersion: prov.dexieSchemaVersion,
    swCacheVersion: prov.swCacheVersion,
  });
};

export interface StampReportProvenanceOptions {
  /** Preferred: frozen start-of-run context (do not re-resolve inference at completion). */
  executionContext?: ResearchExecutionContext;
  inferenceMode?: InferenceMode;
  inferenceReason?: InferenceModeReason;
  providerId?: AIProviderSelection;
  model?: string;
  generatedAt?: number;
  executionId?: string;
  startedAt?: number;
  endpointOrigin?: string;
  promptRegistryVersion?: string;
  transitions?: InferenceTransition[];
}

export const buildReportGenerationProvenance = (
  options: StampReportProvenanceOptions = {},
): ReportGenerationProvenance => {
  const ctx = options.executionContext;
  const release = ctx
    ? {
        appVersion: ctx.appVersion,
        buildCommitSha: ctx.buildCommitSha,
        dexieSchemaVersion: ctx.dexieSchemaVersion,
        swCacheVersion: ctx.swCacheVersion,
      }
    : getAppReleaseInfo();
  const inferenceMode = ctx?.inferenceMode ?? options.inferenceMode;
  const providerId = ctx?.providerId ?? options.providerId;
  const model = ctx?.model ?? options.model;
  const executionId = ctx?.executionId ?? options.executionId;
  const inferenceReason = ctx?.inferenceReason ?? options.inferenceReason;
  const startedAt = ctx?.startedAt ?? options.startedAt;
  const endpointOrigin = ctx?.endpointOrigin ?? options.endpointOrigin;
  const promptRegistryVersion = ctx?.promptRegistryVersion ?? options.promptRegistryVersion;
  const transitions = ctx?.transitions?.length
    ? ctx.transitions
    : options.transitions && options.transitions.length > 0
      ? options.transitions
      : undefined;

  return {
    ...release,
    generatedAt: options.generatedAt ?? Date.now(),
    inferenceMode,
    providerId,
    model,
    ...(executionId ? { executionId } : {}),
    ...(inferenceReason ? { inferenceReason } : {}),
    ...(startedAt !== undefined ? { startedAt } : {}),
    ...(endpointOrigin ? { endpointOrigin } : {}),
    ...(promptRegistryVersion ? { promptRegistryVersion } : {}),
    ...(transitions ? { transitions } : {}),
  };
};

/** Attach generation provenance so exports and history identify the producing build. */
export const stampReportWithProvenance = (
  report: ResearchReport,
  options: StampReportProvenanceOptions = {},
): ResearchReport => ({
  ...report,
  generationProvenance: buildReportGenerationProvenance(options),
});
