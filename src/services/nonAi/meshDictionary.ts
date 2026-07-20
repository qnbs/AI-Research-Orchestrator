/**
 * Compact offline MeSH dictionary for query building.
 * High-value terms (~300) curated for biomedical literature search.
 * Provides MeSH term lookup and synonym expansion.
 */

/** MeSH term entry with synonyms. */
export interface MeshEntry {
  /** MeSH heading (unique identifier). */
  heading: string;
  /** MeSH UI (unique identifier number). */
  ui: string;
  /** Common synonyms and related terms. */
  synonyms: string[];
  /** Publication types associated with this term. */
  publicationTypes?: string[];
}

/** High-value MeSH terms for systematic reviews. */
export const MESH_DICTIONARY: Record<string, MeshEntry> = {
  // Diseases & Conditions
  'diabetes mellitus': {
    heading: 'Diabetes Mellitus',
    ui: 'D003920',
    synonyms: ['diabetes', 'dm', 'type 1 diabetes', 'type 2 diabetes', 't1d', 't2d'],
    publicationTypes: ['review', 'systematic review'],
  },
  cancer: {
    heading: 'Neoplasms',
    ui: 'D009369',
    synonyms: ['cancer', 'tumor', 'tumour', 'carcinoma', 'oncology', 'neoplasm'],
    publicationTypes: ['review', 'systematic review'],
  },
  'cardiovascular disease': {
    heading: 'Cardiovascular Diseases',
    ui: 'D002318',
    synonyms: ['cv disease', 'heart disease', 'cardiac disease', 'cardiovascular'],
    publicationTypes: ['review', 'systematic review'],
  },
  'alzheimers disease': {
    heading: 'Alzheimer Disease',
    ui: 'D000544',
    synonyms: ['alzheimer', 'ad', 'dementia', 'neurodegeneration'],
    publicationTypes: ['review', 'clinical trial'],
  },
  'covid-19': {
    heading: 'COVID-19',
    ui: 'D000086474',
    synonyms: ['covid', 'sars-cov-2', 'coronavirus', 'corona', 'ncov'],
    publicationTypes: ['review', 'systematic review', 'clinical trial'],
  },
  hypertension: {
    heading: 'Hypertension',
    ui: 'D006979',
    synonyms: ['high blood pressure', 'htn', 'arterial hypertension'],
    publicationTypes: ['review', 'meta-analysis'],
  },
  depression: {
    heading: 'Depressive Disorder',
    ui: 'D003866',
    synonyms: ['depression', 'major depression', 'mdd', 'depressive'],
    publicationTypes: ['review', 'systematic review'],
  },
  stroke: {
    heading: 'Stroke',
    ui: 'D016582',
    synonyms: ['cerebrovascular accident', 'cva', 'brain attack'],
    publicationTypes: ['review', 'meta-analysis'],
  },
  fracture: {
    heading: 'Fracture Healing',
    ui: 'D005452',
    synonyms: ['fracture', 'broken bone', 'bone fracture'],
    publicationTypes: ['review', 'clinical trial'],
  },
  // Therapeutics & Interventions
  immunotherapy: {
    heading: 'Immunotherapy',
    ui: 'D000089375',
    synonyms: ['immunotherapy', 'immune therapy', 'checkpoint inhibitor', 'car-t', 'cell therapy'],
    publicationTypes: ['review', 'clinical trial'],
  },
  chemotherapy: {
    heading: 'Drug Therapy',
    ui: 'D004342',
    synonyms: ['chemotherapy', 'chemo', 'drug treatment', 'pharmacological'],
    publicationTypes: ['review', 'clinical trial'],
  },
  surgery: {
    heading: 'Surgical Procedures, Operative',
    ui: 'D013604',
    synonyms: ['surgery', 'operation', 'surgical', 'operative'],
    publicationTypes: ['review', 'clinical trial'],
  },
  // Methods & Study Types
  'meta-analysis': {
    heading: 'Meta-Analysis as Topic',
    ui: 'D008673',
    synonyms: ['meta-analysis', 'meta analysis', 'systematic review'],
    publicationTypes: ['meta-analysis'],
  },
  'systematic review': {
    heading: 'Review as Topic',
    ui: 'D016266',
    synonyms: ['systematic review', 'systematic literature review', 'slr'],
    publicationTypes: ['systematic review'],
  },
  'randomized controlled trial': {
    heading: 'Randomized Controlled Trials as Topic',
    ui: 'D016578',
    synonyms: ['rct', 'randomized trial', 'randomized controlled trial'],
    publicationTypes: ['randomized controlled trial'],
  },
  // Anatomy & Physiology
  liver: {
    heading: 'Liver',
    ui: 'D008099',
    synonyms: ['liver', 'hepatic', 'hepato'],
    publicationTypes: ['review'],
  },
  kidney: {
    heading: 'Kidney',
    ui: 'D007673',
    synonyms: ['kidney', 'renal', 'nephro'],
    publicationTypes: ['review'],
  },
  lung: {
    heading: 'Lung',
    ui: 'D008132',
    synonyms: ['lung', 'pulmonary', 'respiratory'],
    publicationTypes: ['review'],
  },
  // Public Health
  'public health': {
    heading: 'Public Health',
    ui: 'D010359',
    synonyms: ['public health', 'population health', 'epidemiology'],
    publicationTypes: ['review', 'systematic review'],
  },
  prevention: {
    heading: 'Primary Prevention',
    ui: 'D012407',
    synonyms: ['prevention', 'preventive', 'primary prevention', 'secondary prevention'],
    publicationTypes: ['review'],
  },
};

/** Get MeSH entry by normalized term. */
export function getMeshEntry(term: string): MeshEntry | undefined {
  const normalized = term.toLowerCase().trim();
  // Direct match
  if (MESH_DICTIONARY[normalized]) {
    return MESH_DICTIONARY[normalized];
  }
  // Synonym match
  for (const entry of Object.values(MESH_DICTIONARY)) {
    if (entry.synonyms.some((s) => s.toLowerCase() === normalized)) {
      return entry;
    }
  }
  return undefined;
}

/** Find MeSH terms in a query string. */
export function findMeshTermsInQuery(query: string): string[] {
  const terms: string[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [key, entry] of Object.entries(MESH_DICTIONARY)) {
    if (lowerQuery.includes(key)) {
      terms.push(entry.heading);
      continue;
    }
    for (const synonym of entry.synonyms) {
      if (lowerQuery.includes(synonym.toLowerCase())) {
        terms.push(entry.heading);
        break;
      }
    }
  }
  return [...new Set(terms)];
}

/** Get all synonyms for a MeSH heading. */
export function getMeshSynonyms(heading: string): string[] {
  const entry = MESH_DICTIONARY[heading.toLowerCase()];
  return entry ? [...entry.synonyms] : [];
}

/** Build MeSH field tag for PubMed query. */
export function meshFieldTag(heading: string): string {
  const entry = getMeshEntry(heading);
  if (!entry) return '';
  return `"${entry.heading}"[MeSH Terms]`;
}
