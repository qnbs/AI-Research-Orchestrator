import { useMemo } from 'react';
import { useInferenceMode } from './useInferenceMode';
import { deriveResearchCapabilities, type ResearchCapabilities } from '../lib/researchCapabilities';

/**
 * Inference mode plus literature-retrieval capability (Wave B).
 */
export function useResearchCapabilities(): ResearchCapabilities &
  ReturnType<typeof useInferenceMode> {
  const inference = useInferenceMode();

  const capabilities = useMemo(
    () =>
      deriveResearchCapabilities({
        snapshot: inference,
        /** Status line describes retrieval in general; arXiv is opt-in per review run. */
        includeArxiv: true,
      }),
    [inference],
  );

  return { ...inference, ...capabilities };
}
