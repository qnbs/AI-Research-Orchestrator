import { describe, expect, it } from 'vitest';
import { filterHelpTopics } from './HelpView';
import type { HelpTopic } from './help/helpContent';

const topics: HelpTopic[] = [
  {
    title: 'Using the Orchestrator',
    keywords: 'workflow agents review',
    content: 'Plan a large PubMed synthesis.',
  },
  {
    title: 'Knowledge Base',
    keywords: 'library storage',
    content: 'Saved articles stay in IndexedDB through Dexie.',
  },
  {
    title: 'Author Hub',
    keywords: 'researcher profile',
    content: 'Map collaborations and publication themes.',
  },
];

describe('filterHelpTopics', () => {
  it('matches guide topics case-insensitively by title, keywords, and content text', () => {
    expect(filterHelpTopics(topics, 'orchestrator')).toEqual([topics[0]]);
    expect(filterHelpTopics(topics, 'AGENTS')).toEqual([topics[0]]);
    expect(filterHelpTopics(topics, 'indexeddb')).toEqual([topics[1]]);
  });

  it('returns all topics for an empty or whitespace-only search term', () => {
    expect(filterHelpTopics(topics, '   ')).toBe(topics);
  });
});
