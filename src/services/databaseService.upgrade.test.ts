import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, describe, expect, it } from 'vitest';
import { DEXIE_SCHEMA_VERSION } from '../lib/appVersionConstants';
import type { KnowledgeBaseEntry, ResearchEntry } from '../types';
import {
  addCollection,
  db,
  getAllCollections,
  getAllEntries,
  getAllPresets,
  getLatestResearchCheckpoints,
  getResearchCheckpoint,
  getSettings,
} from './databaseService';

const DB_NAME = 'AIResearchAppDatabase';

const V2_STORES = {
  knowledgeBaseEntries: 'id, timestamp, sourceType, title',
  settings: 'id',
  presets: 'id',
};

const V4_STORES = {
  knowledgeBaseEntries: 'id, timestamp, sourceType, title',
  settings: 'id',
  presets: 'id',
  collections: 'id, name, createdAt, updatedAt',
  researchCheckpoints: 'id, createdAt, topic, reason',
};

const liveArticle = {
  pmid: '12345678',
  title: 'Live aspirin trial',
  authors: 'A',
  journal: 'J',
  pubYear: '2020',
  summary: 'Aspirin reduces events',
  relevanceScore: 80,
  relevanceExplanation: '',
  keywords: [] as string[],
  isOpenAccess: false,
};

const demoArticle = {
  pmid: 'demo:aspirin-1',
  title: 'Demo aspirin',
  authors: 'A',
  journal: 'J',
  pubYear: '2020',
  summary: 'Aspirin reduces events',
  relevanceScore: 80,
  relevanceExplanation: '',
  keywords: [] as string[],
  isOpenAccess: false,
};

const researchInput = {
  researchTopic: 'aspirin',
  dateRange: 'any' as const,
  articleTypes: [] as string[],
  synthesisFocus: 'overview' as const,
  maxArticlesToScan: 10,
  topNToSynthesize: 5,
};

function expectResearch(entry: KnowledgeBaseEntry | undefined): ResearchEntry {
  expect(entry?.sourceType).toBe('research');
  if (entry?.sourceType !== 'research') {
    throw new Error(`expected research entry, got ${entry?.sourceType ?? 'undefined'}`);
  }
  return entry;
}

function liveReport(trustLevel: string, validationState: string, extraClaims: object[] = []) {
  return {
    generatedQueries: [],
    rankedArticles: [liveArticle],
    synthesis: 'live synthesis',
    aiGeneratedInsights: [],
    overallKeywords: [],
    groundedSynthesis: {
      mode: 'extractive-template',
      trustLevel,
      claims: [
        {
          text: 'Aspirin reduces events',
          pmids: ['12345678'],
          validationState,
        },
        ...extraClaims,
      ],
    },
  };
}

function demoReport(trustLevel: string, validationState: string) {
  return {
    generatedQueries: [],
    rankedArticles: [demoArticle],
    synthesis: 'demo synthesis',
    aiGeneratedInsights: [],
    overallKeywords: [],
    groundedSynthesis: {
      mode: 'extractive-template',
      trustLevel,
      claims: [
        {
          text: 'Aspirin reduces events',
          pmids: ['demo:aspirin-1'],
          validationState,
        },
      ],
    },
  };
}

function liveResearchEntry(id: string) {
  return {
    id,
    timestamp: 10,
    title: 'Live aspirin',
    sourceType: 'research',
    articles: [liveArticle],
    input: researchInput,
    report: liveReport('verified', 'verified'),
  };
}

function demoResearchEntry(id: string) {
  return {
    id,
    timestamp: 20,
    title: 'Demo aspirin',
    sourceType: 'research',
    articles: [demoArticle],
    input: researchInput,
    report: demoReport('verified', 'verified'),
  };
}

async function resetSingleton(): Promise<void> {
  if (db.isOpen()) {
    db.close();
  }
  await Dexie.delete(DB_NAME);
}

async function seedLegacyDatabase(
  version: 2 | 4 | 6,
  seed: (legacy: Dexie) => Promise<void>,
): Promise<void> {
  await resetSingleton();
  const legacy = new Dexie(DB_NAME);
  if (version === 2) {
    legacy.version(2).stores(V2_STORES);
  } else {
    legacy.version(version).stores(V4_STORES);
  }
  await legacy.open();
  try {
    await seed(legacy);
  } finally {
    legacy.close();
  }
  await db.open();
}

afterEach(async () => {
  if (db.isOpen()) {
    db.close();
  }
  await Dexie.delete(DB_NAME);
});

describe('databaseService Dexie upgrade transactions', () => {
  it('upgrades v2 → current: sibling tables survive and collections exist', async () => {
    await seedLegacyDatabase(2, async (legacy) => {
      await legacy.table('knowledgeBaseEntries').put(liveResearchEntry('kb-live'));
      await legacy.table('settings').put({ id: 'appSettings', appLanguage: 'de' });
      await legacy.table('presets').put({
        id: 'preset-legacy',
        name: 'Legacy preset',
        settings: researchInput,
      });
    });

    expect(db.verno).toBe(DEXIE_SCHEMA_VERSION);
    await expect(getSettings()).resolves.toMatchObject({ appLanguage: 'de' });
    const presets = await getAllPresets();
    expect(presets).toHaveLength(1);
    expect(presets[0]?.name).toBe('Legacy preset');

    await addCollection({
      id: 'col-after-upgrade',
      name: 'Post-upgrade',
      description: '',
      color: '#000000',
      icon: '📚',
      entryIds: [],
      articlePmids: [],
      createdAt: 1,
      updatedAt: 1,
      tags: [],
    });
    await expect(getAllCollections()).resolves.toHaveLength(1);

    const live = expectResearch((await getAllEntries()).find((entry) => entry.id === 'kb-live'));
    expect(live.articles[0]?.articleId).toEqual({ type: 'pmid', value: '12345678' });
    expect(live.report.groundedSynthesis?.trustLevel).toBe('corpus-supported');
    expect(live.report.groundedSynthesis?.claims[0]?.validationState).toBe('claim-supported');
    expect(live.report.groundedSynthesis?.claims[0]?.articleIds).toEqual([
      { type: 'pmid', value: '12345678' },
    ]);
  });

  it('upgrades v4 → current: hydrates ids, stamps demo quarantine, rewrites trust', async () => {
    await seedLegacyDatabase(4, async (legacy) => {
      await legacy.table('knowledgeBaseEntries').bulkPut([
        {
          ...liveResearchEntry('kb-live'),
          report: liveReport('verified', 'verified', [{ text: 'orphan claim' }]),
        },
        demoResearchEntry('demo-research-aspirin'),
        {
          id: 'author-1',
          timestamp: 30,
          title: 'Author Smith',
          sourceType: 'author',
          articles: [liveArticle],
          input: { authorName: 'Smith' },
          profile: { name: 'Smith' },
        },
        {
          id: 'poison-kb',
          timestamp: 40,
          title: 'Poison',
          sourceType: 'research',
          articles: [null],
          input: researchInput,
          report: liveReport('verified', 'verified'),
        },
      ]);
      await legacy.table('collections').put({
        id: 'col-legacy',
        name: 'Legacy collection',
        description: '',
        color: '#336699',
        icon: '📚',
        entryIds: [],
        articlePmids: [],
        createdAt: 1,
        updatedAt: 1,
        tags: [],
      });
      await legacy.table('researchCheckpoints').bulkPut([
        {
          id: 'ckpt-live',
          createdAt: 100,
          updatedAt: 100,
          reason: 'abort',
          phase: 'Phase 3',
          topic: 'aspirin',
          input: researchInput,
          report: liveReport('verified', 'verified'),
          synthesisSoFar: 'partial live',
        },
        {
          id: 'ckpt-demo',
          createdAt: 200,
          updatedAt: 200,
          reason: 'abort',
          phase: 'Phase 3',
          topic: 'demo aspirin',
          input: researchInput,
          report: demoReport('verified', 'verified'),
          synthesisSoFar: 'partial demo',
        },
        {
          id: 'ckpt-poison',
          createdAt: 50,
          updatedAt: 50,
          reason: 'error',
          phase: 'Phase 1',
          topic: 'poison',
          input: researchInput,
          report: { rankedArticles: undefined, synthesis: 'x' },
          synthesisSoFar: 'x',
        },
        {
          id: 'ckpt-empty',
          createdAt: 60,
          updatedAt: 60,
          reason: 'manual',
          phase: 'Phase 1',
          topic: 'empty',
          input: researchInput,
          report: null,
          synthesisSoFar: '',
        },
      ]);
    });

    expect(db.verno).toBe(DEXIE_SCHEMA_VERSION);

    const entries = await getAllEntries();
    expect(entries.map((entry) => entry.id).sort()).toEqual([
      'author-1',
      'demo-research-aspirin',
      'kb-live',
      'poison-kb',
    ]);

    const live = expectResearch(entries.find((entry) => entry.id === 'kb-live'));
    expect(live.articles[0]?.articleId).toEqual({ type: 'pmid', value: '12345678' });
    expect(live.report.rankedArticles[0]?.articleId).toEqual({ type: 'pmid', value: '12345678' });
    expect(live.report.corpusClass).not.toBe('demo-only');
    expect(live.report.groundedSynthesis?.trustLevel).toBe('corpus-supported');
    expect(live.report.groundedSynthesis?.claims[0]?.validationState).toBe('claim-supported');
    expect(live.report.groundedSynthesis?.claims[1]).toMatchObject({ text: 'orphan claim' });
    expect(live.report.groundedSynthesis?.claims[1]?.articleIds).toBeUndefined();

    const demo = expectResearch(entries.find((entry) => entry.id === 'demo-research-aspirin'));
    expect(demo.articles[0]?.sourceClass).toBe('demo-synthetic');
    expect(demo.articles[0]?.articleId).toEqual({ type: 'demo', value: 'aspirin-1' });
    expect(demo.report.corpusClass).toBe('demo-only');
    expect(demo.report.retrievalOutcome).toBe('educational_demo');
    expect(demo.report.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    expect(demo.input.educationalDemoMode).toBe(true);

    const author = entries.find((entry) => entry.id === 'author-1');
    expect(author?.articles[0]?.articleId).toEqual({ type: 'pmid', value: '12345678' });

    const poison = expectResearch(entries.find((entry) => entry.id === 'poison-kb'));
    expect(poison.articles).toEqual([null]);
    expect(poison.report.groundedSynthesis?.trustLevel).toBe('corpus-supported');

    const collections = await getAllCollections();
    expect(collections[0]?.name).toBe('Legacy collection');

    const liveCkpt = await getResearchCheckpoint('ckpt-live');
    expect(liveCkpt?.report?.rankedArticles[0]?.articleId).toEqual({
      type: 'pmid',
      value: '12345678',
    });
    expect(liveCkpt?.report?.groundedSynthesis?.trustLevel).toBe('corpus-supported');

    const demoCkpt = await getResearchCheckpoint('ckpt-demo');
    expect(demoCkpt?.report?.corpusClass).toBe('demo-only');
    expect(demoCkpt?.report?.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    expect(demoCkpt?.report?.rankedArticles[0]?.sourceClass).toBe('demo-synthetic');

    await expect(getResearchCheckpoint('ckpt-empty')).resolves.toMatchObject({
      id: 'ckpt-empty',
      report: null,
    });
    await expect(getResearchCheckpoint('ckpt-poison')).resolves.toMatchObject({
      id: 'ckpt-poison',
      synthesisSoFar: 'x',
    });

    const latest = await getLatestResearchCheckpoints(10);
    expect(latest.map((checkpoint) => checkpoint.id)).toEqual([
      'ckpt-demo',
      'ckpt-live',
      'ckpt-empty',
      'ckpt-poison',
    ]);
  });

  it('upgrades v6 → current: live verified becomes corpus-supported; demo stays demoted', async () => {
    await seedLegacyDatabase(6, async (legacy) => {
      await legacy.table('knowledgeBaseEntries').bulkPut([
        {
          ...liveResearchEntry('kb-live'),
          articles: [{ ...liveArticle, articleId: { type: 'pmid', value: '12345678' } }],
        },
        {
          ...demoResearchEntry('demo-research-aspirin'),
          articles: [
            {
              ...demoArticle,
              sourceClass: 'demo-synthetic',
              articleId: { type: 'demo', value: 'aspirin-1' },
            },
          ],
          input: { ...researchInput, educationalDemoMode: true },
          report: {
            ...demoReport('narrative-draft', 'verified'),
            corpusClass: 'demo-only',
            retrievalOutcome: 'educational_demo',
            rankedArticles: [
              {
                ...demoArticle,
                sourceClass: 'demo-synthetic',
                articleId: { type: 'demo', value: 'aspirin-1' },
              },
            ],
          },
        },
      ]);
      await legacy.table('researchCheckpoints').put({
        id: 'ckpt-live',
        createdAt: 100,
        updatedAt: 100,
        reason: 'abort',
        phase: 'Phase 3',
        topic: 'aspirin',
        input: researchInput,
        report: liveReport('verified', 'verified'),
        synthesisSoFar: 'partial',
      });
    });

    const live = expectResearch((await getAllEntries()).find((entry) => entry.id === 'kb-live'));
    expect(live.report.groundedSynthesis?.trustLevel).toBe('corpus-supported');
    expect(live.report.groundedSynthesis?.claims[0]?.validationState).toBe('claim-supported');

    const demo = expectResearch(
      (await getAllEntries()).find((entry) => entry.id === 'demo-research-aspirin'),
    );
    expect(demo.report.corpusClass).toBe('demo-only');
    expect(demo.report.groundedSynthesis?.trustLevel).toBe('narrative-draft');
    expect(demo.input.educationalDemoMode).toBe(true);

    const ckpt = await getResearchCheckpoint('ckpt-live');
    expect(ckpt?.report?.groundedSynthesis?.trustLevel).toBe('corpus-supported');
  });
});
