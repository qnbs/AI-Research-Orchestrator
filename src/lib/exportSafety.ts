/**
 * Spreadsheet formula-injection sanitization and a hard UTF-8 byte cap for
 * client-side downloads (CSV, JSON, citations, PDF).
 *
 * The 8 MiB ceiling matches the Ollama stream body bound so a single export
 * cannot hang the tab. Formula detection covers OWASP CSV starters plus
 * leading whitespace/BOM, Unicode lookalikes, pipe-DDE, and HTML-risk `<`.
 */

import { translateSync } from '../i18n/translate';
import { AppError, isAppError } from './errors';

/** Same 8 MiB bound as Ollama NDJSON stream bodies. */
export const MAX_EXPORT_BYTES = 8 * 1024 * 1024;

/**
 * Characters that make a spreadsheet treat the cell as a formula or DDE
 * payload, or that start an HTML tag if the CSV is mis-opened as a page.
 */
const FORMULA_STARTERS = new Set<string>([
  '=',
  '+',
  '-',
  '@',
  '\t',
  '\r',
  '\n',
  '|',
  '<',
  '\uFF1D', // fullwidth equals
  '\uFF0B', // fullwidth plus
  '\uFF0D', // fullwidth hyphen-minus
  '\uFF20', // fullwidth commercial at
  '\u2212', // minus sign
]);

/** BOM, Unicode spaces, and zero-width chars that can hide a formula starter. */
const LEADING_JUNK =
  /^[\uFEFF\s\u00A0\u1680\u180E\u2000-\u200D\u2028\u2029\u202F\u205F\u2060\u3000\uFEFF]+/;

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function assertExportWithinByteLimit(byteLength: number, context = 'export'): void {
  if (byteLength > MAX_EXPORT_BYTES) {
    throw new AppError({
      code: 'VALIDATION',
      message: translateSync('errors.code.exportTooLarge'),
      retryable: false,
      context,
    });
  }
}

/**
 * Prefix cells that could be interpreted as spreadsheet formulas.
 * Leading BOM/whitespace is stripped for detection but preserved in the
 * prefixed payload so the original text remains recoverable.
 */
export function sanitizeCsvFormulaInjection(value: string): string {
  const original = String(value ?? '');
  const withoutBom = original.replace(/^\uFEFF+/, '');
  const significant = withoutBom.replace(LEADING_JUNK, '');
  const first = significant.charAt(0);
  if (first && FORMULA_STARTERS.has(first)) {
    return `\t${withoutBom}`;
  }
  return original;
}

/** Blob-download a UTF-8 payload after the byte-cap check. */
export function downloadUtf8File(content: string, filename: string, mimeType: string): void {
  assertExportWithinByteLimit(utf8ByteLength(content));
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  // Revoke on the next macrotask so browsers that start the download
  // asynchronously still have a live blob URL (detached + immediate revoke
  // can drop the file).
  window.setTimeout(() => {
    link.remove();
    URL.revokeObjectURL(url);
  }, 0);
}

/** User-facing export failure text (translated AppError, else Error.message). */
export function exportErrorUserMessage(error: unknown): string {
  if (isAppError(error)) return error.toUserMessage();
  if (error instanceof Error && error.message) return error.message;
  return translateSync('errors.code.unknown');
}
