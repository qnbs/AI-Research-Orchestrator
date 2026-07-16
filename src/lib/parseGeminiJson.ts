/**
 * Robust JSON extraction from Gemini / LLM text (markdown fences, chatter, truncated output).
 * String-aware brace counting avoids false positives when `{` appears inside JSON strings.
 */

export class GeminiJsonParseError extends Error {
  constructor(
    message: string,
    readonly rawPreview?: string,
  ) {
    super(message);
    this.name = 'GeminiJsonParseError';
  }
}

function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function unwrapMarkdownFences(text: string): string {
  let out = text.replace(/```json\s*([\s\S]*?)\s*```/gi, '$1');
  out = out.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
  return out.trim();
}

/** Remove trailing commas before `}` or `]` (common LLM mistake). */
function repairTrailingCommas(json: string): string {
  let out = '';
  let inString = false;
  let escaped = false;

  for (let i = 0; i < json.length; i++) {
    const ch = json[i];

    if (inString) {
      out += ch;
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }

    if (ch === ',') {
      let j = i + 1;
      while (/\s/.test(json[j] ?? '')) j++;
      if (json[j] === '}' || json[j] === ']') {
        continue;
      }
    }

    out += ch;
  }

  return out;
}

type JsonContainer = 'object' | 'array';
type ParseResult<T> = { ok: true; value: T } | { ok: false };

function* findBalancedJsonSegments(
  text: string,
  openChar: '{' | '[',
  closeChar: '}' | ']',
): Generator<string> {
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const startIdx = text.indexOf(openChar, searchFrom);
    if (startIdx === -1) return;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = startIdx; i < text.length; i++) {
      const ch = text[i];

      if (inString) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (ch === '\\') {
          escaped = true;
          continue;
        }
        if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === openChar) depth++;
      else if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          yield text.substring(startIdx, i + 1);
          break;
        }
      }
    }

    searchFrom = startIdx + 1;
  }
}

function pickContainerType(text: string): JsonContainer | null {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBrace === -1) return 'array';
  if (firstBracket === -1) return 'object';
  return firstBrace < firstBracket ? 'object' : 'array';
}

function tryParse<T>(candidate: string): ParseResult<T> {
  const attempts = [candidate, repairTrailingCommas(candidate)];
  for (const json of attempts) {
    try {
      return { ok: true, value: JSON.parse(json) as T };
    } catch {
      // try next repair
    }
  }
  return { ok: false };
}

function tryParseBalancedSegments<T>(
  text: string,
  openChar: '{' | '[',
  closeChar: '}' | ']',
): ParseResult<T> {
  for (const segment of findBalancedJsonSegments(text, openChar, closeChar)) {
    const parsed = tryParse<T>(segment);
    if (parsed.ok) return parsed;
  }
  return { ok: false };
}

/**
 * Parses JSON from AI response text. Throws {@link GeminiJsonParseError} on failure.
 */
export function parseGeminiResponseJson<T>(text: string): T {
  if (!text?.trim()) {
    throw new GeminiJsonParseError('Empty response from AI');
  }

  const cleanText = unwrapMarkdownFences(stripBom(text));

  const direct = tryParse<T>(cleanText);
  if (direct.ok) return direct.value;

  const container = pickContainerType(cleanText);
  if (container === 'object') {
    const parsed = tryParseBalancedSegments<T>(cleanText, '{', '}');
    if (parsed.ok) return parsed.value;
  } else if (container === 'array') {
    const parsed = tryParseBalancedSegments<T>(cleanText, '[', ']');
    if (parsed.ok) return parsed.value;
  }

  // Fallback: slice from first container char to last closing char
  const firstBrace = cleanText.indexOf('{');
  const firstBracket = cleanText.indexOf('[');
  const startIdx =
    firstBrace === -1
      ? firstBracket
      : firstBracket === -1
        ? firstBrace
        : Math.min(firstBrace, firstBracket);

  if (startIdx !== -1) {
    const openChar = cleanText[startIdx];
    const lastClose = openChar === '{' ? cleanText.lastIndexOf('}') : cleanText.lastIndexOf(']');
    if (lastClose > startIdx) {
      const sliced = cleanText.substring(startIdx, lastClose + 1);
      const parsed = tryParse<T>(sliced);
      if (parsed.ok) return parsed.value;
    }
  }

  const preview = cleanText.length > 200 ? `${cleanText.slice(0, 200)}…` : cleanText;
  if (process.env.NODE_ENV !== 'production') {
    console.error('CRITICAL: Could not parse JSON from AI response.', cleanText);
  }
  throw new GeminiJsonParseError(
    'AI response did not contain valid JSON. The model may have been interrupted or returned prose instead of structured data.',
    preview,
  );
}

/**
 * Optional runtime guard when a minimal shape is required (no external schema lib).
 */
export function assertJsonRecord(
  value: unknown,
  label = 'response',
): asserts value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new GeminiJsonParseError(`Expected ${label} to be a JSON object.`);
  }
}
