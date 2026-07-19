/**
 * Heuristic provider adapter.
 *
 * Wraps the local deterministic heuristic layer behind the same `AIProvider`
 * interface. This is primarily a consistency / testability seam: the facade
 * (`geminiService.ts`) still short-circuits to heuristic functions for speed,
 * but the adapter makes the heuristic backend discoverable as a regular
 * provider and provides deterministic streaming for chat and synthesis.
 *
 * All capabilities are emulated: the adapter never performs network calls and
 * has zero API cost.
 */

import { AppError } from '../../lib/errors';
import {
  createHeuristicChatSession,
  generateHeuristicTldr,
  generateResearchAnalysisHeuristic,
  findRelatedOnlineHeuristic,
  streamSynthesisChunks,
} from '../heuristics';
import type { AIProvider } from './provider';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIStreamChunk,
  ProviderChatSession,
} from './types';

function mapHeuristicError(error: unknown): AppError {
  if (error instanceof AppError) return error;
  if (error instanceof Error) {
    return new AppError({
      code: 'PROVIDER_UNAVAILABLE',
      message: `Heuristic engine error: ${error.message}`,
      retryable: false,
      cause: error,
    });
  }
  return new AppError({
    code: 'PROVIDER_UNAVAILABLE',
    message: 'An unknown heuristic engine error occurred.',
    retryable: false,
    cause: error,
  });
}

function inferTopicFromPrompt(prompt: string): string {
  // Extract a reasonable topic from the first user-facing line.
  const match = prompt.match(/topic[:\s]+([^\n]+)/i) ?? prompt.match(/"([^"]{5,120})"/);
  return (match?.[1] ?? prompt).slice(0, 160).trim();
}

function generateGenericHeuristicResponse(request: AIContentRequest): AIContentResponse {
  const topic = inferTopicFromPrompt(request.prompt);

  if (
    request.prompt.toLowerCase().includes('related online') ||
    request.prompt.toLowerCase().includes('web search')
  ) {
    const result = findRelatedOnlineHeuristic(topic);
    return { text: JSON.stringify(result) };
  }

  if (
    request.prompt.toLowerCase().includes('tldr') ||
    request.prompt.toLowerCase().includes('summary')
  ) {
    return { text: generateHeuristicTldr(topic) };
  }

  if (request.prompt.toLowerCase().includes('analysis')) {
    const result = generateResearchAnalysisHeuristic(topic);
    return { text: JSON.stringify(result) };
  }

  // Default deterministic JSON envelope so callers can parse a structured shape.
  return {
    text: JSON.stringify({
      heuristic: true,
      topic,
      note: 'Heuristic provider returned a deterministic fallback. Use specific heuristic functions for richer output.',
    }),
  };
}

export function createHeuristicProvider(): AIProvider {
  return {
    id: 'heuristic',
    capabilities: {
      streaming: true,
      jsonMode: true,
      webGrounding: false,
      chat: true,
      requiresApiKey: false,
    },

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      return generateGenericHeuristicResponse(request);
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      const topic = inferTopicFromPrompt(request.prompt);
      const markdown = `# Heuristic synthesis: ${topic}\n\nThis is a deterministic local fallback. Connect a live provider for full semantic ranking and cited synthesis.`;
      for await (const chunk of streamSynthesisChunks(markdown)) {
        yield { text: chunk };
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      // Chat requires a report to ground answers. Without one we return a polite
      // refusal stream so the session still satisfies the interface contract.
      const fallbackReport = {
        synthesis: request.system ?? 'No report loaded.',
        rankedArticles: [],
        overallKeywords: [],
        aiGeneratedInsights: [],
        generatedQueries: [],
      } as unknown as import('../../types').ResearchReport;

      return createHeuristicChatSession(fallbackReport);
    },

    mapError: mapHeuristicError,
  };
}
