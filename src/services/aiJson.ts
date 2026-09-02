/**
 * Shared JSON generation + prompt preamble for the AI feature façade (ADR 0008).
 * Kept out of `geminiService.ts` so live orchestration and literature tools
 * can call the same helper without growing the public façade past the file cap.
 */
import type { Settings } from '../types';
import { getProviderForSettings } from './providers/factory';
import type { AIContentRequest } from './providers/types';
import { resolveApprovedBaseUrl } from '../lib/endpointPolicy';
import {
  UNTRUSTED_DATA_SYSTEM_RULE,
  withUntrustedDataSystemRule,
} from '../lib/untrustedDataFraming';
import {
  parseGeminiResponseJson as parseGeminiJsonCore,
  GeminiJsonParseError,
} from '../lib/parseGeminiJson';
import { AppError, throwIfAborted } from '../lib/errors';
import { PromptId, promptTag, type PromptIdValue } from '../lib/promptRegistry';
import { safeLogError } from '../lib/safeLog';

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

  if (schema && !caps.nativeJsonSchema && caps.jsonObjectMode) {
    prompt = `${prompt}\n\nRespond with valid JSON matching this schema:\n${JSON.stringify(schema)}`;
  }

  const schemaRootIsArray = schema?.type === 'array';
  // json_object mode cannot emit a root array (OpenAI/Ollama/Anthropic). Keep
  // json:false for array schemas; the schema is already in the prompt above and
  // parseGeminiResponseJson extracts JSON from surrounding chatter (ADR 0014).
  const useJsonObjectMode = caps.jsonObjectMode && !schemaRootIsArray;
  const useStructuredJson = useJsonObjectMode || caps.nativeJsonSchema;

  if (schema && !caps.nativeJsonSchema && !caps.jsonObjectMode) {
    throw new AppError({
      code: 'VALIDATION',
      message: 'Selected provider does not support structured JSON output for this request.',
      retryable: false,
    });
  }

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
    return parseGeminiResponseJson<T>(response.text);
  } catch (error) {
    safeLogError('Error generating content:', error);
    throw provider.mapError(error);
  }
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
