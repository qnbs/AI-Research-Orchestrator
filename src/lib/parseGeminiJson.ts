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
  return json.replace(/,\s*([}\]])/g, '$1');
}

type JsonContainer = 'object' | 'array';

function findBalancedJsonSegment(
  text: string,
  openChar: '{' | '[',
  closeChar: '}' | ']',
): string | null {
  const startIdx = text.indexOf(openChar);
  if (startIdx === -1) return null;

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
      if (depth === 0) return text.substring(startIdx, i + 1);
    }
  }

  return null;
}

function pickContainerType(text: string): JsonContainer | null {
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');

  if (firstBrace === -1 && firstBracket === -1) return null;
  if (firstBrace === -1) return 'array';
  if (firstBracket === -1) return 'object';
  return firstBrace < firstBracket ? 'object' : 'array';
}

function tryParse<T>(candidate: string): T | null {
  const attempts = [candidate, repairTrailingCommas(candidate)];
  for (const json of attempts) {
    try {
      return JSON.parse(json) as T;
    } catch {
      // try next repair
    }
  }
  return null;
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
  if (direct !== null) return direct;

  const container = pickContainerType(cleanText);
  if (container === 'object') {
    const segment = findBalancedJsonSegment(cleanText, '{', '}');
    if (segment) {
      const parsed = tryParse<T>(segment);
      if (parsed !== null) return parsed;
    }
  } else if (container === 'array') {
    const segment = findBalancedJsonSegment(cleanText, '[', ']');
    if (segment) {
      const parsed = tryParse<T>(segment);
      if (parsed !== null) return parsed;
    }
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
      if (parsed !== null) return parsed;
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
