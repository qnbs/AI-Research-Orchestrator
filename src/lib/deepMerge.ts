/** Shallow-recursive merge for plain JSON-like settings objects. */
export function deepMergeRecords(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  const output: Record<string, unknown> = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      targetVal !== null &&
      typeof targetVal === 'object' &&
      !Array.isArray(targetVal) &&
      sourceVal !== null &&
      typeof sourceVal === 'object' &&
      !Array.isArray(sourceVal)
    ) {
      output[key] = deepMergeRecords(
        targetVal as Record<string, unknown>,
        sourceVal as Record<string, unknown>,
      );
    } else {
      output[key] = sourceVal;
    }
  }
  return output;
}
