import { describe, it, expect } from 'vitest';
import { KnowledgeBasePersistError } from './knowledgeBasePersistError';

describe('KnowledgeBasePersistError', () => {
  it('exposes a stable code for dispatch/unwrap callers', () => {
    const err = new KnowledgeBasePersistError('persist failed');
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe('KnowledgeBasePersistError');
    expect(err.code).toBe('KB_PERSIST_FAILED');
    expect(err.message).toBe('persist failed');
  });
});
