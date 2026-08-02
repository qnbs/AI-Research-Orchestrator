import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { batchPmids, parsePubMedEfetchXml } from './pubmedXmlParser';

const fixture = (name: string) =>
  readFileSync(join(process.cwd(), 'src/services/fixtures/pubmed', name), 'utf-8');

describe('parsePubMedEfetchXml', () => {
  it('parses plain abstract', () => {
    const map = parsePubMedEfetchXml(fixture('plain-abstract.xml'));
    const rec = map.get('100001');
    expect(rec).toMatchObject({
      abstractStatus: 'available',
      abstract: 'This is a plain abstract without labels.',
      doi: '10.1000/example.1',
    });
    expect(rec?.publicationTypes).toContain('Journal Article');
  });

  it('parses structured abstract with labels', () => {
    const map = parsePubMedEfetchXml(fixture('structured-abstract.xml'));
    const rec = map.get('100002');
    expect(rec?.abstractStatus).toBe('structured');
    expect(rec?.abstract).toContain('BACKGROUND: Background section text.');
    expect(rec?.publicationTypes).toEqual(
      expect.arrayContaining(['Journal Article', 'Randomized Controlled Trial']),
    );
  });

  it('marks missing abstract explicitly', () => {
    const map = parsePubMedEfetchXml(fixture('no-abstract.xml'));
    const rec = map.get('100003');
    expect(rec?.abstractStatus).toBe('missing');
    expect(rec?.abstract).toBeUndefined();
  });

  it('handles malformed partial payload without throwing', () => {
    const map = parsePubMedEfetchXml(fixture('malformed-partial.xml'));
    expect(map.get('100004')?.abstractStatus).toBe('missing');
  });

  it('parses mixed valid/missing PMIDs in one batch', () => {
    const map = parsePubMedEfetchXml(fixture('mixed-batch.xml'));
    expect(map.get('100001')?.abstractStatus).toBe('available');
    expect(map.get('100003')?.abstractStatus).toBe('missing');
  });
});

describe('batchPmids', () => {
  it('splits into fixed-size batches', () => {
    const ids = Array.from({ length: 205 }, (_, i) => String(i + 1));
    const batches = batchPmids(ids, 200);
    expect(batches).toHaveLength(2);
    expect(batches[0].length).toBe(200);
    expect(batches[1].length).toBe(5);
  });
});
