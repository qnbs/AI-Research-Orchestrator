/**
 * Heuristic provider adapter.
 *
 * Wraps the local deterministic heuristic layer behind the same `AIProvider`
 * interface. This is primarily a consistency / testability seam: the facade
 * (`geminiService.ts`) still short-circuits to typed non-AI functions for speed,
 * but the adapter makes the heuristic backend discoverable as a regular
 * provider and provides deterministic streaming for chat and synthesis.
 *
 * Dispatch is typed (`HeuristicOperation`). Prompt substring guessing is not used.
 * All capabilities are local: the adapter never performs network calls and has
 * zero API cost.
 */

import { AppError, throwIfAborted } from '../../lib/errors';
import {
  createHeuristicChatSession,
  generateHeuristicTldr,
  generateResearchAnalysisHeuristic,
  findRelatedOnlineHeuristic,
  streamSynthesisChunks,
} from '../nonAi';
import type { AIProvider } from './provider';
import type {
  AIChatSessionRequest,
  AIContentRequest,
  AIContentResponse,
  AIStreamChunk,
  HeuristicOperation,
  ProviderChatSession,
} from './types';
import { heuristicProviderCapabilities, isHeuristicOperation } from './types';

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
  const match = prompt.match(/topic[:\s]+([^\n]+)/i) ?? prompt.match(/"([^"]{5,120})"/);
  return (match?.[1] ?? prompt).slice(0, 160).trim();
}

/** Resolve a typed operation; unknown or omitted values become `fallback`. */
export function resolveHeuristicOperation(request: AIContentRequest): HeuristicOperation {
  return isHeuristicOperation(request.heuristicOperation) ? request.heuristicOperation : 'fallback';
}

function generateTypedHeuristicResponse(request: AIContentRequest): AIContentResponse {
  throwIfAborted(request.signal);
  const operation = resolveHeuristicOperation(request);
  const topic = inferTopicFromPrompt(request.prompt);

  switch (operation) {
    case 'related-online':
      return { text: JSON.stringify(findRelatedOnlineHeuristic(topic)) };
    case 'tldr':
      return { text: generateHeuristicTldr(request.prompt) };
    case 'analysis':
      return { text: JSON.stringify(generateResearchAnalysisHeuristic(topic)) };
    case 'synthesis':
    case 'fallback':
      return {
        text: JSON.stringify({
          heuristic: true,
          topic,
          operation: 'fallback',
          note: 'Heuristic provider returned a deterministic fallback. Pass heuristicOperation for a typed local path.',
        }),
      };
  }
}

export function createHeuristicProvider(): AIProvider {
  return {
    id: 'heuristic',
    capabilities: heuristicProviderCapabilities(),

    async generateContent(request: AIContentRequest): Promise<AIContentResponse> {
      return generateTypedHeuristicResponse(request);
    },

    async *generateContentStream(request: AIContentRequest): AsyncGenerator<AIStreamChunk> {
      throwIfAborted(request.signal);
      const topic = inferTopicFromPrompt(request.prompt);
      const markdown = `# Heuristic synthesis: ${topic}\n\nThis is a deterministic local fallback. Connect a live provider for full semantic ranking and cited synthesis.`;
      for await (const chunk of streamSynthesisChunks(markdown)) {
        throwIfAborted(request.signal);
        yield { text: chunk };
      }
      yield { done: true };
    },

    async createChatSession(request: AIChatSessionRequest): Promise<ProviderChatSession> {
      throwIfAborted(request.signal);
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
