import type { AppError } from '../../lib/errors';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIProviderId,
  AIProviderSelection,
  AIStreamChunk,
  ProviderCapabilities,
  ProviderChatSession,
  ProviderMeta,
} from './types';
import { heuristicProviderCapabilities, providerCapabilities } from './types';
import {
  ANTHROPIC_DEFAULT_MODEL,
  ANTHROPIC_MODEL_SUGGESTIONS,
  GEMINI_DEFAULT_MODEL,
  GEMINI_MODEL_SUGGESTIONS,
  OPENAI_DEFAULT_MODEL,
  OPENAI_MODEL_SUGGESTIONS,
} from './modelCatalog';

/**
 * Transport-level abstraction for an AI backend.
 *
 * Implementations live in sibling files and are loaded lazily by the factory.
 * Keep provider methods free of feature semantics — they only turn a prompt
 * into text/JSON/streaming text and map backend errors to `AppError`.
 */
export interface AIProvider {
  readonly id: AIProviderId;
  readonly capabilities: ProviderCapabilities;

  /** Single-shot text/JSON generation. */
  generateContent(request: AIContentRequest): Promise<AIContentResponse>;

  /** Streaming text generation. */
  generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk>;

  /** Create a stateful chat session. */
  createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession>;

  /** Map a backend-specific error to a provider-agnostic `AppError`. */
  mapError(error: unknown): AppError;

  /** Optional connectivity check used by the settings UI. */
  testConnection?(baseURL?: string): Promise<boolean>;

  /** Optional reset hook to clear cached clients/keys (useful in tests). */
  reset?(): void;
}

/**
 * Suggested Gemini thinking budget for a model name.
 * Returns `undefined` for models where thinking is not desired.
 */
export function defaultGeminiThinkingBudget(model: string): number | undefined {
  if (model.includes('gemini-3')) return 8192;
  if (model.includes('gemini-2.5')) return 2048;
  return undefined;
}

export const AI_PROVIDERS: Record<AIProviderSelection, ProviderMeta> = {
  gemini: {
    id: 'gemini',
    label: 'Google Gemini',
    defaultModel: GEMINI_DEFAULT_MODEL,
    modelSuggestions: [...GEMINI_MODEL_SUGGESTIONS],
    capabilities: providerCapabilities({
      webGrounding: true,
      structuredOutput: { nativeJsonSchema: true },
    }),
    keyHint: 'AIza...',
    keyPlaceholder: 'AIza...',
    keyDocsUrl: 'https://aistudio.google.com/apikey',
  },
  openai: {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: OPENAI_DEFAULT_MODEL,
    modelSuggestions: [...OPENAI_MODEL_SUGGESTIONS],
    capabilities: providerCapabilities({
      supportsCustomBaseUrl: true,
      structuredOutput: { jsonObjectMode: true, nativeJsonSchema: false },
    }),
    keyPlaceholder: 'sk-...',
    keyDocsUrl: 'https://platform.openai.com/api-keys',
    supportsBaseUrl: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
  },
  anthropic: {
    id: 'anthropic',
    label: 'Anthropic',
    defaultModel: ANTHROPIC_DEFAULT_MODEL,
    modelSuggestions: [...ANTHROPIC_MODEL_SUGGESTIONS],
    capabilities: providerCapabilities({
      supportsCustomBaseUrl: true,
      structuredOutput: { jsonObjectMode: true, nativeJsonSchema: false },
    }),
    keyHint: 'sk-ant-...',
    keyPlaceholder: 'sk-ant-...',
    keyDocsUrl: 'https://console.anthropic.com/settings/keys',
    supportsBaseUrl: true,
    defaultBaseUrl: 'https://api.anthropic.com',
  },
  ollama: {
    id: 'ollama',
    label: 'Local AI (Ollama)',
    defaultModel: 'llama3.1:8b',
    modelSuggestions: ['llama3.1:8b', 'llama3.3', 'qwen2.5:14b', 'mistral:7b'],
    capabilities: providerCapabilities({
      requiresApiKey: false,
      supportsCustomBaseUrl: true,
      structuredOutput: { jsonObjectMode: true, nativeJsonSchema: false },
    }),
    keyPlaceholder: 'No key required',
    supportsBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434',
  },
  heuristic: {
    id: 'heuristic',
    label: 'Heuristic (local)',
    defaultModel: 'local',
    modelSuggestions: ['local'],
    capabilities: heuristicProviderCapabilities(),
  },
};

/** Returns UI metadata for a provider selection, falling back to Gemini. */
export function getProviderMeta(id: AIProviderSelection): ProviderMeta {
  return AI_PROVIDERS[id] ?? AI_PROVIDERS.gemini;
}
