import { describe, expect, it } from 'vitest';
import {
  AuditIgnoreParseError,
  parseIgnoreGhsas,
  parseIgnoreGhsasFromWorkspaceYaml,
} from './auditIgnoreGhsas';

describe('parseIgnoreGhsasFromWorkspaceYaml', () => {
  it('returns empty when auditConfig or ignoreGhsas is absent', () => {
    expect(parseIgnoreGhsasFromWorkspaceYaml('packages:\n  - .\n')).toEqual([]);
    expect(parseIgnoreGhsasFromWorkspaceYaml('auditConfig:\n  other: true\n')).toEqual([]);
  });

  it('parses empty inline and block lists', () => {
    expect(parseIgnoreGhsasFromWorkspaceYaml('auditConfig:\n  ignoreGhsas: []\n')).toEqual([]);
    expect(
      parseIgnoreGhsasFromWorkspaceYaml(
        'auditConfig:\n  ignoreGhsas:\n    - GHSA-abcd-efgh-ijkl\n',
      ),
    ).toEqual(['GHSA-abcd-efgh-ijkl']);
  });

  it('parses multiline flow sequences', () => {
    const yaml = `auditConfig:
  ignoreGhsas: [
    GHSA-test-aaaa-bbbb
  ]
`;
    expect(parseIgnoreGhsasFromWorkspaceYaml(yaml)).toEqual(['GHSA-test-aaaa-bbbb']);
  });

  it('ignores GHSA-like text in YAML comments', () => {
    const yaml = `auditConfig:
  ignoreGhsas:
    # not an ignore: GHSA-fake-fake-fake
    - GHSA-real-real-real
`;
    expect(parseIgnoreGhsasFromWorkspaceYaml(yaml)).toEqual(['GHSA-real-real-real']);
  });

  it('does not treat a comment line containing ] as closing a flow list', () => {
    const yaml = `auditConfig:
  ignoreGhsas:
    - GHSA-abcd-efgh-ijkl
    # bracket in comment: ]
    - GHSA-mnop-qrst-uvwx
`;
    expect(parseIgnoreGhsasFromWorkspaceYaml(yaml)).toEqual([
      'GHSA-abcd-efgh-ijkl',
      'GHSA-mnop-qrst-uvwx',
    ]);
  });

  it('detects advisory after commented bracket in multiline flow-style list', () => {
    const yaml = `auditConfig:
  ignoreGhsas: [
    GHSA-aaaa-bbbb-cccc,
    # ] decoy in comment
    GHSA-dddd-eeee-ffff
  ]
`;
    expect(parseIgnoreGhsasFromWorkspaceYaml(yaml)).toEqual([
      'GHSA-aaaa-bbbb-cccc',
      'GHSA-dddd-eeee-ffff',
    ]);
  });

  it('accepts quoted entries', () => {
    expect(
      parseIgnoreGhsasFromWorkspaceYaml(
        'auditConfig:\n  ignoreGhsas:\n    - "GHSA-qwer-tyui-opas"\n',
      ),
    ).toEqual(['GHSA-qwer-tyui-opas']);
  });

  it('fails closed on invalid types and malformed ids', () => {
    expect(() =>
      parseIgnoreGhsasFromWorkspaceYaml('auditConfig:\n  ignoreGhsas: GHSA-not-a-list\n'),
    ).toThrow(AuditIgnoreParseError);
    expect(() =>
      parseIgnoreGhsasFromWorkspaceYaml('auditConfig:\n  ignoreGhsas:\n    - not-a-ghsa\n'),
    ).toThrow(AuditIgnoreParseError);
    expect(() => parseIgnoreGhsasFromWorkspaceYaml('auditConfig:\n  ignoreGhsas: [\n')).toThrow(
      AuditIgnoreParseError,
    );
  });
});

describe('parseIgnoreGhsas (deprecated standalone snippets)', () => {
  it('parses a standalone ignoreGhsas block list', () => {
    expect(
      parseIgnoreGhsas('ignoreGhsas:\n  - GHSA-abcd-efgh-ijkl\n  - GHSA-mnop-qrst-uvwx\n'),
    ).toEqual(['GHSA-abcd-efgh-ijkl', 'GHSA-mnop-qrst-uvwx']);
  });

  it('still delegates full workspace snippets to the strict parser', () => {
    expect(parseIgnoreGhsas('auditConfig:\n  ignoreGhsas: []\n')).toEqual([]);
  });

  it('parses YAML comments inside a standalone list', () => {
    expect(
      parseIgnoreGhsas(
        'ignoreGhsas:\n  - GHSA-abcd-efgh-ijkl\n  # trailing note\n  - GHSA-mnop-qrst-uvwx\n',
      ),
    ).toEqual(['GHSA-abcd-efgh-ijkl', 'GHSA-mnop-qrst-uvwx']);
  });

  it('returns empty when standalone snippet omits ignoreGhsas', () => {
    expect(parseIgnoreGhsas('ignoreGhsas: []\n')).toEqual([]);
  });

  it('fails closed on malformed standalone snippet', () => {
    expect(() => parseIgnoreGhsas('ignoreGhsas: not-a-list\n')).toThrow(AuditIgnoreParseError);
    expect(() => parseIgnoreGhsas('ignoreGhsas:\n  - bad-id\n')).toThrow(AuditIgnoreParseError);
  });
});

describe('parseIgnoreGhsasFromWorkspaceYaml edge cases', () => {
  it('rejects non-mapping auditConfig', () => {
    expect(() => parseIgnoreGhsasFromWorkspaceYaml('auditConfig: []\n')).toThrow(
      AuditIgnoreParseError,
    );
  });

  it('rejects non-string sequence entries', () => {
    expect(() =>
      parseIgnoreGhsasFromWorkspaceYaml('auditConfig:\n  ignoreGhsas:\n    - 123\n'),
    ).toThrow(AuditIgnoreParseError);
  });
});
