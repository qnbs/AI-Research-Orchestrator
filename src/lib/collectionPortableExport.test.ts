import { describe, it, expect } from 'vitest';
import type { ResearchCollection } from '../types';
import {
  buildCollectionPortablePayload,
  serializeCollectionPortablePayload,
} from './collectionPortableExport';

const col: ResearchCollection = {
  id: 'c1',
  name: 'Oncology',
  description: 'Trials',
  color: '#fff',
  icon: '📚',
  entryIds: ['e1'],
  articlePmids: ['123'],
  createdAt: 1,
  updatedAt: 2,
  tags: ['tag'],
};

describe('collectionPortableExport', () => {
  it('builds schemaVersion 1 payload without id or shareToken', () => {
    const payload = buildCollectionPortablePayload(col);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.collection.name).toBe('Oncology');
    expect(payload.collection.entryIds).toEqual(['e1']);
    expect(JSON.stringify(payload)).not.toContain('shareToken');
    expect(JSON.stringify(payload)).not.toContain('"id"');
  });

  it('serializes to pretty JSON', () => {
    const text = serializeCollectionPortablePayload(buildCollectionPortablePayload(col));
    expect(text).toContain('"schemaVersion": 1');
    expect(text).toContain('"entryIds"');
  });
});
