import { describe, expect, it } from 'vitest';
import {
  boundTextField,
  DEFAULT_PROMPT_FIELD_LIMITS,
  selectArticlesForRankingPrompt,
  shapeArticleForRankingPrompt,
} from './promptBudget';
import { wrapUntrustedJsonBlock } from './untrustedDataFraming';
import type { RankedArticle } from '../types';

function makeArticle(pmid: string, title: string, summary = 'Abstract text.'): RankedArticle {
  return {
    pmid,
    title,
    authors: 'A',
    journal: 'J',
    pubYear: '2024',
    summary,
    relevanceScore: 0,
    relevanceExplanation: '',
    keywords: [],
    isOpenAccess: false,
    abstractStatus: 'available',
  };
}

describe('wrapUntrustedJsonBlock', () => {
  it('never produces syntactically truncated JSON', () => {
    const large = Array.from({ length: 80 }, (_, i) => ({
      pmid: String(i + 1),
      title: `Aspirin cardiovascular study ${i} with extra detail`,
      sourceAbstract: 'x'.repeat(800),
      abstractStatus: 'available' as const,
    }));
    const wrapped = wrapUntrustedJsonBlock('articles', large);
    const inner = wrapped
      .replace(/^<<<UNTRUSTED_DATA:articles\n/, '')
      .replace(/\n>>>END_UNTRUSTED_DATA$/, '');
    const parsed = JSON.parse(inner);
    expect(parsed).toHaveLength(80);
  });
});

describe('selectArticlesForRankingPrompt', () => {
  it('includes a high-relevance tail article via lexical pre-ranking', () => {
    const articles: RankedArticle[] = Array.from({ length: 90 }, (_, i) =>
      makeArticle(
        String(i + 1),
        `Misc unrelated topic paper ${i}`,
        'x'.repeat(DEFAULT_PROMPT_FIELD_LIMITS.maxAbstractChars),
      ),
    );
    articles.push(
      makeArticle(
        '999',
        'Aspirin cardiovascular randomized trial outcomes aspirin aspirin',
        'Aspirin reduces cardiovascular events in aspirin trials.',
      ),
    );

    const selection = selectArticlesForRankingPrompt(
      articles,
      'aspirin cardiovascular randomized trial',
      'gemini',
      'gemini-2.5-flash',
    );

    const includedPmids = selection.payloads.map((p) => p.pmid);
    expect(includedPmids).toContain('999');
    expect(selection.accounting.omittedFromPrompt).toBeGreaterThan(0);
    expect(selection.accounting.selectionMode).toBe('lexical-prefilter');
  });

  it('handles Unicode titles without breaking JSON wrapping', () => {
    const articles = [
      makeArticle(
        '1',
        'Café naïve résumé — aspirin 日本語 β',
        'Abstract with emoji 🧬 and ümlauts',
      ),
    ];
    const selection = selectArticlesForRankingPrompt(
      articles,
      'aspirin',
      'gemini',
      'gemini-2.5-flash',
    );
    const wrapped = wrapUntrustedJsonBlock('article_list', selection.payloads);
    const inner = wrapped
      .replace(/^<<<UNTRUSTED_DATA:article_list\n/, '')
      .replace(/\n>>>END_UNTRUSTED_DATA$/, '');
    expect(JSON.parse(inner)[0].title).toContain('Café');
  });
});

describe('boundTextField', () => {
  it('marks truncation at field boundaries', () => {
    const { text, truncated } = boundTextField('abcdefgh', 5);
    expect(truncated).toBe(true);
    expect(text).toBe('abcde…');
  });

  it('shapeArticleForRankingPrompt applies per-field limits', () => {
    const shaped = shapeArticleForRankingPrompt(
      makeArticle('1', 't'.repeat(500), 'a'.repeat(2000)),
      { maxTitleChars: 10, maxAbstractChars: 20 },
    );
    expect(shaped.truncatedTitle).toBe(true);
    expect(shaped.truncatedAbstract).toBe(true);
    expect(shaped.payload.title.length).toBeLessThanOrEqual(11);
  });
});

describe('prompt budget boundaries', () => {
  it('fits within configured token budget estimate', () => {
    const articles = Array.from({ length: 30 }, (_, i) =>
      makeArticle(
        String(i),
        `aspirin study ${i}`,
        'x'.repeat(DEFAULT_PROMPT_FIELD_LIMITS.maxAbstractChars),
      ),
    );
    const selection = selectArticlesForRankingPrompt(articles, 'aspirin', 'heuristic', 'local');
    const available = Math.max(1_000, 8_000 - 4_500);
    expect(selection.accounting.estimatedPromptTokens).toBeLessThanOrEqual(available);
    expect(selection.payloads.length).toBeGreaterThan(0);
  });
});
