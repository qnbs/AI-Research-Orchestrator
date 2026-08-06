import { describe, it, expect } from 'vitest';
import { stripMarkdown } from './ReportDisplay';

// marked wraps a single line in a block-level <p>, which DOMPurify's fragment
// textContent carries through as a trailing newline - harmless for the
// clipboard-copy use case this feeds (ReportDisplay.tsx never trims it either),
// but real, so assertions trim it to isolate the property under test.
const strip = (markdown: string) => stripMarkdown(markdown).trim();

describe('stripMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(stripMarkdown('')).toBe('');
  });

  it('strips markdown formatting to plain text', () => {
    expect(strip('**Bold** and _italic_ text')).toBe('Bold and italic text');
  });

  it('strips a real HTML tag embedded in markdown (not just markdown syntax)', () => {
    expect(strip('Safe title <b>Bold</b> markup')).toBe('Safe title Bold markup');
  });

  it('decodes HTML entities via the RETURN_DOM_FRAGMENT path', () => {
    // "&amp;" must decode to a literal "&" (proving DOMPurify's
    // RETURN_DOM_FRAGMENT + .textContent still decodes entities like the old
    // innerHTML-readback path did), not survive as the literal "&amp;" text.
    expect(strip('Risk &amp; benefit of therapy')).toBe('Risk & benefit of therapy');
  });

  it('leaves HTML-entity-encoded angle brackets as inert decoded text, never re-parsed as a tag', () => {
    // Entity references decode at the character level during parsing, not as a
    // second reparse pass over the result - "&lt;script&gt;" becomes the literal
    // characters "<script>" as plain text content, never a real, strippable
    // <script> element. The output is only ever written to the clipboard as
    // plain text (navigator.clipboard.writeText), so decoded angle brackets can
    // never execute, only display.
    expect(strip('Safe title &lt;script&gt;alert(1)&lt;/script&gt;')).toBe(
      'Safe title <script>alert(1)</script>',
    );
  });

  it('strips a real <script> tag and its content entirely', () => {
    const result = stripMarkdown('Before <script>alert(1)</script> after');
    expect(result).not.toContain('<script');
    expect(result).not.toContain('alert(1)');
    expect(result).toContain('Before');
    expect(result).toContain('after');
  });
});
