import { describe, expect, it } from 'vitest';
import { assertJsonRecord, GeminiJsonParseError, parseGeminiResponseJson } from './parseGeminiJson';

describe('parseGeminiResponseJson', () => {
  it('parses raw JSON object', () => {
    expect(parseGeminiResponseJson<{ a: number }>('{"a":1}')).toEqual({ a: 1 });
  });

  it('unwraps markdown json fences', () => {
    const text = '```json\n{"x":"y"}\n```';
    expect(parseGeminiResponseJson<{ x: string }>(text)).toEqual({ x: 'y' });
  });

  it('extracts JSON object from surrounding text', () => {
    const text = 'Here you go: {"k": true} thanks';
    expect(parseGeminiResponseJson<{ k: boolean }>(text)).toEqual({ k: true });
  });

  it('parses JSON arrays', () => {
    expect(parseGeminiResponseJson<number[]>('[1,2,3]')).toEqual([1, 2, 3]);
  });

  it('handles braces inside JSON strings', () => {
    const text = '{"msg": "use {curly} carefully", "ok": true}';
    expect(parseGeminiResponseJson<{ ok: boolean }>(text).ok).toBe(true);
  });

  it('repairs trailing commas', () => {
    const text = '{"a": 1, "b": 2,}';
    expect(parseGeminiResponseJson<{ a: number; b: number }>(text)).toEqual({ a: 1, b: 2 });
  });

  it('throws GeminiJsonParseError on empty input', () => {
    expect(() => parseGeminiResponseJson('')).toThrow(GeminiJsonParseError);
    expect(() => parseGeminiResponseJson('   ')).toThrow(/Empty response/);
  });

  it('throws on prose-only output', () => {
    expect(() => parseGeminiResponseJson('Sure, here is my analysis without JSON.')).toThrow(
      GeminiJsonParseError,
    );
  });
});

describe('assertJsonRecord', () => {
  it('accepts plain objects', () => {
    const v = parseGeminiResponseJson('{"x":1}');
    expect(() => assertJsonRecord(v)).not.toThrow();
  });

  it('rejects arrays', () => {
    expect(() => assertJsonRecord([1, 2])).toThrow(GeminiJsonParseError);
  });
});
