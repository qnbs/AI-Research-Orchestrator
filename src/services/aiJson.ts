/**
 * Shared JSON generation + prompt preamble for the AI feature façade (ADR 0008).
 * Kept out of `geminiService.ts` so live orchestration and literature tools
 * can call the same helper without growing the public façade past the file cap.
 */
import type { Settings } from '../types';
import { getProviderForSettings } from './providers/factory';
import type { AIContentRequest, AIJsonSchema } from './providers/types';
import { resolveApprovedBaseUrl } from '../lib/endpointPolicy';
import {
  UNTRUSTED_DATA_SYSTEM_RULE,
  withUntrustedDataSystemRule,
} from '../lib/untrustedDataFraming';
import {
  parseGeminiResponseJson as parseGeminiJsonCore,
  GeminiJsonParseError,
} from '../lib/parseGeminiJson';
import { AppError, isAbortError, throwIfAborted } from '../lib/errors';
import { PromptId, promptTag, type PromptIdValue } from '../lib/promptRegistry';
import { safeLogError } from '../lib/safeLog';

const ARRAY_WRAP_KEY = 'items';

function isRootArraySchema(schema: AIJsonSchema | undefined): boolean {
  return schema?.type === 'array';
}

/** json_object mode cannot emit a root array — wrap as `{ items: [...] }` for those providers. */
function wrapRootArraySchema(schema: AIJsonSchema): AIJsonSchema {
  return {
    type: 'object',
    properties: { [ARRAY_WRAP_KEY]: schema },
    required: [ARRAY_WRAP_KEY],
  };
}

function unwrapRootArrayJson<T>(parsed: unknown): T {
  if (Array.isArray(parsed)) return parsed as T;
  if (
    parsed !== null &&
    typeof parsed === 'object' &&
    ARRAY_WRAP_KEY in parsed &&
    Array.isArray((parsed as { items: unknown }).items)
  ) {
    return (parsed as { items: T }).items;
  }
  throw new AppError({
    code: 'GEMINI_PARSE_FAILURE',
    message: 'Expected a JSON array (or {items: [...]}) from the model.',
    retryable: true,
  });
}

function abortAsStreamAborted(error: unknown): never {
  if (error instanceof AppError && error.code === 'STREAM_ABORTED') throw error;
  throw new AppError({
    code: 'STREAM_ABORTED',
    message: 'Aborted',
    retryable: false,
    cause: error,
  });
}

/** Helper to call a single-shot provider generation with JSON parsing. */
export async function generateJson<T>(
  aiSettings: Settings['ai'],
  request: Omit<AIContentRequest, 'json'>,
  signal?: AbortSignal,
): Promise<T> {
  const provider = await getProviderForSettings(aiSettings);
  throwIfAborted(signal);
  const baseURL = resolveApprovedBaseUrl(
    aiSettings.customBaseUrl,
    aiSettings.approvedEndpointOrigin,
  );
  const caps = provider.capabilities.structuredOutput;
  const schema = request.jsonSchema;
  let prompt = request.prompt;
  const system = request.system
    ? withUntrustedDataSystemRule(request.system)
    : UNTRUSTED_DATA_SYSTEM_RULE;

  // OpenAI/Ollama/Anthropic json_object mode cannot emit a root array. Wrap
  // internally so JSON mode stays on; callers still pass/receive arrays.
  const wrapRootArray = isRootArraySchema(schema) && caps.jsonObjectMode && !caps.nativeJsonSchema;
  const effectiveSchema = wrapRootArray && schema ? wrapRootArraySchema(schema) : schema;

  if (effectiveSchema && !caps.nativeJsonSchema && caps.jsonObjectMode) {
    prompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(effectiveSchema)}`;
  }

  const useStructuredJson = caps.jsonObjectMode || caps.nativeJsonSchema;

  if (schema && !caps.nativeJsonSchema && !caps.jsonObjectMode) {
    throw new AppError({
      code: 'VALIDATION',
      message: 'Selected provider does not support structured JSON output for this request.',
      retryable: false,
    });
  }

  let responseText: string;
  try {
    const response = await provider.generateContent({
      ...request,
      system,
      prompt,
      json: useStructuredJson,
      jsonSchema: caps.nativeJsonSchema ? schema : undefined,
      baseURL,
      signal,
    });
    responseText = response.text;
  } catch (error) {
    if (isAbortError(error) || signal?.aborted) abortAsStreamAborted(error);
    safeLogError('Error generating content:', error);
    throw provider.mapError(error);
  }

  // Parse outside the provider catch so GEMINI_PARSE_FAILURE is never remapped
  // through mapError (which classifies AbortError as PROVIDER_UNAVAILABLE).
  const parsed = parseGeminiResponseJson<unknown>(responseText);
  return wrapRootArray ? unwrapRootArrayJson<T>(parsed) : (parsed as T);
}

/**
 * Robustly extracts JSON from AI response text.
 * Handles Markdown code blocks, raw JSON, and surrounding chatter.
 * Exported for unit tests and reuse — delegates to string-aware parser.
 */
export function parseGeminiResponseJson<T>(text: string): T {
  try {
    return parseGeminiJsonCore<T>(text);
  } catch (error) {
    if (error instanceof GeminiJsonParseError) {
      throw new AppError({
        code: 'GEMINI_PARSE_FAILURE',
        message: error.message,
        retryable: true,
        cause: error,
      });
    }
    throw error;
  }
}

export const getPreamble = (
  aiSettings: Settings['ai'],
  promptId: PromptIdValue = PromptId.ORCHESTRATOR_SYSTEM,
) => {
  const languagePreamble = `Your response must be in ${aiSettings.aiLanguage}.`;
  const personaPreamble = {
    'Neutral Scientist': 'Adopt a neutral, objective, and strictly scientific tone.',
    'Concise Expert':
      'Be brief and to the point. Focus on delivering the most critical information without verbosity.',
    'Detailed Analyst':
      'Provide in-depth analysis. Explore nuances, methodologies, and potential implications thoroughly.',
    'Creative Synthesizer':
      'Identify and highlight novel connections, cross-disciplinary links, and innovative perspectives found in the literature.',
  }[aiSettings.aiPersona];

  return `${promptTag(promptId)} ${languagePreamble} ${personaPreamble} ${aiSettings.customPreamble || ''}`.trim();
};
