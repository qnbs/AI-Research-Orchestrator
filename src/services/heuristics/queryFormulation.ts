import type { GeneratedQuery, ResearchInput } from '../../types';
import { meaningfulTokens, lightStem } from './utils';

/**
 * High-value MeSH-style expansions for common biomedical topics.
 * Keys are stemmed topic tokens; values are PubMed query fragments.
 */
const MESH_EXPANSIONS: Record<string, string[]> = {
  aspirin: ['"Aspirin"[MeSH Terms]', '"aspirin"[Title/Abstract]'],
  diabetes: ['"Diabetes Mellitus"[MeSH Terms]', '"diabetes"[Title/Abstract]'],
  hypertens: ['"Hypertension"[MeSH Terms]', '"blood pressure"[Title/Abstract]'],
  cancer: ['"Neoplasms"[MeSH Terms]', '"cancer"[Title/Abstract]'],
  covid: ['"COVID-19"[MeSH Terms]', '"SARS-CoV-2"[Title/Abstract]'],
  alzheimer: ['"Alzheimer Disease"[MeSH Terms]', '"alzheimer"[Title/Abstract]'],
  depress: ['"Depression"[MeSH Terms]', '"depressive"[Title/Abstract]'],
  vaccin: ['"Vaccines"[MeSH Terms]', '"vaccination"[Title/Abstract]'],
  antibiot: ['"Anti-Bacterial Agents"[MeSH Terms]', '"antibiotic"[Title/Abstract]'],
  stroke: ['"Stroke"[MeSH Terms]', '"cerebrovascular"[Title/Abstract]'],
  asthma: ['"Asthma"[MeSH Terms]', '"asthma"[Title/Abstract]'],
  obes: ['"Obesity"[MeSH Terms]', '"obese"[Title/Abstract]'],
  inflam: ['"Inflammation"[MeSH Terms]', '"inflammatory"[Title/Abstract]'],
  immun: ['"Immune System"[MeSH Terms]', '"immunity"[Title/Abstract]'],
  cardiac: ['"Heart"[MeSH Terms]', '"cardiac"[Title/Abstract]'],
  myocardial: ['"Myocardial Infarction"[MeSH Terms]', '"heart attack"[Title/Abstract]'],
  Parkinson: ['"Parkinson Disease"[MeSH Terms]', '"parkinson"[Title/Abstract]'],
  epileps: ['"Epilepsy"[MeSH Terms]', '"seizure"[Title/Abstract]'],
  microbiom: ['"Microbiota"[MeSH Terms]', '"microbiome"[Title/Abstract]'],
  CRISPR: ['"CRISPR-Cas Systems"[MeSH Terms]', '"gene editing"[Title/Abstract]'],
};

function expandToken(token: string): string[] {
  const stem = lightStem(token);
  for (const [key, frags] of Object.entries(MESH_EXPANSIONS)) {
    if (stem.includes(lightStem(key)) || lightStem(key).includes(stem)) {
      return frags;
    }
  }
  return [`"${token}"[Title/Abstract]`];
}

/**
 * Build a PubMed-style Boolean query from natural-language topic + filters.
 * Deterministic; falls back to `(topic)[Title/Abstract]` when tokens are scarce.
 */
export function formulatePubMedQuery(input: ResearchInput): GeneratedQuery {
  const tokens = meaningfulTokens(input.researchTopic);
  const unique = [...new Set(tokens.map(lightStem))];
  const topTokens = tokens
    .filter((t, i, arr) => arr.findIndex((x) => lightStem(x) === lightStem(t)) === i)
    .slice(0, 6);

  let topicClause: string;
  let explanation: string;

  if (topTokens.length === 0) {
    const safe = input.researchTopic.trim() || 'research';
    topicClause = `("${safe}")[Title/Abstract]`;
    explanation =
      'Heuristic mode: used the full topic as a Title/Abstract phrase because no meaningful tokens were extracted.';
  } else {
    const groups = topTokens.map((t) => {
      const parts = expandToken(t);
      return parts.length === 1 ? parts[0] : `(${parts.join(' OR ')})`;
    });
    topicClause = groups.length === 1 ? groups[0] : `(${groups.join(' AND ')})`;
    explanation = `Heuristic mode: Boolean query from ${topTokens.length} topic token(s)${
      unique.some((u) =>
        Object.keys(MESH_EXPANSIONS).some((k) => lightStem(k) === u || u.includes(lightStem(k))),
      )
        ? ' with MeSH-style expansions'
        : ''
    }.`;
  }

  const filters: string[] = [];

  if (input.dateRange && input.dateRange !== 'any') {
    const years = parseInt(input.dateRange, 10);
    if (Number.isFinite(years) && years > 0) {
      const startYear = new Date().getFullYear() - years;
      filters.push(`("${startYear}/01/01"[Date - Publication] : "3000/12/31"[Date - Publication])`);
    }
  }

  if (input.articleTypes?.length) {
    const types = input.articleTypes.map((t) => `"${t}"[Publication Type]`).join(' OR ');
    filters.push(`(${types})`);
  }

  let query = topicClause;
  for (const f of filters) {
    query = `(${query}) AND ${f}`;
  }

  return { query, explanation };
}

/**
 * Convenience: return a one-element generatedQueries array for report shape.
 */
export function formulateQueries(input: ResearchInput): GeneratedQuery[] {
  return [formulatePubMedQuery(input)];
}
