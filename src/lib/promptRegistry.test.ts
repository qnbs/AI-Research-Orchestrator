import { describe, it, expect } from 'vitest';
import { PROMPT_CATALOG_VERSION, PromptId, promptTag, describePrompt } from './promptRegistry';

describe('promptRegistry', () => {
  it('exposes a stable catalog version', () => {
    expect(PROMPT_CATALOG_VERSION).toMatch(/^\d{4}\.\d{2}\.\d{2}$/);
  });

  it('builds prompt tags with id and version', () => {
    expect(promptTag(PromptId.ORCHESTRATOR_SYSTEM)).toBe(
      `[prompt:orchestrator.system@${PROMPT_CATALOG_VERSION}]`,
    );
  });

  it('describePrompt returns meta', () => {
    expect(describePrompt(PromptId.TLDR)).toEqual({
      id: 'assistant.tldr',
      catalogVersion: PROMPT_CATALOG_VERSION,
    });
  });
});
