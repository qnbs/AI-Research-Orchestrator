import { describe, it, expect } from 'vitest';
import {
  DEMO_CORPUS,
  DEMO_ENTRY_PREFIX,
  selectDemoArticlesForTopic,
  isDemoPmid,
  buildDemoResearchReport,
  createDemoKnowledgeBaseEntries,
  isDemoEntryId,
  resolveHeuristicArticleByPmid,
} from './sampleData';

describe('selectDemoArticlesForTopic', () => {
  it('ranks and truncates the demo corpus for a topic', () => {
    const articles = selectDemoArticlesForTopic('aspirin cardiovascular prevention', 3);
    expect(articles.length).toBeLessThanOrEqual(3);
    expect(articles.every((a) => isDemoPmid(a.pmid))).toBe(true);
  });

  it('filters by articleTypes when provided and matches exist', () => {
    const articles = selectDemoArticlesForTopic('any topic', 12, {
      articleTypes: ['Systematic Review'],
      dateRange: 'any',
    });
    expect(articles.every((a) => a.articleType === 'Systematic Review')).toBe(true);
  });

  it('falls back to the full corpus when an articleTypes filter matches nothing', () => {
    const articles = selectDemoArticlesForTopic('any topic', 12, {
      articleTypes: ['Nonexistent Type'],
      dateRange: 'any',
    });
    expect(articles.length).toBeGreaterThan(0);
  });

  it('filters by dateRange years', () => {
    const articles = selectDemoArticlesForTopic('any topic', 12, {
      dateRange: '2',
      articleTypes: [],
    });
    const currentYear = new Date().getFullYear();
    expect(articles.every((a) => parseInt(a.pubYear, 10) >= currentYear - 2)).toBe(true);
  });
});

describe('isDemoPmid', () => {
  it('recognizes the demo: namespace', () => {
    expect(isDemoPmid('demo:aspirin-cv-sr-2023')).toBe(true);
    expect(isDemoPmid('12345678')).toBe(false);
  });
});

describe('buildDemoResearchReport', () => {
  it('builds a complete report from the demo corpus', () => {
    const report = buildDemoResearchReport('aspirin cardiovascular prevention');
    expect(report.rankedArticles.length).toBeGreaterThan(0);
    expect(report.synthesis).toBeTruthy();
    expect(report.rankedArticles.every((a) => isDemoPmid(a.pmid))).toBe(true);
  });
});

describe('createDemoKnowledgeBaseEntries', () => {
  it('creates 2 research entries, 1 journal entry, and 1 author entry', () => {
    const entries = createDemoKnowledgeBaseEntries();
    expect(entries).toHaveLength(4);
    expect(entries.filter((e) => e.sourceType === 'research')).toHaveLength(2);
    expect(entries.filter((e) => e.sourceType === 'journal')).toHaveLength(1);
    expect(entries.filter((e) => e.sourceType === 'author')).toHaveLength(1);
  });

  it('gives every entry a demo-prefixed id', () => {
    const entries = createDemoKnowledgeBaseEntries();
    expect(entries.every((e) => e.id.startsWith(DEMO_ENTRY_PREFIX))).toBe(true);
    expect(entries.every((e) => isDemoEntryId(e.id))).toBe(true);
  });

  it('gives the journal entry a real curated profile', () => {
    const entries = createDemoKnowledgeBaseEntries();
    const journalEntry = entries.find((e) => e.sourceType === 'journal');
    expect(journalEntry?.sourceType).toBe('journal');
    if (journalEntry?.sourceType === 'journal') {
      expect(journalEntry.journalProfile.name).toBe('The Lancet');
      expect(journalEntry.journalProfile.issn).toBe('0140-6736');
    }
  });

  it('gives the author entry a profile with core concepts', () => {
    const entries = createDemoKnowledgeBaseEntries();
    const authorEntry = entries.find((e) => e.sourceType === 'author');
    expect(authorEntry?.sourceType).toBe('author');
    if (authorEntry?.sourceType === 'author') {
      expect(authorEntry.profile.name).toBe('Chen L');
      expect(authorEntry.profile.coreConcepts.length).toBeGreaterThan(0);
    }
  });
});

describe('isDemoEntryId', () => {
  it('recognizes the demo entry prefix', () => {
    expect(isDemoEntryId(`${DEMO_ENTRY_PREFIX}research-aspirin`)).toBe(true);
    expect(isDemoEntryId('real-entry-id')).toBe(false);
  });
});

describe('resolveHeuristicArticleByPmid', () => {
  it('returns the real demo article for a known demo PMID', () => {
    const known = DEMO_CORPUS[0];
    const resolved = resolveHeuristicArticleByPmid(known.pmid);
    expect(resolved.title).toBe(known.title);
    expect(resolved).not.toBe(known); // returns a copy, not the same reference
  });

  it('returns an honest offline placeholder for an unknown PMID, never substituting an unrelated article', () => {
    const resolved = resolveHeuristicArticleByPmid('99999999');
    expect(resolved.pmid).toBe('99999999');
    expect(resolved.title).toContain('Unavailable offline');
    expect(resolved.relevanceExplanation).toContain('Placeholder');
  });
});
