/** Strip C0/C1 control chars except tab/newline/carriage return (prompt injection hygiene). */
function stripDangerousControls(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 9 || c === 10 || c === 13) {
      out += s[i];
      continue;
    }
    if (c < 32 || c === 127) continue;
    out += s[i];
  }
  return out;
}

/**
 * Clamp and normalize user-supplied text before embedding in LLM prompts.
 */
export function sanitizePromptFragment(value: string, maxLen = 8000): string {
  const trimmed = stripDangerousControls(value).trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen)}…`;
}
