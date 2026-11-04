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

export const buildCollectionPortablePayload = (
  collection: ResearchCollection,
): CollectionPortablePayload => ({
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
});

export const serializeCollectionPortablePayload = (payload: CollectionPortablePayload): string =>
  JSON.stringify(payload, null, 2);
