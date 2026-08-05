/**
 * Numeric and population/cohort conflict detectors for claimEvidenceMatcher.ts.
 * Split out to keep that file under the repo's 700-line hard max (see AGENTS.md).
 *
 * normalizeForTokenize/stemToken/rawWordTokens below duplicate the identically-named
 * helpers in claimEvidenceMatcher.ts rather than importing them - that file already
 * imports FROM this one, so importing back would create a cycle. This mirrors the
 * pattern stemToken itself already follows there to avoid a cycle through
 * nonAi/utils.stem: keep tiny, stable, pure helpers local rather than shared.
 */

function normalizeForTokenize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function stemToken(token: string): string {
  let result = token;
  result = result.replace(/(tion|sion|ness|ment|ance|ence)$/i, '');
  if (result.length > 5) {
    result = result.replace(/ing$/i, '');
  }
  result = result.replace(/ies$/i, 'y');
  result = result.replace(/(ed|ly|er|est)$/i, '');
  result = result.replace(/es$/i, '');
  result = result.replace(/s$/i, '');
  return result;
}

function rawWordTokens(text: string): string[] {
  return normalizeForTokenize(text)
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Contrastive population/cohort terms — mismatched pairs imply a population conflict. */
const POPULATION_TERMS: Record<string, string[]> = {
  child: ['adult', 'adults', 'elderly', 'geriatric'],
  children: ['adult', 'adults', 'elderly', 'geriatric'],
  pediatric: ['adult', 'adults', 'elderly', 'geriatric'],
  infant: ['adult', 'adults', 'elderly'],
  infants: ['adult', 'adults', 'elderly'],
  adult: ['child', 'children', 'pediatric', 'infant', 'infants'],
  adults: ['child', 'children', 'pediatric', 'infant', 'infants'],
  elderly: ['child', 'children', 'pediatric', 'infant', 'infants'],
  male: ['female', 'females'],
  males: ['female', 'females'],
  female: ['male', 'males'],
  females: ['male', 'males'],
  healthy: ['patient', 'patients'],
};

/**
 * Detects a contrastive population/cohort term in one text matched by its opposite in
 * the other (e.g. claim says "children", evidence is about "adults") - checked on raw
 * tokens, same as detectNegationConflict, so these terms need not leave STOPWORDS to be
 * caught (removing them would also inflate lexical-overlap scoring for near-universal
 * words like "patients"/"adults").
 *
 * Two false-positive classes this guards against:
 *  - identical/shared cohort text (e.g. "healthy patients" appearing in both) - fixed by
 *    requiring a shared population term anywhere in either text to short-circuit to "no
 *    conflict" before ever checking opposites;
 *  - mixed-cohort evidence (e.g. "improved outcomes in both children and adults" as
 *    evidence for a claim about "children") - the same shared-term check covers this too,
 *    since "children" is present in both, even though the evidence separately also
 *    mentions "adults".
 * This is deliberately conservative: any shared population term is treated as proof the
 * two texts are not describing disjoint cohorts, even if another dimension differs.
 */
export function detectPopulationConflict(claimText: string, articleText: string): boolean {
  const claimSet = new Set(rawWordTokens(claimText).map(stemToken));
  const articleSet = new Set(rawWordTokens(articleText).map(stemToken));

  const claimTerms = new Set<string>();
  const articleTerms = new Set<string>();
  for (const term of Object.keys(POPULATION_TERMS)) {
    const stemmedTerm = stemToken(term);
    if (claimSet.has(stemmedTerm)) claimTerms.add(stemmedTerm);
    if (articleSet.has(stemmedTerm)) articleTerms.add(stemmedTerm);
  }
  for (const term of claimTerms) {
    if (articleTerms.has(term)) return false;
  }

  for (const [term, opposites] of Object.entries(POPULATION_TERMS)) {
    const stemmedTerm = stemToken(term);
    const stemmedOpposites = opposites.map(stemToken);
    if (claimTerms.has(stemmedTerm) && stemmedOpposites.some((o) => articleTerms.has(o))) {
      return true;
    }
    if (articleTerms.has(stemmedTerm) && stemmedOpposites.some((o) => claimTerms.has(o))) {
      return true;
    }
  }
  return false;
}

/**
 * Numeric mentions this matcher can compare across claim/evidence text. `\b` is only
 * applied to the word-based units - `%` is not a word character, so a trailing `\b`
 * right after it never matches (both neighbors would be non-word) and would silently
 * make every percent value invisible to this pattern. The first alternative captures
 * comma-grouped thousands (optionally with a decimal tail); the second is the plain
 * fallback where a single comma is a decimal separator (EU notation, e.g. "3,5").
 */
const NUMERIC_UNIT_SOURCE =
  '(\\d{1,3}(?:,\\d{3})+(?:\\.\\d+)?|\\d+(?:[.,]\\d+)?)\\s*(%|percent\\b|mg\\b|mcg\\b|g\\b|kg\\b|ml\\b|l\\b|mmhg\\b|bpm\\b)';
const NUMERIC_UNIT_PATTERN = new RegExp(NUMERIC_UNIT_SOURCE, 'giu');
const THOUSANDS_GROUPED_PATTERN = /^\d{1,3}(,\d{3})+(\.\d+)?$/;

/** Relative drift beyond which a same-unit claim/evidence value pair is treated as conflicting. */
const NUMERIC_TOLERANCE_RATIO = 0.2;

type NumericMention = { value: number; unit: string };

/** Comma-grouped thousands ("1,000" or "1,234.5") use commas as digit-group separators,
 * not a decimal mark - strip them before parsing. Otherwise a single comma is treated as
 * a decimal separator (EU notation, e.g. "3,5"). */
function parseNumericValue(raw: string): number {
  if (THOUSANDS_GROUPED_PATTERN.test(raw)) {
    return Number.parseFloat(raw.replace(/,/g, ''));
  }
  return Number.parseFloat(raw.replace(',', '.'));
}

function extractNumericMentions(text: string): NumericMention[] {
  const mentions: NumericMention[] = [];
  const normalized = normalizeForTokenize(text);
  // Reuse the single compiled pattern rather than `new RegExp(NUMERIC_UNIT_PATTERN)` per
  // call - that copy relies on the source object still carrying the `g` flag, which a
  // future edit could silently drop. Resetting lastIndex explicitly is what actually
  // makes reuse across calls safe.
  NUMERIC_UNIT_PATTERN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NUMERIC_UNIT_PATTERN.exec(normalized)) !== null) {
    const value = parseNumericValue(match[1]);
    if (Number.isNaN(value)) continue;
    const unit = match[2] === 'percent' ? '%' : match[2];
    mentions.push({ value, unit });
  }
  return mentions;
}

/** Detects a same-unit numeric value (percent, dose, vitals) that drifts beyond tolerance
 * between claim and evidence text - e.g. claim "reduced risk by 30%" vs. evidence reporting
 * 12%. Conservative: only fires when EVERY same-unit evidence mention disagrees: a single
 * matching value anywhere in the field is treated as numeric support, not a conflict.
 * Different units are never compared, so this can only ever report a same-unit value
 * conflict, never a "unit conflict". */
export function detectNumericConflict(claimText: string, articleText: string): boolean {
  const claimMentions = extractNumericMentions(claimText);
  const articleMentions = extractNumericMentions(articleText);
  if (claimMentions.length === 0 || articleMentions.length === 0) return false;

  for (const claimMention of claimMentions) {
    const sameUnit = articleMentions.filter((m) => m.unit === claimMention.unit);
    if (sameUnit.length === 0) continue;
    const allDisagree = sameUnit.every((articleMention) => {
      const scale = Math.max(Math.abs(claimMention.value), Math.abs(articleMention.value), 1e-9);
      return Math.abs(claimMention.value - articleMention.value) / scale > NUMERIC_TOLERANCE_RATIO;
    });
    if (allDisagree) return true;
  }
  return false;
}
