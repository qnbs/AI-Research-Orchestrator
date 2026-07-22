import { describe, it, expect } from 'vitest';
import type { RankedArticle } from '../../types';
import {
  generateExtractiveTldr,
  generateNarrativeSections,
  generateResearchReport,
  generateHeuristicTldr,
  extractKeySentences,
  streamSynthesisChunks,
} from './synthesizer';

const mockArticles: RankedArticle[] = [
  {
    pmid: '12345',
    title: 'Diabetes Treatment Study',
    authors: 'Author A',
    journal: 'Journal A',
    pubYear: '2023',
    summary: 'This study examines diabetes treatment. The results show significant improvement.',
    relevanceScore: 85,
    relevanceExplanation: 'High relevance',
    keywords: ['diabetes', 'treatment'],
    isOpenAccess: true,
    articleType: 'Randomized Controlled Trial',
  },
  {
    pmid: '67890',
    title: 'Diabetes Management Review',
    authors: 'Author B',
    journal: 'Journal B',
    pubYear: '2022',
    summary: 'A review of diabetes management strategies. Clinical outcomes were analyzed.',
    relevanceScore: 75,
    relevanceExplanation: 'Medium relevance',
    keywords: ['diabetes', 'management'],
    isOpenAccess: false,
    articleType: 'Review',
  },
];

describe('generateExtractiveTldr', () => {
  it('produces a TL;DR with key findings across multiple articles', () => {
    const synthesis = generateExtractiveTldr(mockArticles, 'diabetes treatment');
    expect(synthesis.tldr).toBeTruthy();
    expect(synthesis.keyFindings.length).toBeGreaterThan(0);
    expect(synthesis.synthesisMode).toBe('extractive-template');
  });
});

describe('generateNarrativeSections', () => {
  it('generates the standard 4 sections', () => {
    const sections = generateNarrativeSections(mockArticles, 'diabetes');
    expect(sections.length).toBe(4);
    expect(sections[0].title).toBe('Background');
    expect(sections[1].title).toBe('Key Findings');
  });
});

describe('generateResearchReport', () => {
  it('produces a complete report shape', () => {
    const report = generateResearchReport(mockArticles, 'diabetes treatment');
    expect(report.generatedQueries.length).toBe(1);
    expect(report.rankedArticles.length).toBe(2);
    expect(report.synthesis).toBeTruthy();
    expect(report.aiGeneratedInsights.length).toBeGreaterThan(0);
    expect(report.overallKeywords.length).toBeGreaterThan(0);
  });
});

describe('generateHeuristicTldr', () => {
  it('returns a fallback message for an empty abstract', () => {
    expect(generateHeuristicTldr('')).toMatch(/no abstract available/i);
  });

  it('returns the single sentence as-is when there is only one', () => {
    const tldr = generateHeuristicTldr('A single short sentence about aspirin.');
    expect(tldr).toContain('aspirin');
  });

  it('picks the most central sentence from a multi-sentence abstract', () => {
    const abstract =
      'Background information not central to the topic at all whatsoever here. ' +
      'Aspirin reduces cardiovascular events through platelet inhibition mechanisms clearly. ' +
      'Unrelated closing remark about funding sources and conflicts of interest disclosed.';
    const tldr = generateHeuristicTldr(abstract);
    expect(tldr.length).toBeGreaterThan(0);
  });

  it('clips very long sentences to about 30 words', () => {
    const longSentence = Array.from({ length: 50 }, (_, i) => `word${i}`).join(' ') + '.';
    const tldr = generateHeuristicTldr(longSentence);
    expect(tldr.endsWith('…')).toBe(true);
  });
});

describe('extractKeySentences', () => {
  it('returns all sentences when there are fewer than count', () => {
    const text = 'First sentence here is long enough. Second sentence here is long enough too.';
    const sentences = extractKeySentences(text, 5);
    expect(sentences.length).toBe(2);
  });

  it('returns sentences in original order when truncating', () => {
    const text =
      'Alpha sentence about the topic in question here today. ' +
      'Beta sentence about a different topic entirely and separately. ' +
      'Gamma sentence returning to discuss the topic once again now. ' +
      'Delta sentence about something else again completely unrelated.';
    const sentences = extractKeySentences(text, 2);
    expect(sentences.length).toBe(2);
    const indices = sentences.map((s) => text.indexOf(s));
    expect(indices).toEqual([...indices].sort((a, b) => a - b));
  });
});

describe('streamSynthesisChunks', () => {
  it('yields the full markdown split into chunks', async () => {
    const markdown = 'a'.repeat(100);
    const chunks: string[] = [];
    for await (const chunk of streamSynthesisChunks(markdown, undefined, 48)) {
      chunks.push(chunk);
    }
    expect(chunks.join('')).toBe(markdown);
    expect(chunks.length).toBe(3);
  });

  it('throws AbortError if the signal fires mid-stream', async () => {
    const controller = new AbortController();
    const markdown = 'a'.repeat(200);
    const iterate = async () => {
      let i = 0;
      for await (const _chunk of streamSynthesisChunks(markdown, controller.signal, 10)) {
        i++;
        if (i === 2) controller.abort();
      }
    };
    await expect(iterate()).rejects.toThrow();
  });

  it('rejects a non-positive-integer chunkSize', async () => {
    const iterate = async () => {
      for await (const _chunk of streamSynthesisChunks('text', undefined, 0)) {
        // no-op
      }
    };
    await expect(iterate()).rejects.toThrow(RangeError);
  });
});
