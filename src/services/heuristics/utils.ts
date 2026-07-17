/**
 * Lightweight NLP helpers for the heuristic inference layer.
 * Deterministic tokenization, stop-word filtering, and n-gram extraction (EN + DE).
 */

const EN_STOP = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'will',
  'would',
  'could',
  'should',
  'may',
  'might',
  'must',
  'can',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'we',
  'our',
  'they',
  'their',
  'he',
  'she',
  'his',
  'her',
  'not',
  'no',
  'nor',
  'so',
  'if',
  'than',
  'then',
  'into',
  'over',
  'under',
  'about',
  'after',
  'before',
  'between',
  'through',
  'during',
  'without',
  'via',
  'using',
  'based',
  'study',
  'studies',
  'results',
  'methods',
  'conclusion',
  'background',
  'objective',
  'objectives',
  'aim',
  'aims',
  'however',
  'also',
  'more',
  'most',
  'such',
  'other',
  'than',
  'which',
  'while',
  'where',
  'when',
  'who',
  'whom',
  'what',
  'how',
  'all',
  'any',
  'each',
  'few',
  'both',
  'either',
  'neither',
  'one',
  'two',
  'three',
  'among',
  'across',
  'within',
  'versus',
  'vs',
  'et',
  'al',
]);

const DE_STOP = new Set([
  'der',
  'die',
  'das',
  'und',
  'oder',
  'aber',
  'in',
  'im',
  'am',
  'an',
  'auf',
  'zu',
  'zum',
  'zur',
  'für',
  'von',
  'mit',
  'bei',
  'aus',
  'nach',
  'über',
  'unter',
  'als',
  'ist',
  'sind',
  'war',
  'waren',
  'sein',
  'haben',
  'hat',
  'wird',
  'werden',
  'kann',
  'können',
  'nicht',
  'kein',
  'keine',
  'ein',
  'eine',
  'einer',
  'einem',
  'eines',
  'dem',
  'den',
  'des',
  'dieser',
  'diese',
  'dieses',
  'wir',
  'sie',
  'ihr',
  'ihre',
  'auch',
  'noch',
  'nur',
  'schon',
  'sehr',
  'mehr',
  'weniger',
  'durch',
  'ohne',
  'sowie',
  'bzw',
  'bzw.',
  'via',
  'et',
  'al',
  'studie',
  'studien',
  'ergebnisse',
  'methoden',
  'schlussfolgerung',
  'hintergrund',
  'ziel',
]);

const STOP_WORDS = new Set([...EN_STOP, ...DE_STOP]);

/**
 * Lowercases and splits text into alphanumeric tokens (min length 2).
 */
export function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^a-z0-9äöüß]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Tokens with stop words removed.
 */
export function meaningfulTokens(text: string): string[] {
  return tokenize(text).filter((t) => !STOP_WORDS.has(t) && !/^\d+$/.test(t));
}

/**
 * Very light stemmer: strip common English/German suffixes for overlap matching.
 */
export function lightStem(token: string): string {
  let t = token.toLowerCase();
  const suffixes = [
    'ation',
    'ition',
    'ments',
    'ment',
    'ings',
    'ing',
    'ness',
    'ties',
    'ty',
    'ies',
    'ied',
    'ed',
    'ly',
    'es',
    's',
    'ung',
    'ungen',
    'isch',
    'liche',
    'lich',
  ];
  for (const s of suffixes) {
    if (t.length > s.length + 3 && t.endsWith(s)) {
      t = t.slice(0, -s.length);
      break;
    }
  }
  return t;
}

/** Stemmed meaningful tokens. */
export function stemmedTokens(text: string): string[] {
  return meaningfulTokens(text).map(lightStem);
}

/** Unique set of stemmed tokens. */
export function tokenSet(text: string): Set<string> {
  return new Set(stemmedTokens(text));
}

/**
 * Jaccard similarity between two token sets (0–1).
 */
export function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const t of a) {
    if (b.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Cosine similarity on bag-of-words (term frequency vectors).
 */
export function cosineBag(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const fa = new Map<string, number>();
  const fb = new Map<string, number>();
  for (const t of a) fa.set(t, (fa.get(t) ?? 0) + 1);
  for (const t of b) fb.set(t, (fb.get(t) ?? 0) + 1);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const [, v] of fa) na += v * v;
  for (const [, v] of fb) nb += v * v;
  for (const [k, va] of fa) {
    const vb = fb.get(k);
    if (vb) dot += va * vb;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Extract contiguous n-grams from meaningful tokens.
 */
export function ngrams(text: string, n: number): string[] {
  const tokens = meaningfulTokens(text);
  if (tokens.length < n) return [];
  const out: string[] = [];
  for (let i = 0; i <= tokens.length - n; i++) {
    out.push(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

/**
 * Split text into sentences (simple punctuation heuristic).
 */
export function splitSentences(text: string): string[] {
  if (!text?.trim()) return [];
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 20);
}

/**
 * Throw if abort signal already fired.
 */
export function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    const err = new DOMException('Aborted', 'AbortError');
    throw err;
  }
}

/**
 * Deterministic hash for stable demo PMIDs / ids.
 */
export function stableHash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
