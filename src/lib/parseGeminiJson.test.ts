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

  it('strips a leading BOM before parsing', () => {
    const withBom = `\uFEFF{"a":1}`;
    expect(parseGeminiResponseJson<{ a: number }>(withBom)).toEqual({ a: 1 });
  });

  it('picks the array container when it appears before any object', () => {
    const text = 'Result: [1, 2, {"nested": true}] end';
    expect(parseGeminiResponseJson<unknown[]>(text)).toEqual([1, 2, { nested: true }]);
  });

  it('ignores a stray unmatched closing brace after the real JSON object', () => {
    // Depth-based scanning should stop as soon as the first object is balanced,
    // regardless of trailing noise that itself contains brace characters.
    const text = 'noise { "a": 1, "b": 2 } trailing } more noise';
    const result = parseGeminiResponseJson<{ a: number; b: number }>(text);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('throws on truncated/interrupted JSON with no closing brace', () => {
    // Simulates a model response cut off mid-stream (unbalanced braces).
    const text = 'Here is the JSON: { "a": 1, "b": { "c": 2';
    expect(() => parseGeminiResponseJson(text)).toThrow(GeminiJsonParseError);
  });

  it('attaches a truncated rawPreview on failure for long unparsable text', () => {
    const longText = 'x'.repeat(300);
    try {
      parseGeminiResponseJson(longText);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(GeminiJsonParseError);
      const parseErr = err as GeminiJsonParseError;
      expect(parseErr.rawPreview?.length).toBeLessThanOrEqual(201);
      expect(parseErr.rawPreview).toMatch(/…$/);
    }
  });

  it('repairs trailing commas inside nested arrays', () => {
    const text = '{"items": [1, 2, 3,], "done": true,}';
    expect(parseGeminiResponseJson<{ items: number[]; done: boolean }>(text)).toEqual({
      items: [1, 2, 3],
      done: true,
    });
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

  it('rejects null and primitives', () => {
    expect(() => assertJsonRecord(null)).toThrow(GeminiJsonParseError);
    expect(() => assertJsonRecord('a string')).toThrow(GeminiJsonParseError);
    expect(() => assertJsonRecord(42)).toThrow(GeminiJsonParseError);
  });

  it('includes the provided label in the error message', () => {
    expect(() => assertJsonRecord([1], 'ranking result')).toThrow(/ranking result/);
  });
});
