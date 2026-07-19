/**
 * Typed application / agent error taxonomy for resilience and UX recovery.
 * Prefer throwing `AppError` (or subclasses) from services instead of bare `Error`.
 */

export type AppErrorCode =
  | 'NO_API_KEY'
  // Legacy Gemini-specific codes — kept for backward compatibility with
  // message-based error classification in `toAppError`.
  | 'GEMINI_QUOTA'
  | 'GEMINI_RATE_LIMIT'
  | 'GEMINI_PARSE_FAILURE'
  // Provider-agnostic AI backend codes (preferred for new provider code).
  | 'PROVIDER_QUOTA'
  | 'PROVIDER_RATE_LIMIT'
  | 'PROVIDER_PARSE_FAILURE'
  | 'PROVIDER_UNAVAILABLE'
  | 'PROVIDER_AUTH'
  | 'NCBI_RATE_LIMIT'
  | 'NCBI_NETWORK'
  | 'ARXIV_NETWORK'
  | 'STREAM_ABORTED'
  | 'CIRCUIT_OPEN'
  | 'VALIDATION'
  | 'STORAGE'
  | 'UNKNOWN';

export interface AppErrorOptions {
  code: AppErrorCode;
  message: string;
  /** Transient failures may be retried with backoff. */
  retryable?: boolean;
  cause?: unknown;
  /** Optional phase or subsystem label (e.g. "query_generation", "pubmed"). */
  context?: string;
  /** HTTP status when applicable. */
  status?: number;
}

export class AppError extends Error {
  readonly code: AppErrorCode;
  readonly retryable: boolean;
  readonly context?: string;
  readonly status?: number;
  override readonly cause?: unknown;

  constructor(options: AppErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    this.context = options.context;
    this.status = options.status;
    this.cause = options.cause;
  }

  /** User-facing short message (no stack / internal details). */
  toUserMessage(): string {
    switch (this.code) {
      case 'NO_API_KEY':
        return 'Please configure your Gemini API key in Settings.';
      case 'GEMINI_QUOTA':
      case 'PROVIDER_QUOTA':
        return 'AI provider quota exhausted. Try again later or check your usage.';
      case 'GEMINI_RATE_LIMIT':
      case 'PROVIDER_RATE_LIMIT':
        return 'AI provider rate limit reached. Wait briefly and try again.';
      case 'GEMINI_PARSE_FAILURE':
      case 'PROVIDER_PARSE_FAILURE':
        return 'The AI response could not be processed. Please restart the research run.';
      case 'PROVIDER_UNAVAILABLE':
        return 'The AI service is temporarily unavailable. Please try again later.';
      case 'PROVIDER_AUTH':
        return 'AI provider authentication failed. Check your API key in Settings.';
      case 'NCBI_RATE_LIMIT':
        return 'PubMed/NCBI rate limit. Optionally add an NCBI API key in Settings.';
      case 'NCBI_NETWORK':
        return 'PubMed is temporarily unavailable. Please try again.';
      case 'ARXIV_NETWORK':
        return 'arXiv is temporarily unavailable. Please try again.';
      case 'STREAM_ABORTED':
        return 'Research cancelled.';
      case 'CIRCUIT_OPEN':
        return 'External service temporarily blocked (circuit breaker). Try again later.';
      case 'VALIDATION':
        return this.message;
      case 'STORAGE':
        return 'Local storage error. Check browser storage and try again.';
      default:
        return 'An unexpected error occurred.';
    }
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isAbortError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  if (error instanceof DOMException && error.name === 'AbortError') return true;
  if (error instanceof Error && error.name === 'AbortError') return true;
  if (isAppError(error) && error.code === 'STREAM_ABORTED') return true;
  return false;
}

/** Normalize unknown thrown values into AppError (preserves AbortError identity). */
export function toAppError(error: unknown, fallbackContext?: string): AppError {
  if (isAbortError(error)) {
    return new AppError({
      code: 'STREAM_ABORTED',
      message: 'Operation aborted',
      retryable: false,
      context: fallbackContext,
      cause: error,
    });
  }

  if (isAppError(error)) return error;

  if (error instanceof Error) {
    const msg = error.message;
    if (msg.includes('NO_API_KEY')) {
      return new AppError({
        code: 'NO_API_KEY',
        message: msg,
        retryable: false,
        context: fallbackContext,
        cause: error,
      });
    }
    if (/429|rate.?limit|RESOURCE_EXHAUSTED/i.test(msg)) {
      const isNcbi = /pubmed|ncbi|eutils/i.test(msg) || fallbackContext === 'pubmed';
      return new AppError({
        code: isNcbi ? 'NCBI_RATE_LIMIT' : 'GEMINI_RATE_LIMIT',
        message: msg,
        retryable: true,
        context: fallbackContext,
        status: 429,
        cause: error,
      });
    }
    if (/quota|billing|exhausted/i.test(msg)) {
      return new AppError({
        code: 'GEMINI_QUOTA',
        message: msg,
        retryable: false,
        context: fallbackContext,
        cause: error,
      });
    }
    if (/JSON|parse|Empty response/i.test(msg)) {
      return new AppError({
        code: 'GEMINI_PARSE_FAILURE',
        message: msg,
        retryable: true,
        context: fallbackContext,
        cause: error,
      });
    }
    if (/PubMed|NCBI|eutils/i.test(msg)) {
      return new AppError({
        code: 'NCBI_NETWORK',
        message: msg,
        retryable: true,
        context: fallbackContext ?? 'pubmed',
        cause: error,
      });
    }
    if (/arxiv/i.test(msg)) {
      return new AppError({
        code: 'ARXIV_NETWORK',
        message: msg,
        retryable: true,
        context: fallbackContext ?? 'arxiv',
        cause: error,
      });
    }
    return new AppError({
      code: 'UNKNOWN',
      message: msg,
      retryable: false,
      context: fallbackContext,
      cause: error,
    });
  }

  return new AppError({
    code: 'UNKNOWN',
    message: String(error),
    retryable: false,
    context: fallbackContext,
    cause: error,
  });
}
