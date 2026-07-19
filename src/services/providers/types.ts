/**
 * Provider-agnostic transport primitives for AI backends.
 *
 * Higher-level feature logic (query generation, ranking, synthesis, etc.) stays
 * in the feature facade (`geminiService.ts`). A provider only needs to speak
 * "plain text / JSON / streaming text" so new backends can be plugged in without
 * touching orchestration code.
 */

/** Live backends supported by the factory. */
export type AIProviderId = 'gemini' | 'openai' | 'anthropic' | 'ollama' | 'heuristic';

/** Value persisted in Settings; 'heuristic' is a mode, not a transport provider. */
export type AIProviderSelection = AIProviderId | 'heuristic';

/** Provider-level capability flags used by the facade to choose fallback paths. */
export interface ProviderCapabilities {
  /** Supports streaming token generation. */
  streaming: boolean;
  /** Supports deterministic JSON output (via native mode or prompt discipline). */
  jsonMode: boolean;
  /** Supports live web search / retrieval-augmented generation. */
  webGrounding: boolean;
  /** Supports multi-turn chat sessions. */
  chat: boolean;
  /** Requires an API key (false for local-only backends such as Ollama). */
  requiresApiKey: boolean;
}

/** JSON Schema subset used for structured responses. */
export type AIJsonSchema = Record<string, unknown>;

export interface AIContentRequest {
  /** Provider-specific model identifier. */
  model: string;
  /** User / assistant prompt text. */
  prompt: string;
  /** Optional system instruction. */
  system?: string;
  /** Sampling temperature. */
  temperature?: number;
  /** Optional max output tokens. */
  maxOutputTokens?: number;
  /** Request JSON-only output. */
  json?: boolean;
  /** Optional JSON schema for structured output. */
  jsonSchema?: AIJsonSchema;
  /** Enable native web-grounding when the provider supports it. */
  webGrounding?: boolean;
  /** Optional thinking/reasoning budget (Gemini-specific; ignored by others). */
  thinkingBudget?: number;
  /** Optional custom base URL for OpenAI-compatible or Ollama backends. */
  baseURL?: string;
  /** Abort signal. */
  signal?: AbortSignal;
}

/** Generic web source extracted by providers that support grounding. */
export interface OnlineSource {
  uri: string;
  title?: string;
}

export interface AIContentResponse {
  text: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Populated when webGrounding was requested and the backend returned sources. */
  sources?: OnlineSource[];
}

export interface AIStreamChunk {
  text?: string;
  done?: boolean;
}

export interface AIChatHistoryMessage {
  role: 'user' | 'model';
  text: string;
}

export interface AIChatSessionRequest {
  model: string;
  system?: string;
  history?: AIChatHistoryMessage[];
  temperature?: number;
  /** Optional custom base URL for OpenAI-compatible or Ollama backends. */
  baseURL?: string;
}

/**
 * Minimal chat session shape shared by live and heuristic adapters.
 * Matches the heuristic `ReportChatSession` interface so the facade can return
 * provider sessions directly.
 */
export interface ProviderChatSession {
  sendMessageStream(params: {
    message: string;
  }): Promise<AsyncGenerator<{ text?: string }, void, unknown>>;
}

/** UI metadata for a selectable provider / heuristic mode. */
export interface ProviderMeta {
  id: AIProviderSelection;
  label: string;
  /** Default model identifier for this provider. */
  defaultModel: string;
  /** Suggested models shown as a datalist; users may still enter free text. */
  modelSuggestions: string[];
  capabilities: ProviderCapabilities;
  /** Short hint shown in the API key input (e.g., "AIza..."). */
  keyHint?: string;
  /** Placeholder for the API key input. */
  keyPlaceholder?: string;
  /** Docs URL for obtaining a key. */
  keyDocsUrl?: string;
  /** Whether the settings UI should show a custom base URL field. */
  supportsBaseUrl?: boolean;
  /** Default base URL when supportsBaseUrl is true. */
  defaultBaseUrl?: string;
}
