import { load } from 'js-yaml';

const GHSA_ID = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i;

export class AuditIgnoreParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditIgnoreParseError';
  }
}

/**
 * Parse `auditConfig.ignoreGhsas` from a pnpm-workspace.yaml document.
 * Fail closed on malformed YAML, wrong types, or invalid advisory IDs.
 */
export function parseIgnoreGhsasFromWorkspaceYaml(yamlText: string): string[] {
  let root: unknown;
  try {
    root = load(yamlText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AuditIgnoreParseError(`pnpm-workspace.yaml YAML parse failed: ${message}`);
  }

  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    throw new AuditIgnoreParseError('pnpm-workspace.yaml root must be a mapping');
  }

  const auditConfig = (root as Record<string, unknown>).auditConfig;
  if (auditConfig === undefined) {
    return [];
  }
  if (auditConfig === null || typeof auditConfig !== 'object' || Array.isArray(auditConfig)) {
    throw new AuditIgnoreParseError('auditConfig must be a mapping');
  }

  const ignoreGhsas = (auditConfig as Record<string, unknown>).ignoreGhsas;
  return coerceGhsaSequence(ignoreGhsas, 'auditConfig.ignoreGhsas');
}

function coerceGhsaSequence(ignoreGhsas: unknown, fieldLabel: string): string[] {
  if (ignoreGhsas === undefined) {
    return [];
  }
  if (!Array.isArray(ignoreGhsas)) {
    throw new AuditIgnoreParseError(`${fieldLabel} must be a YAML sequence`);
  }

  const ids: string[] = [];
  for (const entry of ignoreGhsas) {
    if (typeof entry !== 'string') {
      throw new AuditIgnoreParseError(`${fieldLabel} entries must be strings; got ${typeof entry}`);
    }
    if (!GHSA_ID.test(entry)) {
      throw new AuditIgnoreParseError(`Invalid GHSA advisory id: ${entry}`);
    }
    ids.push(entry);
  }
  return ids;
}

function parseStandaloneIgnoreGhsasList(yamlSnippet: string): string[] {
  let root: unknown;
  try {
    root = load(yamlSnippet);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AuditIgnoreParseError(`ignoreGhsas snippet YAML parse failed: ${message}`);
  }

  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    throw new AuditIgnoreParseError('ignoreGhsas snippet root must be a mapping');
  }

  return coerceGhsaSequence((root as Record<string, unknown>).ignoreGhsas, 'ignoreGhsas');
}

/** @deprecated Use parseIgnoreGhsasFromWorkspaceYaml — kept for script self-check snippets. */
export function parseIgnoreGhsas(yamlSnippet: string): string[] {
  const firstLine = yamlSnippet.trimStart().split('\n')[0] ?? '';
  if (/^\s*ignoreGhsas:/.test(firstLine) && !/^\s*auditConfig:/.test(yamlSnippet.trimStart())) {
    return parseStandaloneIgnoreGhsasList(yamlSnippet);
  }
  return parseIgnoreGhsasFromWorkspaceYaml(yamlSnippet);
}
