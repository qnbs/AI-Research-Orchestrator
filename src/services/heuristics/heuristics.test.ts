import { describe, it, expect, vi } from 'vitest';
import {
  formulatePubMedQuery,
  rankArticles,
  extractKeywords,
  generateHeuristicTldr,
  synthesizeReportMarkdown,
  findSimilarArticlesHeuristic,
  disambiguateAuthorHeuristic,
  generateJournalProfileHeuristic,
  answerFromReport,
  buildDemoResearchReport,
  generateHeuristicResearchReportStream,
  DEMO_CORPUS,
} from './index';
import type { ResearchInput } from '../../types';

describe('heuristics core', () => {
  it('formulates Boolean PubMed query with MeSH expansion for aspirin', () => {
    const q = formulatePubMedQuery({
      researchTopic: 'aspirin heart attack',
      dateRange: '5',
      articleTypes: ['Randomized Controlled Trial'],
      synthesisFocus: 'overview',
      maxArticlesToScan: 20,
      topNToSynthesize: 5,
    });
    expect(q.query).toMatch(/Aspirin|aspirin/i);
    expect(q.query).toMatch(/Publication Type/);
    expect(q.explanation).toMatch(/Heuristic/i);
  });

  it('ranks articles deterministically', () => {
    const a = rankArticles(DEMO_CORPUS, 'aspirin cardiovascular prevention', 3);
    const b = rankArticles(DEMO_CORPUS, 'aspirin cardiovascular prevention', 3);
    expect(a.map((x) => x.pmid)).toEqual(b.map((x) => x.pmid));
    expect(a[0].relevanceScore).toBeGreaterThanOrEqual(a[1].relevanceScore);
    expect(a[0].keywords.length).toBeGreaterThan(0);
  });

  it('extracts keywords and TL;DR', () => {
    const text =
      'Background: Low-dose aspirin reduces cardiovascular events in high-risk adults. Methods: We conducted a randomized trial. Results: Major bleeding increased modestly. Conclusion: Shared decision-making is essential.';
    expect(extractKeywords(text, 5).length).toBeGreaterThan(0);
    const tldr = generateHeuristicTldr(text);
    expect(tldr.split(/\s+/).length).toBeLessThanOrEqual(35);
  });

  it('synthesizes markdown with sections and PMIDs', () => {
    const ranked = rankArticles(DEMO_CORPUS, 'diabetes heart failure', 3);
    const md = synthesizeReportMarkdown('diabetes heart failure', 'outcomes', ranked);
    expect(md).toMatch(/## Background/);
    expect(md).toMatch(/## Key Findings/);
    expect(md).toMatch(/Heuristic mode/);
    expect(md).toContain(ranked[0].pmid);
  });

  it('finds similar articles via Jaccard', () => {
    const seed = DEMO_CORPUS[0];
    const similar = findSimilarArticlesHeuristic(seed, DEMO_CORPUS.slice(1), 3);
    expect(similar.length).toBeGreaterThan(0);
    expect(similar[0].reason).toMatch(/Heuristic/i);
  });

  it('disambiguates authors into clusters', () => {
    const clusters = disambiguateAuthorHeuristic('Chen L', DEMO_CORPUS.slice(0, 3));
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    expect(clusters[0].publicationCount).toBeGreaterThan(0);
  });

  it('profiles known journals', () => {
    const profile = generateJournalProfileHeuristic('The Lancet');
    expect(profile.issn).toMatch(/\d/);
    expect(profile.oaPolicy).toBeTruthy();
  });

  it('answers chat grounded in report', () => {
    const report = buildDemoResearchReport('aspirin cardiovascular');
    const answer = answerFromReport(report, 'What are the top articles?');
    expect(answer).toMatch(/Heuristic/i);
    expect(answer).toMatch(/pmid|ranked|38123456/i);
  });

  it('streams a full heuristic research report offline', async () => {
    const onlineSpy = vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const input: ResearchInput = {
      researchTopic: 'aspirin primary prevention',
      dateRange: '5',
      articleTypes: [],
      synthesisFocus: 'overview',
      maxArticlesToScan: 10,
      topNToSynthesize: 3,
    };
    let sawRank = false;
    let chunks = 0;
    let reportArticles = 0;
    for await (const ev of generateHeuristicResearchReportStream(input, {
      model: 'gemini-2.5-flash',
      customPreamble: '',
      temperature: 0.2,
      aiLanguage: 'English',
      aiPersona: 'Neutral Scientist',
      researchAssistant: {
        autoFetchSimilar: false,
        autoFetchOnline: false,
        authorSearchLimit: 50,
      },
      enableTldr: true,
      ncbiApiKey: '',
      forceHeuristicMode: true,
    })) {
      if (ev.phase.includes('Ranking')) sawRank = true;
      if (ev.synthesisChunk) chunks += 1;
      if (ev.report?.rankedArticles) reportArticles = ev.report.rankedArticles.length;
    }
    expect(sawRank).toBe(true);
    expect(chunks).toBeGreaterThan(0);
    expect(reportArticles).toBeGreaterThan(0);
    onlineSpy.mockRestore();
  });
});
