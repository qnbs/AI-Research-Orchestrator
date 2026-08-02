/**
 * Structured, corpus-bound synthesis claims for research reports.
 * Complements free-form markdown `synthesis` with atomically citable claims.
 */

import type { GroundedClaim, GroundedSynthesis } from '../types';
import type { ExtractiveSynthesis, NarrativeSection } from '../services/nonAi/types';
import { partitionCorpusCitations } from './citationGrounding';
import { assessSynthesisTrust } from './claimValidation';

export interface GroundedClaimSanitizationMetrics {
  droppedClaims: number;
  invalidCitations: number;
}

const PMID_INLINE_PATTERN = /PMID[:\s#]*(\d+)/gi;

/** Build structured claims from heuristic extractive synthesis output. */
export function buildGroundedSynthesisFromExtractive(
  extractive: ExtractiveSynthesis,
  sections: NarrativeSection[],
): GroundedSynthesis {
  const claims: GroundedClaim[] = [];

  if (extractive.tldr.trim()) {
    const pmids = [...new Set(extractive.keyFindings.map((f) => f.pmid))];
    claims.push({ text: extractive.tldr, pmids });
  }

  for (const finding of extractive.keyFindings) {
    claims.push({ text: finding.sentence, pmids: [finding.pmid] });
  }

  for (const section of sections) {
    const text = section.content.trim();
    if (!text) continue;
    claims.push({ text, pmids: [...section.pmids] });
  }

  return { claims, mode: 'extractive-template', trustLevel: 'verified' };
}

/** Build trust-assessed grounded synthesis from live-extracted or template claims. */
export function buildAssessedGroundedSynthesis(
  claims: GroundedClaim[],
  corpusArticles: readonly {
    pmid: string;
    title: string;
    summary?: string;
    aiSummary?: string;
    sourceClass?: import('../types').ArticleSourceClass;
  }[],
  mode: GroundedSynthesis['mode'],
): GroundedSynthesis | undefined {
  if (!claims.length) return undefined;
  const ranked = corpusArticles.map((a) => ({
    pmid: a.pmid,
    title: a.title,
    authors: '',
    journal: '',
    pubYear: '0000',
    summary: a.summary ?? '',
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: [],
    isOpenAccess: false,
    aiSummary: a.aiSummary,
    sourceClass: a.sourceClass,
  }));
  const assessment = assessSynthesisTrust(claims, ranked, mode);
  return {
    mode,
    trustLevel: assessment.trustLevel,
    validatedAt: Date.now(),
    claims: assessment.claims.map((c) => ({
      id: c.id,
      text: c.text,
      pmids: c.pmids,
      validationState: c.validationState,
      evidenceSnippets: c.evidenceSnippets,
      provenanceMode: mode,
    })),
  };
}

/** Extract corpus-bound claims from streamed/live markdown synthesis. */
export function extractGroundedClaimsFromMarkdown(
  synthesis: string,
  corpusPmids: readonly string[],
): GroundedClaim[] {
  const corpusIds = new Set(corpusPmids);
  const blocks = synthesis
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter(Boolean);

  const claims: GroundedClaim[] = [];

  for (const block of blocks) {
    if (isHeadingOnlyBlock(block)) continue;
    const pmids: string[] = [];
    const seen = new Set<string>();
    PMID_INLINE_PATTERN.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = PMID_INLINE_PATTERN.exec(block)) !== null) {
      const id = match[1];
      if (corpusIds.has(id) && !seen.has(id)) {
        seen.add(id);
        pmids.push(id);
      }
    }
    if (pmids.length > 0) {
      claims.push({ text: block, pmids });
    }
  }

  return claims;
}

/** Drop invalid PMIDs and claims with no corpus support. */
export function sanitizeGroundedClaims(
  claims: readonly GroundedClaim[],
  corpusIds: ReadonlySet<string>,
): { claims: GroundedClaim[]; metrics: GroundedClaimSanitizationMetrics } {
  let droppedClaims = 0;
  let invalidCitations = 0;
  const sanitized: GroundedClaim[] = [];

  for (const claim of claims) {
    const { valid, invalid } = partitionCorpusCitations(corpusIds, claim.pmids);
    invalidCitations += invalid.length;
    if (valid.length === 0) {
      droppedClaims += 1;
      continue;
    }
    sanitized.push({ text: claim.text, pmids: valid });
  }

  return { claims: sanitized, metrics: { droppedClaims, invalidCitations } };
}

/** Rebuild markdown synthesis from corpus-bound claims (export-safe). */
export function rebuildSynthesisFromClaims(
  claims: readonly GroundedClaim[],
  preservedHeadings?: readonly string[],
): string {
  const body = claims.map((c) => c.text).join('\n\n');
  if (!preservedHeadings?.length) return body;
  return [...preservedHeadings, body].join('\n\n');
}

function extractHeadingOnlyBlocks(synthesis: string): string[] {
  return synthesis
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && isHeadingOnlyBlock(b));
}

const HEADING_ONLY_PATTERN = /^#{1,6}\s+\S/;

/** Whether a markdown block is a heading line without body content. */
export function isHeadingOnlyBlock(block: string): boolean {
  const trimmed = block.trim();
  if (!trimmed) return false;
  const lines = trimmed
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length === 1 && HEADING_ONLY_PATTERN.test(lines[0]);
}

/** Count non-empty synthesis blocks, excluding heading-only lines. */
export function countSubstantiveBlocks(synthesis: string): number {
  return synthesis
    .split(/\n\n+/)
    .map((b) => b.trim())
    .filter((b) => b.length > 0 && !isHeadingOnlyBlock(b)).length;
}

/**
 * Replace free-form synthesis with corpus-cited paragraphs only.
 * Uses structured claims when present; otherwise extracts PMIDs from markdown.
 */
export function sanitizeSynthesisForExport(
  synthesis: string,
  groundedSynthesis: GroundedSynthesis | undefined,
  corpusPmids: readonly string[],
): { synthesis: string; uncitedParagraphsRemoved: number } {
  const corpusIds = new Set(corpusPmids);
  const claimResult = sanitizeGroundedSynthesis(groundedSynthesis, corpusPmids);
  let claims = claimResult.groundedSynthesis?.claims;
  if (!claims?.length) {
    claims = sanitizeGroundedClaims(
      extractGroundedClaimsFromMarkdown(synthesis, corpusPmids),
      corpusIds,
    ).claims;
  }
  if (!claims.length) {
    const removed = countSubstantiveBlocks(synthesis);
    return { synthesis: '', uncitedParagraphsRemoved: removed };
  }

  const originalBlocks = countSubstantiveBlocks(synthesis);
  const headings = extractHeadingOnlyBlocks(synthesis);
  const rebuilt = rebuildSynthesisFromClaims(claims, headings);
  return {
    synthesis: rebuilt,
    uncitedParagraphsRemoved: Math.max(0, originalBlocks - claims.length),
  };
}

/** Sanitize optional grounded synthesis against a retrieval corpus. */
export function sanitizeGroundedSynthesis(
  grounded: GroundedSynthesis | undefined,
  corpusPmids: readonly string[],
): { groundedSynthesis?: GroundedSynthesis; metrics: GroundedClaimSanitizationMetrics } {
  if (!grounded?.claims?.length) {
    return { groundedSynthesis: grounded, metrics: { droppedClaims: 0, invalidCitations: 0 } };
  }

  const corpusIds = new Set(corpusPmids);
  const { claims, metrics } = sanitizeGroundedClaims(grounded.claims, corpusIds);

  return {
    groundedSynthesis: claims.length > 0 ? { ...grounded, claims } : undefined,
    metrics,
  };
}
