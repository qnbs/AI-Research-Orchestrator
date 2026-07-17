import type { RankedArticle } from '../../types';
import { HEURISTIC_BADGE } from './types';
import { extractKeywords } from './keywords';

/**
 * Template-based markdown synthesis referencing top-N ranked articles.
 * Educational, structured, and clearly labeled as heuristic.
 */
export function synthesizeReportMarkdown(
  topic: string,
  focus: string,
  articles: RankedArticle[],
): string {
  const top = articles.slice(0, Math.max(1, articles.length));
  const kw = extractKeywords(
    `${topic} ${top.map((a) => `${a.title} ${a.keywords?.join(' ')}`).join(' ')}`,
    8,
  );

  const cite = (a: RankedArticle) => `**${a.title}** (PMID ${a.pmid}, ${a.pubYear})`;

  const background = [
    `## Background`,
    ``,
    `*${HEURISTIC_BADGE} — local ranking & template synthesis; not a live Gemini narrative.*`,
    ``,
    `This review addresses **${topic}** with a synthesis focus on **${focus || 'overview'}**.`,
    `A deterministic lexical ranker scored ${articles.length} candidate record(s); the narrative below cites the strongest matches.`,
    kw.length ? `Salient topic terms: ${kw.map((k) => `\`${k}\``).join(', ')}.` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const findings = [
    `## Key Findings`,
    ``,
    ...top.slice(0, 5).map((a, i) => {
      const snippet = (a.aiSummary || a.summary || '').slice(0, 280);
      return `${i + 1}. ${cite(a)} — relevance **${a.relevanceScore}/100**. ${snippet}${snippet.length >= 280 ? '…' : ''}`;
    }),
  ].join('\n');

  const methods = [
    `## Methods Overview`,
    ``,
    `Heuristic pipeline: Boolean / MeSH-style query formulation → PubMed fetch when online (or curated demo corpus offline) → keyword-overlap / TF-style ranking with recency and open-access preference → extractive article notes → this templated markdown.`,
    `Study designs among top hits: ${summarizeTypes(top)}.`,
  ].join('\n');

  const gaps = [
    `## Gaps & Limitations`,
    ``,
    `- Local heuristics cannot replace expert appraisal or live LLM nuance.`,
    `- Ranking relies on title/abstract lexical overlap; synonymy and negation are limited.`,
    `- Offline demo articles are educational fixtures, not a live literature snapshot.`,
    `- When a Gemini API key and network are available, re-run for high-fidelity synthesis.`,
  ].join('\n');

  const conclusion = [
    `## Conclusion`,
    ``,
    `For **${topic}**, the highest-scoring records (${
      top
        .slice(0, 3)
        .map((a) => a.pmid)
        .join(', ') || 'n/a'
    }) provide a practical starting bibliography.`,
    `Use the ranked list and insights panel to drill into methods and outcomes; export or save to the Knowledge Base for offline reuse.`,
  ].join('\n');

  return [background, findings, methods, gaps, conclusion].join('\n\n');
}

function summarizeTypes(articles: RankedArticle[]): string {
  const counts = new Map<string, number>();
  for (const a of articles) {
    const t = a.articleType ?? 'Other';
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const parts = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  return parts.length ? parts.map(([k, v]) => `${k} (${v})`).join(', ') : 'unclassified';
}

/**
 * Stream synthesis in small chunks for UI parity with live Gemini streaming.
 */
export async function* streamSynthesisChunks(
  markdown: string,
  signal?: AbortSignal,
  chunkSize = 48,
): AsyncGenerator<string> {
  if (!Number.isInteger(chunkSize) || chunkSize <= 0) {
    throw new RangeError('chunkSize must be a positive integer');
  }
  for (let i = 0; i < markdown.length; i += chunkSize) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    yield markdown.slice(i, i + chunkSize);
    // Yield to event loop without real delay (deterministic tests)
    await Promise.resolve();
  }
}
