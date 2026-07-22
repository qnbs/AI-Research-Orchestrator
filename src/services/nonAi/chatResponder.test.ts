import { describe, it, expect } from 'vitest';
import type { ResearchReport } from '../../types';
import {
  generateResearchAnalysisHeuristic,
  findRelatedOnlineHeuristic,
  answerFromReport,
  createHeuristicChatSession,
} from './chatResponder';

function makeReport(overrides: Partial<ResearchReport> = {}): ResearchReport {
  return {
    generatedQueries: [{ query: 'aspirin', explanation: '' }],
    rankedArticles: [
      {
        pmid: '12345678',
        title: 'Aspirin for cardiovascular prevention',
        authors: 'Chen L',
        journal: 'The Lancet',
        pubYear: '2023',
        summary: 'Aspirin reduces cardiovascular events but increases bleeding risk.',
        relevanceScore: 90,
        relevanceExplanation: '',
        keywords: ['aspirin', 'cardiovascular'],
        isOpenAccess: true,
      },
    ],
    synthesis: '## TL;DR\n\nAspirin has mixed benefits for primary prevention.',
    aiGeneratedInsights: [
      {
        question: 'What are the risks of aspirin?',
        answer: 'Increased bleeding risk in low-risk populations.',
        supportingArticles: ['1'],
      },
    ],
    overallKeywords: [{ keyword: 'aspirin', frequency: 3 }],
    ...overrides,
  };
}

describe('generateResearchAnalysisHeuristic', () => {
  it('produces a summary, key findings, and a synthesized topic', () => {
    const analysis = generateResearchAnalysisHeuristic('aspirin cardiovascular prevention');
    expect(analysis.summary).toContain('Heuristic mode');
    expect(analysis.synthesizedTopic.length).toBeGreaterThan(0);
  });
});

describe('findRelatedOnlineHeuristic', () => {
  it('is honest about lacking live web search', () => {
    const result = findRelatedOnlineHeuristic('gene therapy');
    expect(result.summary).toMatch(/live web|search grounding/i);
    expect(result.sources).toEqual([]);
  });
});

describe('answerFromReport', () => {
  it('greets on a simple hello', () => {
    const answer = answerFromReport(makeReport(), 'hello');
    expect(answer).toMatch(/Hello/);
  });

  it('returns a prompt for an empty question', () => {
    const answer = answerFromReport(makeReport(), '   ');
    expect(answer).toMatch(/ask a question/i);
  });

  it('answers a PMID-specific question from ranked articles', () => {
    const answer = answerFromReport(makeReport(), 'Tell me about PMID 12345678');
    expect(answer).toContain('Aspirin for cardiovascular prevention');
  });

  it('reports an honest miss for an unknown PMID', () => {
    const answer = answerFromReport(makeReport(), 'What about PMID 99999?');
    expect(answer).toMatch(/not in this report/i);
  });

  it('lists overall keywords on request', () => {
    const answer = answerFromReport(makeReport(), 'What are the keywords?');
    expect(answer).toContain('aspirin (3)');
  });

  it('lists top ranked articles on request', () => {
    const answer = answerFromReport(makeReport(), 'List the top articles');
    expect(answer).toContain('Aspirin for cardiovascular prevention');
  });

  it('returns the synthesis for a summary request', () => {
    const answer = answerFromReport(makeReport(), 'Give me a summary');
    expect(answer).toContain('TL;DR');
  });

  it('grounds an answer in the closest matching insight', () => {
    // Deliberately avoids "aspirin"/synthesis-overlapping words so the synthesis-match
    // branch (checked first) doesn't win over the more specific insight match.
    const answer = answerFromReport(
      makeReport(),
      'What is the bleeding risk in low-risk populations?',
    );
    expect(answer).toMatch(/bleeding risk/i);
  });

  it('prefers a strong insight match over a weaker synthesis overlap on the same question', () => {
    // Overlaps "aspirin" with both the synthesis and the insight, but shares far more
    // tokens ("risks"/"bleeding") with the insight — the insight must win, not the
    // synthesis branch just because it's checked first.
    const answer = answerFromReport(makeReport(), 'What are the risks of aspirin and bleeding?');
    expect(answer).toMatch(/bleeding risk in low-risk populations/i);
    expect(answer).not.toContain('TL;DR');
  });

  it('refuses to invent external knowledge when nothing matches', () => {
    const answer = answerFromReport(makeReport(), 'Tell me about quantum computing');
    expect(answer).toMatch(/could not ground/i);
  });
});

describe('createHeuristicChatSession', () => {
  it('streams the same answer answerFromReport would produce, in chunks', async () => {
    const report = makeReport();
    const session = createHeuristicChatSession(report);
    const stream = await session.sendMessageStream({ message: 'hello' });
    let full = '';
    for await (const chunk of stream) {
      full += chunk.text ?? '';
    }
    expect(full).toBe(answerFromReport(report, 'hello'));
  });
});
