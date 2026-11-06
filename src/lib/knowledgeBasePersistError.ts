/**
 * Thrown when a Knowledge Base IndexedDB write fails after `dispatch(thunk).unwrap()`.
 * Callers can distinguish persistence failures from AI/network/analysis errors.
 */
export class KnowledgeBasePersistError extends Error {
  readonly code = 'KB_PERSIST_FAILED' as const;

  constructor(message = 'Knowledge Base save failed') {
    super(message);
    this.name = 'KnowledgeBasePersistError';
  }
}
