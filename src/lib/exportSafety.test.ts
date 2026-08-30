import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppError } from './errors';
import {
  MAX_EXPORT_BYTES,
  assertExportWithinByteLimit,
  downloadUtf8File,
  exportErrorUserMessage,
  sanitizeCsvFormulaInjection,
  utf8ByteLength,
} from './exportSafety';

describe('sanitizeCsvFormulaInjection', () => {
  it('prefixes ASCII formula starters', () => {
    expect(sanitizeCsvFormulaInjection('=1+1')).toBe('\t=1+1');
    expect(sanitizeCsvFormulaInjection('+sum')).toBe('\t+sum');
    expect(sanitizeCsvFormulaInjection('-x')).toBe('\t-x');
    expect(sanitizeCsvFormulaInjection('@ref')).toBe('\t@ref');
    expect(sanitizeCsvFormulaInjection('\t=cmd')).toBe('\t\t=cmd');
    expect(sanitizeCsvFormulaInjection('\r=cmd')).toBe('\t\r=cmd');
  });

  it('prefixes leading-whitespace and BOM-hidden formulas', () => {
    expect(sanitizeCsvFormulaInjection(' =SUM(1)')).toBe('\t =SUM(1)');
    expect(sanitizeCsvFormulaInjection('\u00A0+cmd')).toBe('\t\u00A0+cmd');
    expect(sanitizeCsvFormulaInjection('\uFEFF=1+1')).toBe('\t=1+1');
    expect(sanitizeCsvFormulaInjection('\uFEFF  @HYPERLINK')).toBe('\t  @HYPERLINK');
  });

  it('prefixes Unicode lookalikes, pipe-DDE, and HTML-risk script tags', () => {
    expect(sanitizeCsvFormulaInjection('\uFF1D1+1')).toBe('\t\uFF1D1+1');
    expect(sanitizeCsvFormulaInjection('\uFF0Bcmd')).toBe('\t\uFF0Bcmd');
    expect(sanitizeCsvFormulaInjection('\uFF0D2+3')).toBe('\t\uFF0D2+3');
    expect(sanitizeCsvFormulaInjection('\uFF20ref')).toBe('\t\uFF20ref');
    expect(sanitizeCsvFormulaInjection('\u2212cmd')).toBe('\t\u2212cmd');
    expect(sanitizeCsvFormulaInjection("|cmd|' /C calc'!A0")).toBe("\t|cmd|' /C calc'!A0");
    expect(sanitizeCsvFormulaInjection('<script>alert(1)</script>')).toBe(
      "'&lt;script>alert(1)&lt;/script>",
    );
  });

  it('leaves safe strings unchanged', () => {
    expect(sanitizeCsvFormulaInjection('normal')).toBe('normal');
    expect(sanitizeCsvFormulaInjection(' PMID123')).toBe(' PMID123');
    expect(sanitizeCsvFormulaInjection('Title: results')).toBe('Title: results');
    expect(sanitizeCsvFormulaInjection('')).toBe('');
  });
});

describe('assertExportWithinByteLimit', () => {
  it('allows payloads at or under the 8 MiB ceiling', () => {
    expect(() => assertExportWithinByteLimit(MAX_EXPORT_BYTES)).not.toThrow();
    expect(() => assertExportWithinByteLimit(0)).not.toThrow();
  });

  it('rejects payloads over the 8 MiB ceiling as VALIDATION', () => {
    expect(() => assertExportWithinByteLimit(MAX_EXPORT_BYTES + 1)).toThrow(AppError);
    try {
      assertExportWithinByteLimit(MAX_EXPORT_BYTES + 1);
    } catch (error) {
      expect(error).toMatchObject({ code: 'VALIDATION', retryable: false, context: 'export' });
      expect(exportErrorUserMessage(error)).toMatch(/8 MiB/i);
    }
  });
});

describe('utf8ByteLength / downloadUtf8File', () => {
  const originalCreate = document.createElement.bind(document);
  const anchors: HTMLAnchorElement[] = [];

  beforeEach(() => {
    anchors.length = 0;
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = originalCreate(tag);
      if (tag === 'a') {
        vi.spyOn(el, 'click').mockImplementation(() => undefined);
        anchors.push(el as HTMLAnchorElement);
      }
      return el;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('counts UTF-8 bytes, not JS string length', () => {
    expect(utf8ByteLength('a')).toBe(1);
    expect(utf8ByteLength('ä')).toBe(2);
  });

  it('downloads in-budget text and skips the download when over budget', () => {
    vi.useFakeTimers();
    downloadUtf8File('ok', 't.csv', 'text/csv;charset=utf-8;');
    expect(anchors[0].click).toHaveBeenCalled();
    expect(anchors[0].download).toBe('t.csv');
    expect(document.body.contains(anchors[0])).toBe(true);
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock');
    expect(document.body.contains(anchors[0])).toBe(false);

    const oversized = 'x'.repeat(MAX_EXPORT_BYTES + 1);
    expect(() => downloadUtf8File(oversized, 'big.csv', 'text/csv;charset=utf-8;')).toThrow(
      AppError,
    );
    expect(anchors.length).toBe(1);
  });
});

describe('exportErrorUserMessage', () => {
  it('uses AppError.toUserMessage and never echoes raw Error.message', () => {
    expect(
      exportErrorUserMessage(new AppError({ code: 'VALIDATION', message: 'Title is required' })),
    ).toBe('Title is required');
    expect(exportErrorUserMessage(new Error('disk full /internal/endpoint'))).toMatch(
      /unexpected error/i,
    );
    expect(exportErrorUserMessage('nope')).toMatch(/unexpected error/i);
  });
});
