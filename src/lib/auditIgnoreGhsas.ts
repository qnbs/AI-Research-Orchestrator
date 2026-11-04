import { load } from 'js-yaml';

const GHSA_ID = /^GHSA-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}$/i;

export class AuditIgnoreParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuditIgnoreParseError';
  }
}

function loadYamlMapping(
  yamlText: string,
  parseErrorLabel: string,
  rootErrorLabel: string,
): Record<string, unknown> {
  let root: unknown;
  try {
    root = load(yamlText);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AuditIgnoreParseError(`${parseErrorLabel}: ${message}`);
  }

  if (root === null || typeof root !== 'object' || Array.isArray(root)) {
    throw new AuditIgnoreParseError(rootErrorLabel);
  }

  return root as Record<string, unknown>;
}

function readAuditConfigIgnoreGhsas(root: Record<string, unknown>): unknown {
  const auditConfig = root.auditConfig;
  if (auditConfig === undefined) {
    return undefined;
  }
  if (auditConfig === null || typeof auditConfig !== 'object' || Array.isArray(auditConfig)) {
    throw new AuditIgnoreParseError('auditConfig must be a mapping');
  }
  return (auditConfig as Record<string, unknown>).ignoreGhsas;
}

/**
 * Parse `auditConfig.ignoreGhsas` from a pnpm-workspace.yaml document.
 * Fail closed on malformed YAML, wrong types, or invalid advisory IDs.
 */
export function parseIgnoreGhsasFromWorkspaceYaml(yamlText: string): string[] {
  const root = loadYamlMapping(
    yamlText,
    'pnpm-workspace.yaml YAML parse failed',
    'pnpm-workspace.yaml root must be a mapping',
  );
  return coerceGhsaSequence(readAuditConfigIgnoreGhsas(root), 'auditConfig.ignoreGhsas');
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
  const root = loadYamlMapping(
    yamlSnippet,
    'ignoreGhsas snippet YAML parse failed',
    'ignoreGhsas snippet root must be a mapping',
  );
  return coerceGhsaSequence(root.ignoreGhsas, 'ignoreGhsas');
}

/** @deprecated Use parseIgnoreGhsasFromWorkspaceYaml — kept for script self-check snippets. */
export function parseIgnoreGhsas(yamlSnippet: string): string[] {
  const trimmed = yamlSnippet.trimStart();
  const firstLine = trimmed.split('\n')[0] ?? '';
  if (/^\s*ignoreGhsas:/.test(firstLine) && !/^\s*auditConfig:/.test(trimmed)) {
    return parseStandaloneIgnoreGhsasList(yamlSnippet);
  }
  return parseIgnoreGhsasFromWorkspaceYaml(yamlSnippet);
}
