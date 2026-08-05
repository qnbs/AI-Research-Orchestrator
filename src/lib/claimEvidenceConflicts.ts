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
 * Three false-positive classes this guards against:
 *  - identical/shared cohort text (e.g. "healthy patients" appearing in both) - the
 *    matching term itself present on both sides suppresses that term's own opposite check;
 *  - mixed-cohort evidence on the SAME dimension (e.g. "improved outcomes in both children
 *    and adults" as evidence for a claim about "children") - a term shared as one side of
 *    the opposite pair being checked suppresses just that pair;
 *  - a shared term on an UNRELATED dimension must not blanket-suppress every other
 *    dimension - "male children" vs "male adults" shares "male" (sex), which must not hide
 *    the genuine children-vs-adults (age) conflict. Each POPULATION_TERMS pair is checked
 *    independently rather than via one global "any shared term ⇒ no conflict" shortcut, so
 *    a shared term only neutralizes conflicts on its own dimension.
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

  for (const [term, opposites] of Object.entries(POPULATION_TERMS)) {
    const stemmedTerm = stemToken(term);
    const stemmedOpposites = opposites.map(stemToken);
    // A shared opposite-pair term (e.g. both texts also mention "children" while this
    // pair is "adult") proves the pair's own dimension overlaps - don't let this
    // specific pair fire even if the direct-term checks below otherwise would.
    const hasSharedOpposite = stemmedOpposites.some(
      (opposite) => claimTerms.has(opposite) && articleTerms.has(opposite),
    );
    if (
      claimTerms.has(stemmedTerm) &&
      !articleTerms.has(stemmedTerm) &&
      !hasSharedOpposite &&
      stemmedOpposites.some((opposite) => articleTerms.has(opposite))
    ) {
      return true;
    }
    if (
      articleTerms.has(stemmedTerm) &&
      !claimTerms.has(stemmedTerm) &&
      !hasSharedOpposite &&
      stemmedOpposites.some((opposite) => claimTerms.has(opposite))
    ) {
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
 * 12%. Conservative: a single same-unit claim/evidence pair matching within tolerance
 * anywhere is treated as support and short-circuits the whole check, even if the claim or
 * evidence also contains other, unrelated same-unit values that individually disagree
 * (e.g. claim "30%, 50%" vs evidence "30%, 70%" - the matching 30% pair is support, the
 * unrelated 50%-vs-70% mismatch must not override that). Only reports a conflict when at
 * least one same-unit pair existed to compare and none of them matched. Different units
 * are never compared, so this can only ever report a same-unit value conflict, never a
 * "unit conflict". */
export function detectNumericConflict(claimText: string, articleText: string): boolean {
  const claimMentions = extractNumericMentions(claimText);
  const articleMentions = extractNumericMentions(articleText);

  let hasComparablePair = false;
  for (const claimMention of claimMentions) {
    for (const articleMention of articleMentions) {
      if (articleMention.unit !== claimMention.unit) continue;
      hasComparablePair = true;
      const scale = Math.max(Math.abs(claimMention.value), Math.abs(articleMention.value), 1e-9);
      if (Math.abs(claimMention.value - articleMention.value) / scale <= NUMERIC_TOLERANCE_RATIO) {
        return false;
      }
    }
  }
  return hasComparablePair;
}
