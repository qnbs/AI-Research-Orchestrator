import { meaningfulTokens, splitSentences, cosineBag, stemmedTokens } from './utils';

/**
 * Extractive TL;DR: pick the sentence most central to the abstract (cosine to all tokens),
 * prefer first+last blend when centrality is weak. Target ~30 words.
 */
export function generateHeuristicTldr(abstract: string): string {
  const text = abstract?.trim() ?? '';
  if (!text) {
    return 'Heuristic mode: no abstract available for summarization.';
  }

  const sentences = splitSentences(text);
  if (sentences.length === 0) {
    return clipWords(text, 30);
  }

  if (sentences.length === 1) {
    return clipWords(sentences[0], 30);
  }

  const allTokens = stemmedTokens(text);
  let bestIdx = 0;
  let bestScore = -1;
  for (let i = 0; i < sentences.length; i++) {
    const score = cosineBag(stemmedTokens(sentences[i]), allTokens);
    // Slight preference for earlier informative sentences
    const adjusted = score + (i === 0 ? 0.05 : 0) + (i === sentences.length - 1 ? 0.02 : 0);
    if (adjusted > bestScore) {
      bestScore = adjusted;
      bestIdx = i;
    }
  }

  let tldr = sentences[bestIdx];
  if (bestScore < 0.15) {
    tldr = `${sentences[0]} ${sentences[sentences.length - 1]}`;
  }

  return clipWords(tldr, 30);
}

function clipWords(text: string, maxWords: number): string {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  if (words.length <= maxWords) return words.join(' ');
  return `${words.slice(0, maxWords).join(' ')}…`;
}

/**
 * Key-sentence extraction for longer narratives (up to `count` sentences).
 */
export function extractKeySentences(text: string, count = 3): string[] {
  const sentences = splitSentences(text);
  if (sentences.length <= count) return sentences;
  const allTokens = stemmedTokens(text);
  const scored = sentences.map((s, i) => ({
    s,
    i,
    score: cosineBag(stemmedTokens(s), allTokens),
  }));
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  return scored
    .slice(0, count)
    .sort((a, b) => a.i - b.i)
    .map((x) => x.s);
}

/** Token count helper for tests. */
export function countMeaningfulTokens(text: string): number {
  return meaningfulTokens(text).length;
}
