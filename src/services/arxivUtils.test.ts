import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { searchAndFetchArxiv } from './arxivUtils';

const atom = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>http://arxiv.org/abs/2301.99999v1</id>
    <title> Test Title </title>
    <summary> Abstract here. </summary>
    <published>2023-01-15T12:00:00Z</published>
    <author><name>Jane Doe</name></author>
    <category term="cs.AI"/>
  </entry>
</feed>`;

describe('arxivUtils', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.spyOn(AbortSignal, 'timeout').mockImplementation(() => new AbortController().signal);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('searchAndFetchArxiv maps Atom entries', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => atom,
    });

    const rows = await searchAndFetchArxiv('quantum', 5);
    expect(rows).toHaveLength(1);
    expect(rows[0].pmid).toBe('arxiv:2301.99999');
    expect(rows[0].title).toContain('Test Title');
  });

  it('returns empty array on non-OK HTTP without long retry', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 });
    await expect(searchAndFetchArxiv('x', 1)).resolves.toEqual([]);
  });
});
