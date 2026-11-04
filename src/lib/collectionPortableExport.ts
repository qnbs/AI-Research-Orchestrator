import type { ResearchCollection } from '../types';

/** Portable collection metadata for manual copy/export (no server sync). */
export type CollectionPortablePayload = {
  schemaVersion: 1;
  exportedAt: string;
  collection: Pick<
    ResearchCollection,
    'name' | 'description' | 'color' | 'icon' | 'tags' | 'entryIds' | 'articlePmids'
  >;
};

export function buildCollectionPortablePayload(
  collection: ResearchCollection,
): CollectionPortablePayload {
  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    collection: {
      name: collection.name,
      description: collection.description,
      color: collection.color,
      icon: collection.icon,
      tags: collection.tags,
      entryIds: collection.entryIds,
      articlePmids: collection.articlePmids,
    },
  };
}

export function serializeCollectionPortablePayload(payload: CollectionPortablePayload): string {
  return JSON.stringify(payload, null, 2);
}
